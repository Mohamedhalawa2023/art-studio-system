/**
 * Finance & Billing Domain Service
 * Records tuition payments, payment reversals, installment balances, and operating expenses.
 */

import type { DatabaseEngine, DatabaseState } from '@/lib/db/transactionManager';
import type { Enrollment, Installment, OperatingExpense, OperatingExpenseCategory, OperatingExpenseRevision, Payment } from '@/lib/mockData';
import { Validators } from '@/lib/validators';
import { logger } from '@/lib/logger/logger';
import { formatLocalDate, formatLocalDateTime } from '@/lib/dates';

const PAYMENT_METHODS: Payment['method'][] = ['cash', 'transfer', 'instapay', 'vodafone', 'card'];
const EXPENSE_CATEGORIES: OperatingExpenseCategory[] = [
  'rent', 'salaries', 'materials', 'utilities', 'maintenance', 'transport', 'marketing', 'other'
];
const INITIAL_DEPOSIT_NOTE = 'دفعة مقدمة عند التعاقد والتسجيل';

function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

function fromCents(cents: number): number {
  if (!Number.isSafeInteger(cents)) throw new Error('إجمالي العملية يتجاوز الحد المالي المسموح.');
  return cents / 100;
}

function createId(prefix: string): string {
  const unique = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${unique}`;
}

function nextReceiptNumber(payments: Payment[]): string {
  const latest = payments.reduce((highest, payment) => {
    const match = /^RCP-(\d+)$/.exec(payment.receiptNumber);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `RCP-${String(latest + 1).padStart(4, '0')}`;
}

function nextReversalNumber(payments: Payment[], year: number): string {
  const prefix = `REV-${year}-`;
  const latest = payments.reduce((highest, payment) => {
    if (!payment.receiptNumber.startsWith(prefix)) return highest;
    const match = new RegExp(`^REV-${year}-(\\d+)$`).exec(payment.receiptNumber);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(latest + 1).padStart(4, '0')}`;
}

export interface RecordPaymentDTO {
  enrollmentId: string;
  amount: number;
  method: Payment['method'];
  notes?: string;
  recordedBy?: string;
}

export interface ReversePaymentDTO {
  paymentId: string;
  reason: string;
  recordedBy?: string;
}

export interface RecordExpenseDTO {
  date: string;
  category: OperatingExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: Payment['method'];
  recordedBy?: string;
}

export interface UpdateExpenseDTO extends RecordExpenseDTO {
  id: string;
  updatedBy?: string;
}

