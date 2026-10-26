'use client';

import { useMarsam } from '@/lib/store';
import { useEffect, useState } from 'react';
import {
  Users, CreditCard, ShoppingBag, AlertCircle,
  ArrowUpRight, Plus, Barcode, Shield, CheckCircle, Download, Clock, Wallet
} from 'lucide-react';
import Link from 'next/link';
import { formatLocalDate } from '@/lib/dates';

export default function Dashboard() {
  const {
    students, enrollments, installments, payments, supplySales, supplyReturns,
    settings, exportDatabase
  } = useMarsam();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    // Next 16 defers current-time reads in Client Components until after prerendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(formatLocalDate(new Date()));
  }, []);

  // Financial calculations
  const totalCourseRevenue = payments.filter(p => p.status === 'valid').reduce((s, p) => s + p.amount, 0);
  const validSupplySales = supplySales.filter(sale => sale.status !== 'voided');
  const totalSuppliesSales = validSupplySales.reduce((s, p) => s + p.totalAmount, 0)
    - supplyReturns.reduce((sum, item) => sum + item.totalRefund, 0);
  const totalSuppliesProfit = validSupplySales.reduce((s, p) => s + p.profit, 0)
    - supplyReturns.reduce((sum, item) => sum + item.totalRefund - item.restockedCost, 0);
  const outstandingAmount = (installment: typeof installments[number]) => Math.max(
    0,
    (installment.originalAmount ?? installment.amount) - (installment.paidAmount ?? (installment.status === 'paid' ? installment.amount : 0))
  );
  const overdueInstallments = today ? installments.filter(installment =>
    installment.status !== 'paid' && installment.dueDate < today && outstandingAmount(installment) > 0
  ) : [];
  const upcomingInstallments = today ? installments.filter(installment =>
    installment.status !== 'paid' && installment.dueDate >= today && outstandingAmount(installment) > 0
  ) : [];
  const totalRemainingTuition = enrollments.reduce((acc, e) => acc + Math.max(0, e.totalAmount - e.totalPaid), 0);

  return (
    <div className="space-y-4">
      {/* 1. Welcome Banner */}
      <div className="p-4 md:py-4.5 md:px-6 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          {/* Right-aligned Header Information */}
          <div className="space-y-1.5 text-right flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#0D9488]/15 border border-[#0D9488]/30 text-[#2DD4BF] text-xs font-bold">
              <Shield size={13} className="text-[#2DD4BF]" />
              <span>نظام إدارة المرسم المكتبي • تخزين محلي 100%</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#F8FAFC] tracking-tight">
              لوحة إدارة <span className="text-[#2DD4BF]">{settings.name || 'مرسم الإبداع للفنون التشكيلية'}</span>
            </h1>
            <p className="text-[#94A3B8] text-xs md:text-sm max-w-2xl leading-relaxed">
              إدارة شؤون الطلاب، عقود التدريب الرسمية، الشهادات الفنية الملكية، الحضور بالباركود، ومبيعات الخامات الفنية.
            </p>
          </div>

          {/* Left-aligned Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
            <Link
              href="/students"
              prefetch={true}
              className="btn bg-[#0D9488] hover:bg-[#0F766E] text-white flex items-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl shadow-md shadow-[#0D9488]/25 transition-all"
            >
              <Plus size={15} /> تسجيل طالب وعقد جديد
            </Link>
            <Link
              href="/attendance"
              prefetch={true}
              className="btn bg-transparent hover:bg-white/5 border border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl transition-all"
            >
              <Barcode size={15} /> مسح الحضور بالسكانر
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3.5">
        {/* Total Students */}
        <Link
          href="/students"
          prefetch={true}
          className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] hover:border-[#0D9488] transition-all group shadow-sm block text-right"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#94A3B8]">إجمالي الطلاب المقيدين</span>
            <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#2DD4BF] mt-1 font-mono">{students.length}</p>
          <p className="text-xs text-[#2DD4BF] mt-1.5 font-bold flex items-center gap-1">
            <span>ملفات الطلاب والشهادات {students.length}</span>
            <ArrowUpRight size={13} />
          </p>
        </Link>

        {/* Course Revenue */}
        <Link
          href="/payments"
          prefetch={true}
          className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] hover:border-[#0D9488] transition-all group shadow-sm block text-right"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#94A3B8]">إيرادات رسوم الكورسات</span>
            <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#2DD4BF] mt-1 font-mono">{totalCourseRevenue.toLocaleString()} ج</p>
          <p className="text-xs text-[#94A3B8] mt-1.5 font-medium">
            صافي الدفعات بعد قيود الرد والتصحيح
          </p>
        </Link>

        {/* Supplies Profit */}
        <Link
          href="/supplies"
          prefetch={true}
          className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] hover:border-[#0D9488] transition-all group shadow-sm block text-right"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#94A3B8]">أرباح متجر الأدوات (صافي)</span>
            <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#2DD4BF] mt-1 font-mono">+{totalSuppliesProfit.toLocaleString()} ج</p>
          <p className="text-xs text-[#94A3B8] mt-1.5 font-medium">
            المبيعات: <strong className="font-mono text-[#F8FAFC]">{totalSuppliesSales.toLocaleString()} ج</strong>
          </p>
        </Link>

        {/* Overdue / Alerts - Matching User #450A0A & #7F1D1D */}
        <Link
          href="/payments"
          prefetch={true}
          className="p-4 rounded-2xl border border-[#7F1D1D] bg-[#450A0A] hover:border-red-500 transition-all group shadow-sm block text-right"
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#FCA5A5]">أقساط متأخرة</span>
            <div className="w-8 h-8 rounded-xl bg-[#2B0707] border border-[#7F1D1D] text-[#EF4444] flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#EF4444] mt-1 font-mono">
            {overdueInstallments.length}
          </p>
          <p className="text-xs mt-1.5 font-bold text-[#FCA5A5] flex items-center gap-1">
            <span>⚠ أقساط لها رصيد وموعدها عدى</span>
          </p>
        </Link>

        {/* Upcoming installments */}
        <Link href="/payments" prefetch={true} className="p-4 rounded-2xl border border-amber-500/40 bg-[#1B2537] hover:border-amber-400 transition-all group shadow-sm block text-right">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#FCD34D]">أقساط قادمة</span>
            <div className="w-8 h-8 rounded-xl bg-[#111827] border border-amber-500/40 text-amber-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#F59E0B] mt-1 font-mono">{upcomingInstallments.length}</p>
          <p className="text-xs text-[#FCD34D] mt-1.5 font-bold">موعدها اليوم أو لم يأتِ بعد</p>
        </Link>

        {/* Total remaining receivables, including future installments */}
        <Link href="/payments" prefetch={true} className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] hover:border-[#0D9488] transition-all group shadow-sm block text-right">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#94A3B8]">إجمالي المتبقي المستحق</span>
            <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-[#2DD4BF] mt-1 font-mono">{totalRemainingTuition.toLocaleString()} ج</p>
          <p className="text-xs text-[#94A3B8] mt-1.5 font-medium">رصيد كل الاشتراكات الحالية</p>
        </Link>
      </div>

      {/* 3 & 4. Main Two Columns */}
      <div className="grid lg:grid-cols-2 gap-4 items-stretch">
        {/* Recent Tuition Receipts (CRS) */}
        <div className="p-4.5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
              <h3 className="font-bold text-sm text-[#F8FAFC] flex items-center gap-2">
                <CreditCard size={17} className="text-[#2DD4BF]" />
                آخر إيصالات سداد الكورسات (CRS)
              </h3>
              <Link href="/payments" prefetch={true} className="text-xs text-[#2DD4BF] hover:underline font-bold">
                عرض الكل
              </Link>
            </div>

            <div className="space-y-2 mt-3">
              {payments.slice(0, 4).map(pay => {
                const enr = enrollments.find(e => e.id === pay.enrollmentId);
                const student = students.find(s => s.id === enr?.studentId);
                return (
                  <div key={pay.id} className="p-3 rounded-xl bg-[#111827] border border-[#2A3B56] flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0 pr-1 text-right">
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-mono font-bold text-[#2DD4BF] bg-[#0D9488]/20 px-2 py-0.5 rounded text-[11px] border border-[#0D9488]/40 shrink-0">
                          {pay.receiptNumber}
                        </span>
                        <strong className="text-[#F8FAFC] text-right truncate block max-w-[200px] [unicode-bidi:plaintext] dir-rtl font-bold">
                          {student?.name || 'طالب'}
                        </strong>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1 text-right">{pay.reversalOf ? 'رد / تصحيح • ' : ''}{pay.method} - {pay.date}</p>
                    </div>
                    <span className={`font-black text-sm font-mono shrink-0 mr-3 ${pay.amount < 0 ? 'text-red-400' : 'text-[#2DD4BF]'}`}>{pay.amount < 0 ? '−' : '+'}{Math.abs(pay.amount).toLocaleString()} ج</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#2A3B56] flex items-center justify-between text-xs text-[#94A3B8] mt-3">
            <span>الإيصالات الأصلية: {payments.filter(payment => !payment.reversalOf).length}</span>
            <Link href="/payments" prefetch={true} className="text-[#2DD4BF] font-bold hover:underline">
              طباعة إيصال جديد ⌵
            </Link>
          </div>
        </div>

        {/* Recent Supplies Sales (SHP) */}
        <div className="p-4.5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B56]">
              <h3 className="font-bold text-sm text-[#F8FAFC] flex items-center gap-2">
                <ShoppingBag size={17} className="text-[#2DD4BF]" />
                آخر فواتير متجر الأدوات (SHP)
              </h3>
              <Link href="/supplies" prefetch={true} className="text-xs text-[#2DD4BF] hover:underline font-bold">
                فتح نقطة البيع
              </Link>
            </div>

            <div className="space-y-2 mt-3">
              {supplySales.slice(0, 4).map(sale => {
                const returns = supplyReturns.filter(item => item.saleId === sale.id);
                const refunded = returns.reduce((sum, item) => sum + item.totalRefund, 0);
                const restockedCost = returns.reduce((sum, item) => sum + item.restockedCost, 0);
                const netAmount = sale.totalAmount - refunded;
                const netProfit = sale.profit - refunded + restockedCost;
                return (
                <div key={sale.id} className="p-3 rounded-xl bg-[#111827] border border-[#2A3B56] flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0 pr-1 text-right">
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-mono font-bold text-[#2DD4BF] bg-[#0D9488]/20 px-2 py-0.5 rounded text-[11px] border border-[#0D9488]/40 shrink-0">
                        {sale.invoiceNumber}
                      </span>
                      <strong className="text-[#F8FAFC] text-right truncate block max-w-[180px] [unicode-bidi:plaintext] dir-rtl font-bold">
                        {sale.customerName}
                      </strong>
                      <span className="badge text-[10px] shrink-0 bg-[#0D9488]/20 text-[#2DD4BF] border border-[#0D9488]/40">
                        {sale.items.length} صنف
                      </span>
                      {sale.status === 'voided' && <span className="badge badge-danger text-[10px]">ملغاة</span>}
                      {sale.status === 'partially_returned' && <span className="badge text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">مرتجع جزئي</span>}
                      {sale.status === 'returned' && <span className="badge text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">مرتجعة بالكامل</span>}
                    </div>
                    <p className="text-[11px] text-[#94A3B8] mt-1 text-right">{sale.date}{sale.status === 'voided' ? ' • أُعيدت للمخزون' : refunded > 0 ? ` • مسترد ${refunded} ج • صافي الربح: ${netProfit} ج` : ` • ربح: +${sale.profit} ج`}</p>
                  </div>
                  <span className={`font-black text-sm font-mono shrink-0 mr-3 ${sale.status === 'voided' ? 'text-slate-500 line-through' : 'text-[#2DD4BF]'}`}>{sale.status === 'voided' ? sale.totalAmount : netAmount} ج</span>
                </div>
              );})}
            </div>
          </div>

          <div className="pt-3 border-t border-[#2A3B56] flex items-center justify-between text-xs text-[#94A3B8] mt-3">
            <span>إجمالي فواتير المتجر: {supplySales.length}</span>
            <Link href="/supplies" prefetch={true} className="text-[#2DD4BF] font-bold hover:underline">
              إصدار فاتورة بيع +
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Safety & Backup Reminder Card */}
      <div className="p-3.5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0D9488]/20 border border-[#0D9488]/40 text-[#2DD4BF] flex items-center justify-center shrink-0">
            <CheckCircle size={18} />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-xs text-[#F8FAFC]">قاعدة البيانات المحلية تعمل ومحمية على القرص الصلب</h4>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              كل البيانات والشهادات وعقود التدريب تُحفظ فوراً في ملف <code className="font-mono text-[#2DD4BF]">data/data_store.json</code> محلياً وبصورة آمنة.
            </p>
          </div>
        </div>
        <button
          onClick={exportDatabase}
          className="btn bg-transparent hover:bg-white/5 border border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1.5 shrink-0 text-xs font-bold py-2 px-3.5 rounded-xl cursor-pointer transition-all"
        >
          <Download size={13} /> حفظ نسخة احتياطية
        </button>
      </div>
    </div>
  );
}
