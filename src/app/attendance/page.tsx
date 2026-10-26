'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useMarsam } from '@/lib/store';
import type { BarcodeScanResult } from '@/lib/services/attendance.service';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Pagination } from '@/components/common/Pagination';
import {
  QrCode, XCircle, UserCheck, AlertTriangle, Barcode, BookOpen, Trash2
} from 'lucide-react';

export default function AttendancePage() {
  const {
    students, courses, groups, sessions, attendance,
    enrollments, recordStudentAttendance, deleteAttendance, processBarcodeScan
  } = useMarsam();

  const [mode, setMode] = useState<'scan' | 'list'>('scan');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ses1');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedLessonTopic, setSelectedLessonTopic] = useState('');
  const [scanResult, setScanResult] = useState<BarcodeScanResult | null>(null);
  const [attendancePage, setAttendancePage] = useState(1);
  const ATTENDANCE_PER_PAGE = 15;
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { execute: executeScan } = useAsyncAction({ cooldownMs: 400 });
  const { isSubmitting: isMarking, execute: executeManualMark } = useAsyncAction({ cooldownMs: 300 });

  const session = sessions.find(s => s.id === selectedSessionId) || sessions[0];
  const group = session ? groups.find(g => g.id === session.groupId) : null;
  const course = group ? courses.find(c => c.id === group.courseId) : null;

  const activeLessonTopic = course?.syllabus?.includes(selectedLessonTopic)
    ? selectedLessonTopic
    : course?.syllabus?.[0] || '';

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

        if (result.success && result.student && activeLessonTopic) {
          recordStudentAttendance({
            studentId: result.student.id,
            sessionId: session.id,
            status: 'present',
            lessonTopic: activeLessonTopic
          });
        }

        setTimeout(() => {
          setScanResult(prev => (prev?.student?.id === result.student?.id ? null : prev));
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
      if (result.success && result.student && activeLessonTopic) {
        recordStudentAttendance({
          studentId: result.student.id,
          sessionId: session.id,
          status: 'present',
          lessonTopic: activeLessonTopic
        });
      }

      // Auto clear result after 6s
      setTimeout(() => {
        setScanResult(prev => (prev?.student?.id === result.student?.id ? null : prev));
      }, 6000);
    });
  };

  const handleManualMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    executeManualMark(() => {
      recordStudentAttendance({
        studentId,
        sessionId: session.id,
        status,
        lessonTopic: status === 'present' ? activeLessonTopic : undefined
      });
    });
  };

  const handleDeleteAttendance = (attendanceId: string) => {
    if (!window.confirm('حذف سجل الحضور لهذا الطالب من الحصة؟')) return;
    try { deleteAttendance(attendanceId); }
    catch (error) { alert(error instanceof Error ? error.message : 'تعذر حذف سجل الحضور.'); }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <QrCode size={26} className="text-[#2DD4BF]" />
            تسجيل الحضور بالباركود والتقدم
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            دعم كامل لسكانر الباركود USB (HID) مع التنبيه التلقائي للمتأخرات المالية
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={`btn ${mode === 'scan' ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/25' : 'bg-[#1B2537] border border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC]'} flex items-center gap-1.5`}
            onClick={() => setMode('scan')}
          >
            <Barcode size={16} /> مسح الباركود (سكانر)
          </button>
          <button
            className={`btn ${mode === 'list' ? 'bg-[#0D9488] text-white shadow-md shadow-[#0D9488]/25' : 'bg-[#1B2537] border border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC]'} flex items-center gap-1.5`}
            onClick={() => setMode('list')}
          >
            <UserCheck size={16} /> القائمة اليدوية
          </button>
        </div>
      </div>

      {/* Session & Lesson Topic Selector */}
      <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#94A3B8] mb-2">اختر الحصة والمجموعة الحالية:</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {sessions.map(sess => {
              const grp = groups.find(g => g.id === sess.groupId);
              const crs = courses.find(c => c.id === grp?.courseId);
              const isSelected = selectedSessionId === sess.id;
              return (
                <button
                  key={sess.id}
                  onClick={() => setSelectedSessionId(sess.id)}
                  className={`p-3 rounded-xl text-right transition-all border ${isSelected ? 'border-2 border-[#2DD4BF] bg-[#1B2537] shadow-lg shadow-[#2DD4BF]/15 ring-1 ring-[#2DD4BF]/30' : 'border border-[#2A3B56] bg-[#111827] hover:border-[#0D9488]/50'}`}
                >
                  <p className="font-bold text-sm text-[#F8FAFC]">{crs?.name}</p>
                  <p className="text-xs text-[#94A3B8]">{sess.date} — {sess.time}</p>
                  <span className={`badge text-[10px] mt-2 ${sess.status === 'completed' ? 'bg-[#115E59] text-[#2DD4BF] border border-[#0D9488]/40' : 'bg-[#D97706] text-white font-bold'}`}>
                    {sess.status === 'completed' ? 'حصة سابقة' : 'حصة اليوم'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lesson Topic Selector */}
        {course?.syllabus && course.syllabus.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-[#2A3B56] flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2DD4BF] shrink-0">
              <BookOpen size={16} />
              موضوع درس اليوم المعتمد:
            </div>
            <select
              className="text-xs flex-1 max-w-md bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] rounded-xl py-2 px-3 focus:outline-none focus:border-[#0D9488]"
              value={activeLessonTopic}
              onChange={e => setSelectedLessonTopic(e.target.value)}
            >
              {course.syllabus?.map((topic: string, i: number) => (
                <option key={i} value={topic}>
                  الدرس {i + 1}: {topic}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[#94A3B8]">
              (سيتم توثيق هذا الدرس تلقائياً في ملف تقدم كل طالب يسجل حضوره اليوم)
            </span>
          </div>
        )}
      </div>

      {/* ================= SCANNER MODE ================= */}
      {mode === 'scan' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner Input & Camera placeholder */}
          <div className="p-6 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm space-y-5 text-center">
            {/* Barcode Scanner Box */}
            <div className="p-6 rounded-2xl bg-[#111827] border-2 border-dashed border-[#2A3B56] space-y-3">
              <Barcode size={50} className="mx-auto text-[#2DD4BF] animate-pulse" />
              <h3 className="font-bold text-base text-[#F8FAFC]">امسح كارت الطالب بجهاز السكانر USB</h3>
              <p className="text-xs text-slate-500">
                وجّه السكانر نحو باركود الكارت وسيتم تسجيل الحضور واحتساب تقدم الدرس فوراً
              </p>

              <form onSubmit={handleBarcodeScan} className="pt-2">
                <input
                  ref={barcodeInputRef}
                  className="w-full text-center text-base font-mono tracking-widest border border-[#2A3B56] bg-[#0E1629] text-[#D97706] placeholder-[#D97706]/75 font-bold py-3 rounded-xl focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
                  placeholder="جاهز للمسح... (STU-2026-XXXX)"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </form>
            </div>

            {/* Simulation test buttons */}
            <div className="pt-2 border-t border-white/5 text-right">
              <p className="text-xs text-[#94A3B8] mb-2">أو اضغط للتجربة السريعة بدون سكانر:</p>
              <div className="flex flex-wrap gap-2">
                {enrolledStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setBarcodeInput(student.qrToken);
                      const result = processBarcodeScan(student.qrToken, session.id);
                      setScanResult(result);
                      if (result.success && activeLessonTopic) {
                        recordStudentAttendance({
                          studentId: student.id,
                          sessionId: session.id,
                          status: 'present',
                          lessonTopic: activeLessonTopic
                        });
                      }
                    }}
                    className="bg-[#1B2537] border border-[#2A3B56] hover:bg-[#111827] hover:border-[#2DD4BF] text-[#2DD4BF] hover:text-[#F8FAFC] px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <QrCode size={12} /> {student.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scanner Result Card */}
          <div className="rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-6 flex flex-col justify-center items-center shadow-sm min-h-[380px]">
            {scanResult ? (
              <div className="space-y-4 text-center">
                {scanResult.success ? (
                  <>
                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black shadow-lg ${scanResult.isOverdue ? 'bg-[#450A0A] border-2 border-[#7F1D1D] text-[#EF4444]' : 'bg-[#115E59] border-2 border-[#0D9488] text-[#2DD4BF]'}`}>
                      {scanResult.student?.name.charAt(0)}
                    </div>

                    <div>
                      <span className="badge text-xs font-bold py-1.5 px-3 bg-[#115E59] text-[#2DD4BF] border border-[#0D9488]/40">
                        ✅ تم تسجيل الحضور بنجاح
                      </span>
                      <h3 className="text-xl font-black text-[#F8FAFC] mt-2">{scanResult.student?.name}</h3>
                      <p className="text-xs text-[#2DD4BF] font-mono mt-0.5">{scanResult.student?.qrToken}</p>
                      {activeLessonTopic && (
                        <p className="text-xs text-teal-400 mt-1">
                          الدرس المنجز: <strong>{activeLessonTopic}</strong>
                        </p>
                      )}
                    </div>

                    {/* OVERDUE FINANCIAL ALERT (Crucial Feature) */}
                    {typeof scanResult.remainingBalance === 'number' && scanResult.remainingBalance > 0 ? (
                      <div className="p-3.5 rounded-xl bg-[#450A0A] border border-[#7F1D1D] text-right space-y-1">
                        <div className="flex items-center gap-2 text-[#EF4444] font-bold text-xs">
                          <AlertTriangle size={15} />
                          تنبيه مالي: الطالب عليه متبقي من رسوم الكورس!
                        </div>
                        <p className="text-xs text-[#FCA5A5]">
                          المبلغ المتبقي المستحق: <strong className="text-[#F59E0B] font-mono text-sm">{scanResult.remainingBalance} جنيه</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-[#115E59] border border-[#0D9488]/40 text-xs text-[#2DD4BF] font-bold">
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
                <QrCode size={48} className="mx-auto text-teal-400" />
                <p className="text-sm font-semibold text-[#F8FAFC]">في انتظار مسح كارت الطالب...</p>
                <p className="text-xs text-[#94A3B8]">ستظهر بيانات الطالب وحالته المالية فور المسح</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MANUAL LIST MODE ================= */}
      {mode === 'list' && (
        <div className="rounded-2xl overflow-hidden border border-[#2A3B56] bg-[#1B2537]">
          <div className="p-4 bg-[#111827] border-b border-[#2A3B56] flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#F8FAFC]">
              قائمة طلاب المجموعة ({enrolledStudents.length} طالب)
            </h3>
            <span className="text-xs text-slate-500">
              الحاضرين: {sessionAttendance.filter(a => a.status === 'present').length} من {enrolledStudents.length}
            </span>
          </div>

          <table className="w-full text-right text-sm">
            <thead className="bg-[#111827] text-[#94A3B8] text-xs border-b border-[#2A3B56]">
              <tr>
                <th className="p-3">الطالب</th>
                <th className="p-3">الكود</th>
                <th className="p-3">الحالة المالية</th>
                <th className="p-3">وقت الحضور</th>
                <th className="p-3 text-center">تسجيل الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3B56]">
              {paginatedEnrolled.map(student => {
                const att = sessionAttendance.find(a => a.studentId === student.id);
                const enr = enrollments.find(e => e.studentId === student.id);
                const remaining = enr ? Math.max(0, enr.totalAmount - enr.totalPaid) : 0;

                return (
                  <tr key={student.id} className="hover:bg-teal-500/10/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">{student.name}</td>
                    <td className="p-3 font-mono text-xs text-teal-300 font-bold">{student.qrToken}</td>
                    <td className="p-3">
                      {remaining > 0 ? (
                        <span className="badge text-xs bg-[#450A0A] border border-[#7F1D1D] text-[#F59E0B] font-bold">عليه {remaining} ج</span>
                      ) : (
                        <span className="badge badge-teal text-xs">خالص الرسوم</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500 font-mono">{att?.checkIn || '—'}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex gap-1.5">
                        <button
                          disabled={isMarking}
                          onClick={() => handleManualMark(student.id, 'present')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            att?.status === 'present' ? 'bg-[#0D9488] text-white shadow-sm' : 'bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:bg-[#1B2537]'
                          }`}
                        >
                          حاضر
                        </button>
                        <button
                          disabled={isMarking}
                          onClick={() => handleManualMark(student.id, 'late')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            att?.status === 'late' ? 'bg-amber-400 text-[#111827] shadow-sm' : 'bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:bg-[#1B2537]'
                          }`}
                        >
                          متأخر
                        </button>
                        <button
                          disabled={isMarking}
                          onClick={() => handleManualMark(student.id, 'absent')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            att?.status === 'absent' ? 'bg-red-600 text-white shadow-sm' : 'bg-[#111827] border border-[#2A3B56] text-[#94A3B8] hover:bg-[#1B2537]'
                          }`}
                        >
                          غائب
                        </button>
                        {att && <button type="button" onClick={() => handleDeleteAttendance(att.id)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#111827] text-red-300 border border-red-900/60 hover:bg-red-950/40" title="حذف سجل الحضور" aria-label="حذف سجل الحضور"><Trash2 size={12} /></button>}
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
