'use client';
import { useState } from 'react';
import {
  mockEnrollments, mockStudents, mockGroups, mockInstallments,
  getCourse, getStudent, getGroup
} from '@/lib/mockData';
import { FileText, CheckCircle, Clock, AlertCircle, Plus, Eye } from 'lucide-react';

const contractText = `بنود التعاقد مع مرسم:
١. يلتزم الطالب بحضور الحصص في المواعيد المحددة.
٢. في حال الغياب يُرجى الإخطار المسبق.
٣. سياسة الإلغاء: استرداد كامل قبل أول حصة بـ 3 أيام، 50% حتى الحصة الثانية، ولا استرداد بعدها.
٤. الرسوم تُدفع حسب الجدول المتفق عليه.
٥. المرسم غير مسؤول عن فقدان الأدوات أو الأعمال الشخصية.
٦. يحق لإدارة المرسم الاحتفاظ بصور الأعمال لأغراض تعليمية بموافقة ولي الأمر.`;

export default function EnrollmentsPage() {
  const [step, setStep] = useState<'list' | 'new-step1' | 'new-step2' | 'new-step3'>('list');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'installments'>('installments');

  const uniqueCourseIds = [...new Set(mockGroups.map(g => g.courseId))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">الحجوزات والعقود</h1>
          <p className="text-slate-400 text-sm mt-1">{mockEnrollments.length} حجز مسجل</p>
        </div>
        {step === 'list' && (
          <button className="btn btn-primary" onClick={() => setStep('new-step1')}>
            <Plus size={16} />
            حجز جديد
          </button>
        )}
        {step !== 'list' && (
          <button className="btn btn-secondary" onClick={() => { setStep('list'); setContractAccepted(false); }}>
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
              { label: 'مكتملة', count: mockEnrollments.filter(e => e.paymentStatus === 'completed').length, color: '#10b981' },
              { label: 'جزئية', count: mockEnrollments.filter(e => e.paymentStatus === 'partial').length, color: '#f59e0b' },
              { label: 'متأخرة', count: mockEnrollments.filter(e => e.paymentStatus === 'overdue').length, color: '#ef4444' },
              { label: 'لم تدفع', count: mockEnrollments.filter(e => e.paymentStatus === 'unpaid').length, color: '#64748b' },
            ].map(s => (
              <div key={s.label} className="glass p-4 text-center">
                <p className="text-3xl font-black" style={{ color: s.color }}>{s.count}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="glass table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الكورس</th>
                  <th>المجموعة</th>
                  <th>العقد</th>
                  <th>حالة الدفع</th>
                  <th>المدفوع</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {mockEnrollments.map(enrollment => {
                  const student = getStudent(enrollment.studentId);
                  const group = getGroup(enrollment.groupId);
                  const course = getCourse(group?.courseId || '');
                  return (
                    <tr key={enrollment.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                            {student?.name.charAt(0)}
                          </div>
                          <span className="font-medium">{student?.name}</span>
                        </div>
                      </td>
                      <td>{course?.name}</td>
                      <td className="text-slate-400 text-xs">{group?.schedule}</td>
                      <td>
                        {enrollment.contractSigned
                          ? <span className="badge badge-success flex items-center gap-1 w-fit"><CheckCircle size={10} />موقّع</span>
                          : <span className="badge badge-danger w-fit">غير موقّع</span>}
                      </td>
                      <td>
                        <span className={`badge ${
                          enrollment.paymentStatus === 'completed' ? 'badge-success' :
                          enrollment.paymentStatus === 'partial' ? 'badge-warning' :
                          enrollment.paymentStatus === 'overdue' ? 'badge-danger' : 'badge-gray'
                        }`}>
                          {enrollment.paymentStatus === 'completed' ? 'مكتمل' :
                           enrollment.paymentStatus === 'partial' ? 'جزئي' :
                           enrollment.paymentStatus === 'overdue' ? 'متأخر' : 'لم يدفع'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-semibold">{enrollment.totalPaid.toLocaleString()} ج</p>
                          <p className="text-xs text-slate-500">من {enrollment.totalAmount.toLocaleString()} ج</p>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm">
                          <Eye size={12} />
                          التفاصيل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              { id: 'new-step2', label: 'العقد والموافقة' },
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
                      done ? 'bg-green-500 text-white' : current ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-500'
                    }`}>
                      {done ? <CheckCircle size={16} /> : thisNum}
                    </div>
                    <p className="text-xs text-center" style={{ color: current ? '#a78bfa' : '#64748b' }}>{s.label}</p>
                  </div>
                  {i < 2 && <div className={`h-0.5 w-8 -mt-4 ${done ? 'bg-green-500' : 'bg-white/10'}`} />}
                </div>
              );
            })}
          </div>

          {/* Step 1 - Course & Group Selection */}
          {step === 'new-step1' && (
            <div className="glass p-6 space-y-6 fade-in">
              <h2 className="text-xl font-bold">اختيار الكورس والمجموعة</h2>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">الكورس</label>
                <select className="input" value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedGroupId(''); }}>
                  <option value="">اختر الكورس...</option>
                  {uniqueCourseIds.map(id => {
                    const course = getCourse(id);
                    return <option key={id} value={id}>{course?.name} — {course?.price.toLocaleString()} ج</option>;
                  })}
                </select>
              </div>
              {selectedCourseId && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">المجموعة</label>
                  <div className="grid gap-3">
                    {mockGroups.filter(g => g.courseId === selectedCourseId).map(group => {
                      const available = group.capacity - group.enrolled;
                      return (
                        <label key={group.id} className={`p-4 rounded-xl cursor-pointer transition-all ${selectedGroupId === group.id ? 'ring-2 ring-violet-500 bg-violet-500/10' : 'bg-white/5 hover:bg-white/10'}`}>
                          <input type="radio" className="sr-only" value={group.id} checked={selectedGroupId === group.id} onChange={() => setSelectedGroupId(group.id)} />
                          <div className="flex justify-between">
                            <div>
                              <p className="font-semibold">{group.schedule}</p>
                              <p className="text-xs text-slate-400">{group.room}</p>
                            </div>
                            <span className={`badge ${available > 0 ? 'badge-success' : 'badge-danger'}`}>
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
                className="btn btn-primary w-full"
                disabled={!selectedCourseId || !selectedGroupId}
                onClick={() => setStep('new-step2')}
              >
                التالي ← عرض العقد
              </button>
            </div>
          )}

          {/* Step 2 - Contract */}
          {step === 'new-step2' && (
            <div className="glass p-6 space-y-5 fade-in">
              <div className="flex items-center gap-3">
                <FileText size={24} className="text-violet-400" />
                <h2 className="text-xl font-bold">بنود التعاقد</h2>
              </div>
              <div className="p-4 rounded-xl text-sm leading-8 text-slate-300 whitespace-pre-line" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {contractText}
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-violet-500"
                    checked={contractAccepted}
                    onChange={e => setContractAccepted(e.target.checked)}
                  />
                  <p className="text-sm text-slate-300 leading-6">
                    أقر أنا <strong className="text-violet-300">ولي الأمر / الطالب</strong> بقراءة جميع البنود المذكورة أعلاه والموافقة عليها. هذه الموافقة الإلكترونية لها نفس القيمة القانونية للتوقيع الورقي.
                    <br /><span className="text-xs text-slate-500">الإصدار: v2.0 — {new Date().toLocaleDateString('ar-EG')}</span>
                  </p>
                </label>
              </div>
              <button
                className="btn btn-primary w-full"
                disabled={!contractAccepted}
                onClick={() => setStep('new-step3')}
              >
                موافق، التالي ← خطة الدفع
              </button>
            </div>
          )}

          {/* Step 3 - Payment Plan */}
          {step === 'new-step3' && (
            <div className="glass p-6 space-y-5 fade-in">
              <h2 className="text-xl font-bold">خطة الدفع</h2>
              {(() => {
                const course = getCourse(selectedCourseId);
                const price = course?.price || 1200;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'full', label: 'دفع كامل', desc: `${price.toLocaleString()} ج مرة واحدة`, discount: '(خصم 5%)' },
                        { id: 'installments', label: 'أقساط', desc: `3 أقساط × ${Math.round(price/3).toLocaleString()} ج`, discount: '' },
                      ].map(plan => (
                        <label key={plan.id} className={`p-4 rounded-xl cursor-pointer transition-all text-center ${paymentPlan === plan.id ? 'ring-2 ring-violet-500 bg-violet-500/10' : 'bg-white/5 hover:bg-white/10'}`}>
                          <input type="radio" className="sr-only" value={plan.id} checked={paymentPlan === plan.id} onChange={() => setPaymentPlan(plan.id as any)} />
                          <p className="font-bold">{plan.label}</p>
                          <p className="text-sm text-slate-400 mt-1">{plan.desc}</p>
                          {plan.discount && <p className="text-xs text-green-400 mt-0.5">{plan.discount}</p>}
                        </label>
                      ))}
                    </div>

                    {paymentPlan === 'installments' && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-300">جدول الأقساط:</p>
                        {[1,2,3].map(n => (
                          <div key={n} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <span className="text-sm">القسط {n}</span>
                            <span className="text-sm text-slate-400">عند بداية الشهر {n}</span>
                            <span className="font-bold text-violet-400">{Math.round(price/3).toLocaleString()} ج</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button className="btn btn-primary w-full" onClick={() => { alert('✅ تم تسجيل الحجز بنجاح!'); setStep('list'); setContractAccepted(false); }}>
                      <CheckCircle size={16} />
                      تأكيد الحجز
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
