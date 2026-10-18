'use client';
import { useMarsam } from '@/lib/store';
import {
  Users, CreditCard, QrCode, ShoppingBag, Settings,
  AlertCircle, CheckCircle, Clock, ArrowUpRight, Palette,
  TrendingUp, Download, Plus, Barcode, Shield
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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-violet-950/60 via-slate-900/80 to-amber-950/40">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Shield size={14} /> نظام الإدارة المكتبي المعتمد • تخزين محلي آمن
            </div>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">
              مرحباً بك في لوحة إدارة <span className="gradient-text">{settings.name || 'المرسم'}</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              إدارة شؤون الطلاب، عقود التدريب الرسمية، الحضور بالباركود، ومبيعات الخامات الفنية بماليات منفصلة بالكامل.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/students"
              className="btn btn-primary flex items-center gap-2 shadow-lg shadow-violet-600/30 text-xs font-bold py-2.5 px-4"
            >
              <Plus size={16} /> تسجيل طالب وعقد جديد
            </Link>
            <Link
              href="/attendance"
              className="btn btn-secondary flex items-center gap-2 text-xs font-bold py-2.5 px-4"
            >
              <Barcode size={16} /> مسح الحضور بالسكانر
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Link href="/students" className="glass p-5 rounded-2xl border border-white/5 hover:border-violet-500/40 transition-all group">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-400">إجمالي الطلاب المقيدين</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100 mt-1">{students.length}</p>
          <p className="text-xs text-violet-400 mt-2 font-semibold flex items-center gap-1">
            <span>عرض وإدارة ملفات الطلاب</span>
            <ArrowUpRight size={13} />
          </p>
        </Link>

        {/* Course Revenue */}
        <Link href="/payments" className="glass p-5 rounded-2xl border border-white/5 hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-400">إيرادات رسوم الكورسات</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">{totalCourseRevenue.toLocaleString()} ج</p>
          <p className="text-xs text-slate-400 mt-2">
            متبقي أقساط: <strong className="text-red-400 font-mono">{totalRemainingTuition.toLocaleString()} ج</strong>
          </p>
        </Link>

        {/* Supplies Profit (Separated!) */}
        <Link href="/supplies" className="glass p-5 rounded-2xl border border-white/5 hover:border-amber-500/40 transition-all group">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-400">أرباح متجر الأدوات (صافي)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400 mt-1 font-mono">+{totalSuppliesProfit.toLocaleString()} ج</p>
          <p className="text-xs text-slate-400 mt-2">
            إجمالي المبيعات: <strong className="font-mono text-slate-300">{totalSuppliesSales.toLocaleString()} ج</strong>
          </p>
        </Link>

        {/* Overdue / Alerts */}
        <Link href="/payments" className="glass p-5 rounded-2xl border border-white/5 hover:border-red-500/40 transition-all group">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-400">طلاب عليهم متأخرات</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className="text-3xl font-black text-red-400 mt-1">{overdueEnrollments.length}</p>
          <p className="text-xs text-red-400/80 mt-2 font-semibold">
            تنبيه فوري يظهر عند مسح الكارت
          </p>
        </Link>
      </div>

      {/* Main Two Columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tuition Receipts (CRS) */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" />
              آخر إيصالات سداد الكورسات (CRS)
            </h3>
            <Link href="/payments" className="text-xs text-violet-400 hover:underline">
              عرض الكل
            </Link>
          </div>

          <div className="space-y-2.5">
            {payments.slice(0, 5).map(pay => {
              const enr = enrollments.find(e => e.id === pay.enrollmentId);
              const student = students.find(s => s.id === enr?.studentId);
              return (
                <div key={pay.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                        {pay.receiptNumber}
                      </span>
                      <strong className="text-slate-200">{student?.name || 'طالب'}</strong>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{pay.date} • {pay.method}</p>
                  </div>
                  <span className="font-black text-sm text-emerald-400 font-mono">+{pay.amount} ج</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Supplies Sales (SHP) */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <ShoppingBag size={18} className="text-amber-400" />
              آخر فواتير متجر الأدوات (SHP)
            </h3>
            <Link href="/supplies" className="text-xs text-violet-400 hover:underline">
              فتح نقطة البيع
            </Link>
          </div>

          <div className="space-y-2.5">
            {supplySales.slice(0, 5).map(sale => (
              <div key={sale.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded text-[11px]">
                      {sale.invoiceNumber}
                    </span>
                    <strong className="text-slate-200">{sale.customerName}</strong>
                    <span className="badge badge-gray text-[10px]">
                      {sale.items.length} أصناف
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{sale.date} • ربح: +{sale.profit} ج</p>
                </div>
                <span className="font-black text-sm text-amber-400 font-mono">{sale.totalAmount} ج</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Safety & Backup Reminder Card */}
      <div className="glass p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-100">بياناتك محفوظة محلياً وتلقائياً</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              كل طالب أو قسط أو فاتورة تسجلها تُحفظ فوراً على جهازك. يُنصح بتحميل نسخة دورية على فلاشة خارجية.
            </p>
          </div>
        </div>
        <button
          onClick={exportDatabase}
          className="btn btn-secondary btn-sm flex items-center gap-1.5 shrink-0 text-xs font-bold"
        >
          <Download size={14} /> حفظ نسخة احتياطية الآن
        </button>
      </div>
    </div>
  );
}
