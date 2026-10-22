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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
            <FileText className="text-teal-400" size={26} />
            الحجوزات وعقود الطلاب
          </h1>
          <p className="text-slate-500 text-sm mt-1">{enrollments.length} اشتراك مسجل بقاعدة البيانات</p>
        </div>
        {step === 'list' && (
          <button className="btn btn-primary text-xs font-bold" onClick={() => { setFeedback(''); setStep('new-step1'); }}>
            <Plus size={15} />
            حجز جديد
          </button>
        )}
        {step !== 'list' && (
          <button className="btn btn-secondary text-xs font-bold" onClick={() => { setStep('list'); setContractAccepted(false); setFeedback(''); }}>
            ← رجوع للقائمة
          </button>
        )}
      </div>

      {feedback && step === 'list' && (
        <div role={feedbackIsError ? 'alert' : 'status'} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${feedbackIsError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="text-emerald-700">إغلاق</button>
        </div>
      )}

      {/* Enrollment List */}
      {step === 'list' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'مكتملة', count: enrollments.filter(e => e.paymentStatus === 'completed').length, colorClass: 'text-teal-300', borderClass: 'border-teal-500/60' },
              { label: 'جزئية', count: enrollments.filter(e => e.paymentStatus === 'partial').length, colorClass: 'text-teal-400', borderClass: 'border-teal-500/40' },
              { label: 'متأخرة', count: enrollments.filter(e => e.paymentStatus === 'overdue').length, colorClass: 'text-slate-800', borderClass: 'border-slate-300' },
              { label: 'لم تدفع', count: enrollments.filter(e => e.paymentStatus === 'unpaid').length, colorClass: 'text-slate-500', borderClass: 'border-slate-200' },
            ].map(s => (
              <div key={s.label} className={`glass p-4 text-center rounded-2xl border-r-4 ${s.borderClass} border-slate-200 bg-white`}>
                <p className={`text-3xl font-black ${s.colorClass}`}>{s.count}</p>
                <p className="text-xs text-slate-500 mt-1 font-bold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="glass rounded-2xl overflow-hidden border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
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
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map(enrollment => {
                    const student = students.find(s => s.id === enrollment.studentId);
                    const group = groups.find(g => g.id === enrollment.groupId);
                    const course = courses.find(c => c.id === group?.courseId);

                    return (
                      <tr key={enrollment.id} className="hover:bg-teal-500/10/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {student?.name ? student.name.charAt(0) : '؟'}
                            </div>
                            <span className="font-bold text-slate-900">{student?.name || 'طالب غير محدد'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-800 font-medium">{course?.name || 'دورة فنية'}</td>
                        <td className="p-3.5 text-slate-500">{group?.schedule || 'مواعيد الدورة'}</td>
                        <td className="p-3.5">
                          {enrollment.contractSigned ? (
                            <span className="badge badge-teal flex items-center gap-1 w-fit"><CheckCircle size={10} />موافقة مسجلة</span>
                          ) : (
                            <span className="badge badge-danger w-fit">بانتظار الموافقة</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`badge ${
                            enrollment.paymentStatus === 'completed' ? 'badge-teal' :
                            enrollment.paymentStatus === 'partial' ? 'badge-info' :
                            enrollment.paymentStatus === 'overdue' ? 'badge-danger' : 'badge-gray'
                          }`}>
                            {enrollment.paymentStatus === 'completed' ? 'مسدد بالكامل' :
                             enrollment.paymentStatus === 'partial' ? 'سداد جزئي' :
                             enrollment.paymentStatus === 'overdue' ? 'متأخر' : 'لم يسدد'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div>
                            <p className="font-black text-teal-300">{enrollment.totalPaid?.toLocaleString()} ج</p>
                            <p className="text-[10px] text-[#94A3B8]">من إجمالي {enrollment.totalAmount?.toLocaleString()} ج</p>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex gap-1.5">
                            <button type="button" className="btn btn-secondary btn-sm text-slate-700 border-slate-300" aria-label={`تعديل اشتراك ${student?.name || 'الطالب'}`} title="تعديل الاشتراك" onClick={() => { setEditingEnrollmentId(enrollment.id); setEditGroupId(enrollment.groupId); setEditContractAccepted(enrollment.contractSigned); setEditTotalAmount(enrollment.totalAmount); }}><Pencil size={13} /></button>
                            <button type="button" className="btn btn-secondary btn-sm text-red-700 border-slate-300" aria-label={`حذف اشتراك ${student?.name || 'الطالب'}`} title="حذف الاشتراك" onClick={() => removeEnrollment(enrollment.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {editingEnrollmentId && (
            <div className="modal-overlay" onClick={() => setEditingEnrollmentId(null)}>
              <div role="dialog" aria-modal="true" className="bg-[#1B2537] border border-[#2A3B56] shadow-2xl p-6 rounded-2xl w-full max-w-lg space-y-4 text-[#F8FAFC]" onClick={event => event.stopPropagation()}>
                <h2 className="text-lg font-bold">تعديل الاشتراك</h2>
                <label className="block text-sm font-semibold">المجموعة<select className="input mt-1" value={editGroupId} onChange={event => setEditGroupId(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{courses.find(course => course.id === group.courseId)?.name || 'كورس'} — {group.schedule}</option>)}</select></label>
                <label className="block text-sm font-semibold">إجمالي الرسوم<input className="input mt-1" type="number" min="0.01" step="0.01" value={editTotalAmount} onChange={event => setEditTotalAmount(Number(event.target.value))} /></label>
                {payments.some(payment => payment.enrollmentId === editingEnrollmentId) && <p className="text-xs text-amber-300">إجمالي الرسوم مثبت بعد تسجيل إيصالات؛ يمكن تعديل المجموعة والعقد فقط.</p>}
                <label className="flex items-center gap-2 text-sm"><input className="accent-teal-400" type="checkbox" checked={editContractAccepted} onChange={event => setEditContractAccepted(event.target.checked)} />تأكيد موافقة العقد</label>
                <div className="flex gap-2"><button type="button" className="btn btn-primary" onClick={saveEnrollmentEdit}>حفظ</button><button type="button" className="btn btn-secondary" onClick={() => setEditingEnrollmentId(null)}>إلغاء</button></div>
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      done ? 'bg-teal-600 text-white' : current ? 'bg-teal-700 text-white shadow-md shadow-blue-600/30' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {done ? <CheckCircle size={16} /> : thisNum}
                    </div>
                    <p className={`text-xs text-center font-bold ${current ? 'text-teal-300' : 'text-slate-500'}`}>{s.label}</p>
                  </div>
                  {i < 2 && <div className={`h-0.5 w-8 -mt-4 ${done ? 'bg-teal-600' : 'bg-slate-200'}`} />}
                </div>
              );
            })}
          </div>

          {/* Step 1 - Course & Group Selection */}
          {step === 'new-step1' && (
            <div className="glass p-6 rounded-2xl border border-slate-200 space-y-5 bg-white">
              <h2 className="text-lg font-black text-slate-900">١. اختيار الطالب والكورس والمجموعة</h2>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الطالب:</label>
                <select className="input text-xs" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                  <option value="">اختر الطالب...</option>
                  {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الكورس التدريبي:</label>
                <select className="input text-xs" value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedGroupId(''); }}>
                  <option value="">اختر الكورس...</option>
                  {uniqueCourses.map(course => (
                    <option key={course.id} value={course.id}>{course.name} — {course.price?.toLocaleString()} ج</option>
                  ))}
                </select>
              </div>
              {selectedCourseId && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">المجموعة والمواعيد:</label>
                  <div className="grid gap-2.5">
                    {groups.filter(g => g.courseId === selectedCourseId && g.status !== 'completed').map(group => {
                      const available = (group.capacity || 10) - (group.enrolled || 0);
                      const disabled = available <= 0;
                      return (
                        <label key={group.id} className={`p-3.5 rounded-xl border transition-all ${disabled ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60' : `cursor-pointer ${selectedGroupId === group.id ? 'border-teal-500/60 bg-teal-500/10/60' : 'border-slate-200 hover:bg-slate-50'}`}`}>
                          <input type="radio" className="sr-only" value={group.id} checked={selectedGroupId === group.id} disabled={disabled} onChange={() => setSelectedGroupId(group.id)} />
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-xs text-slate-900">{group.schedule}</p>
                              <p className="text-[11px] text-slate-500">{group.room || 'القاعة الرئيسية'}</p>
                            </div>
                            <span className={`badge ${available > 0 ? 'badge-teal' : 'badge-danger'} text-[10px]`}>
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
                className="btn btn-primary w-full text-xs font-bold py-2.5"
                disabled={!selectedStudentId || !selectedCourseId || !selectedGroupId}
                onClick={() => setStep('new-step2')}
              >
                التالي ← عرض وثيقة التعاقد
              </button>
            </div>
          )}

          {/* Step 2 - Contract */}
          {step === 'new-step2' && (
            <div className="glass p-6 rounded-2xl border border-slate-200 space-y-5 bg-white">
              <div className="flex items-center gap-2.5">
                <FileText size={22} className="text-teal-400" />
                <h2 className="text-lg font-black text-slate-900">٢. بنود وثيقة التعاقد</h2>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
                الطالب: <strong>{students.find(student => student.id === selectedStudentId)?.name || '—'}</strong>
                <span className="mx-2">•</span>
                الكورس: <strong>{courses.find(course => course.id === selectedCourseId)?.name || '—'}</strong>
              </div>
              <div className="p-4 rounded-xl text-xs leading-relaxed text-slate-800 whitespace-pre-line bg-teal-500/10/30 border border-blue-100">
                {contractText}
              </div>
              <div className="p-4 rounded-xl bg-teal-500/10/60 border border-teal-500/20">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-blue-600"
                    checked={contractAccepted}
                    onChange={e => setContractAccepted(e.target.checked)}
                  />
                  <p className="text-xs text-slate-800 leading-relaxed">
                    أقر أنا <strong className="text-teal-300">ولي الأمر / الطالب</strong> بالاطلاع على جميع شروط وضوابط المرسم المذكورة أعلاه والموافقة التامة عليها.
                  </p>
                </label>
              </div>
              <button
                className="btn btn-primary w-full text-xs font-bold py-2.5"
                disabled={!contractAccepted}
                onClick={() => setStep('new-step3')}
              >
                موافق، التالي ← خطة الدفع
              </button>
            </div>
          )}

          {/* Step 3 - Payment Plan */}
          {step === 'new-step3' && (
            <div className="glass p-6 rounded-2xl border border-slate-200 space-y-5 bg-white">
              <h2 className="text-lg font-black text-slate-900">٣. خطة سداد الرسوم</h2>
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
                        <label key={plan.id} className={`p-4 rounded-xl cursor-pointer transition-all text-center border ${paymentPlan === plan.id ? 'border-teal-500/60 bg-teal-500/10/60' : 'border-slate-200 bg-slate-50'}`}>
                          <input type="radio" className="sr-only" value={plan.id} checked={paymentPlan === plan.id} onChange={() => setPaymentPlan(plan.id as 'full' | 'installments')} />
                          <p className="font-bold text-xs text-slate-900">{plan.label}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{plan.desc}</p>
                          {plan.discount && <p className="text-[10px] text-teal-300 font-bold mt-0.5">{plan.discount}</p>}
                        </label>
                      ))}
                    </div>

                    {paymentPlan === 'full' && (
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600">طريقة سداد الدفعة الكاملة:</label>
                        <select className="input text-xs" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as Payment['method'])}>
                          <option value="cash">نقداً</option>
                          <option value="transfer">تحويل بنكي</option>
                          <option value="instapay">إنستاباي</option>
                          <option value="vodafone">فودافون كاش</option>
                          <option value="card">بطاقة بنكية</option>
                        </select>
                      </div>
                    )}

                    <button
                      className="btn btn-primary w-full text-xs font-bold py-2.5"
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
