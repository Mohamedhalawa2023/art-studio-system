import type { Enrollment, Installment, Payment } from '@/lib/mockData';
import type { DatabaseEngine, DatabaseState } from '@/lib/db/transactionManager';
import { Validators } from '@/lib/validators';
import { addLocalCalendarDays, formatLocalDate, formatLocalDateTime } from '@/lib/dates';

export interface CreateEnrollmentDTO {
  studentId: string;
  groupId: string;
  paymentPlan: 'full' | 'installments';
  paymentMethod?: Payment['method'];
  contractAccepted: boolean;
  recordedBy?: string;
}

export interface UpdateEnrollmentDTO {
  groupId: string;
  contractAccepted: boolean;
  totalAmount: number;
}

export class EnrollmentService {
  constructor(private db: DatabaseEngine) {}

  public createEnrollment(
    dto: CreateEnrollmentDTO,
    onStateCommit?: (state: DatabaseState) => void
  ): { enrollment: Enrollment; payment?: Payment } {
    return this.db.executeTransaction(
      'CREATE_STUDENT_ENROLLMENT',
      (draft) => {
        if (!dto.contractAccepted) throw new Error('يجب تسجيل موافقة ولي الأمر على بنود التعاقد قبل الحجز.');
        const student = draft.students.find(item => item.id === dto.studentId);
        if (!student) throw new Error('الطالب المحدد غير موجود.');

        const group = draft.groups.find(item => item.id === dto.groupId);
        if (!group) throw new Error('المجموعة المحددة غير موجودة.');
        if (group.status === 'completed') throw new Error('لا يمكن الحجز في مجموعة منتهية.');

        const capacity = Number.isSafeInteger(group.capacity) && group.capacity > 0 ? group.capacity : 10;
        if ((group.enrolled || 0) >= capacity) throw new Error('المجموعة مكتملة العدد، اختر مجموعة أخرى.');

        if (draft.enrollments.some(item => item.studentId === student.id && item.groupId === group.id)) {
          throw new Error('الطالب مسجل بالفعل في هذه المجموعة.');
        }

        const course = draft.courses.find(item => item.id === group.courseId);
        if (!course) throw new Error('الكورس المرتبط بالمجموعة غير موجود.');

        const basePrice = Validators.requirePositiveMoney(course.price, 'سعر الكورس');
        const totalAmount = dto.paymentPlan === 'full'
          ? Math.round(basePrice * 0.95 * 100) / 100
          : basePrice;
        const isPaidInFull = dto.paymentPlan === 'full';
        const now = new Date();
        const enrollment: Enrollment = {
          id: `enr_${crypto.randomUUID()}`,
          studentId: student.id,
          groupId: group.id,
          enrollDate: formatLocalDate(now),
          contractSigned: true,
          contractVersion: 'v2.0-2026',
          paymentStatus: isPaidInFull ? 'completed' : 'unpaid',
          totalPaid: isPaidInFull ? totalAmount : 0,
          totalAmount,
        };

        let payment: Payment | undefined;
        if (isPaidInFull) {
          payment = {
            id: `pay_${crypto.randomUUID()}`,
            enrollmentId: enrollment.id,
            amount: totalAmount,
            method: dto.paymentMethod || 'cash',
            receiptNumber: `RCP-${String(draft.payments.length + 1).padStart(4, '0')}`,
            date: formatLocalDateTime(now),
            recordedBy: dto.recordedBy || 'u1',
            status: 'valid',
            notes: 'سداد كامل مع خصم 5% عند التسجيل',
          };
          draft.payments.push(payment);
        } else {
          const totalCents = Math.round(totalAmount * 100);
          const installmentCents = Math.floor(totalCents / 3);
          for (let index = 0; index < 3; index += 1) {
            const cents = index === 2
              ? totalCents - installmentCents * 2
              : installmentCents;
            const installment: Installment = {
              id: `inst_${crypto.randomUUID()}`,
              enrollmentId: enrollment.id,
              amount: cents / 100,
              dueDate: addLocalCalendarDays(now, 30 * (index + 1)),
              status: 'pending',
            };
            draft.installments.push(installment);
          }
        }

        draft.enrollments.push(enrollment);
        group.enrolled = (group.enrolled || 0) + 1;

        return { enrollment, payment };
      },
      onStateCommit
    );
  }

