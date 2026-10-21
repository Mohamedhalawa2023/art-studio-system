'use client';
import { useState } from 'react';
import { useMarsam } from '@/lib/store';
import { FileText, CheckCircle, Clock, AlertCircle, Plus, Eye } from 'lucide-react';

export default function EnrollmentsPage() {
  const { enrollments, students, groups, courses, installments, settings } = useMarsam();

  const [step, setStep] = useState<'list' | 'new-step1' | 'new-step2' | 'new-step3'>('list');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'installments'>('installments');

  const contractText = settings.contractTerms || `بنود التعاقد مع مرسم الإبداع:
١. يلتزم الطالب بحضور الحصص في المواعيد المحددة.
٢. في حال الغياب يُرجى الإخطار المسبق.
٣. سياسة الإلغاء: استرداد كامل قبل أول حصة بـ 3 أيام، 50% بعد الحصة الأولى، ولا استرداد بعدها.
٤. الرسوم تُدفع حسب جدول الأقساط المتفق عليه.
٥. المرسم مسؤول عن توفير بيئة تعليمية آمنة ومعتمدة.`;

  const uniqueCourses = courses;

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
          <button className="btn btn-primary text-xs font-bold" onClick={() => setStep('new-step1')}>
            <Plus size={15} />
            حجز جديد
          </button>
        )}
        {step !== 'list' && (
          <button className="btn btn-secondary text-xs font-bold" onClick={() => { setStep('list'); setContractAccepted(false); }}>
            ← رجوع للقائمة
          </button>
        )}
      </div>

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
                            <span className="badge badge-teal flex items-center gap-1 w-fit"><CheckCircle size={10} />موقّع إلكترونياً</span>
                          ) : (
                            <span className="badge badge-danger w-fit">غير موقّع</span>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
              <h2 className="text-lg font-black text-slate-900">١. اختيار الكورس والمجموعة</h2>
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
                    {groups.filter(g => g.courseId === selectedCourseId).map(group => {
                      const available = (group.capacity || 10) - (group.enrolled || 0);
                      return (
                        <label key={group.id} className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selectedGroupId === group.id ? 'border-teal-500/60 bg-teal-500/10/60' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input type="radio" className="sr-only" value={group.id} checked={selectedGroupId === group.id} onChange={() => setSelectedGroupId(group.id)} />
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
                disabled={!selectedCourseId || !selectedGroupId}
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
                        { id: 'full', label: 'سداد كامل', desc: `${price.toLocaleString()} ج دفعة واحدة`, discount: '(خصم 5%)' },
                        { id: 'installments', label: 'تقسيط ميسر', desc: `3 أقساط × ${Math.round(price/3).toLocaleString()} ج`, discount: '' },
                      ].map(plan => (
                        <label key={plan.id} className={`p-4 rounded-xl cursor-pointer transition-all text-center border ${paymentPlan === plan.id ? 'border-teal-500/60 bg-teal-500/10/60' : 'border-slate-200 bg-slate-50'}`}>
                          <input type="radio" className="sr-only" value={plan.id} checked={paymentPlan === plan.id} onChange={() => setPaymentPlan(plan.id as any)} />
                          <p className="font-bold text-xs text-slate-900">{plan.label}</p>
                          <p className="text-[11px] text-slate-500 mt-1">{plan.desc}</p>
                          {plan.discount && <p className="text-[10px] text-teal-300 font-bold mt-0.5">{plan.discount}</p>}
                        </label>
                      ))}
                    </div>

                    <button
                      className="btn btn-primary w-full text-xs font-bold py-2.5"
                      onClick={() => {
                        alert('✅ تم تأكيد خطة السداد وإتمام الحجز!');
                        setStep('list');
                        setContractAccepted(false);
                      }}
                    >
                      <CheckCircle size={16} />
                      تأكيد وحفظ الحجز
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
