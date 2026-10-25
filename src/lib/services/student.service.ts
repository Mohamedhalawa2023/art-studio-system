/**
 * Student Domain Service
 * Handles business rules for student registration, contract enrollment, and installment plan generation.
 */

import { Student, Enrollment, Installment, Payment, User } from '@/lib/mockData';
import type { DatabaseEngine, DatabaseState } from '@/lib/db/transactionManager';
import { Validators } from '@/lib/validators';
import { logger } from '@/lib/logger/logger';
import { addLocalCalendarDays, formatLocalDate, formatLocalDateTime } from '@/lib/dates';

export interface RegisterStudentDTO {
  name: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  groupId?: string;
  contractAccepted?: boolean;
  totalAmount?: number;
  initialPayment?: number;
  paymentMethod?: Payment['method'];
  level?: string;
  healthNotes?: string;
  publishConsent?: boolean;
}

export interface UpdateStudentDTO {
  name: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  level?: string;
  healthNotes?: string;
  publishConsent?: boolean;
}

export class StudentService {
  constructor(private db: DatabaseEngine) {}

  /**
   * Registers a student atomically with their enrollment, initial receipt, and installment schedule.
   * If any step fails, the entire transaction is rolled back.
   */
  public registerStudentWithEnrollment(
    dto: RegisterStudentDTO,
    onStateCommit?: (state: DatabaseState) => void
  ): { student: Student; enrollment?: Enrollment; payment?: Payment } {
    return this.db.executeTransaction(
      'REGISTER_STUDENT_ENROLLMENT',
      (draft) => {
        // 1. Strict Input Validations
        const validatedName = Validators.requireText(dto.name, 'اسم الطالب', 3, 80);
        const validatedGuardian = Validators.requireText(dto.guardianName, 'اسم ولي الأمر', 3, 80);
        const validatedPhone = Validators.validatePhone(dto.guardianPhone);
        const validatedBirthDate = Validators.validateDateString(dto.birthDate, 'تاريخ الميلاد');

        const now = new Date();
        const dateStr = formatLocalDate(now);
        const dateTimeStr = formatLocalDateTime(now);

        // 2. Manage Guardian Account
        let guardian = draft.users.find(u => u.phone === validatedPhone && u.role === 'guardian');
        if (!guardian) {
          const newGuardian: User = {
            id: `u-g-${Date.now()}`,
            name: validatedGuardian,
            phone: validatedPhone,
            email: dto.guardianEmail?.trim() || `${validatedPhone}@marsam.art`,
            role: 'guardian'
          };
          draft.users.push(newGuardian);
          guardian = newGuardian;
        }

        // 3. Generate Unique Barcode / QR Token
        const existingBarcodes = new Set(draft.students.map(s => s.qrToken?.toLowerCase()));
        let qrToken = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
        while (existingBarcodes.has(qrToken.toLowerCase())) {
          qrToken = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // 4. Create Student Record
        const newStudent: Student = {
          id: `s-${Date.now()}`,
          name: validatedName,
          guardianId: guardian.id,
          birthDate: validatedBirthDate,
          level: dto.level || 'المستوى الأول (مبتدئ)',
          healthNotes: dto.healthNotes?.trim() || '',
          publishConsent: dto.publishConsent ?? false,
          qrToken
        };
        draft.students.push(newStudent);

        // 5. If Group is selected, create Enrollment & Financial Plan atomically
        let createdEnrollment: Enrollment | undefined;
        let initialPaymentRecord: Payment | undefined;

        if (dto.groupId) {
          if (!dto.contractAccepted) {
            throw new Error('يجب تسجيل موافقة ولي الأمر على بنود التعاقد قبل إنشاء الاشتراك.');
          }
          const group = draft.groups.find(g => g.id === dto.groupId);
          if (!group) {
            throw new Error(`المجموعة المحددة غير صالحة أو غير موجودة (${dto.groupId})`);
          }

          if (group.status === 'completed') {
            throw new Error('لا يمكن تسجيل الطالب في مجموعة منتهية.');
          }
          const capacity = Number.isSafeInteger(group.capacity) && group.capacity > 0 ? group.capacity : 10;
          if ((group.enrolled || 0) >= capacity) {
            throw new Error('المجموعة مكتملة العدد، اختر مجموعة أخرى.');
          }

          const course = draft.courses.find(c => c.id === group.courseId);
          if (!course) {
            throw new Error(`الكورس المرتبط بالمجموعة غير موجود (${group.courseId})`);
          }

          const totalAmount = Validators.requireNonNegativeNumber(
            dto.totalAmount ?? course.price,
            'إجمالي رسوم الكورس'
          );
          const initialPayment = Validators.requireNonNegativeNumber(
            dto.initialPayment ?? 0,
            'المبلغ المدفوع مقدماً'
          );

          if (initialPayment > totalAmount) {
            throw new Error('المبلغ المدفوع مقدماً لا يمكن أن يتجاوز إجمالي رسوم الكورس.');
          }

          const remaining = Math.max(0, totalAmount - initialPayment);
          const paymentStatus: Enrollment['paymentStatus'] =
            remaining === 0 ? 'completed' : initialPayment > 0 ? 'partial' : 'unpaid';

          createdEnrollment = {
            id: `e-${Date.now()}`,
            studentId: newStudent.id,
            groupId: group.id,
            enrollDate: dateStr,
            contractSigned: dto.contractAccepted === true,
            contractVersion: 'v2.0-2026',
            totalAmount,
            totalPaid: initialPayment,
            paymentStatus
          };
          draft.enrollments.push(createdEnrollment);

          // Record Initial Payment Receipt if paid
          if (initialPayment > 0) {
            const nextReceiptNo = `RCP-${String(draft.payments.length + 1).padStart(4, '0')}`;
            initialPaymentRecord = {
              id: `p-${Date.now()}`,
              enrollmentId: createdEnrollment.id,
              amount: initialPayment,
              method: dto.paymentMethod || 'cash',
              receiptNumber: nextReceiptNo,
              date: dateTimeStr,
              recordedBy: 'u1',
              status: 'valid',
              notes: 'دفعة مقدمة عند التعاقد والتسجيل'
            };
            draft.payments.push(initialPaymentRecord);
          }

          // Generate Installment Schedule if remaining balance exists
          if (remaining > 0) {
            const halfRemaining = Math.round(remaining / 2);
            const installment1: Installment = {
              id: `inst-${Date.now()}-1`,
              enrollmentId: createdEnrollment.id,
              amount: halfRemaining,
              dueDate: addLocalCalendarDays(now, 30),
              status: 'pending'
            };
            const installment2: Installment = {
              id: `inst-${Date.now()}-2`,
              enrollmentId: createdEnrollment.id,
              amount: remaining - halfRemaining,
              dueDate: addLocalCalendarDays(now, 60),
              status: 'pending'
            };
            draft.installments.push(installment1, installment2);
          }

          // Increment group enrolled count safely
          group.enrolled = (group.enrolled || 0) + 1;
        }

        logger.info('StudentService', `Student registered successfully: ${newStudent.id}`);

        return {
          student: newStudent,
          enrollment: createdEnrollment,
          payment: initialPaymentRecord
        };
      },
      onStateCommit
    );
  }

  public updateStudent(id: string, dto: UpdateStudentDTO, onStateCommit?: (state: DatabaseState) => void): Student {
    return this.db.executeTransaction('UPDATE_STUDENT', draft => {
      const student = draft.students.find(item => item.id === id);
      if (!student) throw new Error('الطالب المطلوب غير موجود.');
      const name = Validators.requireText(dto.name, 'اسم الطالب', 3, 80);
      const guardianName = Validators.requireText(dto.guardianName, 'اسم ولي الأمر', 3, 80);
      const phone = Validators.validatePhone(dto.guardianPhone);
      const birthDate = Validators.validateDateString(dto.birthDate, 'تاريخ الميلاد');
      const guardian = draft.users.find(user => user.id === student.guardianId && user.role === 'guardian');
      if (!guardian) throw new Error('بيانات ولي الأمر المرتبطة بالطالب غير موجودة.');
      if (draft.users.some(user => user.id !== guardian.id && user.role === 'guardian' && user.phone === phone)) {
        throw new Error('رقم الهاتف مسجل بالفعل لولي أمر آخر.');
      }
      student.name = name;
      student.birthDate = birthDate;
      student.level = dto.level?.trim() || '';
      student.healthNotes = dto.healthNotes?.trim() || '';
      student.publishConsent = dto.publishConsent === true;
      guardian.name = guardianName;
      guardian.phone = phone;
      guardian.email = dto.guardianEmail?.trim() || `${phone}@marsam.art`;
      return student;
    }, onStateCommit);
  }

  public deleteStudent(id: string, onStateCommit?: (state: DatabaseState) => void): void {
    this.db.executeTransaction('DELETE_STUDENT', draft => {
      const student = draft.students.find(item => item.id === id);
      if (!student) throw new Error('الطالب المطلوب غير موجود.');
      const enrollmentIds = new Set(draft.enrollments.filter(item => item.studentId === id).map(item => item.id));
      if (draft.payments.some(item => enrollmentIds.has(item.enrollmentId))) {
        throw new Error('لا يمكن حذف طالب له إيصالات مالية محفوظة. صحّح الإيصالات بإجراء عكسي، واترك سجل الطالب للمراجعة المالية.');
      }
      for (const enrollment of draft.enrollments.filter(item => item.studentId === id)) {
        const group = draft.groups.find(item => item.id === enrollment.groupId);
        if (group) group.enrolled = Math.max(0, (group.enrolled || 0) - 1);
      }
      draft.enrollments = draft.enrollments.filter(item => item.studentId !== id);
      draft.installments = draft.installments.filter(item => !enrollmentIds.has(item.enrollmentId));
      draft.attendance = draft.attendance.filter(item => item.studentId !== id);
      draft.progress = draft.progress.filter(item => item.studentId !== id);
      draft.students = draft.students.filter(item => item.id !== id);
      if (draft.customDiplomas) delete draft.customDiplomas[id];
    }, onStateCommit);
  }
}
