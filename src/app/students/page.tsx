'use client';
import { useState, useMemo } from 'react';
import { useMarsam } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Pagination } from '@/components/common/Pagination';
import {
  Users, Search, Plus, QrCode, Phone, Baby, ChevronRight,
  FileText, CreditCard, Award, Calendar, CheckCircle, Clock,
  AlertCircle, Printer, X, Shield, Sparkles, HeartPulse, Camera
} from 'lucide-react';
import ArtDiplomaModal from '@/components/diploma/ArtDiplomaModal';

export default function StudentsPage() {
  const {
    students, users, enrollments, courses, groups, installments, payments,
    progress, settings, addStudentWithEnrollment, addCoursePayment
  } = useMarsam();

  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<'info' | 'contract' | 'financials' | 'progress'>('info');
  const [studentPage, setStudentPage] = useState(1);
  const STUDENTS_PER_PAGE = 15;

  const { isSubmitting: isAddingStudent, execute: executeAddStudent } = useAsyncAction();
  const { isSubmitting: isRecordingPayment, execute: executeRecordPayment } = useAsyncAction();

  // Luxury Art Diploma Modal State
  const [showDiplomaModal, setShowDiplomaModal] = useState(false);
  const [diplomaStudent, setDiplomaStudent] = useState<any>(null);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
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
    paymentMethod: 'cash' as const,
    healthNotes: '',
    publishConsent: true
  });

  // Quick Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState(400);
  const [payMethod, setPayMethod] = useState<'cash' | 'instapay' | 'vodafone' | 'transfer'>('cash');
  const [payNotes, setPayNotes] = useState('');

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<any>(null);

  // Guardians
  const guardians = users.filter(u => u.role === 'guardian');
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

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedGuardian = selectedStudent ? users.find(u => u.id === selectedStudent.guardianId) : null;
  const studentEnrollments = selectedStudent ? enrollments.filter(e => e.studentId === selectedStudent.id) : [];
  const primaryEnrollment = studentEnrollments[0];
  const primaryGroup = primaryEnrollment ? groups.find(g => g.id === primaryEnrollment.groupId) : null;
  const primaryCourse = primaryGroup ? courses.find(c => c.id === primaryGroup.courseId) : null;
  
  const studentInstallments = primaryEnrollment ? installments.filter(i => i.enrollmentId === primaryEnrollment.id) : [];
  const studentPayments = primaryEnrollment ? payments.filter(p => p.enrollmentId === primaryEnrollment.id) : [];
  const studentProgress = selectedStudent ? progress.filter(p => p.studentId === selectedStudent.id) : [];

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentData.name.trim() || !newStudentData.guardianName.trim() || !newStudentData.guardianPhone.trim()) {
      alert('برجاء استكمال اسم الطالب، واسم ولي الأمر، ورقم هاتفه');
      return;
    }

    executeAddStudent(() => {
      const { student, payment } = addStudentWithEnrollment({
        name: newStudentData.name,
        birthDate: newStudentData.birthDate,
        guardianName: newStudentData.guardianName,
        guardianPhone: newStudentData.guardianPhone,
        guardianEmail: newStudentData.guardianEmail,
        groupId: newStudentData.groupId,
        totalAmount: Number(newStudentData.totalAmount),
        initialPayment: Number(newStudentData.initialPayment),
        paymentMethod: newStudentData.paymentMethod,
        level: newStudentData.level,
        healthNotes: newStudentData.healthNotes,
        publishConsent: newStudentData.publishConsent
      });

      setShowAddModal(false);
      setSelectedStudentId(student.id);
      setProfileTab('contract');

      if (payment) {
        setReceiptData({
          receiptNumber: payment.receiptNumber,
          date: payment.date,
          studentName: student.name,
          courseName: courses.find(c => c.id === groups.find(g => g.id === newStudentData.groupId)?.courseId)?.name || 'دورة تدريبية',
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
        method: payMethod as any,
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
            <Users size={26} className="text-blue-600" />
            شؤون الطلاب وملفات التعاقد
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            إدارة الطلاب، عقود التدريب الرسمية، ومتابعة الأقساط والتقدم الدراسي
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center gap-2 shadow-md shadow-blue-600/20"
        >
          <Plus size={18} />
          تسجيل طالب جديد
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              قائمة الطلاب ({filteredStudents.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {paginatedStudents.map(student => {
              const guardian = users.find(u => u.id === student.guardianId);
              const enr = enrollments.find(e => e.studentId === student.id);
              const remaining = enr ? Math.max(0, enr.totalAmount - enr.totalPaid) : 0;
              const isSelected = selectedStudentId === student.id;

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-slate-900 truncate">{student.name}</p>
                        <span className="text-[11px] font-mono text-blue-700 font-bold">{student.qrToken}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        ولي الأمر: {guardian?.name || 'غير مسجل'} • {guardian?.phone}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="badge badge-blue text-[10px]">{student.level || 'مبتدئ'}</span>
                          {remaining > 0 ? (
                            <span className="badge badge-danger text-[10px]">متبقي {remaining} ج</span>
                          ) : (
                            <span className="badge badge-blue text-[10px]">سدد بالكامل</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDiplomaStudent(student);
                            setShowDiplomaModal(true);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                          title="استخراج الشهادة الفنية الملكية"
                        >
                          <Award size={11} className="text-blue-600" />
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
            className="pt-2 border-t border-slate-100"
          />
        </div>

        {/* ================= STUDENT PROFILE & CONTRACT (2 COLS) ================= */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] shadow-sm space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                      <span className="badge badge-blue text-xs font-mono">{selectedStudent.qrToken}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      تاريخ الميلاد: {selectedStudent.birthDate} • المستوى: {selectedStudent.level}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                      الكورس الحالي: {primaryCourse?.name || 'غير مسجل بكورس'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setDiplomaStudent(selectedStudent);
                      setShowDiplomaModal(true);
                    }}
                    className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-600/30 text-xs flex items-center gap-1.5 cursor-pointer py-2 px-3.5"
                  >
                    <Award size={15} className="text-white" />
                    <span>🎓 الشهادة الملكية (A4 Diploma)</span>
                  </button>

                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => setProfileTab('info')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${profileTab === 'info' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-white'}`}
                  >
                    البيانات والكارنيه
                  </button>
                  <button
                    onClick={() => setProfileTab('contract')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${profileTab === 'contract' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-white'}`}
                  >
                    <FileText size={13} />
                    وثيقة التعاقد
                  </button>
                  <button
                    onClick={() => setProfileTab('financials')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${profileTab === 'financials' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-white'}`}
                  >
                    <CreditCard size={13} />
                    الماليات
                  </button>
                  <button
                    onClick={() => setProfileTab('progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${profileTab === 'progress' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-white'}`}
                  >
                    <Award size={13} />
                    تقدم الدروس
                  </button>
                </div>
              </div>
            </div>

              {/* TAB 1: INFO & ID BADGE */}
              {profileTab === 'info' && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Student ID Card (Printable) */}
                  <div className="p-6 rounded-2xl border-2 border-blue-200 flex flex-col items-center justify-between text-center relative overflow-hidden bg-gradient-to-b from-blue-50/70 to-white shadow-sm">
                    <div className="w-full pb-3 border-b border-blue-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-blue-700">🎨 {settings.name}</span>
                      <span className="font-medium text-slate-600">بطاقة عضوية المرسم الرسمية</span>
                    </div>

                    <div className="my-5 space-y-2">
                      <div className="w-20 h-20 rounded-full mx-auto bg-blue-600 border-4 border-blue-100 flex items-center justify-center text-3xl font-black text-white shadow-md">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <h3 className="font-black text-lg text-slate-900">{selectedStudent.name}</h3>
                      <p className="text-xs font-bold text-blue-600">{primaryCourse?.name}</p>
                    </div>

                    {/* Barcode Display */}
                    <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm my-2 w-full max-w-[220px]">
                      <div className="flex justify-center items-center py-1">
                        <QrCode size={56} className="text-blue-900" />
                      </div>
                      <p className="font-mono text-blue-950 font-black text-xs tracking-wider mt-1">{selectedStudent.qrToken}</p>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white btn-sm w-full mt-4 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Printer size={14} /> طباعة بطاقة الطالب (ID)
                    </button>
                  </div>

                  {/* Guardian & Details */}
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <Shield size={16} className="text-blue-600" /> بيانات ولي الأمر
                      </h4>
                      <div className="space-y-2 text-xs text-slate-700">
                        <p className="flex justify-between border-b border-slate-200/60 pb-1.5"><span className="text-slate-500">الاسم:</span> <strong className="text-slate-900">{selectedGuardian?.name}</strong></p>
                        <p className="flex justify-between border-b border-slate-200/60 pb-1.5"><span className="text-slate-500">رقم الهاتف:</span> <strong className="font-mono text-blue-700 font-bold">{selectedGuardian?.phone}</strong></p>
                        <p className="flex justify-between"><span className="text-slate-500">البريد:</span> <span className="font-mono text-slate-600">{selectedGuardian?.email || 'غير مسجل'}</span></p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <HeartPulse size={16} className="text-blue-600" /> ملاحظات صحية وتراخيص
                      </h4>
                      <div className="space-y-2.5 text-xs">
                        <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                          {selectedStudent.healthNotes || 'لا توجد ملاحظات أو حساسيات مسجلة.'}
                        </p>
                        <div className="pt-2 flex items-center gap-2">
                          <span className={`badge ${selectedStudent.publishConsent ? 'badge-blue' : 'badge-gray'}`}>
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
                      <h3 className="font-black text-slate-900">وثيقة التعاقد والاشتراك الرسمي</h3>
                      <p className="text-xs text-slate-500">مسجلة بتاريخ الانضمام: {primaryEnrollment?.enrollDate || '2026-10-01'}</p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white btn-sm flex items-center gap-1.5 shadow-sm"
                    >
                      <Printer size={15} /> طباعة وثيقة التعاقد (A4)
                    </button>
                  </div>

                  {/* Printable Formal A4 Paper */}
                  <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-md font-sans border-2 border-slate-200 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-blue-900 pb-4">
                      <div>
                        <h2 className="text-2xl font-black text-blue-900">🎨 {settings.name}</h2>
                        <p className="text-xs text-slate-600 mt-1">{settings.address} • هاتف: {settings.phone}</p>
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-3 py-1 rounded border border-blue-200">
                          عقد رقم: CTR-{selectedStudent.id.slice(-5)}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">تاريخ التعاقد: {primaryEnrollment?.enrollDate}</p>
                      </div>
                    </div>

                    {/* Parties */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs space-y-2">
                      <p>
                        <strong>الطرف الأول (إدارة المرسم):</strong> {settings.name}، ويمثلها المدير التنفيذي.
                      </p>
                      <p>
                        <strong>الطرف الثاني (المتدرب / ولي الأمر):</strong> السيد/ة <strong>{selectedGuardian?.name}</strong>، ولي أمر الطالب: <strong>{selectedStudent.name}</strong>، هاتف: <strong>{selectedGuardian?.phone}</strong>.
                      </p>
                      <p>
                        <strong>موضوع العقد:</strong> اشتراك وتدريب في <strong>{primaryCourse?.name}</strong>، بإجمالي رسوم متفق عليها: <strong>{primaryEnrollment?.totalAmount} جنيه مصري</strong>.
                      </p>
                    </div>

                    {/* Clauses */}
                    <div className="space-y-2 text-xs leading-relaxed text-slate-700">
                      <h4 className="font-bold text-slate-900 text-sm">بنود وشروط الاتفاق:</h4>
                      <p className="whitespace-pre-line text-slate-700 bg-white p-3 rounded-lg border border-dashed border-slate-300">
                        {settings.contractTerms}
                      </p>
                    </div>

                    {/* Signatures */}
                    <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                      <div className="space-y-6">
                        <p className="font-bold text-slate-800">توقيع ولي الأمر / الطالب</p>
                        <div className="h-10 border-b border-dashed border-slate-400"></div>
                        <p className="text-slate-500">{selectedGuardian?.name}</p>
                      </div>
                      <div className="space-y-6">
                        <p className="font-bold text-slate-800">ختم وتوقيع إدارة المرسم</p>
                        <div className="h-10 border-b border-dashed border-slate-400 flex items-center justify-center">
                          <span className="text-[10px] text-blue-700 font-bold border-2 border-blue-700 px-3 py-0.5 rounded-full bg-blue-50">معتمد رسمياً ✅</span>
                        </div>
                        <p className="text-slate-500">إدارة {settings.name}</p>
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
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-center">
                        <p className="text-xs text-slate-500 font-medium">إجمالي رسوم الكورس</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{primaryEnrollment.totalAmount} ج</p>
                      </div>
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-center">
                        <p className="text-xs text-blue-700 font-medium">المبلغ المسدد</p>
                        <p className="text-xl font-black text-blue-700 mt-1">{primaryEnrollment.totalPaid} ج</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-center">
                        <p className="text-xs text-slate-500 font-medium">المتبقي المطلوب</p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                          {Math.max(0, primaryEnrollment.totalAmount - primaryEnrollment.totalPaid)} ج
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <h4 className="font-black text-sm text-slate-900">سجل إيصالات الدفع للكورس</h4>
                    {primaryEnrollment && primaryEnrollment.totalPaid < primaryEnrollment.totalAmount && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white btn-sm flex items-center gap-1.5 shadow-sm"
                      >
                        <CreditCard size={14} /> تسجيل دفعة نقدية جديدة
                      </button>
                    )}
                  </div>

                  {/* Payments Receipts */}
                  <div className="space-y-2">
                    {studentPayments.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3 text-center">لم يتم تسجيل دفعات بعد.</p>
                    ) : (
                      studentPayments.map(pay => (
                        <div key={pay.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded mr-2">
                              {pay.receiptNumber}
                            </span>
                            <span className="font-bold text-slate-900">{pay.amount} ج</span>
                            <span className="text-slate-500 mr-2">({pay.method})</span>
                            <p className="text-[11px] text-slate-500 mt-1">{pay.date} • {pay.notes}</p>
                          </div>
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
                            className="btn btn-secondary btn-sm flex items-center gap-1 text-slate-700 border-slate-200"
                          >
                            <Printer size={12} /> طباعة إيصال الدفع
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Installments Schedule */}
                  <div className="pt-3 border-t border-slate-200">
                    <h4 className="font-black text-sm text-slate-900 mb-3 flex items-center gap-1.5">
                      <Clock size={15} className="text-blue-600" /> جدول الأقساط المتبقية
                    </h4>
                    <div className="space-y-2">
                      {studentInstallments.map((inst, idx) => (
                        <div key={inst.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">القسط #{idx + 1}</span>
                            <span className="text-slate-500">تاريخ الاستحقاق: {inst.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-900">{inst.amount} ج</span>
                            <span className={`badge text-[10px] ${inst.status === 'paid' ? 'badge-blue' : inst.status === 'overdue' ? 'badge-danger' : 'badge-gray'}`}>
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
                      <h4 className="font-black text-sm text-slate-900">تقدم المنهج حسب موضوعات الدروس</h4>
                      <p className="text-xs text-slate-500">مقرر: {primaryCourse?.name}</p>
                    </div>
                    <span className="badge badge-blue text-xs font-bold">
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
                            completed ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50/50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              completed ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${completed ? 'text-blue-900' : 'text-slate-700'}`}>
                                {topic}
                              </p>
                              <p className="text-[10px] text-slate-500">موضوع الدرس المعتمد بالمنهج</p>
                            </div>
                          </div>

                          <span className={`badge text-[10px] ${completed ? 'badge-blue' : 'badge-gray'}`}>
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
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3 shadow-xs">
              <Users size={48} className="mx-auto text-blue-300" />
              <p className="font-bold text-slate-700">اختر طالباً من القائمة لعرض ملفه وعقده ومالياته</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD STUDENT ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-blue-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" />
                تسجيل طالب جديد واستخراج وثيقة التعاقد
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              {/* Student Info */}
              <div className="space-y-2">
                <h4 className="font-black text-blue-700 text-sm">١. بيانات الطالب</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">اسم الطالب الرباعي *:</label>
                    <input
                      className="input text-xs"
                      placeholder="مثال: يوسف خالد إبراهيم"
                      required
                      value={newStudentData.name}
                      onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">تاريخ الميلاد:</label>
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
                    <label className="block text-slate-600 mb-1 font-bold">مستوى الرسم:</label>
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
                    <label className="block text-slate-600 mb-1 font-bold">ملاحظات صحية (إن وجد):</label>
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
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="font-black text-blue-700 text-sm">٢. بيانات ولي الأمر</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">اسم ولي الأمر *:</label>
                    <input
                      className="input text-xs"
                      placeholder="السيد/ة ولي الأمر"
                      required
                      value={newStudentData.guardianName}
                      onChange={e => setNewStudentData({ ...newStudentData, guardianName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">رقم الهاتف (واتساب) *:</label>
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
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="font-black text-blue-700 text-sm">٣. الكورس المتفق عليه والماليات</h4>
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">اختر الكورس والمجموعة:</label>
                  <select
                    className="input text-xs"
                    value={newStudentData.groupId}
                    onChange={e => setNewStudentData({ ...newStudentData, groupId: e.target.value })}
                  >
                    {groups.map(g => {
                      const c = courses.find(course => course.id === g.courseId);
                      return (
                        <option key={g.id} value={g.id}>
                          {c?.name} — {g.schedule} ({c?.price} ج)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">إجمالي الرسوم (ج):</label>
                    <input
                      type="number"
                      className="input text-xs font-black text-slate-900"
                      value={newStudentData.totalAmount}
                      onChange={e => setNewStudentData({ ...newStudentData, totalAmount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">المدفوع الآن (مقدم):</label>
                    <input
                      type="number"
                      className="input text-xs font-black text-blue-700"
                      value={newStudentData.initialPayment}
                      onChange={e => setNewStudentData({ ...newStudentData, initialPayment: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">طريقة الدفع:</label>
                    <select
                      className="input text-xs"
                      value={newStudentData.paymentMethod}
                      onChange={e => setNewStudentData({ ...newStudentData, paymentMethod: e.target.value as any })}
                    >
                      <option value="cash">نقداً (كاش)</option>
                      <option value="instapay">انستاباي</option>
                      <option value="vodafone">فودافون كاش</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  سيتم توليد باركود تلقائي للطالب وعقد اشتراك رسمي، وتقسيم المتبقي ({Math.max(0, newStudentData.totalAmount - newStudentData.initialPayment)} ج) على قسطين تلقائياً.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="btn btn-primary bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex-1 py-2.5 font-bold shadow-sm flex items-center justify-center gap-2"
                >
                  {isAddingStudent ? 'جاري الحفظ والتعاقد...' : 'حفظ الطالب واستخراج وثيقة التعاقد'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary border-slate-200">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK PAYMENT ================= */}
      {showPaymentModal && primaryEnrollment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl border border-blue-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-base text-slate-900">تسجيل دفعة قسط دراسي</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700">
                الطالب: <strong className="text-slate-900">{selectedStudent?.name}</strong>
              </p>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-slate-600">المتبقي حالياً:</span>{' '}
                <strong className="text-blue-700 font-black text-sm">{Math.max(0, primaryEnrollment.totalAmount - primaryEnrollment.totalPaid)} ج</strong>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">المبلغ المدفوع (ج):</label>
                <input
                  type="number"
                  className="input text-sm font-black text-blue-700"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">طريقة السداد:</label>
                <select
                  className="input text-xs"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                >
                  <option value="cash">نقداً (كاش)</option>
                  <option value="instapay">انستاباي</option>
                  <option value="vodafone">فودافون كاش</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-bold">ملاحظات إضافية:</label>
                <input
                  className="input text-xs"
                  placeholder="مثال: سداد القسط الثاني"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex gap-2">
              <button
                onClick={handleRecordPayment}
                disabled={isRecordingPayment}
                className="btn btn-primary bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex-1 font-bold shadow-sm flex items-center justify-center gap-2"
              >
                {isRecordingPayment ? 'جاري تسجيل الدفعة...' : 'تأكيد الدفع وطباعة الإيصال'}
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary border-slate-200">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE RECEIPT ================= */}
      {receiptData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative border-2 border-blue-200">
            <button
              onClick={() => setReceiptData(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-800 p-1"
            >
              <X size={20} />
            </button>

            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-black text-blue-900">{settings.name}</h2>
                <p className="text-xs text-slate-600 mt-0.5">إيصال سداد رسوم تدريبية</p>
                <p className="text-xs text-slate-500">{settings.address} • {settings.phone}</p>
                <div className="mt-2 inline-block bg-blue-50 px-3 py-1 rounded text-xs font-mono font-bold text-blue-800 border border-blue-200">
                  إيصال رقم: {receiptData.receiptNumber}
                </div>
              </div>

              <div className="text-xs space-y-2 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span>اسم الطالب:</span>
                  <strong className="text-slate-900">{receiptData.studentName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>الدورة التدريبية:</span>
                  <span className="font-semibold text-slate-800">{receiptData.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span className="font-mono text-slate-700">{receiptData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة السداد:</span>
                  <span className="font-semibold text-blue-700">{receiptData.method}</span>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-3 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">المبلغ المدفوع:</span>
                <span className="font-black text-2xl text-blue-700">{receiptData.amount} ج</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>المتبقي بعد هذا السداد:</span>
                <strong className="text-slate-800 font-bold">{receiptData.remaining} ج</strong>
              </div>

              <p className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                هذا الإيصال معتمد رسمي من إدارة المرسم ومسجل بالسجلات المحاسبية
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => window.print()}
                className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white flex-1 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={16} /> طباعة إيصال الدفع
              </button>
              <button onClick={() => setReceiptData(null)} className="btn btn-secondary border-slate-200">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= A4 LUXURY ART DIPLOMA MODAL ================= */}
      <ArtDiplomaModal
        isOpen={showDiplomaModal}
        onClose={() => {
          setShowDiplomaModal(false);
          setDiplomaStudent(null);
        }}
        student={diplomaStudent || selectedStudent}
        courseTitle={primaryCourse?.name || 'دورة الفنون التشكيلية الاحترافية'}
        branchName={settings.address ? settings.address.split('—')[0].trim() : 'المقر الرئيسي'}
      />
    </div>
  );
}
