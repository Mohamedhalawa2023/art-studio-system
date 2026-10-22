/**
 * Attendance & Barcode Verification Domain Service
 * Utilizes in-memory O(1) indexes for instantaneous QR barcode scans and automated overdue detection.
 */

import type { Student, Attendance, Enrollment } from '@/lib/mockData';
import type { DatabaseEngine, DatabaseState } from '@/lib/db/transactionManager';
import { logger } from '@/lib/logger/logger';
import { formatLocalDate } from '@/lib/dates';

export interface BarcodeScanResult {
  success: boolean;
  student?: Student;
  attendance?: Attendance;
  enrollment?: Enrollment;
  isOverdue?: boolean;
  remainingBalance?: number;
  message: string;
}

export class AttendanceService {
  constructor(private db: DatabaseEngine) {}

  /**
   * Processes a real-time barcode / QR code scan at the door:
   * 1. Resolves student in O(1) using the in-memory barcode index.
   * 2. Checks active enrollment and identifies any overdue tuition.
   * 3. Records attendance timestamp.
   */
  public processBarcodeScan(
    barcode: string,
    sessionId: string,
    onStateCommit?: (state: DatabaseState) => void,
    recordedBy = 'u1'
  ): BarcodeScanResult {
    const cleanBarcode = barcode?.trim().toLowerCase();
    if (!cleanBarcode) {
      return { success: false, message: 'كود الباركود فارغ' };
    }

    const indexes = this.db.getIndexes();
    // 1. Fast O(1) Index Lookup
    const student = indexes.studentsByQr.get(cleanBarcode);

    if (!student) {
      logger.warn('AttendanceService', `Unknown barcode scanned: "${cleanBarcode}"`);
      return {
        success: false,
        message: 'كود الباركود غير مسجل في سجلات المرسم!'
      };
    }

    const state = this.db.getState();
    const session = state.sessions.find(item => item.id === sessionId);
    if (!session) return { success: false, message: 'الحصة المحددة غير موجودة.' };
    if (session.status === 'cancelled' || session.status === 'completed') {
      return { success: false, message: 'لا يمكن تسجيل الحضور في حصة ملغاة أو منتهية.' };
    }

    // A student can attend only a session in a group they are enrolled in.
    const activeEnrollment = (indexes.enrollmentsByStudentId.get(student.id) || [])
      .find(enrollment => enrollment.groupId === session.groupId);
    if (!activeEnrollment) {
      return { success: false, student, message: 'الطالب غير مسجل في مجموعة هذه الحصة.' };
    }

    const remaining = activeEnrollment
      ? Math.max(0, activeEnrollment.totalAmount - activeEnrollment.totalPaid)
      : 0;

    const today = formatLocalDate(new Date());
    const hasOverdueInstallment = state.installments.some(installment =>
      installment.enrollmentId === activeEnrollment.id &&
      (installment.status === 'overdue' || (installment.status === 'pending' && installment.dueDate < today))
    );
    const isOverdue = activeEnrollment.paymentStatus === 'overdue' || hasOverdueInstallment;

    // 3. Atomically record Attendance
    let createdAttendance: Attendance | undefined;

    this.db.executeTransaction(
      'RECORD_BARCODE_ATTENDANCE',
      (draft) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

        // Check if attendance already logged for this session
        const existing = draft.attendance.find(
          a => a.studentId === student.id && a.sessionId === sessionId
        );

        if (existing) {
          existing.status = 'present';
          existing.checkIn = existing.checkIn || timeStr;
          createdAttendance = existing;
        } else {
          createdAttendance = {
            id: `att-${Date.now()}`,
            studentId: student.id,
            sessionId,
            checkIn: timeStr,
            recordedBy,
            status: 'present'
          };
          draft.attendance.push(createdAttendance);
        }
      },
      onStateCommit
    );

    logger.info('AttendanceService', `Attendance recorded for ${student.name} (${student.qrToken})`);

    const overdueMessage = isOverdue
      ? ` ⚠️ تنبيه: متبقي رسوم مستحقة (${remaining} ج)!`
      : ' ✅ الحساب مسدد بالكامل.';

    return {
      success: true,
      student,
      attendance: createdAttendance,
      enrollment: activeEnrollment,
      isOverdue,
      remainingBalance: remaining,
      message: `تم تسجيل حضور ${student.name} بنجاح الساعة ${createdAttendance?.checkIn}.${overdueMessage}`
    };
  }
}
