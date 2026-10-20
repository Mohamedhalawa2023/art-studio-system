'use client';
import { useState, useMemo, useEffect } from 'react';
import { useMarsam } from '@/lib/store';
import {
  TrendingUp, DollarSign, CreditCard, ShoppingBag, Calendar,
  Printer, Download, Filter, ArrowUpRight, ArrowDownRight,
  PieChart as PieIcon, BarChart3, Clock, CheckCircle2, AlertTriangle,
  Banknote, Smartphone, ArrowRightLeft, ShieldCheck, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

const COLORS = ['#0D9488', '#2563EB', '#F59E0B', '#10B981', '#6366F1'];

export default function FinancialReportsPage() {
  const {
    payments, enrollments, supplySales, supplyItems,
    students, courses, groups, settings
  } = useMarsam();

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'supplies' | 'courses' | 'receivables'>('overview');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Compute Filter Date Threshold
  const filterDateRange = useMemo(() => {
    if (!currentDate) {
      return { startDate: new Date(0), endDate: new Date(2100, 0, 1) };
    }
    const now = new Date(currentDate);
    let startDate = new Date(0);
    let endDate = new Date(2100, 0, 1);

    if (dateFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (dateFilter === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday/Saturday adjustment
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateFilter === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59);
    }

    return { startDate, endDate };
  }, [dateFilter, customStart, customEnd]);

  // Filtered Payments (Course revenue)
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (p.status !== 'valid') return false;
      const d = new Date(p.date);
      return d >= filterDateRange.startDate && d <= filterDateRange.endDate;
    });
  }, [payments, filterDateRange]);

  // Filtered Supply Sales (Tools revenue)
  const filteredSales = useMemo(() => {
    return supplySales.filter(s => {
      const d = new Date(s.date);
      return d >= filterDateRange.startDate && d <= filterDateRange.endDate;
    });
  }, [supplySales, filterDateRange]);

  // Financial Metrics
  const courseRevenue = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  const suppliesRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [filteredSales]);

  const suppliesCost = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  }, [filteredSales]);

  const suppliesProfit = useMemo(() => {
    return suppliesRevenue - suppliesCost;
  }, [suppliesRevenue, suppliesCost]);

  const totalGrossRevenue = courseRevenue + suppliesRevenue;
  const totalNetProfit = courseRevenue + suppliesProfit;
  const overallMargin = totalGrossRevenue > 0 ? Math.round((totalNetProfit / totalGrossRevenue) * 100) : 0;

  // Receivables / Remaining Tuition
  const totalRemainingTuition = useMemo(() => {
    return enrollments.reduce((acc, e) => {
      const remaining = Math.max(0, e.totalAmount - e.totalPaid);
      return acc + remaining;
    }, 0);
  }, [enrollments]);

  // Inventory Asset Value (Current Stock * Cost)
  const inventoryAssetValue = useMemo(() => {
    return supplyItems.reduce((acc, i) => acc + (i.costPrice * i.stockQty), 0);
  }, [supplyItems]);

  // Payment Methods Breakdown (Combined)
  const paymentMethodsBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      cash: 0,
      instapay: 0,
      vodafone: 0,
      transfer: 0
    };

    filteredPayments.forEach(p => {
      map[p.method] = (map[p.method] || 0) + p.amount;
    });

    filteredSales.forEach(s => {
      map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.totalAmount;
    });

    const labels: Record<string, string> = {
      cash: 'نقداً (كاش)',
      instapay: 'انستاباي (InstaPay)',
      vodafone: 'محافظ إلكترونية (فودافون كاش)',
      transfer: 'تحويل بنكي / بطاقات'
    };

    return Object.entries(map).map(([key, value]) => ({
      key,
      name: labels[key] || key,
      value
    })).filter(m => m.value > 0);
  }, [filteredPayments, filteredSales]);

  // Revenue by Category Pie
  const revenueSourcesPie = useMemo(() => {
    return [
      { name: 'رسوم واشتراكات الكورسات', value: courseRevenue, color: '#0D9488' },
      { name: 'مبيعات متجر الأدوات والخامات', value: suppliesRevenue, color: '#2563EB' }
    ].filter(i => i.value > 0);
  }, [courseRevenue, suppliesRevenue]);

  // Top Selling Supplies
  const topSellingSupplies = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const existing = itemMap.get(it.productId) || {
          name: it.productName,
          qty: 0,
          revenue: 0,
          profit: 0
        };
        const profit = (it.unitPrice - it.costPrice) * it.quantity;
        itemMap.set(it.productId, {
          name: it.productName,
          qty: existing.qty + it.quantity,
          revenue: existing.revenue + it.total,
          profit: existing.profit + profit
        });
      });
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['نوع العملية', 'المرجع / الفاتورة', 'العميل / الطالب', 'التاريخ', 'المبلغ (ج.م)', 'طريقة الدفع', 'الصافي / الربح'],
      ...filteredPayments.map(p => {
        const enr = enrollments.find(e => e.id === p.enrollmentId);
        const stu = students.find(s => s.id === enr?.studentId);
        return ['اشتراك كورس', p.receiptNumber, stu?.name || 'طالب', p.date, p.amount, p.method, p.amount];
      }),
      ...filteredSales.map(s => {
        return ['مبيعات أدوات', s.invoiceNumber, s.customerName, s.date, s.totalAmount, s.paymentMethod, s.profit];
      })
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `تقرير_مالي_مرسم_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold mb-1">
            <ShieldCheck size={14} />
            <span>نظام التقارير المحاسبية المعتمد</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-teal-400" size={26} />
            التقارير المالية والأرباح العامة
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            المركز المالي المتكامل، أرباح متجر الأدوات، إيرادات الكورسات، وتحليل حركة الخزينة
          </p>
        </div>

        {/* Global Export & Print Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
          <button
            onClick={() => window.print()}
            className="btn btn-secondary flex items-center gap-1.5 text-xs font-bold py-2.5 px-3.5 shadow-xs"
            title="طباعة التقرير المالي الرسمي"
          >
            <Printer size={15} /> طباعة التقرير
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn-primary flex items-center gap-1.5 text-xs font-bold py-2.5 px-3.5 shadow-md shadow-teal-500/15"
            title="تصدير كشيت إكسيل"
          >
            <Download size={15} /> تصدير Excel (CSV)
          </button>
        </div>
      </div>

      {/* 2. Date Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 ml-2">
            <Calendar size={14} /> الفترة:
          </span>
          {(['today', 'week', 'month', 'year', 'all', 'custom'] as DateFilter[]).map(df => {
            const labels: Record<DateFilter, string> = {
              today: 'اليوم',
              week: 'هذا الأسبوع',
              month: 'هذا الشهر',
              year: 'هذا العام',
              all: 'كل الفترات',
              custom: 'فترة مخصصة'
            };
            const isSelected = dateFilter === df;
            return (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {labels[df]}
              </button>
            );
          })}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <input
              type="date"
              className="input text-xs py-1 px-2.5"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
            <span className="text-xs text-slate-400">إلى</span>
            <input
              type="date"
              className="input text-xs py-1 px-2.5"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 3. Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Gross Revenue */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الإيرادات الكلية</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {totalGrossRevenue.toLocaleString()} ج
          </p>
          <p className="text-[11px] text-teal-400 mt-1.5 font-bold flex items-center gap-1">
            <span>كورسات + مبيعات خامات</span>
          </p>
        </div>

        {/* Net Profit */}
        <div className="p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-teal-300">صافي الأرباح المقدرة</span>
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-teal-400 mt-1 font-mono">
            {totalNetProfit.toLocaleString()} ج
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 font-medium">
            هامش ربح إجمالي: <strong className="text-teal-400 font-mono">%{overallMargin}</strong>
          </p>
        </div>

        {/* Supplies Profit */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أرباح متجر الأدوات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
            +{suppliesProfit.toLocaleString()} ج
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
            المبيعات: <strong className="font-mono text-slate-700 dark:text-slate-300">{suppliesRevenue.toLocaleString()} ج</strong>
          </p>
        </div>

        {/* Uncollected Receivables */}
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">أقساط ومستحقات قيد التحصيل</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
            {totalRemainingTuition.toLocaleString()} ج
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
            قيمة المخزن السلعي: <strong className="font-mono text-teal-400">{inventoryAssetValue.toLocaleString()} ج</strong>
          </p>
        </div>
      </div>

      {/* 4. Visual Charts Section */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Distribution Pie Chart */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <PieIcon size={16} className="text-teal-400" />
            توزيع مصادر الدخل
          </h3>
          <div className="h-56 w-full flex items-center justify-center">
            {revenueSourcesPie.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد حركات مالية في هذه الفترة</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueSourcesPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {revenueSourcesPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `${Number(val).toLocaleString()} ج`}
                    contentStyle={{ borderRadius: '12px', background: '#0F172A', color: '#fff', border: 'none' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">رسوم الكورسات:</span>
              <strong className="font-mono text-teal-400">{courseRevenue.toLocaleString()} ج</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">مبيعات الأدوات:</span>
              <strong className="font-mono text-blue-500">{suppliesRevenue.toLocaleString()} ج</strong>
            </div>
          </div>
        </div>

        {/* Payment Methods Treasury Breakdown */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-teal-400" />
            حركة الخزينة حسب طريقة الدفع
          </h3>
          <div className="space-y-3 my-auto">
            {paymentMethodsBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">لا توجد مدفوعات مسجلة في هذه الفترة</p>
            ) : (
              paymentMethodsBreakdown.map(pm => {
                const pct = totalGrossRevenue > 0 ? Math.round((pm.value / totalGrossRevenue) * 100) : 0;
                return (
                  <div key={pm.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{pm.name}</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {pm.value.toLocaleString()} ج ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-teal-700 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-400">إجمالي السيولة المحصلة:</span>
            <span className="font-black text-sm text-teal-400 font-mono">{totalGrossRevenue.toLocaleString()} ج</span>
          </div>
        </div>

        {/* Top Selling Art Supplies */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <ShoppingBag size={16} className="text-teal-400" />
            الأدوات والخامات الأكثر مبيعاً
          </h3>
          <div className="space-y-2.5 my-auto">
            {topSellingSupplies.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">لا توجد مبيعات أدوات في هذه الفترة</p>
            ) : (
              topSellingSupplies.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{it.name}</p>
                    <p className="text-[11px] text-slate-400">تم بيع {it.qty} قطعة</p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="font-bold font-mono text-slate-900 dark:text-white">{it.revenue.toLocaleString()} ج</span>
                    <p className="text-[10px] text-teal-400 font-bold">ربح: +{it.profit.toLocaleString()} ج</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-xs">
            <span className="text-slate-500">إجمالي قطع المخزن:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {supplyItems.reduce((acc, i) => acc + i.stockQty, 0)} قطعة
            </span>
          </div>
        </div>
      </div>

      {/* 5. Detailed Tables with Tabs */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B] shadow-xs space-y-4">
        {/* Table Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveReportTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeReportTab === 'overview'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              كشف حركة الخزينة العام ({filteredPayments.length + filteredSales.length})
            </button>
            <button
              onClick={() => setActiveReportTab('supplies')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeReportTab === 'supplies'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              فواتير متجر الأدوات ({filteredSales.length})
            </button>
            <button
              onClick={() => setActiveReportTab('courses')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeReportTab === 'courses'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              إيصالات الكورسات ({filteredPayments.length})
            </button>
            <button
              onClick={() => setActiveReportTab('receivables')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeReportTab === 'receivables'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              المتبقيات والأقساط المستحقة
            </button>
          </div>
        </div>

        {/* TAB A: OVERVIEW */}
        {activeReportTab === 'overview' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">رقم الإيصال / الفاتورة</th>
                  <th className="p-3">الطرف / العميل</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">طريقة التحصيل</th>
                  <th className="p-3 text-left">المبلغ المحصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {[
                  ...filteredPayments.map(p => ({
                    type: 'كورس',
                    ref: p.receiptNumber,
                    name: students.find(s => s.id === enrollments.find(e => e.id === p.enrollmentId)?.studentId)?.name || 'طالب',
                    date: p.date,
                    method: p.method,
                    amount: p.amount,
                    isPositive: true
                  })),
                  ...filteredSales.map(s => ({
                    type: 'متجر أدوات',
                    ref: s.invoiceNumber,
                    name: s.customerName,
                    date: s.date,
                    method: s.paymentMethod,
                    amount: s.totalAmount,
                    isPositive: true
                  }))
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 30)
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <span className={`badge ${row.type === 'كورس' ? 'badge-teal' : 'badge-info'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{row.ref}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                      <td className="p-3 text-slate-500">{row.date}</td>
                      <td className="p-3"><span className="badge badge-gray">{row.method}</span></td>
                      <td className="p-3 text-left font-black text-teal-400 font-mono text-sm">
                        +{row.amount.toLocaleString()} ج
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB B: SUPPLIES SALES */}
        {activeReportTab === 'supplies' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">اسم المشتري</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الأصناف المباعة</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">إجمالي الفاتورة</th>
                  <th className="p-3">تكلفة البضاعة</th>
                  <th className="p-3 text-left">الربح الصافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-teal-400">{s.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{s.customerName}</td>
                    <td className="p-3 text-slate-500">{s.date}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {s.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="p-3"><span className="badge badge-gray">{s.paymentMethod}</span></td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white font-mono">{s.totalAmount} ج</td>
                    <td className="p-3 text-slate-400 font-mono">{s.totalCost} ج</td>
                    <td className="p-3 text-left font-black text-teal-400 font-mono">+{s.profit} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB C: COURSES PAYMENTS */}
        {activeReportTab === 'courses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3">رقم الإيصال</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الكورس</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">طريقة السداد</th>
                  <th className="p-3">البيان / ملاحظات</th>
                  <th className="p-3 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredPayments.map(p => {
                  const enr = enrollments.find(e => e.id === p.enrollmentId);
                  const stu = students.find(s => s.id === enr?.studentId);
                  const grp = groups.find(g => g.id === enr?.groupId);
                  const crs = courses.find(c => c.id === grp?.courseId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-teal-400">{p.receiptNumber}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{stu?.name || 'طالب'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">{crs?.name || 'دورة فنية'}</td>
                      <td className="p-3 text-slate-500">{p.date}</td>
                      <td className="p-3"><span className="badge badge-gray">{p.method}</span></td>
                      <td className="p-3 text-slate-500">{p.notes || '-'}</td>
                      <td className="p-3 text-left font-black text-teal-400 font-mono">+{p.amount} ج</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB D: RECEIVABLES */}
        {activeReportTab === 'receivables' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الكورس المسجل به</th>
                  <th className="p-3">إجمالي الرسوم</th>
                  <th className="p-3">المسدد حتى الآن</th>
                  <th className="p-3 text-left">المبلغ المتبقي المطلوب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {enrollments
                  .filter(e => (e.totalAmount - e.totalPaid) > 0)
                  .map(e => {
                    const stu = students.find(s => s.id === e.studentId);
                    const grp = groups.find(g => g.id === e.groupId);
                    const crs = courses.find(c => c.id === grp?.courseId);
                    const rem = e.totalAmount - e.totalPaid;
                    return (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{stu?.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{crs?.name}</td>
                        <td className="p-3 font-mono">{e.totalAmount} ج</td>
                        <td className="p-3 font-mono text-teal-400">{e.totalPaid} ج</td>
                        <td className="p-3 text-left font-black text-red-500 font-mono">{rem} ج</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Official Print-Optimized Footer (Visible on Print) */}
      <div className="hidden print:block pt-8 border-t-2 border-slate-300 text-xs text-slate-600 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-black text-slate-900">{settings.name}</h2>
            <p>{settings.address} • {settings.phone}</p>
          </div>
          <div className="text-left font-mono">
            <p>تاريخ استخراج التقرير: {currentDate ? currentDate.toLocaleString('ar-EG') : ''}</p>
            <p>الفترة: {dateFilter}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-8">
          <div className="border-t border-slate-400 pt-2 text-center">
            توقيع المسؤول المالي والمحاسب
          </div>
          <div className="border-t border-slate-400 pt-2 text-center">
            اعتماد إدارة المرسم
          </div>
        </div>
      </div>
    </div>
  );
}
