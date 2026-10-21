'use client';
import { useState, useMemo } from 'react';
import { useMarsam } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Pagination } from '@/components/common/Pagination';
import {
  CreditCard, Plus, CheckCircle, Clock, AlertCircle, Banknote,
  Smartphone, ArrowRightLeft, X, Printer, Search, Calendar, ShieldCheck
} from 'lucide-react';

const methodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote size={14} />,
  instapay: <Smartphone size={14} />,
  vodafone: <Smartphone size={14} />,
  transfer: <ArrowRightLeft size={14} />,
};

const methodLabel: Record<string, string> = {
  cash: 'نقداً (كاش)',
  instapay: 'انستاباي',
  vodafone: 'فودافون كاش',
  transfer: 'تحويل بنكي',
};

export default function PaymentsPage() {
  const {
    payments, installments, enrollments, students, courses, groups,
    settings, addCoursePayment
  } = useMarsam();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [payAmount, setPayAmount] = useState(400);
  const [payMethod, setPayMethod] = useState<'cash' | 'instapay' | 'vodafone' | 'transfer'>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [search, setSearch] = useState('');
  const [receiptPage, setReceiptPage] = useState(1);
  const RECEIPTS_PER_PAGE = 15;

  const { isSubmitting, execute: executeRecordPayment } = useAsyncAction();

  // Receipt Modal
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);

  const totalCollected = payments.filter(p => p.status === 'valid').reduce((s, p) => s + p.amount, 0);
  const pendingInstallmentsCount = installments.filter(i => i.status === 'pending').length;
  const overdueInstallmentsCount = installments.filter(i => i.status === 'overdue').length;

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
      } catch (err: any) {
        alert(err.message || 'حدث خطأ أثناء تسجيل السداد');
      }
    });
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
          <p className="text-2xl font-black text-[#2DD4BF] mt-1 font-mono">{payments.length} إيصال</p>
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
          <p className="text-2xl font-black text-[#D97706] mt-1 font-mono">{totalCollected.toLocaleString()} ج</p>
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

              return (
                <div
                  key={inst.id}
                  className="p-3.5 rounded-xl border border-[#2A3B56] bg-[#111827] hover:border-[#0D9488]/50 flex items-center justify-between text-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${inst.status === 'paid' ? 'bg-[#115E59]/40 border border-[#0D9488]/40 text-[#2DD4BF]' : inst.status === 'overdue' ? 'bg-[#450A0A] border border-[#7F1D1D] text-[#EF4444]' : 'bg-[#78350F]/40 border border-[#D97706]/40 text-[#D97706]'}`}>
                      {inst.status === 'paid' ? <CheckCircle size={18} /> : inst.status === 'overdue' ? <AlertCircle size={18} /> : <Clock size={18} />}
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
                      <p className="font-bold text-sm text-[#F8FAFC] font-mono">{inst.amount} ج</p>
                      <span className={`badge text-[10px] mt-0.5 ${inst.status === 'paid' ? 'bg-[#115E59] border border-[#0D9488]/40 text-[#2DD4BF] font-bold' : inst.status === 'overdue' ? 'bg-[#450A0A] border border-[#7F1D1D] text-[#EF4444] font-bold' : 'bg-[#78350F] border border-[#D97706]/40 text-[#D97706] font-bold'}`}>
                        {inst.status === 'paid' ? 'تم السداد' : inst.status === 'overdue' ? 'متأخر ⚠️' : 'قيد الانتظار'}
                      </span>
                    </div>

                    {inst.status !== 'paid' && enr && (
                      <button
                        onClick={() => {
                          setSelectedEnrollmentId(enr.id);
                          setPayAmount(inst.amount);
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
            <span className="text-xs text-[#94A3B8] font-bold">{payments.length} إيصال</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {paginatedPayments.map(pay => {
              const enr = enrollments.find(e => e.id === pay.enrollmentId);
              const student = students.find(s => s.id === enr?.studentId);
              const group = groups.find(g => g.id === enr?.groupId);
              const course = courses.find(c => c.id === group?.courseId);

              return (
                <div key={pay.id} className="p-3 rounded-xl bg-[#111827] border border-[#2A3B56] hover:border-[#0D9488]/40 text-xs space-y-2 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[#2DD4BF] bg-[#0D9488]/20 border border-[#0D9488]/40 px-2 py-0.5 rounded text-[11px]">
                        {pay.receiptNumber}
                      </span>
                      <strong className="text-[#F8FAFC] font-bold mr-2">{student?.name}</strong>
                    </div>
                    <span className="font-black text-sm text-[#2DD4BF] font-mono">{pay.amount} ج</span>
                  </div>

                  <div className="flex items-center justify-between text-[#94A3B8] text-[11px]">
                    <span>{course?.name} • {pay.date}</span>
                    <button
                      onClick={() => setCurrentReceipt({
                        receiptNumber: pay.receiptNumber,
                        date: pay.date,
                        studentName: student?.name,
                        courseName: course?.name,
                        amount: pay.amount,
                        remaining: Math.max(0, (enr?.totalAmount || 0) - (enr?.totalPaid || 0)),
                        method: pay.method,
                        notes: pay.notes
                      })}
                      className="text-[#D97706] hover:text-[#F59E0B] flex items-center gap-1 font-bold"
                    >
                      <Printer size={12} className="text-[#D97706]" /> طباعة الإيصال
                    </button>
                  </div>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-[#F8FAFC] flex items-center gap-2">
                <CreditCard size={20} className="text-teal-400" />
                تسجيل دفعة رسوم دورة تدريبية
              </h3>
              <button onClick={() => setShowAddPayment(false)} className="text-[#94A3B8] hover:text-slate-700">
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
                  onChange={e => setPayMethod(e.target.value as any)}
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

      {/* ================= MODAL: PRINTABLE RECEIPT ================= */}
      {currentReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setCurrentReceipt(null)}
              className="absolute top-4 left-4 text-[#94A3B8] hover:text-slate-800"
            >
              <X size={20} />
            </button>

            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-black text-slate-900">{settings.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">إيصال سداد رسوم دورة تدريبية</p>
                <p className="text-xs text-[#94A3B8]">{settings.address} • {settings.phone}</p>
                <div className="mt-2 inline-block bg-teal-500/10 px-3 py-1 rounded text-xs font-mono font-bold text-teal-300 border border-teal-500/20">
                  إيصال رقم: {currentReceipt.receiptNumber}
                </div>
              </div>

              <div className="text-xs space-y-2 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span>اسم الطالب:</span>
                  <strong className="text-slate-900">{currentReceipt.studentName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>الدورة التدريبية:</span>
                  <span className="font-semibold">{currentReceipt.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span>{currentReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة السداد:</span>
                  <span>{methodLabel[currentReceipt.method] || currentReceipt.method}</span>
                </div>
                {currentReceipt.notes && (
                  <div className="flex justify-between text-slate-500">
                    <span>ملاحظات:</span>
                    <span>{currentReceipt.notes}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b py-3 flex justify-between items-center">
                <span className="font-black text-sm text-slate-900">المبلغ المدفوع:</span>
                <span className="font-black text-2xl text-teal-300 font-mono">{currentReceipt.amount} ج</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>المتبقي بعد هذا السداد:</span>
                <strong className="text-red-600 font-mono text-sm">{currentReceipt.remaining} ج</strong>
              </div>

              <p className="text-center text-[10px] text-[#94A3B8] pt-2 border-t">
                هذا الإيصال مسجل ومعتمد رسمي بنظام الإدارة المالي لمرسم الإبداع
              </p>
            </div>

            <div className="mt-5 pt-3 border-t flex gap-2">
              <button
                onClick={() => window.print()}
                className="btn btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                <Printer size={16} /> طباعة الإيصال (حراري / A5)
              </button>
              <button onClick={() => setCurrentReceipt(null)} className="btn btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
