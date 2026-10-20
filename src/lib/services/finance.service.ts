/**
 * Finance & Billing Domain Service
 * Manages tuition payments, installment reconciliation, balance calculation, and receipt numbering.
 */

import { Payment, Enrollment, Installment } from '@/lib/mockData';
import { DatabaseEngine } from '@/lib/db/transactionManager';
import { Validators } from '@/lib/validators';
import { logger } from '@/lib/logger/logger';
import { formatLocalDateTime } from '@/lib/dates';

export interface RecordPaymentDTO {
  enrollmentId: string;
  amount: number;
  method: Payment['method'];
  notes?: string;
  recordedBy?: string;
}

export class FinanceService {
  constructor(private db: DatabaseEngine) {}

  /**
   * Records a tuition payment atomically:
   * 1. Validates positive amount against remaining balance.
   * 2. Updates enrollment totalPaid and paymentStatus.
   * 3. Reconciles and updates installment statuses.
   * 4. Generates an official receipt record.
   */
  public addCoursePayment(
    dto: RecordPaymentDTO,
    onStateCommit?: (state: any) => void
  ): Payment {
    return this.db.executeTransaction(
      'RECORD_COURSE_PAYMENT',
      (draft) => {
        const validatedAmount = Validators.requirePositiveMoney(dto.amount, 'مبلغ الدفعة');

        const enr = draft.enrollments.find(e => e.id === dto.enrollmentId);
        if (!enr) {
          throw new Error(`الاشتراك المطلوب تسجيل دفعة له غير موجود (${dto.enrollmentId})`);
        }

        const currentPaid = enr.totalPaid || 0;
        const totalCost = enr.totalAmount || 0;
        const remaining = Math.max(0, totalCost - currentPaid);

        if (validatedAmount > remaining) {
          throw new Error(`المبلغ المدفوع (${validatedAmount} ج) يتجاوز المتبقي المستحق على الطالب (${remaining} ج).`);
        }

        const now = new Date();
        const receiptNumber = `RCP-${String(draft.payments.length + 1).padStart(4, '0')}`;

        // 1. Create Payment Record
        const payment: Payment = {
          id: `p-${Date.now()}`,
          enrollmentId: enr.id,
          amount: validatedAmount,
          method: dto.method,
          receiptNumber,
          date: formatLocalDateTime(now),
          recordedBy: dto.recordedBy || 'u1',
          status: 'valid',
          notes: dto.notes?.trim() || 'سداد دفعة دراسية'
        };
        draft.payments.push(payment);

        // 2. Update Enrollment State
        const newTotalPaid = currentPaid + validatedAmount;
        enr.totalPaid = newTotalPaid;
        enr.paymentStatus = newTotalPaid >= totalCost ? 'completed' : 'partial';

        // 3. Reconcile Installments (mark earliest pending as paid)
        const studentInsts = draft.installments
          .filter(i => i.enrollmentId === enr.id && i.status !== 'paid')
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        let allocationRemaining = validatedAmount;
        for (const inst of studentInsts) {
          if (allocationRemaining >= inst.amount) {
            inst.status = 'paid';
            allocationRemaining -= inst.amount;
          } else if (allocationRemaining > 0) {
            inst.amount -= allocationRemaining;
            allocationRemaining = 0;
          }
        }

        logger.info('FinanceService', `Payment recorded: ${receiptNumber} -> ${validatedAmount} EGP (Enrollment: ${enr.id})`);

        return payment;
      },
      onStateCommit
    );
  }
}
