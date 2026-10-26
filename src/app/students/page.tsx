'use client';
import { useState, useMemo } from 'react';
import { useMarsam } from '@/lib/store';
import type { Payment, Student } from '@/lib/mockData';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Pagination } from '@/components/common/Pagination';
import { PaymentReceiptModal, type CoursePaymentReceipt } from '@/components/finance/PaymentReceiptModal';
import {
  Users, Search, Plus, QrCode,
  FileText, CreditCard, Award, Clock,
  Printer, X, Shield, HeartPulse, Pencil, Trash2
} from 'lucide-react';
import ArtDiplomaModal from '@/components/diploma/ArtDiplomaModal';
import { printContractDocument, printStudentIdCard } from '@/lib/printing';

export default function StudentsPage() {
  const {
    students, users, enrollments, courses, groups, installments, payments,
    progress, settings, addStudentWithEnrollment, addCoursePayment, updateStudent, deleteStudent
  } = useMarsam();

  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const activeStudentId = selectedStudentId ?? students[0]?.id ?? null;
  const [profileTab, setProfileTab] = useState<'info' | 'contract' | 'financials' | 'progress'>('info');
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [studentEditError, setStudentEditError] = useState('');
  const [studentDraft, setStudentDraft] = useState({ name: '', birthDate: '', level: '', guardianName: '', guardianPhone: '', guardianEmail: '', healthNotes: '', publishConsent: false });
  const [studentPage, setStudentPage] = useState(1);
  const STUDENTS_PER_PAGE = 15;

  const { isSubmitting: isAddingStudent, execute: executeAddStudent } = useAsyncAction();
  const { isSubmitting: isRecordingPayment, execute: executeRecordPayment } = useAsyncAction();

  // Luxury Art Diploma Modal State
  const [showDiplomaModal, setShowDiplomaModal] = useState(false);
  const [diplomaStudent, setDiplomaStudent] = useState<Student | null>(null);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: '',
    birthDate: '2016-05-10',
    level: 'المستوى الأول (مبتدئ)',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    groupId: 'g1',
    totalAmount: 1200,
    initialPayment: 600,
    paymentMethod: 'cash' as Payment['method'],
    healthNotes: '',
    publishConsent: false
  });
  const groupCapacity = (group: typeof groups[number]) =>
    Number.isSafeInteger(group.capacity) && group.capacity > 0 ? group.capacity : 10;
  const isGroupAvailable = (group: typeof groups[number]) =>
    group.status !== 'completed' && (group.enrolled || 0) < groupCapacity(group);
  const availableGroups = groups.filter(isGroupAvailable);
  const selectedGroupId = newStudentData.groupId === ''
    ? ''
    : availableGroups.some(group => group.id === newStudentData.groupId)
      ? newStudentData.groupId
      : availableGroups[0]?.id || '';

  // Quick Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState(400);
  const [payMethod, setPayMethod] = useState<'cash' | 'instapay' | 'vodafone' | 'transfer'>('cash');
  const [payNotes, setPayNotes] = useState('');

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<CoursePaymentReceipt | null>(null);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const guardian = users.find(u => u.id === s.guardianId);
      return s.name.includes(search) || guardian?.name.includes(search) || s.qrToken.includes(search);
    });
  }, [students, users, search]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredStudents, studentPage]);

  const selectedStudent = students.find(s => s.id === activeStudentId);
  const selectedGuardian = selectedStudent ? users.find(u => u.id === selectedStudent.guardianId) : null;
  const studentEnrollments = selectedStudent ? enrollments.filter(e => e.studentId === selectedStudent.id) : [];
  const primaryEnrollment = studentEnrollments[0];
  const primaryGroup = primaryEnrollment ? groups.find(g => g.id === primaryEnrollment.groupId) : null;
  const primaryCourse = primaryGroup ? courses.find(c => c.id === primaryGroup.courseId) : null;
  const contractReady = Boolean(
    primaryEnrollment?.enrollDate?.trim()
    && primaryCourse?.name?.trim()
    && selectedGuardian?.name?.trim()
    && selectedGuardian?.phone?.trim()
    && Number.isFinite(primaryEnrollment?.totalAmount)
    && (primaryEnrollment?.totalAmount ?? -1) >= 0
  );
  
  const studentInstallments = primaryEnrollment ? installments.filter(i => i.enrollmentId === primaryEnrollment.id) : [];
  const studentPayments = primaryEnrollment ? payments.filter(p => p.enrollmentId === primaryEnrollment.id) : [];
  const studentProgress = selectedStudent ? progress.filter(p => p.studentId === selectedStudent.id) : [];

  const beginStudentEdit = () => {
    if (!selectedStudent) return;
    setStudentDraft({
      name: selectedStudent.name,
      birthDate: selectedStudent.birthDate,
      level: selectedStudent.level || '',
      guardianName: selectedGuardian?.name || '',
      guardianPhone: selectedGuardian?.phone || '',
      guardianEmail: selectedGuardian?.email || '',
      healthNotes: selectedStudent.healthNotes || '',
      publishConsent: selectedStudent.publishConsent,
    });
    setStudentEditError('');
    setIsEditingStudent(true);
    setProfileTab('info');
  };

  const saveStudentEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent) return;
    try {
      updateStudent(selectedStudent.id, studentDraft);
      setIsEditingStudent(false);
      setStudentEditError('');
    } catch (error) { setStudentEditError(error instanceof Error ? error.message : 'تعذر حفظ بيانات الطالب.'); }
  };

  const removeStudent = () => {
    if (!selectedStudent || !window.confirm(`حذف ملف الطالب «${selectedStudent.name}»؟ سيتم حذف السجلات الدراسية التابعة، مع الاحتفاظ بالملف إذا كانت له إيصالات مالية.`)) return;
    try {
      deleteStudent(selectedStudent.id);
      setSelectedStudentId(null);
      setIsEditingStudent(false);
      setStudentEditError('');
    } catch (error) { setStudentEditError(error instanceof Error ? error.message : 'تعذر حذف الطالب.'); }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name.trim() || !newStudentData.guardianName.trim() || !newStudentData.guardianPhone.trim()) {
      alert('برجاء استكمال اسم الطالب، واسم ولي الأمر، ورقم هاتفه');
      return;
    }
    if (selectedGroupId && !contractAccepted) {
      alert('يرجى قراءة بنود التعاقد وتسجيل موافقة ولي الأمر قبل إنشاء الاشتراك.');
      return;
    }

    executeAddStudent(() => {
      const { student, payment } = addStudentWithEnrollment({
        name: newStudentData.name,
        birthDate: newStudentData.birthDate,
        guardianName: newStudentData.guardianName,
        guardianPhone: newStudentData.guardianPhone,
        guardianEmail: newStudentData.guardianEmail,
        groupId: selectedGroupId,
        contractAccepted,
        totalAmount: Number(newStudentData.totalAmount),
        initialPayment: Number(newStudentData.initialPayment),
        paymentMethod: newStudentData.paymentMethod,
        level: newStudentData.level,
        healthNotes: newStudentData.healthNotes,
        publishConsent: newStudentData.publishConsent
      });

      setShowAddModal(false);
      setContractAccepted(false);
      setNewStudentData(current => ({
        ...current,
        name: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        healthNotes: '',
        publishConsent: false,
      }));
      setSelectedStudentId(student.id);
      setProfileTab('contract');

      if (payment) {
        setReceiptData({
          receiptNumber: payment.receiptNumber,
          date: payment.date,
          studentName: student.name,
          courseName: courses.find(c => c.id === groups.find(g => g.id === selectedGroupId)?.courseId)?.name || 'دورة تدريبية',
          amount: payment.amount,
          remaining: Math.max(0, Number(newStudentData.totalAmount) - Number(newStudentData.initialPayment)),
          method: payment.method
        });
      }
    });
  };

  const handleRecordPayment = () => {
    if (!primaryEnrollment || payAmount <= 0) return;

    executeRecordPayment(() => {
      const payment = addCoursePayment({
        enrollmentId: primaryEnrollment.id,
        amount: payAmount,
        method: payMethod,
        notes: payNotes
      });

      setShowPaymentModal(false);
      setReceiptData({
        receiptNumber: payment.receiptNumber,
        date: payment.date,
        studentName: selectedStudent?.name || 'الطالب',
        courseName: primaryCourse?.name || 'دورة تدريبية',
        amount: payment.amount,
        remaining: Math.max(0, (primaryEnrollment.totalAmount - primaryEnrollment.totalPaid) - payAmount),
        method: payment.method
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <Users size={26} className="text-teal-400" />
            شؤون الطلاب وملفات التعاقد
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            إدارة الطلاب، عقود التدريب الرسمية، ومتابعة الأقساط والتقدم الدراسي
          </p>
        </div>
        <button
          onClick={() => { setContractAccepted(false); setShowAddModal(true); }}
          className="btn btn-primary flex items-center gap-2 shadow-md shadow-[#0D9488]/20"
        >
          <Plus size={18} />
          تسجيل طالب جديد
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          className="input pr-10 text-sm"
          placeholder="بحث بالاسم، هاتف ولي الأمر، أو كود الباركود..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setStudentPage(1);
          }}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ================= STUDENTS LIST (1 COL) ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
              قائمة الطلاب ({filteredStudents.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {paginatedStudents.map(student => {
              const guardian = users.find(u => u.id === student.guardianId);
              const enr = enrollments.find(e => e.studentId === student.id);
              const remaining = enr ? Math.max(0, enr.totalAmount - enr.totalPaid) : 0;
              const isSelected = activeStudentId === student.id;

              return (
                <div
                  key={student.id}
                  onClick={() => { setSelectedStudentId(student.id); setIsEditingStudent(false); setStudentEditError(''); }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${isSelected ? 'border-[#0D9488] bg-[#111827] shadow-md shadow-[#0D9488]/20' : 'border-[#2A3B56] bg-[#1B2537] hover:border-[#0D9488]/60'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#0D9488] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-[#F8FAFC] truncate">{student.name}</p>
                        <span className="text-[11px] font-mono text-[#2DD4BF] font-bold">{student.qrToken}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
                        ولي الأمر: {guardian?.name || 'غير مسجل'} • {guardian?.phone}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="badge text-[10px] bg-[#111827] text-[#2DD4BF] border border-[#2A3B56]">{student.level || 'مبتدئ'}</span>
                          {remaining > 0 ? (
                            <span className="badge text-[10px] bg-[#450A0A] border border-[#7F1D1D] text-[#F59E0B] font-bold">متبقي {remaining} ج</span>
                          ) : (
                            <span className="badge text-[10px] bg-[#115E59] border border-[#0D9488]/40 text-[#2DD4BF] font-bold">سدد بالكامل</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDiplomaStudent(student);
                            setShowDiplomaModal(true);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[#111827] hover:bg-[#1B2537] text-[#2DD4BF] font-bold border border-[#2A3B56] transition-all flex items-center gap-1 cursor-pointer shrink-0"
                          title="استخراج الشهادة الفنية الملكية"
                        >
                          <Award size={11} className="text-[#2DD4BF]" />
                          <span>الشهادة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={studentPage}
            totalItems={filteredStudents.length}
            pageSize={STUDENTS_PER_PAGE}
            onPageChange={setStudentPage}
            className="pt-2 border-t border-[#2A3B56]"
          />
        </div>

        {/* ================= STUDENT PROFILE & CONTRACT (2 COLS) ================= */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="p-6 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm space-y-6">
              {studentEditError && !isEditingStudent && <p role="alert" className="text-xs text-red-400">{studentEditError}</p>}
              {/* Profile Header */}
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between pb-4 border-b border-[#2A3B56] gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#0D9488] text-[#F8FAFC] flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-[#F8FAFC]">{selectedStudent.name}</h2>
                      <span className="font-mono text-xs font-bold bg-[#115E59] text-[#2DD4BF] border border-[#2DD4BF]/30 px-2.5 py-0.5 rounded-lg">
                        {selectedStudent.qrToken}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      تاريخ الميلاد: {selectedStudent.birthDate} • المستوى: {selectedStudent.level}
                    </p>
                    <p className="text-xs text-[#94A3B8] font-semibold mt-0.5">
                      الكورس الحالي: <span className="text-[#2DD4BF]">{primaryCourse?.name || 'غير مسجل بكورس'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={beginStudentEdit}
                    className="bg-[#111827] hover:bg-[#1e293b] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all font-medium"
                  >
                    <Pencil size={14} />تعديل البيانات
                  </button>
                  <button
                    type="button"
                    onClick={removeStudent}
                    className="bg-[#111827] hover:bg-[#1e293b] border border-[#334155] text-[#94A3B8] hover:text-red-400 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all font-medium"
                  >
                    <Trash2 size={14} />حذف الملف
                  </button>
                  <button
                    onClick={() => {
                      setDiplomaStudent(selectedStudent);
                      setShowDiplomaModal(true);
                    }}
                    className="bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold shadow-md shadow-[#0D9488]/30 text-xs flex items-center gap-1.5 cursor-pointer py-2 px-3.5 rounded-xl border-0 transition-all"
                  >
                    <Award size={15} className="text-[#F8FAFC]" />
                    <span>🎓 الشهادة الملكية (A4 Diploma)</span>
                  </button>

                  <div className="flex gap-1.5 bg-[#111827] border border-[#2A3B56] p-1 rounded-xl">
                    <button
                      onClick={() => setProfileTab('info')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${profileTab === 'info' ? 'bg-[#0D9488] text-[#F8FAFC] border-[#0D9488] shadow-sm' : 'bg-[#111827] border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                    >
                      البيانات والكارنيه
                    </button>
                    <button
                      onClick={() => setProfileTab('contract')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${profileTab === 'contract' ? 'bg-[#0D9488] text-[#F8FAFC] border-[#0D9488] shadow-sm' : 'bg-[#111827] border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                    >
                      <FileText size={13} />
                      وثيقة التعاقد
                    </button>
                    <button
                      onClick={() => setProfileTab('financials')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${profileTab === 'financials' ? 'bg-[#0D9488] text-[#F8FAFC] border-[#0D9488] shadow-sm' : 'bg-[#111827] border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                    >
                      <CreditCard size={13} />
                      الماليات
                    </button>
                    <button
                      onClick={() => setProfileTab('progress')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${profileTab === 'progress' ? 'bg-[#0D9488] text-[#F8FAFC] border-[#0D9488] shadow-sm' : 'bg-[#111827] border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                    >
                      <Award size={13} />
                      تقدم الدروس
                    </button>
                  </div>
                </div>
            </div>

              {/* TAB 1: INFO & ID BADGE */}
              {profileTab === 'info' && (
                isEditingStudent ? (
                  <form onSubmit={saveStudentEdit} className="space-y-4 rounded-2xl border border-[#2A3B56] bg-[#111827] p-5">
                    <h3 className="font-bold text-[#F8FAFC]">تعديل ملف الطالب وبيانات ولي الأمر</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      <label className="text-xs text-[#CBD5E1]">اسم الطالب<input className="input mt-1" required minLength={3} value={studentDraft.name} onChange={e => setStudentDraft({ ...studentDraft, name: e.target.value })} /></label>
                      <label className="text-xs text-[#CBD5E1]">تاريخ الميلاد<input className="input mt-1" type="date" required value={studentDraft.birthDate} onChange={e => setStudentDraft({ ...studentDraft, birthDate: e.target.value })} /></label>
                      <label className="text-xs text-[#CBD5E1]">المستوى<input className="input mt-1" value={studentDraft.level} onChange={e => setStudentDraft({ ...studentDraft, level: e.target.value })} /></label>
                      <label className="text-xs text-[#CBD5E1]">اسم ولي الأمر<input className="input mt-1" required minLength={3} value={studentDraft.guardianName} onChange={e => setStudentDraft({ ...studentDraft, guardianName: e.target.value })} /></label>
                      <label className="text-xs text-[#CBD5E1]">هاتف ولي الأمر<input className="input mt-1" required value={studentDraft.guardianPhone} onChange={e => setStudentDraft({ ...studentDraft, guardianPhone: e.target.value })} /></label>
                      <label className="text-xs text-[#CBD5E1]">بريد ولي الأمر<input className="input mt-1" type="email" value={studentDraft.guardianEmail} onChange={e => setStudentDraft({ ...studentDraft, guardianEmail: e.target.value })} /></label>
                    </div>
                    <label className="block text-xs text-[#CBD5E1]">ملاحظات صحية<textarea className="input mt-1" rows={3} value={studentDraft.healthNotes} onChange={e => setStudentDraft({ ...studentDraft, healthNotes: e.target.value })} /></label>
                    <label className="flex items-center gap-2 text-xs text-[#CBD5E1]"><input type="checkbox" checked={studentDraft.publishConsent} onChange={e => setStudentDraft({ ...studentDraft, publishConsent: e.target.checked })} />موافقة على نشر الأعمال بالمعرض الفني</label>
                    {studentEditError && <p role="alert" className="text-xs text-red-400">{studentEditError}</p>}
                    <div className="flex gap-2"><button className="btn btn-primary text-xs" type="submit">حفظ التعديلات</button><button className="btn btn-secondary text-xs" type="button" onClick={() => { setIsEditingStudent(false); setStudentEditError(''); }}>إلغاء</button></div>
                  </form>
                ) :
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Student ID Card (Printable) */}
                  <div
                    id="printable-student-id"
                    className="p-6 rounded-2xl border border-[#2A3B56] flex flex-col items-center justify-between text-center relative overflow-hidden bg-[#111827] text-[#F8FAFC] shadow-sm"
                  >
                    <div className="id-print-header w-full pb-3 border-b border-[#2A3B56] flex items-center justify-between text-xs text-[#94A3B8]">
                      <span className="font-bold text-[#2DD4BF]">🎨 {settings.name}</span>
                      <span className="font-medium text-[#94A3B8]">بطاقة عضوية المرسم الرسمية</span>
                    </div>

                    <div className="my-4 space-y-2">
                      <div className="id-print-avatar w-20 h-20 rounded-full mx-auto bg-[#0D9488] border-4 border-[#2A3B56] flex items-center justify-center text-3xl font-black text-[#F8FAFC] shadow-md">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <h3 className="font-black text-lg text-[#F8FAFC]">{selectedStudent.name}</h3>
                      <p className="text-xs font-bold text-[#2DD4BF]">{primaryCourse?.name || 'فنون تشكيلية'}</p>
                      <p className="text-[11px] text-[#94A3B8]">المستوى: {selectedStudent.level || 'مبتدئ'}</p>
                    </div>

                    {/* Barcode Display */}
                    <div className="id-print-codebox bg-[#0E1629] p-3 rounded-xl border border-[#2A3B56] shadow-sm my-2 w-full max-w-[220px]">
                      <div className="flex justify-center items-center py-1">
                        <QrCode size={52} className="text-[#2DD4BF]" />
                      </div>
                      <p className="font-mono text-[#2DD4BF] font-black text-xs tracking-wider mt-1">{selectedStudent.qrToken}</p>
                    </div>

                    <p className="text-[10px] text-[#94A3B8] mt-1">طوارئ: {selectedGuardian?.phone || settings.phone}</p>

                    <button
                      type="button"
                      onClick={() => printStudentIdCard()}
                      className="id-no-print w-full mt-4 bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all border-0 cursor-pointer"
                    >
                      <Printer size={14} /> طباعة بطاقة الطالب (ID)
                    </button>
                  </div>

                  {/* Guardian & Details */}
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#111827] space-y-3">
                      <h4 className="font-black text-sm text-[#F8FAFC] flex items-center gap-2">
                        <Shield size={16} className="text-teal-400" /> بيانات ولي الأمر
                      </h4>
                      <div className="space-y-2 text-xs text-[#94A3B8]">
                        <p className="flex justify-between border-b border-[#2A3B56] pb-1.5"><span className="text-[#94A3B8]">الاسم:</span> <strong className="text-[#F8FAFC]">{selectedGuardian?.name}</strong></p>
                        <p className="flex justify-between border-b border-[#2A3B56] pb-1.5"><span className="text-[#94A3B8]">رقم الهاتف:</span> <strong className="font-mono text-teal-300 font-bold">{selectedGuardian?.phone}</strong></p>
                        <p className="flex justify-between"><span className="text-[#94A3B8]">البريد:</span> <span className="font-mono text-[#CBD5E1]">{selectedGuardian?.email || 'غير مسجل'}</span></p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#111827] space-y-3">
                      <h4 className="font-black text-sm text-[#F8FAFC] flex items-center gap-2">
                        <HeartPulse size={16} className="text-teal-400" /> ملاحظات صحية وتراخيص
                      </h4>
                      <div className="space-y-2.5 text-xs">
                        <p className="text-[#CBD5E1] bg-[#0E1629] p-3 rounded-xl border border-[#2A3B56] leading-relaxed">
                          {selectedStudent.healthNotes || 'لا توجد ملاحظات أو حساسيات مسجلة.'}
                        </p>
                        <div className="pt-2 flex items-center gap-2">
                          <span className={`badge ${selectedStudent.publishConsent ? 'badge-teal' : 'badge-gray'}`}>
                            {selectedStudent.publishConsent ? 'موافق على نشر الأعمال بالمعرض الفني' : 'غير موافق على النشر'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OFFICIAL CONTRACT DOCUMENT */}
              {profileTab === 'contract' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-[#F8FAFC]">وثيقة التعاقد والاشتراك الرسمي</h3>
                      <p className="text-xs text-[#94A3B8]">مسجلة بتاريخ الانضمام: {primaryEnrollment?.enrollDate || 'غير مسجل'}</p>
                    </div>
                    <button
                      onClick={() => printContractDocument()}
                      disabled={!contractReady}
                      title={contractReady ? 'طباعة وثيقة التعاقد' : 'أكمل بيانات الاشتراك وولي الأمر قبل الطباعة'}
                      className="bg-[#0D9488] hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-50 text-[#F8FAFC] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all border-0"
                    >
                      <Printer size={15} /> طباعة وثيقة التعاقد (A4)
                    </button>
                  </div>

                  {!contractReady && (
                    <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs leading-6 text-amber-200">
                      لا يمكن طباعة عقد رسمي قبل تسجيل بيانات ولي الأمر والاشتراك والكورس وتاريخ الانضمام.
                    </p>
                  )}

                  {/* Printable Formal A4 Paper */}
                  <div id="printable-contract" className="bg-[#1B2537] text-[#F8FAFC] p-8 rounded-2xl shadow-md font-sans border border-[#2A3B56] space-y-6">
                    {/* Header */}
                    <div className="contract-print-header flex items-center justify-between border-b border-[#2A3B56] pb-4">
                      <div>
                        <h2 className="contract-print-title text-2xl font-black text-[#F8FAFC] flex items-center gap-2">🎨 {settings.name}</h2>
                        <p className="contract-print-sub text-xs text-[#94A3B8] mt-1">{settings.address} • هاتف: {settings.phone}</p>
                      </div>
                      <div className="text-left">
                        <span className="contract-print-badge text-xs font-mono font-bold bg-[#111827] text-[#2DD4BF] px-3 py-1.5 rounded-lg border border-[#2A3B56] inline-block">
                          عقد رقم: CTR-{selectedStudent.id.slice(-5)}
                        </span>
                        <p className="contract-print-sub text-xs text-[#94A3B8] mt-1">تاريخ التعاقد: {primaryEnrollment?.enrollDate || 'غير مسجل'}</p>
                      </div>
                    </div>

                    {/* Contract Document Banner */}
                    <div className="text-center py-1">
                      <h3 className="contract-print-title text-base font-black text-[#F8FAFC] tracking-wide">وثيقة التعاقد والاشتراك الرسمي</h3>
                    </div>

                    {/* Parties */}
                    <div className="contract-print-box bg-[#111827] p-4 rounded-xl border border-[#2A3B56] text-xs space-y-2">
                      <p className="text-[#94A3B8] leading-relaxed">
                        <strong className="text-[#F8FAFC]">الطرف الأول (إدارة المرسم):</strong> {settings.name}، ويمثلها المدير التنفيذي.
                      </p>
                      <p className="text-[#94A3B8] leading-relaxed">
                        <strong className="text-[#F8FAFC]">الطرف الثاني (المتدرب / ولي الأمر):</strong> السيد/ة <strong className="text-[#F8FAFC]">{selectedGuardian?.name || 'غير مسجل'}</strong>، ولي أمر الطالب: <strong className="text-[#F8FAFC]">{selectedStudent.name}</strong>، هاتف: <strong className="text-[#F8FAFC]">{selectedGuardian?.phone || 'غير مسجل'}</strong>.
                      </p>
                      <p className="text-[#94A3B8] leading-relaxed">
                        <strong className="text-[#F8FAFC]">موضوع العقد:</strong> اشتراك وتدريب في <strong className="text-[#F8FAFC]">{primaryCourse?.name || 'غير مسجل'}</strong>، بإجمالي رسوم متفق عليها: <strong className="text-[#2DD4BF]">{primaryEnrollment?.totalAmount ?? 'غير مسجل'} جنيه مصري</strong>.
                      </p>
                    </div>

                    {/* Clauses */}
                    <div className="space-y-2 text-xs leading-relaxed">
                      <h4 className="contract-print-title font-bold text-[#F8FAFC] text-sm">بنود وشروط التعاقد</h4>
                      <div className="contract-print-clauses whitespace-pre-line text-[#F8FAFC] bg-[#111827] p-4 rounded-xl border border-[#2A3B56] leading-relaxed text-xs">
                        {settings.contractTerms}
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="contract-print-signatures pt-8 border-t border-[#2A3B56] grid grid-cols-2 gap-8 text-center text-xs">
                      <div className="space-y-6">
                        <p className="font-bold text-[#F8FAFC]">توقيع ولي الأمر / الطالب</p>
                        <div className="h-10 border-b border-dashed border-[#2A3B56]"></div>
                        <p className="text-[#94A3B8] font-medium">{selectedGuardian?.name || 'غير مسجل'}</p>
                      </div>
                      <div className="space-y-6">
                        <p className="font-bold text-[#F8FAFC]">ختم وتوقيع إدارة المرسم</p>
                        <div className="h-10 border-b border-dashed border-[#2A3B56] flex items-center justify-center">
                          <span className="text-[11px] text-[#94A3B8] font-bold border border-dashed border-[#64748B] px-3 py-1 rounded-full flex items-center gap-1">
                            ختم الإدارة
                          </span>
                        </div>
                        <p className="text-[#94A3B8] font-medium">{settings.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FINANCIALS & INSTALLMENTS */}
              {profileTab === 'financials' && (
                <div className="space-y-5">
                  {/* Financial Summary */}
                  {primaryEnrollment && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl border border-[#2A3B56] bg-[#1B2537] text-center">
                        <p className="text-xs text-[#94A3B8] font-medium">إجمالي رسوم الكورس</p>
                        <p className="text-xl font-black text-[#F8FAFC] mt-1">{primaryEnrollment.totalAmount} ج</p>
                      </div>
                      <div className="p-4 rounded-xl border border-[#2A3B56] bg-[#1B2537] text-center">
                        <p className="text-xs text-[#94A3B8] font-medium">المبلغ المسدد</p>
                        <p className="text-xl font-black text-[#2DD4BF] mt-1">{primaryEnrollment.totalPaid} ج</p>
                      </div>
                      <div className="p-4 rounded-xl border border-[#2A3B56] bg-[#1B2537] text-center">
                        <p className="text-xs text-[#94A3B8] font-medium">المتبقي المطلوب</p>
                        <p className="text-xl font-black text-[#F8FAFC] mt-1">
                          {Math.max(0, primaryEnrollment.totalAmount - primaryEnrollment.totalPaid)} ج
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <h4 className="font-black text-sm text-[#F8FAFC]">سجل إيصالات الدفع للكورس</h4>
                    {primaryEnrollment && primaryEnrollment.totalPaid < primaryEnrollment.totalAmount && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all border-0"
                      >
                        <CreditCard size={14} /> تسجيل دفعة نقدية جديدة
                      </button>
                    )}
                  </div>

                  {/* Payments Receipts */}
                  <div className="space-y-2">
                    {studentPayments.length === 0 ? (
                      <p className="text-xs text-[#94A3B8] py-3 text-center">لم يتم تسجيل دفعات بعد.</p>
                    ) : (
                      studentPayments.map(pay => (
                        <div key={pay.id} className="p-3.5 bg-[#111827] border border-[#2A3B56] rounded-xl flex items-center justify-between text-xs">
                          <button
                            onClick={() => setReceiptData({
                              receiptNumber: pay.receiptNumber,
                              date: pay.date,
                              studentName: selectedStudent.name,
                              courseName: primaryCourse?.name || 'دورة تدريبية',
                              amount: pay.amount,
                              remaining: Math.max(0, (primaryEnrollment?.totalAmount || 0) - (primaryEnrollment?.totalPaid || 0)),
                              method: pay.method
                            })}
                            className="bg-[#111827] hover:bg-[#1e293b] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all font-medium"
                          >
                            <Printer size={13} className="text-[#94A3B8]" />
                            <span>طباعة إيصال الدفع</span>
                          </button>
                          <div className="flex items-center gap-3">
                            <span className="text-[#94A3B8] text-xs font-medium">({pay.method})</span>
                            <span className="font-mono font-bold text-[#2DD4BF] bg-[#115E59] border border-[#2DD4BF]/30 px-2.5 py-0.5 rounded-lg text-xs">
                              {pay.receiptNumber}
                            </span>
                            <span className="font-black text-[#F8FAFC]">{pay.amount} ج</span>
                            <p className="text-xs text-[#94A3B8]">{pay.date} • {pay.notes}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Installments Schedule */}
                  <div className="pt-3 border-t border-[#2A3B56]">
                    <h4 className="font-black text-sm text-[#F8FAFC] mb-3 flex items-center gap-1.5">
                      <Clock size={15} className="text-[#2DD4BF]" /> جدول الأقساط المتبقية
                    </h4>
                    <div className="space-y-2">
                      {studentInstallments.map((inst, idx) => (
                        <div key={inst.id} className="p-3 bg-[#111827] border border-[#2A3B56] rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#F8FAFC]">القسط #{idx + 1}</span>
                            <span className="text-[#94A3B8]">تاريخ الاستحقاق: {inst.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#F8FAFC]">{inst.amount} ج</span>
                            <span className={`badge text-[10px] ${inst.status === 'paid' ? 'bg-[#115E59] text-[#2DD4BF] border border-[#2DD4BF]/30' : inst.status === 'overdue' ? 'bg-[#450A0A] text-[#EF4444] border border-[#7F1D1D]' : 'bg-[#1e293b] text-[#94A3B8] border border-[#2A3B56]'}`}>
                              {inst.status === 'paid' ? 'مدفوع' : inst.status === 'overdue' ? 'متأخر' : 'معلق'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CURRICULUM & LESSON PROGRESS */}
              {profileTab === 'progress' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-[#F8FAFC]">تقدم المنهج حسب موضوعات الدروس</h4>
                      <p className="text-xs text-[#94A3B8]">مقرر: {primaryCourse?.name}</p>
                    </div>
                    <span className="badge badge-teal text-xs font-bold">
                      {studentProgress.length} دروس مكتملة
                    </span>
                  </div>

                  {/* Syllabus checklist */}
                  <div className="space-y-2.5">
                    {primaryCourse?.syllabus?.map((topic: string, index: number) => {
                      const completed = studentProgress.some(p => p.level.includes(topic));
                      return (
                        <div
                          key={index}
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            completed ? 'bg-[#0D9488]/15 border-[#0D9488]/40' : 'bg-[#111827] border-[#2A3B56]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              completed ? 'bg-[#0D9488] text-white shadow-sm' : 'bg-[#1B2537] text-[#94A3B8]'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${completed ? 'text-[#99F6E4]' : 'text-[#CBD5E1]'}`}>
                                {topic}
                              </p>
                              <p className="text-[10px] text-[#94A3B8]">موضوع الدرس المعتمد بالمنهج</p>
                            </div>
                          </div>

                          <span className={`badge text-[10px] ${completed ? 'badge-teal' : 'badge-gray'}`}>
                            {completed ? 'تم الإنجاز ✅' : 'قيد الانتظار'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-12 text-center text-[#94A3B8] space-y-3 shadow-sm">
              <Users size={48} className="mx-auto text-[#2DD4BF]" />
              <p className="font-bold text-[#F8FAFC]">اختر طالباً من القائمة لعرض ملفه وعقده ومالياته</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD STUDENT ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0E1629]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B2537] p-6 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-[#2A3B56] text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
              <h3 className="font-black text-lg text-[#F8FAFC] flex items-center gap-2">
                <Plus size={20} className="text-teal-400" />
                تسجيل طالب جديد واستخراج وثيقة التعاقد
              </h3>
              <button onClick={() => { setShowAddModal(false); setContractAccepted(false); }} className="text-[#94A3B8] hover:text-[#F8FAFC] p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              {/* Student Info */}
              <div className="space-y-2">
                <h4 className="font-black text-teal-300 text-sm">١. بيانات الطالب</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">اسم الطالب الرباعي *:</label>
                    <input
                      className="input text-xs"
                      placeholder="مثال: يوسف خالد إبراهيم"
                      required
                      value={newStudentData.name}
                      onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">تاريخ الميلاد:</label>
                    <input
                      type="date"
                      className="input text-xs"
                      value={newStudentData.birthDate}
                      onChange={e => setNewStudentData({ ...newStudentData, birthDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">مستوى الرسم:</label>
                    <select
                      className="input text-xs"
                      value={newStudentData.level}
                      onChange={e => setNewStudentData({ ...newStudentData, level: e.target.value })}
                    >
                      <option value="المستوى الأول (مبتدئ)">المستوى الأول (مبتدئ)</option>
                      <option value="المستوى الثاني (متوسط)">المستوى الثاني (متوسط)</option>
                      <option value="المستوى الثالث (متقدم)">المستوى الثالث (متقدم)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">ملاحظات صحية (إن وجد):</label>
                    <input
                      className="input text-xs"
                      placeholder="حساسية، نظارة، الخ"
                      value={newStudentData.healthNotes}
                      onChange={e => setNewStudentData({ ...newStudentData, healthNotes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Guardian Info */}
              <div className="space-y-2 pt-2 border-t border-[#2A3B56]">
                <h4 className="font-black text-teal-300 text-sm">٢. بيانات ولي الأمر</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">اسم ولي الأمر *:</label>
                    <input
                      className="input text-xs"
                      placeholder="السيد/ة ولي الأمر"
                      required
                      value={newStudentData.guardianName}
                      onChange={e => setNewStudentData({ ...newStudentData, guardianName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">رقم الهاتف (واتساب) *:</label>
                    <input
                      className="input text-xs font-mono"
                      placeholder="01xxxxxxxxx"
                      required
                      value={newStudentData.guardianPhone}
                      onChange={e => setNewStudentData({ ...newStudentData, guardianPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Course & Financial Agreement */}
              <div className="space-y-2 pt-2 border-t border-[#2A3B56]">
                <h4 className="font-black text-teal-300 text-sm">٣. الكورس المتفق عليه والماليات</h4>
                <div>
                  <label className="block text-[#CBD5E1] mb-1 font-bold">اختر الكورس والمجموعة:</label>
                  <select
                    className="input text-xs"
                    value={selectedGroupId}
                    onChange={e => setNewStudentData({ ...newStudentData, groupId: e.target.value })}
                  >
                    <option value="">تسجيل الطالب بدون مجموعة الآن</option>
                    {groups.map(g => {
                      const c = courses.find(course => course.id === g.courseId);
                      const capacity = groupCapacity(g);
                      const available = isGroupAvailable(g);
                      return (
                        <option key={g.id} value={g.id} disabled={!available}>
                          {c?.name} — {g.schedule} ({c?.price} ج) · {available ? `متاح ${capacity - (g.enrolled || 0)} مقعد` : 'المجموعة مكتملة'}
                        </option>
                      );
                    })}
                  </select>
                  {availableGroups.length === 0 && <p className="mt-1 text-xs text-amber-300">لا توجد مقاعد متاحة حاليًا؛ يمكنك حفظ ملف الطالب وإلحاقه بمجموعة لاحقًا.</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">إجمالي الرسوم (ج):</label>
                    <input
                      type="number"
                      className="input text-xs font-black text-[#F8FAFC]"
                      value={newStudentData.totalAmount}
                      onChange={e => setNewStudentData({ ...newStudentData, totalAmount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">المدفوع الآن (مقدم):</label>
                    <input
                      type="number"
                      className="input text-xs font-black text-teal-300"
                      value={newStudentData.initialPayment}
                      onChange={e => setNewStudentData({ ...newStudentData, initialPayment: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[#CBD5E1] mb-1 font-bold">طريقة الدفع:</label>
                    <select
                      className="input text-xs"
                      value={newStudentData.paymentMethod}
                      onChange={e => setNewStudentData({ ...newStudentData, paymentMethod: e.target.value as Payment['method'] })}
                    >
                      <option value="cash">نقداً (كاش)</option>
                      <option value="transfer">تحويل بنكي</option>
                      <option value="instapay">انستاباي</option>
                      <option value="vodafone">فودافون كاش</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-[#CBD5E1]">
                  سيتم توليد باركود تلقائي للطالب وعقد اشتراك رسمي، وتقسيم المتبقي ({Math.max(0, newStudentData.totalAmount - newStudentData.initialPayment)} ج) على قسطين تلقائياً.
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[#2A3B56] bg-[#111827] p-4">
                <details>
                  <summary className="cursor-pointer font-bold text-[#F8FAFC]">قراءة بنود التعاقد</summary>
                  <p className="mt-3 whitespace-pre-line leading-6 text-[#CBD5E1]">{settings.contractTerms}</p>
                </details>
                <label className="flex items-start gap-2 border-t border-[#2A3B56] pt-3 text-[#CBD5E1]">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-700" checked={contractAccepted} onChange={event => setContractAccepted(event.target.checked)} />
                  <span>أقر بأن ولي الأمر اطّلع على بنود التعاقد ووافق عليها.</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#2A3B56] flex gap-2">
                <button
                  type="submit"
                  disabled={isAddingStudent || Boolean(selectedGroupId && !contractAccepted)}
                  className="btn btn-primary bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex-1 py-2.5 font-bold shadow-sm flex items-center justify-center gap-2"
                >
                  {isAddingStudent
                    ? 'جاري حفظ التسجيل...'
                    : selectedGroupId && !contractAccepted
                      ? 'وافق على العقد لإتمام التسجيل'
                      : 'حفظ الطالب وتسجيل الموافقة'}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setContractAccepted(false); }} className="btn btn-secondary border-[#2A3B56]">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK PAYMENT ================= */}
      {showPaymentModal && primaryEnrollment && (
        <div className="fixed inset-0 bg-[#0E1629]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B2537] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl border border-[#2A3B56] text-[#F8FAFC]">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A3B56]">
              <h3 className="font-black text-base text-[#F8FAFC]">تسجيل دفعة قسط دراسي</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[#94A3B8] hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#CBD5E1]">
                الطالب: <strong className="text-[#F8FAFC]">{selectedStudent?.name}</strong>
              </p>
              <div className="p-3 bg-[#0D9488]/15 rounded-xl border border-[#0D9488]/40">
                <span className="text-[#94A3B8]">المتبقي حالياً:</span>{' '}
                <strong className="text-[#2DD4BF] font-black text-sm">{Math.max(0, primaryEnrollment.totalAmount - primaryEnrollment.totalPaid)} ج</strong>
              </div>

              <div>
                <label className="block text-[#CBD5E1] mb-1 font-bold">المبلغ المدفوع (ج):</label>
                <input
                  type="number"
                  className="input text-sm font-black text-teal-300"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-[#CBD5E1] mb-1 font-bold">طريقة السداد:</label>
                <select
                  className="input text-xs"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as typeof payMethod)}
                >
                  <option value="cash">نقداً (كاش)</option>
                  <option value="transfer">تحويل بنكي</option>
                  <option value="instapay">انستاباي</option>
                  <option value="vodafone">فودافون كاش</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-[#CBD5E1] mb-1 font-bold">ملاحظات إضافية:</label>
                <input
                  className="input text-xs"
                  placeholder="مثال: سداد القسط الثاني"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#2A3B56] flex gap-2">
              <button
                onClick={handleRecordPayment}
                disabled={isRecordingPayment}
                className="btn btn-primary bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex-1 font-bold shadow-sm flex items-center justify-center gap-2"
              >
                {isRecordingPayment ? 'جاري تسجيل الدفعة...' : 'تأكيد الدفع وطباعة الإيصال'}
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary border-[#2A3B56]">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE RECEIPT ================= */}
      {receiptData && (
        <PaymentReceiptModal
          receipt={receiptData}
          settings={settings}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* ================= A4 LUXURY ART DIPLOMA MODAL ================= */}
      <ArtDiplomaModal
        key={`${diplomaStudent?.id || selectedStudent?.id || 'none'}:${primaryCourse?.name || ''}:${settings.address || ''}`}
        isOpen={showDiplomaModal}
        onClose={() => {
          setShowDiplomaModal(false);
          setDiplomaStudent(null);
        }}
        student={diplomaStudent || selectedStudent || null}
        courseTitle={primaryCourse?.name || 'دورة الفنون التشكيلية الاحترافية'}
        branchName={settings.address ? settings.address.split('—')[0].trim() : 'المقر الرئيسي'}
      />
    </div>
  );
}
