'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useMarsam } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Pagination } from '@/components/common/Pagination';
import {
  QrCode, Search, CheckCircle, XCircle, Clock, Camera,
  UserCheck, AlertTriangle, Barcode, BookOpen, Volume2, Sparkles
} from 'lucide-react';

export default function AttendancePage() {
  const {
    students, courses, groups, sessions, attendance,
    enrollments, recordStudentAttendance, processBarcodeScan
  } = useMarsam();

  const [mode, setMode] = useState<'scan' | 'list'>('scan');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ses1');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedLessonTopic, setSelectedLessonTopic] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [attendancePage, setAttendancePage] = useState(1);
  const ATTENDANCE_PER_PAGE = 15;
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { isSubmitting: isScanning, execute: executeScan } = useAsyncAction({ cooldownMs: 400 });
  const { isSubmitting: isMarking, execute: executeManualMark } = useAsyncAction({ cooldownMs: 300 });

  const session = sessions.find(s => s.id === selectedSessionId) || sessions[0];
  const group = session ? groups.find(g => g.id === session.groupId) : null;
  const course = group ? courses.find(c => c.id === group.courseId) : null;

  // Set default lesson topic from syllabus
  useEffect(() => {
    if (course?.syllabus && course.syllabus.length > 0 && !selectedLessonTopic) {
      setSelectedLessonTopic(course.syllabus[0]);
    }
  }, [course, selectedLessonTopic]);

  // Keep barcode input focused for physical USB scanner
  useEffect(() => {
    if (mode === 'scan') {
      barcodeInputRef.current?.focus();
    }
  }, [mode, selectedSessionId]);

  const enrolledStudentIds = useMemo(() => {
    return enrollments
      .filter(e => e.groupId === group?.id)
      .map(e => e.studentId);
  }, [enrollments, group]);

  const enrolledStudents = useMemo(() => {
    return students.filter(s => enrolledStudentIds.includes(s.id));
  }, [students, enrolledStudentIds]);

  const paginatedEnrolled = useMemo(() => {
    const start = (attendancePage - 1) * ATTENDANCE_PER_PAGE;
    return enrolledStudents.slice(start, start + ATTENDANCE_PER_PAGE);
  }, [enrolledStudents, attendancePage]);

  const sessionAttendance = attendance.filter(a => a.sessionId === session?.id);

  // Global Hardware Barcode Scanner Listener
  useBarcodeScanner({
    onScan: (scanned) => {
      executeScan(() => {
        const result = processBarcodeScan(scanned, session.id);
        setScanResult(result);
        setBarcodeInput('');

        if (result.success && result.student && selectedLessonTopic) {
          recordStudentAttendance({
            studentId: result.student.id,
            sessionId: session.id,
            status: 'present',
            lessonTopic: selectedLessonTopic
          });
        }

        setTimeout(() => {
          setScanResult((prev: any) => (prev?.student?.id === result.student?.id ? null : prev));
        }, 6000);
      });
    },
    enabled: mode === 'scan'
  });

  // USB Barcode Scanner handles 'Enter' key press or manual input
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    executeScan(() => {
      const result = processBarcodeScan(barcodeInput.trim(), session.id);
      setScanResult(result);
      setBarcodeInput('');

      // If lesson topic is active and student is present, record progress topic too
      if (result.success && result.student && selectedLessonTopic) {
        recordStudentAttendance({
          studentId: result.student.id,
          sessionId: session.id,
          status: 'present',
          lessonTopic: selectedLessonTopic
        });
      }

      // Auto clear result after 6s
      setTimeout(() => {
        setScanResult((prev: any) => (prev?.student?.id === result.student?.id ? null : prev));
      }, 6000);
    });
  };

  const handleManualMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    executeManualMark(() => {
      recordStudentAttendance({
        studentId,
        sessionId: session.id,
        status,
        lessonTopic: status === 'present' ? selectedLessonTopic : undefined
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <QrCode size={26} className="text-blue-600" />
            تسجيل الحضور بالباركود والتقدم
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            دعم كامل لسكانر الباركود USB (HID) مع التنبيه التلقائي للمتأخرات المالية
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`btn ${mode === 'scan' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
            onClick={() => setMode('scan')}
          >
            <Barcode size={16} /> مسح الباركود (سكانر)
          </button>
          <button
            className={`btn ${mode === 'list' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
            onClick={() => setMode('list')}
          >
            <UserCheck size={16} /> القائمة اليدوية
          </button>
        </div>
      </div>

      {/* Session & Lesson Topic Selector */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">اختر الحصة والمجموعة الحالية:</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {sessions.map(sess => {
              const grp = groups.find(g => g.id === sess.groupId);
              const crs = courses.find(c => c.id === grp?.courseId);
              const isSelected = selectedSessionId === sess.id;
              return (
                <button
                  key={sess.id}
                  onClick={() => setSelectedSessionId(sess.id)}
                  className={`p-3 rounded-xl text-right transition-all border ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{crs?.name}</p>
                  <p className="text-xs text-slate-500">{sess.date} — {sess.time}</p>
                  <span className={`badge text-[10px] mt-2 ${sess.status === 'completed' ? 'badge-blue' : 'badge-warning'}`}>
                    {sess.status === 'completed' ? 'حصة سابقة' : 'حصة اليوم'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lesson Topic Selector */}
        {course?.syllabus && course.syllabus.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 shrink-0">
              <BookOpen size={16} />
              موضوع درس اليوم المعتمد:
            </div>
            <select
              className="input text-xs flex-1 max-w-md bg-white dark:bg-slate-900 border-blue-300"
              value={selectedLessonTopic}
              onChange={e => setSelectedLessonTopic(e.target.value)}
            >
              {course.syllabus?.map((topic: string, i: number) => (
                <option key={i} value={topic}>
                  الدرس {i + 1}: {topic}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500">
              (سيتم توثيق هذا الدرس تلقائياً في ملف تقدم كل طالب يسجل حضوره اليوم)
            </span>
          </div>
        )}
      </div>

      {/* ================= SCANNER MODE ================= */}
      {mode === 'scan' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner Input & Camera placeholder */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] shadow-sm space-y-5 text-center">
            {/* Barcode Scanner Box */}
            <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border-2 border-dashed border-blue-300 dark:border-blue-700 space-y-3">
              <Barcode size={50} className="mx-auto text-blue-600 animate-pulse" />
              <h3 className="font-bold text-slate-900 dark:text-white">امسح كارت الطالب بجهاز السكانر USB</h3>
              <p className="text-xs text-slate-500">
                وجّه السكانر نحو باركود الكارت وسيتم تسجيل الحضور واحتساب تقدم الدرس فوراً
              </p>

              <form onSubmit={handleBarcodeScan} className="pt-2">
                <input
                  ref={barcodeInputRef}
                  className="input text-center text-base font-mono tracking-widest border-blue-400 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-bold"
                  placeholder="جاهز للمسح... (STU-2026-XXXX)"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </form>
            </div>

            {/* Simulation test buttons */}
            <div className="pt-2 border-t border-white/5 text-right">
              <p className="text-xs text-slate-400 mb-2">أو اضغط للتجربة السريعة بدون سكانر:</p>
              <div className="flex flex-wrap gap-2">
                {enrolledStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setBarcodeInput(student.qrToken);
                      const result = processBarcodeScan(student.qrToken, session.id);
                      setScanResult(result);
                      if (result.success && selectedLessonTopic) {
                        recordStudentAttendance({
                          studentId: student.id,
                          sessionId: session.id,
                          status: 'present',
                          lessonTopic: selectedLessonTopic
                        });
                      }
                    }}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                  >
                    <QrCode size={12} /> {student.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scanner Result Card */}
          <div className="glass p-6 rounded-2xl flex flex-col justify-center bg-white border border-slate-200">
            {scanResult ? (
              <div className="space-y-4 text-center">
                {scanResult.success ? (
                  <>
                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black shadow-lg ${
                      scanResult.isOverdue ? 'bg-red-50 border-2 border-red-500 text-red-600' : 'bg-blue-50 border-2 border-blue-600 text-blue-700'
                    }`}>
                      {scanResult.student?.name.charAt(0)}
                    </div>

                    <div>
                      <span className="badge badge-blue text-xs font-bold py-1 px-3">
                        ✅ تم تسجيل الحضور بنجاح
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-2">{scanResult.student?.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{scanResult.student?.qrToken}</p>
                      {selectedLessonTopic && (
                        <p className="text-xs text-blue-600 mt-1">
                          الدرس المنجز: <strong>{selectedLessonTopic}</strong>
                        </p>
                      )}
                    </div>

                    {/* OVERDUE FINANCIAL ALERT (Crucial Feature) */}
                    {scanResult.remainingBalance > 0 ? (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-right space-y-1">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                          <AlertTriangle size={15} />
                          تنبيه مالي: الطالب عليه متبقي من رسوم الكورس!
                        </div>
                        <p className="text-xs text-slate-700">
                          المبلغ المتبقي المستحق: <strong className="text-red-600 font-mono text-sm">{scanResult.remainingBalance} جنيه</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold">
                        حالة الرسوم: مسددة بالكامل ✅
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <XCircle size={48} className="mx-auto text-red-500" />
                    <p className="font-bold text-red-600">{scanResult.message}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <QrCode size={48} className="mx-auto text-blue-600" />
                <p className="text-sm font-semibold text-slate-800">في انتظار مسح كارت الطالب...</p>
                <p className="text-xs text-slate-400">ستظهر بيانات الطالب وحالته المالية فور المسح</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MANUAL LIST MODE ================= */}
      {mode === 'list' && (
        <div className="glass rounded-2xl overflow-hidden border border-slate-200 bg-white">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              قائمة طلاب المجموعة ({enrolledStudents.length} طالب)
            </h3>
            <span className="text-xs text-slate-500">
              الحاضرين: {sessionAttendance.filter(a => a.status === 'present').length} من {enrolledStudents.length}
            </span>
          </div>

          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
              <tr>
                <th className="p-3">الطالب</th>
                <th className="p-3">الكود</th>
                <th className="p-3">الحالة المالية</th>
                <th className="p-3">وقت الحضور</th>
                <th className="p-3 text-center">تسجيل الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEnrolled.map(student => {
                const att = sessionAttendance.find(a => a.studentId === student.id);
                const enr = enrollments.find(e => e.studentId === student.id);
                const remaining = enr ? Math.max(0, enr.totalAmount - enr.totalPaid) : 0;

                return (
                  <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">{student.name}</td>
                    <td className="p-3 font-mono text-xs text-blue-700 font-bold">{student.qrToken}</td>
                    <td className="p-3">
                      {remaining > 0 ? (
                        <span className="badge badge-danger text-xs">عليه {remaining} ج</span>
                      ) : (
                        <span className="badge badge-blue text-xs">خالص الرسوم</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500 font-mono">{att?.checkIn || '—'}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex gap-1.5">
                        <button
                          disabled={isMarking}
                          onClick={() => handleManualMark(student.id, 'present')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            att?.status === 'present' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          حاضر
                        </button>
                        <button
                          disabled={isMarking}
                          onClick={() => handleManualMark(student.id, 'late')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            att?.status === 'late' ? 'bg-blue-400 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          متأخر
                        </button>
                        <button
                          disabled={isMarking}
                          onClick={() => handleManualMark(student.id, 'absent')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            att?.status === 'absent' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          غائب
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={attendancePage}
            totalItems={enrolledStudents.length}
            pageSize={ATTENDANCE_PER_PAGE}
            onPageChange={setAttendancePage}
            className="p-3 border-t border-slate-100"
          />
        </div>
      )}
    </div>
  );
}