  public updateEnrollment(id: string, dto: UpdateEnrollmentDTO, onStateCommit?: (state: DatabaseState) => void): Enrollment {
    return this.db.executeTransaction('UPDATE_STUDENT_ENROLLMENT', draft => {
      const enrollment = draft.enrollments.find(item => item.id === id);
      if (!enrollment) throw new Error('الاشتراك المطلوب غير موجود.');
      const nextGroup = draft.groups.find(item => item.id === dto.groupId);
      if (!nextGroup) throw new Error('المجموعة المحددة غير موجودة.');
      if (nextGroup.status === 'completed') throw new Error('لا يمكن نقل الاشتراك إلى مجموعة منتهية.');
      if (nextGroup.id !== enrollment.groupId) {
        if (draft.payments.some(item => item.enrollmentId === id)) {
          throw new Error('لا يمكن نقل اشتراك له إيصالات مالية إلى مجموعة أخرى؛ اترك سجل التعاقد كما تم تسجيله.');
        }
        if (draft.enrollments.some(item => item.id !== id && item.studentId === enrollment.studentId && item.groupId === nextGroup.id)) {
          throw new Error('الطالب مسجل بالفعل في المجموعة المحددة.');
        }
        if ((nextGroup.enrolled || 0) >= nextGroup.capacity) throw new Error('المجموعة المحددة مكتملة العدد.');
        const previousGroup = draft.groups.find(item => item.id === enrollment.groupId);
        if (previousGroup) previousGroup.enrolled = Math.max(0, (previousGroup.enrolled || 0) - 1);
        nextGroup.enrolled = (nextGroup.enrolled || 0) + 1;
        enrollment.groupId = nextGroup.id;
      }
      const nextAmount = Validators.requirePositiveMoney(dto.totalAmount, 'إجمالي رسوم الاشتراك');
      if (nextAmount !== enrollment.totalAmount) {
        if (draft.payments.some(item => item.enrollmentId === id) || enrollment.totalPaid > 0) {
          throw new Error('لا يمكن تغيير إجمالي الرسوم بعد تسجيل إيصالات. استخدم تسوية مالية موثقة بدل تعديل السجل التاريخي.');
        }
        const oldInstallments = draft.installments.filter(item => item.enrollmentId === id);
        const count = Math.max(1, oldInstallments.length || 3);
        const totalCents = Math.round(nextAmount * 100);
        const baseCents = Math.floor(totalCents / count);
        const now = new Date();
        const nextInstallments: Installment[] = Array.from({ length: count }, (_, index) => {
          const amount = index === count - 1 ? totalCents - baseCents * (count - 1) : baseCents;
          return {
            id: oldInstallments[index]?.id || `inst_${crypto.randomUUID()}`,
            enrollmentId: id,
            amount: amount / 100,
            originalAmount: amount / 100,
            paidAmount: 0,
            dueDate: oldInstallments[index]?.dueDate || addLocalCalendarDays(now, 30 * (index + 1)),
            status: 'pending',
          };
        });
        draft.installments = draft.installments.filter(item => item.enrollmentId !== id).concat(nextInstallments);
        enrollment.totalAmount = nextAmount;
        enrollment.paymentStatus = enrollment.totalPaid > 0 ? 'partial' : 'unpaid';
      }
      enrollment.contractSigned = dto.contractAccepted;
      return enrollment;
    }, onStateCommit);
  }

  public deleteEnrollment(id: string, onStateCommit?: (state: DatabaseState) => void): void {
    this.db.executeTransaction('DELETE_STUDENT_ENROLLMENT', draft => {
      const enrollment = draft.enrollments.find(item => item.id === id);
      if (!enrollment) throw new Error('الاشتراك المطلوب غير موجود.');
      if (draft.payments.some(item => item.enrollmentId === id)) {
        throw new Error('لا يمكن حذف اشتراك له إيصالات مالية محفوظة. استخدم إجراء عكسي للدفعة مع الاحتفاظ بسجل الاشتراك.');
      }
      const group = draft.groups.find(item => item.id === enrollment.groupId);
      if (group) group.enrolled = Math.max(0, (group.enrolled || 0) - 1);
      draft.installments = draft.installments.filter(item => item.enrollmentId !== id);
      draft.enrollments = draft.enrollments.filter(item => item.id !== id);
    }, onStateCommit);
  }
}
