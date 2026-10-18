'use client';
import { useState, useRef, useEffect } from 'react';
import { useMarsam } from '@/lib/store';
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
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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

  const enrolledStudentIds = enrollments
    .filter(e => e.groupId === group?.id)
    .map(e => e.studentId);

  const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));
  const sessionAttendance = attendance.filter(a => a.sessionId === session?.id);

  // USB Barcode Scanner handles 'Enter' key press
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

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
  };

  const handleManualMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    recordStudentAttendance({
      studentId,
      sessionId: session.id,
      status,
      lessonTopic: status === 'present' ? selectedLessonTopic : undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <QrCode size={26} className="text-amber-400" />
            تسجيل الحضور بالباركود والتقدم
          </h1>
          <p className="text-slate-400 text-sm mt-1">
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
      <div className="glass p-5 rounded-2xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">اختر الحصة والمجموعة الحالية:</label>
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
                    isSelected ? 'bg-violet-600/20 border-violet-500 shadow-md' : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <p className="font-bold text-sm text-slate-100">{crs?.name}</p>
                  <p className="text-xs text-slate-400">{sess.date} — {sess.time}</p>
                  <span className={`badge text-[10px] mt-2 ${sess.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {sess.status === 'completed' ? 'حصة سابقة' : 'حصة اليوم'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lesson Topic Selector */}
        {course?.syllabus && course.syllabus.length > 0 && (
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 shrink-0">
              <BookOpen size={16} />
              موضوع درس اليوم المعتمد:
            </div>
            <select
              className="input text-xs flex-1 max-w-md bg-slate-900 border-amber-500/30"
              value={selectedLessonTopic}
              onChange={e => setSelectedLessonTopic(e.target.value)}
            >
              {course.syllabus?.map((topic: string, i: number) => (
                <option key={i} value={topic}>
                  الدرس {i + 1}: {topic}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400">
              (سيتم توثيق هذا الدرس تلقائياً في ملف تقدم كل طالب يسجل حضوره اليوم)
            </span>
          </div>
        )}
      </div>

      {/* ================= SCANNER MODE ================= */}
      {mode === 'scan' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner Input & Camera placeholder */}
          <div className="glass p-6 rounded-2xl space-y-5 text-center">
            {/* Barcode Scanner Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-violet-950/30 to-slate-900/40 border-2 border-dashed border-violet-500/40 space-y-3">
              <Barcode size={50} className="mx-auto text-amber-400 animate-pulse" />
              <h3 className="font-bold text-slate-100">امسح كارت الطالب بجهاز السكانر USB</h3>
              <p className="text-xs text-slate-400">
                وجّه السكانر نحو باركود الكارت وسيتم تسجيل الحضور واحتساب تقدم الدرس فوراً
              </p>

              <form onSubmit={handleBarcodeScan} className="pt-2">
                <input
                  ref={barcodeInputRef}
                  className="input text-center text-base font-mono tracking-widest border-violet-400 bg-slate-900/90 text-amber-300"
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
          <div className="glass p-6 rounded-2xl flex flex-col justify-center">
            {scanResult ? (
              <div className="space-y-4 text-center">
                {scanResult.success ? (
                  <>
                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black shadow-xl ${
                      scanResult.isOverdue ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-400' : 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                    }`}>
                      {scanResult.student?.name.charAt(0)}
                    </div>

                    <div>
                      <span className="badge badge-success text-xs font-bold py-1 px-3">
                        ✅ تم تسجيل الحضور بنجاح
                      </span>
                      <h3 className="text-xl font-black text-slate-100 mt-2">{scanResult.student?.name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{scanResult.student?.qrToken}</p>
                      {selectedLessonTopic && (
                        <p className="text-xs text-violet-400 mt-1">
                          الدرس المنجز: <strong>{selectedLessonTopic}</strong>
                        </p>
                      )}
                    </div>

                    {/* OVERDUE FINANCIAL ALERT (Crucial Feature) */}
                    {scanResult.remainingBalance > 0 ? (
                      <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-right space-y-1">
                        <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                          <AlertTriangle size={15} />
                          تنبيه مالي: الطالب عليه متبقي من رسوم الكورس!
                        </div>
                        <p className="text-xs text-slate-300">
                          المبلغ المتبقي المستحق: <strong className="text-red-400 font-mono text-sm">{scanResult.remainingBalance} جنيه</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold">
                        حالة الرسوم: مسددة بالكامل ✅
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <XCircle size={48} className="mx-auto text-red-400" />
                    <p className="font-bold text-red-300">{scanResult.message}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <QrCode size={48} className="mx-auto text-slate-600" />
                <p className="text-sm font-semibold">في انتظار مسح كارت الطالب...</p>
                <p className="text-xs text-slate-500">ستظهر بيانات الطالب وحالته المالية فور المسح</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MANUAL LIST MODE ================= */}
      {mode === 'list' && (
        <div className="glass rounded-2xl overflow-hidden border border-white/10">
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200">
              قائمة طلاب المجموعة ({enrolledStudents.length} طالب)
            </h3>
            <span className="text-xs text-slate-400">
              الحاضرين: {sessionAttendance.filter(a => a.status === 'present').length} من {enrolledStudents.length}
            </span>
          </div>

          <table className="w-full text-right text-sm">
            <thead className="bg-white/5 text-slate-400 text-xs border-b border-white/10">
              <tr>
                <th className="p-3">الطالب</th>
                <th className="p-3">الكود</th>
                <th className="p-3">الحالة المالية</th>
                <th className="p-3">وقت الحضور</th>
                <th className="p-3 text-center">تسجيل الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {enrolledStudents.map(student => {
                const att = sessionAttendance.find(a => a.studentId === student.id);
                const enr = enrollments.find(e => e.studentId === student.id);
                const remaining = enr ? Math.max(0, enr.totalAmount - enr.totalPaid) : 0;

                return (
                  <tr key={student.id} className="hover:bg-white/5">
                    <td className="p-3 font-semibold text-slate-200">{student.name}</td>
                    <td className="p-3 font-mono text-xs text-amber-400">{student.qrToken}</td>
                    <td className="p-3">
                      {remaining > 0 ? (
                        <span className="badge badge-danger text-xs">عليه {remaining} ج</span>
                      ) : (
                        <span className="badge badge-success text-xs">خالص الرسوم</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-400 font-mono">{att?.checkIn || '—'}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => handleManualMark(student.id, 'present')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            att?.status === 'present' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          حاضر
                        </button>
                        <button
                          onClick={() => handleManualMark(student.id, 'late')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            att?.status === 'late' ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          متأخر
                        </button>
                        <button
                          onClick={() => handleManualMark(student.id, 'absent')}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            att?.status === 'absent' ? 'bg-red-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
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
        </div>
      )}
    </div>
  );
}
