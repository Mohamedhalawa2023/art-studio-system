'use client';
import { useMarsam } from '@/lib/store';
import {
  Users, CreditCard, QrCode, ShoppingBag, Settings,
  AlertCircle, CheckCircle, Clock, ArrowUpRight, Palette,
  TrendingUp, Download, Plus, Barcode, Shield, Award, Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const {
    students, enrollments, payments, supplySales, supplyItems,
    settings, exportDatabase
  } = useMarsam();

  // Financial calculations
  const totalCourseRevenue = payments.filter(p => p.status === 'valid').reduce((s, p) => s + p.amount, 0);
  const totalSuppliesSales = supplySales.reduce((s, p) => s + p.totalAmount, 0);
  const totalSuppliesProfit = supplySales.reduce((s, p) => s + p.profit, 0);
  const overdueEnrollments = enrollments.filter(e => e.paymentStatus === 'overdue' || (e.totalAmount - e.totalPaid > 0 && e.paymentStatus === 'unpaid'));
  const totalRemainingTuition = enrollments.reduce((acc, e) => acc + Math.max(0, e.totalAmount - e.totalPaid), 0);
  const lowStockItems = supplyItems.filter(i => i.stockQty <= i.minStock);

  return (
    <div className="space-y-4">
      {/* 1. Welcome Banner - Strict RTL Alignment & Balanced Left Actions */}
      <div className="p-4 md:py-4.5 md:px-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          {/* Right-aligned Header Information */}
          <div className="space-y-1.5 text-right flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold">
              <Shield size={13} className="text-blue-600" />
              <span>نظام إدارة المرسم المكتبي • تخزين محلي 100%</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              لوحة إدارة <span className="text-blue-600 dark:text-blue-400">{settings.name || 'مرسم الإبداع'}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              إدارة شؤون الطلاب، عقود التدريب الرسمية، الشهادات الفنية الملكية، الحضور بالباركود، ومبيعات الخامات الفنية.
            </p>
          </div>

          {/* Left-aligned Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
            <Link
              href="/students"
              prefetch={true}
              className="btn btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 shadow-xs"
            >
              <Plus size={15} /> تسجيل طالب وعقد جديد
            </Link>
            <Link
              href="/attendance"
              prefetch={true}
              className="btn btn-secondary flex items-center gap-1.5 text-xs font-bold py-2 px-3.5"
            >
              <Barcode size={15} /> مسح الحضور بالسكانر
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPI Stats Grid - Tightened Padding & Warning Alert Highlight */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Students */}
        <Link href="/students" prefetch={true} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] hover:border-blue-500 transition-all group shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الطلاب المقيدين</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-1">{students.length}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 font-bold flex items-center gap-1">
            <span>ملفات الطلاب والشهادات</span>
            <ArrowUpRight size={13} />
          </p>
        </Link>

        {/* Course Revenue */}
        <Link href="/payments" prefetch={true} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] hover:border-blue-500 transition-all group shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إيرادات رسوم الكورسات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-blue-700 dark:text-blue-300 mt-1 font-mono">{totalCourseRevenue.toLocaleString()} ج</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            متبقي أقساط: <strong className="text-blue-600 dark:text-blue-400 font-mono">{totalRemainingTuition.toLocaleString()} ج</strong>
          </p>
        </Link>

        {/* Supplies Profit */}
        <Link href="/supplies" prefetch={true} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] hover:border-blue-500 transition-all group shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أرباح متجر الأدوات (صافي)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-blue-700 dark:text-blue-300 mt-1 font-mono">+{totalSuppliesProfit.toLocaleString()} ج</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            المبيعات: <strong className="font-mono text-slate-800 dark:text-slate-200">{totalSuppliesSales.toLocaleString()} ج</strong>
          </p>
        </Link>

        {/* Overdue / Alerts - Highlighted with Warning Color (#EF4444) */}
        <Link
          href="/payments"
          prefetch={true}
          className={`p-4 rounded-2xl border transition-all group shadow-xs ${
            overdueEnrollments.length > 0
              ? 'border-rose-300 bg-rose-50/40 hover:border-rose-500'
              : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] hover:border-blue-500'
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className={`text-xs font-bold ${overdueEnrollments.length > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              أقساط متأخرة
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
              overdueEnrollments.length > 0
                ? 'bg-rose-100 text-rose-600 border border-rose-200'
                : 'bg-blue-50 text-blue-600'
            }`}>
              <AlertCircle size={16} />
            </div>
          </div>
          <p className={`text-2xl md:text-3xl font-black mt-1 font-mono ${
            overdueEnrollments.length > 0 ? 'text-rose-600' : 'text-slate-900'
          }`}>
            {overdueEnrollments.length}
          </p>
          <p className={`text-xs mt-1.5 font-bold ${
            overdueEnrollments.length > 0 ? 'text-rose-600' : 'text-blue-600'
          }`}>
            {overdueEnrollments.length > 0 ? '⚠️ يتطلب المتابعة والتحصيل' : 'لا توجد متأخرات'}
          </p>
        </Link>
      </div>

      {/* 3 & 4. Main Two Columns - Equal Height, Equal 4 Items, & Strict RTL Text Alignment */}
      <div className="grid lg:grid-cols-2 gap-4 items-stretch">
        {/* Recent Tuition Receipts (CRS) */}
        <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard size={17} className="text-blue-600" />
                آخر إيصالات سداد الكورسات (CRS)
              </h3>
              <Link href="/payments" prefetch={true} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold">
                عرض الكل
              </Link>
            </div>

            <div className="space-y-2 mt-3">
              {payments.slice(0, 4).map(pay => {
                const enr = enrollments.find(e => e.id === pay.enrollmentId);
                const student = students.find(s => s.id === enr?.studentId);
                return (
                  <div key={pay.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0 pr-1 text-right">
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200 shrink-0">
                          {pay.receiptNumber}
                        </span>
                        <strong className="text-slate-900 text-right truncate block max-w-[200px] [unicode-bidi:plaintext] dir-rtl">
                          {student?.name || 'طالب'}
                        </strong>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 text-right">{pay.date} • {pay.method}</p>
                    </div>
                    <span className="font-black text-sm text-blue-700 font-mono shrink-0 mr-3">+{pay.amount} ج</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>إجمالي الإيصالات المسجلة: {payments.length}</span>
            <Link href="/payments" prefetch={true} className="text-blue-600 font-bold hover:underline">
              طباعة إيصال جديد ←
            </Link>
          </div>
        </div>

        {/* Recent Supplies Sales (SHP) */}
        <div className="p-4.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag size={17} className="text-blue-600" />
                آخر فواتير متجر الأدوات (SHP)
              </h3>
              <Link href="/supplies" prefetch={true} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold">
                فتح نقطة البيع
              </Link>
            </div>

            <div className="space-y-2 mt-3">
              {supplySales.slice(0, 4).map(sale => (
                <div key={sale.id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0 pr-1 text-right">
                    <div className="flex items-center gap-2 text-right">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200 shrink-0">
                        {sale.invoiceNumber}
                      </span>
                      <strong className="text-slate-900 text-right truncate block max-w-[180px] [unicode-bidi:plaintext] dir-rtl">
                        {sale.customerName}
                      </strong>
                      <span className="badge badge-blue text-[10px] shrink-0">
                        {sale.items.length} صنف
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 text-right">{sale.date} • ربح: +{sale.profit} ج</p>
                  </div>
                  <span className="font-black text-sm text-blue-700 font-mono shrink-0 mr-3">{sale.totalAmount} ج</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>إجمالي فواتير المتجر: {supplySales.length}</span>
            <Link href="/supplies" prefetch={true} className="text-blue-600 font-bold hover:underline">
              إصدار فاتورة بيع ←
            </Link>
          </div>
        </div>
      </div>

      {/* Safety & Backup Reminder Card */}
      <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle size={18} />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white">قاعدة البيانات المحلية تعمل ومحمية على القرص الصلب</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              كل الحركات والشهادات والعقود تُحفظ فوراً في ملف <code className="font-mono text-blue-700 dark:text-blue-300">data/data_store.json</code> محلياً وتعمل بدون إنترنت.
            </p>
          </div>
        </div>
        <button
          onClick={exportDatabase}
          className="btn btn-secondary btn-sm flex items-center gap-1.5 shrink-0 text-xs font-bold cursor-pointer"
        >
          <Download size={13} /> حفظ نسخة احتياطية
        </button>
      </div>
    </div>
  );
}