function validateExpenseInput(dto: RecordExpenseDTO) {
  const category = Validators.requireText(dto.category, 'بند المصروف', 2, 30) as OperatingExpenseCategory;
  if (!EXPENSE_CATEGORIES.includes(category)) throw new Error('بند المصروف غير صالح.');
  if (!PAYMENT_METHODS.includes(dto.paymentMethod)) throw new Error('طريقة الدفع غير صالحة.');

  const date = Validators.requireText(dto.date, 'تاريخ المصروف', 10, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error('تاريخ المصروف غير صالح.');
  const parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (formatLocalDate(parsedDate) !== date) throw new Error('تاريخ المصروف غير صالح.');

  return {
    date,
    category,
    description: Validators.requireText(dto.description, 'بيان المصروف', 2, 200),
    amount: Validators.requirePositiveMoney(dto.amount, 'قيمة المصروف'),
    paymentMethod: dto.paymentMethod,
    recordedBy: dto.recordedBy || 'u1'
  };
}

export class FinanceService {
  constructor(private db: DatabaseEngine) {}

  /** Rebuilds the due schedule from valid ledger entries; installment face values remain stable. */
  private reconcileEnrollment(draft: DatabaseState, enrollment: Enrollment, now: Date) {
    const installments = draft.installments
      .filter(item => item.enrollmentId === enrollment.id)
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
    const initialDeposits = draft.payments.filter(payment =>
      payment.enrollmentId === enrollment.id &&
      !payment.reversalOf &&
      payment.notes?.includes(INITIAL_DEPOSIT_NOTE)
    );
    const initialDepositIds = new Set(initialDeposits.map(payment => payment.id));
    const initialDepositsCents = initialDeposits.reduce((sum, payment) => sum + toCents(payment.amount), 0);
    const regularInstallments = installments.filter(item => !item.isAdjustment);
    const adjustments = installments.filter(item => item.isAdjustment);

    // Older versions reduced an installment's amount after a partial payment. Recover that
    // missing face value from the enrollment's original plan before switching to paidAmount.
    const scheduledBaseCents = regularInstallments.length > 0
      ? Math.max(0, toCents(enrollment.totalAmount) - initialDepositsCents)
      : 0;
    const knownBaseCents = regularInstallments.reduce(
      (sum, item) => sum + toCents(item.originalAmount ?? item.amount),
      0
    );
    const missingBaseCents = Math.max(0, scheduledBaseCents - knownBaseCents);
    if (missingBaseCents > 0 && regularInstallments.length > 0) {
      const target = regularInstallments.find(item => item.status !== 'paid') || regularInstallments[regularInstallments.length - 1];
      target.originalAmount = fromCents(toCents(target.originalAmount ?? target.amount) + missingBaseCents);
    }

    let schedulePaidCents = draft.payments.reduce((sum, payment) => {
      if (payment.enrollmentId !== enrollment.id || payment.status !== 'valid') return sum;
      if (initialDepositIds.has(payment.id)) return sum;
      if (payment.reversalOf && initialDepositIds.has(payment.reversalOf)) return sum;
      return sum + toCents(payment.amount);
    }, 0);
    schedulePaidCents = Math.max(0, schedulePaidCents);

    for (const installment of [...regularInstallments, ...adjustments].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
      const originalAmount = installment.originalAmount ?? installment.amount;
      const originalCents = toCents(originalAmount);
      const paidCents = Math.min(originalCents, schedulePaidCents);
      schedulePaidCents -= paidCents;

      installment.originalAmount = originalAmount;
      installment.amount = originalAmount;
      installment.paidAmount = fromCents(paidCents);
      const remainingCents = originalCents - paidCents;
      if (remainingCents <= 0) {
        installment.status = 'paid';
      } else if (installment.dueDate < formatLocalDate(now)) {
        installment.status = 'overdue';
        delete installment.paidDate;
      } else if (paidCents > 0) {
        installment.status = 'partial';
        delete installment.paidDate;
      } else {
        installment.status = 'pending';
        delete installment.paidDate;
      }
    }

    const totalPaidCents = draft.payments.reduce((sum, payment) => {
      if (payment.enrollmentId !== enrollment.id || payment.status !== 'valid') return sum;
      return sum + toCents(payment.amount);
    }, 0);
    const safePaidCents = Math.max(0, totalPaidCents);
    enrollment.totalPaid = fromCents(safePaidCents);
    if (safePaidCents >= toCents(enrollment.totalAmount)) {
      enrollment.paymentStatus = 'completed';
    } else if (installments.some(item => item.status === 'overdue')) {
      enrollment.paymentStatus = 'overdue';
    } else if (safePaidCents > 0) {
      enrollment.paymentStatus = 'partial';
    } else {
      enrollment.paymentStatus = 'unpaid';
    }
  }

  /** Records a tuition payment atomically and reconciles the installment schedule. */
  public addCoursePayment(dto: RecordPaymentDTO, onStateCommit?: (state: DatabaseState) => void): Payment {
    return this.db.executeTransaction('RECORD_COURSE_PAYMENT', draft => {
      const validatedAmount = Validators.requirePositiveMoney(dto.amount, 'مبلغ الدفعة');
      if (!PAYMENT_METHODS.includes(dto.method)) throw new Error('طريقة الدفع غير صالحة.');

      const enrollment = draft.enrollments.find(item => item.id === dto.enrollmentId);
      if (!enrollment) throw new Error(`الاشتراك المطلوب تسجيل دفعة له غير موجود (${dto.enrollmentId})`);

      const currentPaidCents = draft.payments.reduce((sum, payment) => {
        if (payment.enrollmentId !== enrollment.id || payment.status !== 'valid') return sum;
        return sum + toCents(payment.amount);
      }, 0);
      const totalAmountCents = toCents(enrollment.totalAmount);
      const remainingCents = Math.max(0, totalAmountCents - currentPaidCents);
      const amountCents = toCents(validatedAmount);
      if (amountCents > remainingCents) {
        throw new Error(`المبلغ المدفوع (${validatedAmount} ج) يتجاوز المتبقي المستحق على الطالب (${fromCents(remainingCents)} ج).`);
      }

      const now = new Date();
      const payment: Payment = {
        id: createId('pay'),
        enrollmentId: enrollment.id,
        amount: fromCents(amountCents),
        method: dto.method,
        receiptNumber: nextReceiptNumber(draft.payments),
        date: formatLocalDateTime(now),
        recordedBy: dto.recordedBy || 'u1',
        status: 'valid',
        notes: dto.notes?.trim() || 'سداد دفعة دراسية'
      };
      draft.payments.unshift(payment);
      this.reconcileEnrollment(draft, enrollment, now);

      logger.info('FinanceService', `Payment recorded: ${payment.receiptNumber} -> ${payment.amount} EGP (Enrollment: ${enrollment.id})`);
      return payment;
    }, onStateCommit);
  }

  /** Adds an immutable negative ledger entry instead of deleting the original receipt. */
  public reverseCoursePayment(dto: ReversePaymentDTO, onStateCommit?: (state: DatabaseState) => void): Payment {
    return this.db.executeTransaction('REVERSE_COURSE_PAYMENT', draft => {
      const original = draft.payments.find(payment => payment.id === dto.paymentId);
      if (!original || original.status !== 'valid' || original.amount <= 0 || original.reversalOf) {
        throw new Error('الإيصال المحدد غير صالح للرد أو تم إلغاؤه بالفعل.');
      }
      if (draft.payments.some(payment => payment.reversalOf === original.id)) {
        throw new Error('تم رد هذا الإيصال من قبل.');
      }

      const reason = Validators.requireText(dto.reason, 'سبب رد الإيصال', 3, 300);
      const enrollment = draft.enrollments.find(item => item.id === original.enrollmentId);
      if (!enrollment) throw new Error('الاشتراك المرتبط بالإيصال غير موجود.');

      const now = new Date();
      const reversal: Payment = {
        id: createId('reversal'),
        enrollmentId: original.enrollmentId,
        amount: -original.amount,
        method: original.method,
        receiptNumber: nextReversalNumber(draft.payments, now.getFullYear()),
        date: formatLocalDateTime(now),
        recordedBy: dto.recordedBy || 'u1',
        status: 'valid',
        notes: `رد الإيصال ${original.receiptNumber}`,
        reversalOf: original.id,
        reversalReason: reason
      };
      draft.payments.unshift(reversal);

      const hasInstallments = draft.installments.some(item => item.enrollmentId === enrollment.id);
      const reversesInitialDeposit = original.notes?.includes(INITIAL_DEPOSIT_NOTE) === true;
      if (reversesInitialDeposit || !hasInstallments) {
        draft.installments.push({
          id: createId('installment-adjustment'),
          enrollmentId: enrollment.id,
          amount: original.amount,
          originalAmount: original.amount,
          paidAmount: 0,
          dueDate: formatLocalDate(now),
          status: 'pending',
          isAdjustment: true
        });
      }

      this.reconcileEnrollment(draft, enrollment, now);
      logger.info('FinanceService', `Payment reversed: ${original.receiptNumber} -> ${reversal.receiptNumber} (${reason})`);
      return reversal;
    }, onStateCommit);
  }

  /** Records an operating expense for date-filtered financial reporting. */
  public addOperatingExpense(dto: RecordExpenseDTO, onStateCommit?: (state: DatabaseState) => void): OperatingExpense {
    return this.db.executeTransaction('RECORD_OPERATING_EXPENSE', draft => {
      const values = validateExpenseInput(dto);
      const expense: OperatingExpense = {
        id: createId('expense'),
        ...values,
        recordedAt: formatLocalDateTime(new Date())
      };
      draft.expenses.unshift(expense);
      logger.info('FinanceService', `Operating expense recorded: ${expense.category} -> ${expense.amount} EGP (${expense.date})`);
      return expense;
    }, onStateCommit);
  }

  /** Updates a saved expense while keeping who first recorded it and when. */
  public updateOperatingExpense(dto: UpdateExpenseDTO, onStateCommit?: (state: DatabaseState) => void): OperatingExpense {
    return this.db.executeTransaction('UPDATE_OPERATING_EXPENSE', draft => {
      const expenseIndex = draft.expenses.findIndex(expense => expense.id === dto.id);
      if (expenseIndex < 0) throw new Error('المصروف المطلوب تعديله غير موجود.');

      const existing = draft.expenses[expenseIndex];
      if (existing.voidedAt) throw new Error('لا يمكن تعديل مصروف ملغى. أضف مصروفًا جديدًا إذا لزم الأمر.');
      const values = validateExpenseInput(dto);
      const updatedExpense: OperatingExpense = {
        ...existing,
        ...values,
        recordedBy: existing.recordedBy,
        recordedAt: existing.recordedAt,
        changeHistory: [
          ...(existing.changeHistory || []),
          {
            date: existing.date,
            category: existing.category,
            description: existing.description,
            amount: existing.amount,
            paymentMethod: existing.paymentMethod,
            changedBy: dto.updatedBy || dto.recordedBy || 'u1',
            changedAt: formatLocalDateTime(new Date()),
          } satisfies OperatingExpenseRevision,
        ],
        updatedBy: dto.updatedBy || dto.recordedBy || 'u1',
        updatedAt: formatLocalDateTime(new Date())
      };
      draft.expenses[expenseIndex] = updatedExpense;
      logger.info('FinanceService', `Operating expense updated: ${updatedExpense.id} -> ${updatedExpense.amount} EGP (${updatedExpense.date})`);
      return updatedExpense;
    }, onStateCommit);
  }

  /** Voids an expense without erasing its financial history. */
  public deleteOperatingExpense(id: string, reason: string, deletedBy?: string, onStateCommit?: (state: DatabaseState) => void): void {
    this.db.executeTransaction('VOID_OPERATING_EXPENSE', draft => {
      const expense = draft.expenses.find(item => item.id === id);
      if (!expense) throw new Error('المصروف المطلوب إلغاؤه غير موجود.');
      if (expense.voidedAt) throw new Error('هذا المصروف ملغى بالفعل.');

      expense.voidedAt = formatLocalDateTime(new Date());
      expense.voidedBy = deletedBy || 'u1';
      expense.voidReason = Validators.requireText(reason, 'سبب إلغاء المصروف', 3, 200);
      logger.info('FinanceService', `Operating expense voided: ${expense.id} (${expense.voidedBy})`);
    }, onStateCommit);
  }
}
