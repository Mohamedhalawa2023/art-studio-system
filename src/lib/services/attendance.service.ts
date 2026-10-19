/**
 * Attendance & Barcode Verification Domain Service
 * Utilizes in-memory O(1) indexes for instantaneous QR barcode scans and automated overdue detection.
 */

import { Student, Attendance, Enrollment } from '@/lib/mockData';
import { DatabaseEngine } from '@/lib/db/transactionManager';
import { logger } from '@/lib/logger/logger';

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
    onStateCommit?: (state: any) => void
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

    // 2. Fetch student enrollment via index
    const enrollments = indexes.enrollmentsByStudentId.get(student.id) || [];
    const activeEnrollment = enrollments[0];

    const remaining = activeEnrollment
      ? Math.max(0, activeEnrollment.totalAmount - activeEnrollment.totalPaid)
      : 0;

    const isOverdue = activeEnrollment?.paymentStatus === 'overdue' || remaining > 0;

    // 3. Atomically record Attendance
    let createdAttendance: Attendance | undefined;

    this.db.executeTransaction(
      'RECORD_BARCODE_ATTENDANCE',
      (draft) => {
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 5);

        // Check if attendance already logged for this session
        const existing = draft.attendance.find(
          a => a.studentId === student.id && a.sessionId === sessionId
        );

        if (existing) {
          existing.status = 'present';
          existing.checkIn = timeStr;
          createdAttendance = existing;
        } else {
          createdAttendance = {
            id: `att-${Date.now()}`,
            studentId: student.id,
            sessionId,
            checkIn: timeStr,
            recordedBy: 'u1',
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
