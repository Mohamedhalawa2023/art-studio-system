'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import type { Payment } from '@/lib/mockData';
import { PaymentReceiptModal, type CoursePaymentReceipt } from '@/components/finance/PaymentReceiptModal';
import { FileText, CheckCircle, Plus, Pencil, Trash2 } from 'lucide-react';

export default function EnrollmentsPage() {
  const { enrollments, students, groups, courses, settings, currentUser, payments, createEnrollment, updateEnrollment, deleteEnrollment } = useMarsam();

  const [step, setStep] = useState<'list' | 'new-step1' | 'new-step2' | 'new-step3'>('list');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'installments'>('installments');
  const [paymentMethod, setPaymentMethod] = useState<Payment['method']>('cash');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [receipt, setReceipt] = useState<CoursePaymentReceipt | null>(null);
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState('');
  const [editContractAccepted, setEditContractAccepted] = useState(false);
  const [editTotalAmount, setEditTotalAmount] = useState(0);

  const contractText = settings.contractTerms || `بنود التعاقد مع مرسم الإبداع:
١. يلتزم الطالب بحضور الحصص في المواعيد المحددة.
٢. في حال الغياب يُرجى الإخطار المسبق.
٣. سياسة الإلغاء: استرداد كامل قبل أول حصة بـ 3 أيام، 50% بعد الحصة الأولى، ولا استرداد بعدها.
٤. الرسوم تُدفع حسب جدول الأقساط المتفق عليه.
٥. المرسم مسؤول عن توفير بيئة تعليمية آمنة ومعتمدة.`;

  const uniqueCourses = courses;

  const confirmEnrollment = () => {
    if (!selectedStudentId || !selectedGroupId || !contractAccepted || isSaving) return;
    setIsSaving(true);
    try {
      const { enrollment, payment } = createEnrollment({
        studentId: selectedStudentId,
        groupId: selectedGroupId,
        paymentPlan,
        paymentMethod,
        contractAccepted,
        recordedBy: currentUser?.id,
      });
      const student = students.find(item => item.id === enrollment.studentId);
      const group = groups.find(item => item.id === enrollment.groupId);
      const course = courses.find(item => item.id === group?.courseId);
      setFeedback('تم حفظ الحجز وخطة السداد بنجاح.');
      setFeedbackIsError(false);
      if (payment) {
        setReceipt({
          receiptNumber: payment.receiptNumber,
          date: payment.date,
          studentName: student?.name || 'الطالب',
          courseName: course?.name || 'دورة تدريبية',
          amount: payment.amount,
          remaining: Math.max(0, enrollment.totalAmount - enrollment.totalPaid),
          method: payment.method,
          notes: payment.notes,
        });
      }
      setStep('list');
      setSelectedStudentId('');
      setSelectedCourseId('');
      setSelectedGroupId('');
      setContractAccepted(false);
    } catch {
      // The store reports a localized validation message and rolls back the transaction.
    } finally {
      setIsSaving(false);
    }
  };

  const saveEnrollmentEdit = () => {
    if (!editingEnrollmentId || !editGroupId) return;
    try {
      updateEnrollment(editingEnrollmentId, { groupId: editGroupId, contractAccepted: editContractAccepted, totalAmount: Number(editTotalAmount) });
      setEditingEnrollmentId(null);
      setFeedback('تم تحديث الاشتراك بنجاح.');
      setFeedbackIsError(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'تعذر تعديل الاشتراك.');
      setFeedbackIsError(true);
    }
  };

  const removeEnrollment = (id: string) => {
    if (!window.confirm('حذف الاشتراك وجدول أقساطه؟ إذا كان له إيصال محفوظ سيحتفظ النظام بالسجل لحماية الحسابات.')) return;
    try { deleteEnrollment(id); setFeedback('تم حذف الاشتراك.'); setFeedbackIsError(false); }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'تعذر حذف الاشتراك.'); setFeedbackIsError(true); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <FileText className="text-[#2DD4BF]" size={26} />
            الحجوزات وعقود الطلاب
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">{enrollments.length} اشتراك مسجل بقاعدة البيانات</p>
        </div>
        {step === 'list' && (
          <button
            className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-teal-900/30"
            onClick={() => { setFeedback(''); setStep('new-step1'); }}
          >
            <Plus size={16} />
            حجز جديد
          </button>
        )}
        {step !== 'list' && (
          <button
            className="px-4 py-2 rounded-xl bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] font-bold text-xs transition-all"
            onClick={() => { setStep('list'); setContractAccepted(false); setFeedback(''); }}
          >
            ← رجوع للقائمة
          </button>
        )}
      </div>

      {feedback && step === 'list' && (
        <div role={feedbackIsError ? 'alert' : 'status'} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${feedbackIsError ? 'border-red-500/40 bg-red-950/40 text-red-300' : 'border-teal-500/40 bg-teal-950/40 text-teal-300'}`}>
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="text-[#94A3B8] hover:text-[#F8FAFC]">إغلاق</button>
        </div>
      )}

      {/* Enrollment List */}
      {step === 'list' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'مكتملة', count: enrollments.filter(e => e.paymentStatus === 'completed').length, colorClass: 'text-[#2DD4BF]', labelClass: 'text-[#2DD4BF]' },
              { label: 'جزئية', count: enrollments.filter(e => e.paymentStatus === 'partial').length, colorClass: 'text-amber-400', labelClass: 'text-amber-400' },
              { label: 'متأخرة', count: enrollments.filter(e => e.paymentStatus === 'overdue').length, colorClass: 'text-rose-400', labelClass: 'text-rose-400' },
              { label: 'لم تدفع', count: enrollments.filter(e => e.paymentStatus === 'unpaid').length, colorClass: 'text-[#F8FAFC]', labelClass: 'text-[#94A3B8]' },
            ].map(s => (
              <div key={s.label} className="bg-[#1B2537] border border-[#2A3B56] p-4 text-center rounded-2xl shadow-sm">
                <p className={`text-3xl font-black ${s.colorClass}`}>{s.count}</p>
                <p className={`text-xs mt-1 font-bold ${s.labelClass}`}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-[#1B2537] rounded-2xl overflow-hidden border border-[#2A3B56] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#111827]/60 border-b border-[#2A3B56] text-[#94A3B8]">
                  <tr>
                    <th className="p-3.5 font-bold">الطالب</th>
                    <th className="p-3.5 font-bold">الكورس</th>
                    <th className="p-3.5 font-bold">المجموعة</th>
                    <th className="p-3.5 font-bold">العقد</th>
                    <th className="p-3.5 font-bold">حالة السداد</th>
                    <th className="p-3.5 font-bold">المدفوع</th>
                    <th className="p-3.5 font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3B56]">
                  {enrollments.map(enrollment => {
                    const student = students.find(s => s.id === enrollment.studentId);
                    const group = groups.find(g => g.id === enrollment.groupId);
                    const course = courses.find(c => c.id === group?.courseId);

                    return (
                      <tr key={enrollment.id} className="hover:bg-[#111827]/40 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center text-[#F8FAFC] text-xs font-bold shrink-0">
                              {student?.name ? student.name.charAt(0) : '؟'}
                            </div>
                            <span className="font-bold text-[#F8FAFC]">{student?.name || 'طالب غير محدد'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-[#F8FAFC] font-medium">{course?.name || 'دورة فنية'}</td>
                        <td className="p-3.5 text-[#94A3B8]">{group?.schedule || 'مواعيد الدورة'}</td>
                        <td className="p-3.5">
                          {enrollment.contractSigned ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#115E59] text-[#2DD4BF] w-fit">
                              <CheckCircle size={11} />
                              موافقة مسجلة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#450A0A] text-[#FCA5A5] w-fit">
                              بانتظار الموافقة
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                            enrollment.paymentStatus === 'completed' ? 'bg-[#115E59] text-[#2DD4BF]' :
                            enrollment.paymentStatus === 'partial' ? 'bg-[#1E293B] border border-[#334155] text-[#94A3B8]' :
                            enrollment.paymentStatus === 'overdue' ? 'bg-[#450A0A] text-[#FCA5A5]' : 'bg-[#334155] text-[#94A3B8]'
                          }`}>
                            {enrollment.paymentStatus === 'completed' ? 'مسدد بالكامل' :
                             enrollment.paymentStatus === 'partial' ? 'سداد جزئي' :
                             enrollment.paymentStatus === 'overdue' ? 'متأخر' : 'لم يسدد'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div>
                            <p className="font-black text-[#2DD4BF] text-xs">{enrollment.totalPaid?.toLocaleString()} ج</p>
                            <p className="text-[10px] text-[#94A3B8] mt-0.5">من إجمالي {enrollment.totalAmount?.toLocaleString()} ج</p>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] flex items-center justify-center transition-colors"
                              aria-label={`تعديل اشتراك ${student?.name || 'الطالب'}`}
                              title="تعديل الاشتراك"
                              onClick={() => { setEditingEnrollmentId(enrollment.id); setEditGroupId(enrollment.groupId); setEditContractAccepted(enrollment.contractSigned); setEditTotalAmount(enrollment.totalAmount); }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-red-400 hover:border-red-500/50 flex items-center justify-center transition-colors"
                              aria-label={`حذف اشتراك ${student?.name || 'الطالب'}`}
                              title="حذف الاشتراك"
                              onClick={() => removeEnrollment(enrollment.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Modal */}
          {editingEnrollmentId && (
            <div className="modal-overlay" onClick={() => setEditingEnrollmentId(null)}>
              <div
                role="dialog"
                aria-modal="true"
                className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg space-y-4 text-[#F8FAFC]"
                onClick={event => event.stopPropagation()}
              >
                <h2 className="text-lg font-bold text-[#F8FAFC]">تعديل الاشتراك</h2>
                <label className="block text-sm font-semibold text-[#94A3B8]">
                  المجموعة
                  <select
                    className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                    value={editGroupId}
                    onChange={event => setEditGroupId(event.target.value)}
                  >
                    {groups.map(group => (
                      <option key={group.id} value={group.id} className="bg-[#111827] text-[#F8FAFC]">
                        {courses.find(course => course.id === group.courseId)?.name || 'كورس'} — {group.schedule}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-[#94A3B8]">
                  إجمالي الرسوم
                  <input
                    className="w-full mt-1.5 p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editTotalAmount}
                    onChange={event => setEditTotalAmount(Number(event.target.value))}
                  />
                </label>
                {payments.some(payment => payment.enrollmentId === editingEnrollmentId) && (
                  <p className="text-xs text-amber-400">إجمالي الرسوم مثبت بعد تسجيل إيصالات؛ يمكن تعديل المجموعة والعقد فقط.</p>
                )}
                <label className="flex items-center gap-2 text-sm text-[#F8FAFC] cursor-pointer">
                  <input
                    className="accent-[#0D9488] w-4 h-4 rounded"
                    type="checkbox"
                    checked={editContractAccepted}
                    onChange={event => setEditContractAccepted(event.target.checked)}
                  />
                  تأكيد موافقة العقد
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs transition-colors"
                    onClick={saveEnrollmentEdit}
                  >
                    حفظ
                  </button>
                  <button
                    type="button"
                    className="px-5 py-2 rounded-xl bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-xs transition-colors"
                    onClick={() => setEditingEnrollmentId(null)}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Enrollment Wizard */}
      {step !== 'list' && (
        <div className="max-w-2xl mx-auto">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[
              { id: 'new-step1', label: 'اختيار الكورس' },
              { id: 'new-step2', label: 'وثيقة التعاقد' },
              { id: 'new-step3', label: 'خطة الدفع' },
            ].map((s, i) => {
              const stepNum = parseInt(step.replace('new-step', ''));
              const thisNum = i + 1;
              const done = stepNum > thisNum;
              const current = stepNum === thisNum;
              return (
                <div key={s.id} className="flex-1 flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      done ? 'bg-[#0D9488] text-[#F8FAFC]' : current ? 'bg-[#0D9488] text-[#F8FAFC] ring-4 ring-[#0D9488]/20 shadow-lg shadow-teal-900/30' : 'bg-[#111827] text-[#94A3B8] border border-[#2A3B56]'
                    }`}>
                      {done ? <CheckCircle size={16} /> : thisNum}
                    </div>
                    <p className={`text-xs text-center font-bold ${current ? 'text-[#2DD4BF]' : 'text-[#94A3B8]'}`}>{s.label}</p>
                  </div>
                  {i < 2 && <div className={`h-0.5 w-8 -mt-4 ${done ? 'bg-[#0D9488]' : 'bg-[#2A3B56]'}`} />}
                </div>
              );
            })}
          </div>

          {/* Step 1 - Course & Group Selection */}
          {step === 'new-step1' && (
            <div className="p-6 rounded-2xl border border-[#2A3B56] space-y-5 bg-[#1B2537]">
              <h2 className="text-lg font-black text-[#F8FAFC]">١. اختيار الطالب والكورس والمجموعة</h2>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">الطالب:</label>
                <select
                  className="w-full p-3 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                >
                  <option value="" className="bg-[#111827] text-[#94A3B8]">اختر الطالب...</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id} className="bg-[#111827] text-[#F8FAFC]">{student.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">الكورس التدريبي:</label>
                <select
                  className="w-full p-3 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                  value={selectedCourseId}
                  onChange={e => { setSelectedCourseId(e.target.value); setSelectedGroupId(''); }}
                >
                  <option value="" className="bg-[#111827] text-[#94A3B8]">اختر الكورس...</option>
                  {uniqueCourses.map(course => (
                    <option key={course.id} value={course.id} className="bg-[#111827] text-[#F8FAFC]">{course.name} — {course.price?.toLocaleString()} ج</option>
                  ))}
                </select>
              </div>
              {selectedCourseId && (
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">المجموعة والمواعيد:</label>
                  <div className="grid gap-2.5">
                    {groups.filter(g => g.courseId === selectedCourseId && g.status !== 'completed').map(group => {
                      const available = (group.capacity || 10) - (group.enrolled || 0);
                      const disabled = available <= 0;
                      return (
                        <label
                          key={group.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            disabled
                              ? 'cursor-not-allowed border-[#2A3B56]/50 bg-[#111827]/40 opacity-50'
                              : `cursor-pointer ${
                                  selectedGroupId === group.id
                                    ? 'border-[#0D9488] bg-[#111827] ring-1 ring-[#0D9488]'
                                    : 'border-[#2A3B56] bg-[#111827] hover:border-[#334155]'
                                }`
                          }`}
                        >
                          <input type="radio" className="sr-only" value={group.id} checked={selectedGroupId === group.id} disabled={disabled} onChange={() => setSelectedGroupId(group.id)} />
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-xs text-[#F8FAFC]">{group.schedule}</p>
                              <p className="text-[11px] text-[#94A3B8] mt-0.5">{group.room || 'القاعة الرئيسية'}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              available > 0
                                ? 'bg-[#115E59] text-[#2DD4BF]'
                                : 'bg-[#450A0A] text-[#FCA5A5]'
                            }`}>
                              {available > 0 ? `${available} مكان متاح` : 'ممتلئة'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <button
                className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-900/30"
                disabled={!selectedStudentId || !selectedCourseId || !selectedGroupId}
                onClick={() => setStep('new-step2')}
              >
                التالي ← عرض وثيقة التعاقد
              </button>
            </div>
          )}

          {/* Step 2 - Contract */}
          {step === 'new-step2' && (
            <div className="p-6 rounded-2xl border border-[#2A3B56] space-y-5 bg-[#1B2537]">
              <div className="flex items-center gap-2.5">
                <FileText size={22} className="text-[#2DD4BF]" />
                <h2 className="text-lg font-black text-[#F8FAFC]">٢. بنود وثيقة التعاقد</h2>
              </div>
              <div className="rounded-xl border border-[#2A3B56] bg-[#111827] p-3 text-xs leading-6 text-[#94A3B8]">
                الطالب: <strong className="text-[#F8FAFC]">{students.find(student => student.id === selectedStudentId)?.name || '—'}</strong>
                <span className="mx-2 text-[#2A3B56]">•</span>
                الكورس: <strong className="text-[#F8FAFC]">{courses.find(course => course.id === selectedCourseId)?.name || '—'}</strong>
              </div>
              <div className="p-4 rounded-xl text-xs leading-relaxed text-[#F8FAFC] whitespace-pre-line bg-[#111827] border border-[#2A3B56]">
                {contractText}
              </div>
              <div className="p-4 rounded-xl bg-[#115E59]/20 border border-[#0D9488]/40">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-[#0D9488]"
                    checked={contractAccepted}
                    onChange={e => setContractAccepted(e.target.checked)}
                  />
                  <p className="text-xs text-[#F8FAFC] leading-relaxed">
                    أقر أنا <strong className="text-[#2DD4BF]">ولي الأمر / الطالب</strong> بالاطلاع على جميع شروط وضوابط المرسم المذكورة أعلاه والموافقة التامة عليها.
                  </p>
                </label>
              </div>
              <button
                className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-900/30"
                disabled={!contractAccepted}
                onClick={() => setStep('new-step3')}
              >
                موافق، التالي ← خطة الدفع
              </button>
            </div>
          )}

          {/* Step 3 - Payment Plan */}
          {step === 'new-step3' && (
            <div className="p-6 rounded-2xl border border-[#2A3B56] space-y-5 bg-[#1B2537]">
              <h2 className="text-lg font-black text-[#F8FAFC]">٣. خطة سداد الرسوم</h2>
              {(() => {
                const course = courses.find(c => c.id === selectedCourseId);
                const price = course?.price || 1200;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'full', label: 'سداد كامل', desc: `${Math.round(price * 0.95 * 100) / 100} ج.م دفعة واحدة`, discount: 'خصم 5% مطبق على الإجمالي' },
                        { id: 'installments', label: 'تقسيط ميسر', desc: `3 أقساط متساوية تقريباً من إجمالي ${price.toLocaleString()} ج.م`, discount: '' },
                      ].map(plan => (
                        <label
                          key={plan.id}
                          className={`p-4 rounded-xl cursor-pointer transition-all text-center border ${
                            paymentPlan === plan.id
                              ? 'border-[#0D9488] bg-[#111827] ring-1 ring-[#0D9488]'
                              : 'border-[#2A3B56] bg-[#111827] hover:border-[#334155]'
                          }`}
                        >
                          <input type="radio" className="sr-only" value={plan.id} checked={paymentPlan === plan.id} onChange={() => setPaymentPlan(plan.id as 'full' | 'installments')} />
                          <p className="font-bold text-xs text-[#F8FAFC]">{plan.label}</p>
                          <p className="text-[11px] text-[#94A3B8] mt-1">{plan.desc}</p>
                          {plan.discount && <p className="text-[10px] text-[#2DD4BF] font-bold mt-1">{plan.discount}</p>}
                        </label>
                      ))}
                    </div>

                    {paymentPlan === 'full' && (
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-[#94A3B8]">طريقة سداد الدفعة الكاملة:</label>
                        <select
                          className="w-full p-3 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:outline-none focus:border-[#0D9488]"
                          value={paymentMethod}
                          onChange={event => setPaymentMethod(event.target.value as Payment['method'])}
                        >
                          <option value="cash" className="bg-[#111827] text-[#F8FAFC]">نقداً</option>
                          <option value="transfer" className="bg-[#111827] text-[#F8FAFC]">تحويل بنكي</option>
                          <option value="instapay" className="bg-[#111827] text-[#F8FAFC]">إنستاباي</option>
                          <option value="vodafone" className="bg-[#111827] text-[#F8FAFC]">فودافون كاش</option>
                          <option value="card" className="bg-[#111827] text-[#F8FAFC]">بطاقة بنكية</option>
                        </select>
                      </div>
                    )}

                    <button
                      className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-teal-900/30"
                      disabled={isSaving}
                      onClick={confirmEnrollment}
                    >
                      <CheckCircle size={16} />
                      {isSaving ? 'جاري الحفظ...' : 'تأكيد وحفظ الحجز'}
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {receipt && (
        <PaymentReceiptModal
          receipt={receipt}
          settings={settings}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
