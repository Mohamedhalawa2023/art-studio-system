'use client';
import { useState, useMemo, useEffect } from 'react';
import { useMarsam } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Pagination } from '@/components/common/Pagination';
import { PaymentReceiptModal, type CoursePaymentReceipt } from '@/components/finance/PaymentReceiptModal';
import type { Payment } from '@/lib/mockData';
import { formatLocalDate } from '@/lib/dates';
import {
  CreditCard, Plus, CheckCircle, Clock, AlertCircle, X, Printer
} from 'lucide-react';

export default function PaymentsPage() {
  const {
    payments, installments, enrollments, students, courses, groups,
    settings, currentUser, addCoursePayment, reverseCoursePayment
  } = useMarsam();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [payAmount, setPayAmount] = useState(400);
  const [payMethod, setPayMethod] = useState<'cash' | 'instapay' | 'vodafone' | 'transfer'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [receiptPage, setReceiptPage] = useState(1);
  const RECEIPTS_PER_PAGE = 15;
  const [reversalTarget, setReversalTarget] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    // Next 16 defers current-time reads in Client Components until after prerendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(formatLocalDate(new Date()));
  }, []);

  const { isSubmitting, execute: executeRecordPayment } = useAsyncAction();
  const { isSubmitting: isReversing, execute: executeReversePayment } = useAsyncAction();

  // Receipt Modal
  const [currentReceipt, setCurrentReceipt] = useState<CoursePaymentReceipt | null>(null);

  const totalCollected = payments.filter(p => p.status === 'valid').reduce((s, p) => s + p.amount, 0);
  const remainingInstallmentAmount = (installment: typeof installments[number]) => Math.max(
    0,
    (installment.originalAmount ?? installment.amount) - (installment.paidAmount ?? (installment.status === 'paid' ? installment.amount : 0))
  );
  const pendingInstallmentsCount = today ? installments.filter(i => i.dueDate >= today && remainingInstallmentAmount(i) > 0).length : 0;
  const overdueInstallmentsCount = today ? installments.filter(i => i.dueDate < today && remainingInstallmentAmount(i) > 0).length : 0;

  const paginatedPayments = useMemo(() => {
    const start = (receiptPage - 1) * RECEIPTS_PER_PAGE;
    return payments.slice(start, start + RECEIPTS_PER_PAGE);
  }, [payments, receiptPage]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentId || payAmount <= 0) return;

    await executeRecordPayment(async () => {
      try {
        const enr = enrollments.find(e => e.id === selectedEnrollmentId);
        const student = students.find(s => s.id === enr?.studentId);
        const group = groups.find(g => g.id === enr?.groupId);
        const course = courses.find(c => c.id === group?.courseId);

        const newPay = addCoursePayment({
          enrollmentId: selectedEnrollmentId,
          amount: payAmount,
          method: payMethod,
          notes: payNotes || 'سداد رسوم كورس'
        });

        setShowAddPayment(false);
        setPayNotes('');

        setCurrentReceipt({
          receiptNumber: newPay.receiptNumber,
          date: newPay.date,
          studentName: student?.name || 'الطالب',
          courseName: course?.name || 'دورة تدريبية',
          amount: newPay.amount,
          remaining: Math.max(0, (enr?.totalAmount || 0) - ((enr?.totalPaid || 0) + payAmount)),
          method: newPay.method,
          notes: newPay.notes
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل السداد';
        alert(message);
      }
    });
  };

  const handleReversePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;
    try {
      await executeReversePayment(async () => {
        reverseCoursePayment({
          paymentId: reversalTarget.id,
          reason: reversalReason.trim(),
          recordedBy: currentUser?.id || 'admin'
        });
        setReversalTarget(null);
        setReversalReason('');
      });
    } catch {
      // The store already shows the validation error to the user.
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <CreditCard size={26} className="text-[#2DD4BF]" />
            ماليات الكورسات والأقساط
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            متابعة مدفوعات اشتراكات الكورسات، وجداول الأقساط، وإصدار الإيصالات الرسمية
          </p>
        </div>
        <button
          onClick={() => {
            if (enrollments.length > 0) {
              setSelectedEnrollmentId(enrollments[0].id);
            }
            setShowAddPayment(true);
          }}
          className="btn bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center gap-2 shadow-md shadow-[#0D9488]/30 rounded-xl font-bold text-xs py-2.5 px-4 transition-all"
        >
          <Plus size={18} />
          تسجيل دفعة كورس جديدة
        </button>
      </div>

      {/* Summary KPI Cards - Matching Screenshot Order (Right to Left in RTL) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. عدد إيصالات الدفع المصدرة (Rightmost) */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm text-right">
          <p className="text-xs text-[#94A3B8] font-bold">عدد إيصالات الدفع المصدرة</p>
          <p className="text-2xl font-black text-[#2DD4BF] mt-1 font-mono">{payments.filter(payment => !payment.reversalOf).length} إيصال</p>
          <p className="text-xs text-[#94A3B8] mt-1">ترتيب الكورسات والتدريب</p>
        </div>

        {/* 2. أقساط متأخرة عن موعدها (The Warning Card) */}
        <div className="p-5 rounded-2xl border border-[#7F1D1D] bg-[#450A0A] shadow-sm text-right">
          <p className="text-xs text-[#FCA5A5] font-bold">أقساط متأخرة عن موعدها</p>
          <p className="text-2xl font-black text-[#EF4444] mt-1 font-mono">{overdueInstallmentsCount} أقساط</p>
          <p className="text-xs text-[#FCA5A5] mt-1">تتضمن زر تنبيه ولي الأمر</p>
        </div>

        {/* 3. أقساط معلقة (مستحقة قريباً) */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm text-right">
          <p className="text-xs text-[#94A3B8] font-bold">أقساط معلقة (مستحقة قريباً)</p>
          <p className="text-2xl font-black text-[#D97706] mt-1 font-mono">{pendingInstallmentsCount} أقساط</p>
          <p className="text-xs text-[#94A3B8] mt-1">لتسهيل تنبيه ولي الأمر</p>
        </div>

        {/* 4. إجمالي رسوم الكورسات المحصلة (Leftmost) */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm text-right">
          <p className="text-xs text-[#94A3B8] font-bold">إجمالي رسوم الكورسات المحصلة</p>
          <p className="text-2xl font-black text-[#2DD4BF] mt-1 font-mono">{totalCollected.toLocaleString()} ج</p>
          <p className="text-xs text-[#94A3B8] mt-1">ترقيم CRS-2026</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Installments Table (3 Cols) */}
        <div className="lg:col-span-3 p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
            <h3 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
              <Clock size={18} className="text-[#2DD4BF]" />
              جدول الأقساط واستحقاقات الطلاب
            </h3>
            <span className="badge text-xs font-mono font-bold bg-[#111827] border border-[#2A3B56] text-[#2DD4BF]">{installments.length} قسط</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {installments.map(inst => {
              const enr = enrollments.find(e => e.id === inst.enrollmentId);
              const student = students.find(s => s.id === enr?.studentId);
              const group = groups.find(g => g.id === enr?.groupId);
              const course = courses.find(c => c.id === group?.courseId);
              const installmentRemaining = remainingInstallmentAmount(inst);
              const installmentStatus = installmentRemaining <= 0
                ? 'paid'
                : today && inst.dueDate < today
                  ? 'overdue'
                  : (inst.paidAmount ?? 0) > 0
                    ? 'partial'
                    : 'pending';

              return (
                <div
                  key={inst.id}
                  className="p-3.5 rounded-xl border border-[#2A3B56] bg-[#111827] hover:border-[#0D9488]/50 flex items-center justify-between text-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${installmentStatus === 'paid' ? 'bg-[#115E59]/40 border border-[#0D9488]/40 text-[#2DD4BF]' : installmentStatus === 'overdue' ? 'bg-[#450A0A] border border-[#7F1D1D] text-[#EF4444]' : installmentStatus === 'partial' ? 'bg-[#0D9488]/20 border border-[#0D9488]/40 text-[#2DD4BF]' : 'bg-[#78350F]/40 border border-[#D97706]/40 text-[#D97706]'}`}>
                      {installmentStatus === 'paid' ? <CheckCircle size={18} /> : installmentStatus === 'overdue' ? <AlertCircle size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#F8FAFC]">{student?.name || 'طالب'}</p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {course?.name} • الاستحقاق: <strong className="font-mono text-[#F8FAFC]">{inst.dueDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="font-bold text-sm text-[#F8FAFC] font-mono">متبقي {installmentRemaining} ج</p>
                      <span className={`badge text-[10px] mt-0.5 ${installmentStatus === 'paid' ? 'bg-[#115E59] border border-[#0D9488]/40 text-[#2DD4BF] font-bold' : installmentStatus === 'overdue' ? 'bg-[#450A0A] border border-[#7F1D1D] text-[#EF4444] font-bold' : installmentStatus === 'partial' ? 'bg-[#115E59]/40 border border-[#0D9488]/40 text-[#2DD4BF] font-bold' : 'bg-[#78350F] border border-[#D97706]/40 text-[#D97706] font-bold'}`}>
                        {installmentStatus === 'paid' ? 'تم السداد' : installmentStatus === 'overdue' ? 'متأخر ⚠️' : installmentStatus === 'partial' ? 'سداد جزئي' : 'قادم / مستحق اليوم'}
                      </span>
                    </div>

                    {installmentRemaining > 0 && enr && (
                      <button
                        onClick={() => {
                          setSelectedEnrollmentId(enr.id);
                          setPayAmount(installmentRemaining);
                          setShowAddPayment(true);
                        }}
                        className="btn bg-[#0D9488] hover:bg-[#0F766E] text-white btn-sm text-xs py-1.5 px-3.5 rounded-xl font-bold shadow-sm shadow-[#0D9488]/25 transition-all"
                      >
                        سداد الآن
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payments History (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-base text-[#F8FAFC] flex items-center gap-2">
              <CreditCard size={18} className="text-teal-400" />
              سجل إيصالات السداد (CRS)
            </h3>
            <span className="text-xs text-[#94A3B8] font-bold">{payments.filter(payment => !payment.reversalOf).length} إيصال</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {paginatedPayments.map(pay => {
              const enr = enrollments.find(e => e.id === pay.enrollmentId);
              const student = students.find(s => s.id === enr?.studentId);
              const group = groups.find(g => g.id === enr?.groupId);
              const course = courses.find(c => c.id === group?.courseId);
              const linkedReversal = pay.reversalOf ? undefined : payments.find(payment => payment.reversalOf === pay.id);
              const reversedPayment = pay.reversalOf ? payments.find(payment => payment.id === pay.reversalOf) : undefined;

              return (
                <div key={pay.id} className="p-3 rounded-xl bg-[#111827] border border-[#2A3B56] hover:border-[#0D9488]/40 text-xs space-y-2 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[#2DD4BF] bg-[#0D9488]/20 border border-[#0D9488]/40 px-2 py-0.5 rounded text-[11px]">
                        {pay.receiptNumber}
                      </span>
                      <strong className="text-[#F8FAFC] font-bold mr-2">{student?.name}</strong>
                    </div>
                    <span className={`font-black text-sm font-mono ${pay.amount < 0 ? 'text-red-400' : linkedReversal ? 'text-slate-400 line-through' : 'text-[#2DD4BF]'}`}>
                      {pay.amount < 0 ? '−' : ''}{Math.abs(pay.amount)} ج
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#94A3B8] text-[11px]">
                    <span>{course?.name} • {pay.date}</span>
                    {pay.reversalOf ? (
                      <span className="text-red-300">رد إيصال {reversedPayment?.receiptNumber || ''}</span>
                    ) : linkedReversal ? (
                      <span className="text-red-300">تم الرد بسبب: {linkedReversal.reversalReason}</span>
                    ) : pay.status !== 'valid' ? (
                      <span className="text-red-300">إيصال ملغي</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCurrentReceipt({
                            receiptNumber: pay.receiptNumber,
                            date: pay.date,
                            studentName: student?.name || 'الطالب',
                            courseName: course?.name || 'دورة تدريبية',
                            amount: pay.amount,
                            remaining: Math.max(0, (enr?.totalAmount || 0) - (enr?.totalPaid || 0)),
                            method: pay.method,
                            notes: pay.notes
                          })}
                          className="text-[#2DD4BF] hover:text-teal-200 flex items-center gap-1 font-bold"
                        >
                          <Printer size={12} className="text-[#2DD4BF]" /> طباعة الإيصال
                        </button>
                        <button
                          onClick={() => { setReversalTarget(pay); setReversalReason(''); }}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          رد / تصحيح
                        </button>
                      </div>
                    )}
                  </div>
                  {pay.reversalReason && <p className="text-[11px] text-red-300">سبب الرد: {pay.reversalReason}</p>}
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={receiptPage}
            totalItems={payments.length}
            pageSize={RECEIPTS_PER_PAGE}
            onPageChange={setReceiptPage}
            className="pt-2 border-t border-[#2A3B56]"
          />
        </div>
      </div>

      {/* ================= MODAL: ADD PAYMENT ================= */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-[#0E1629]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B2537] border border-[#2A3B56] text-[#F8FAFC] shadow-2xl p-6 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
              <h3 className="font-bold text-lg text-[#F8FAFC] flex items-center gap-2">
                <CreditCard size={20} className="text-teal-400" />
                تسجيل دفعة رسوم دورة تدريبية
              </h3>
              <button onClick={() => setShowAddPayment(false)} className="text-[#94A3B8] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">اختر الطالب / الكورس:</label>
                <select
                  className="input text-xs"
                  value={selectedEnrollmentId}
                  onChange={e => setSelectedEnrollmentId(e.target.value)}
                  required
                >
                  {enrollments.map(e => {
                    const student = students.find(s => s.id === e.studentId);
                    const group = groups.find(g => g.id === e.groupId);
                    const course = courses.find(c => c.id === group?.courseId);
                    const remaining = Math.max(0, e.totalAmount - e.totalPaid);
                    return (
                      <option key={e.id} value={e.id}>
                        {student?.name} — {course?.name} (متبقي: {remaining} ج)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">المبلغ المطلوب سداده الآن (ج):</label>
                <input
                  type="number"
                  className="input text-base font-bold text-teal-300"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">طريقة الدفع:</label>
                <select
                  className="input text-xs"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as typeof payMethod)}
                >
                  <option value="cash">نقداً (كاش للخزنة)</option>
                  <option value="instapay">انستاباي (InstaPay)</option>
                  <option value="vodafone">فودافون كاش</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold mb-1">ملاحظات على الإيصال:</label>
                <input
                  className="input text-xs"
                  placeholder="مثال: سداد القسط الثاني نقداً"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary flex-1 py-2.5 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? 'جاري إصدار الإيصال...' : 'إصدار الإيصال وطباعته'}
                </button>
                <button type="button" onClick={() => setShowAddPayment(false)} className="btn btn-secondary">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1629]/80 p-4 backdrop-blur-sm">
          <form onSubmit={handleReversePayment} className="w-full max-w-md space-y-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-6 text-[#F8FAFC] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#2A3B56] pb-3">
              <div>
                <h3 className="font-bold text-lg">رد / تصحيح إيصال سداد</h3>
                <p className="mt-1 text-xs text-[#94A3B8]">{reversalTarget.receiptNumber} • {reversalTarget.amount.toLocaleString()} ج</p>
              </div>
              <button type="button" onClick={() => setReversalTarget(null)} className="text-[#94A3B8] hover:text-white" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-[#CBD5E1]">
              سيُحفظ الإيصال الأصلي ويُضاف له قيد عكسي بالمبلغ نفسه. اكتب سبب الرد ليظهر في سجل الحركات.
            </p>
            <div>
              <label htmlFor="payment-reversal-reason" className="mb-1 block text-xs font-bold text-[#CBD5E1]">سبب الرد أو التصحيح</label>
              <textarea
                id="payment-reversal-reason"
                className="input min-h-24 w-full text-sm"
                minLength={3}
                maxLength={300}
                required
                value={reversalReason}
                onChange={event => setReversalReason(event.target.value)}
                placeholder="مثال: تسجيل مبلغ غير صحيح بالخطأ"
              />
            </div>
            <div className="flex gap-2 border-t border-[#2A3B56] pt-3">
              <button type="submit" disabled={isReversing || reversalReason.trim().length < 3} className="btn flex-1 bg-red-600 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isReversing ? 'جاري تسجيل الرد...' : 'تأكيد الرد وتسجيله'}
              </button>
              <button type="button" onClick={() => setReversalTarget(null)} className="btn btn-secondary">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE RECEIPT ================= */}
      {currentReceipt && (
        <PaymentReceiptModal
          receipt={currentReceipt}
          settings={settings}
          onClose={() => setCurrentReceipt(null)}
        />
      )}
    </div>
  );
}
