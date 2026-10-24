'use client';
import { useState, useMemo, useEffect } from 'react';
import { useMarsam } from '@/lib/store';
import {
  TrendingUp, DollarSign, CreditCard, ShoppingBag, Calendar,
  Printer, Download, PieChart as PieIcon, BarChart3, Clock, ShieldCheck, Pencil, Trash2, X
} from 'lucide-react';
import {
  ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import { formatLocalDate } from '@/lib/dates';
import type { OperatingExpenseCategory } from '@/lib/mockData';

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقدًا',
  transfer: 'تحويل بنكي',
  instapay: 'إنستاباي',
  vodafone: 'فودافون كاش',
  card: 'بطاقة بنكية',
};

const EXPENSE_CATEGORY_LABELS: Record<OperatingExpenseCategory, string> = {
  rent: 'إيجار',
  salaries: 'مرتبات',
  materials: 'خامات',
  utilities: 'مرافق',
  maintenance: 'صيانة',
  transport: 'مواصلات',
  marketing: 'تسويق',
  other: 'أخرى',
};

const toCents = (amount: number) => Math.round((amount + Number.EPSILON) * 100);
const fromCents = (amount: number) => amount / 100;

function parseReportDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, yearText, monthText, dayText, hourText = '0', minuteText = '0', secondText = '0'] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const parsed = new Date(year, month - 1, day, hour, minute, second);
  if (
    parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day ||
    parsed.getHours() !== hour || parsed.getMinutes() !== minute || parsed.getSeconds() !== second
  ) return null;
  return parsed;
}

export default function FinancialReportsPage() {
  const {
    payments, enrollments, supplySales, supplyReturns, supplyItems,
    students, courses, groups, settings, expenses, addOperatingExpense,
    updateOperatingExpense, deleteOperatingExpense, currentUser
  } = useMarsam();

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'supplies' | 'courses' | 'receivables' | 'expenses'>('overview');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<OperatingExpenseCategory>('rent');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'transfer' | 'instapay' | 'vodafone' | 'card'>('cash');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const now = new Date();
      setCurrentDate(now);
      setExpenseDate(formatLocalDate(now));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseDate(formatLocalDate(new Date()));
    setExpenseCategory('rent');
    setExpenseDescription('');
    setExpenseAmount('');
    setExpensePaymentMethod('cash');
  };

  const startEditingExpense = (expense: (typeof expenses)[number]) => {
    setEditingExpenseId(expense.id);
    setExpenseDate(expense.date);
    setExpenseCategory(expense.category);
    setExpenseDescription(expense.description);
    setExpenseAmount(String(expense.amount));
    setExpensePaymentMethod(expense.paymentMethod);
  };

  const handleDeleteExpense = (expense: (typeof expenses)[number]) => {
    if (!window.confirm('حذف المصروف «' + expense.description + '» بقيمة ' + expense.amount.toLocaleString() + ' ج؟')) return;
    try {
      deleteOperatingExpense(expense.id, currentUser?.id || undefined);
      if (editingExpenseId === expense.id) resetExpenseForm();
    } catch {
      // The store already displays the validation error.
    }
  };

  // Compute Filter Date Threshold
  const filterDateRange = useMemo(() => {
    if (dateFilter === 'custom') {
      if (!customStart || !customEnd) return null;

      const parseLocalDate = (value: string) => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
          ? date
          : null;
      };

      const startDate = parseLocalDate(customStart);
      const endDate = parseLocalDate(customEnd);
      if (!startDate || !endDate || startDate > endDate) return null;
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }

    if (!currentDate) return null;

    const now = new Date(currentDate);
    let startDate: Date;
    let endDate: Date;

    if (dateFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      const daysSinceMonday = (now.getDay() + 6) % 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999);
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateFilter === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      startDate = new Date(0);
      endDate = new Date(8640000000000000);
    }

    return { startDate, endDate };
  }, [currentDate, dateFilter, customStart, customEnd]);

  // Filtered Payments (Course revenue)
  const filteredPayments = useMemo(() => {
    if (!filterDateRange) return [];
    return payments.filter(p => {
      if (p.status !== 'valid') return false;
      const date = parseReportDate(p.date);
      return date !== null && date >= filterDateRange.startDate && date <= filterDateRange.endDate;
    }).sort((a, b) => (parseReportDate(b.date)?.getTime() || 0) - (parseReportDate(a.date)?.getTime() || 0));
  }, [payments, filterDateRange]);

  // Filtered Supply Sales (Tools revenue)
  const filteredSales = useMemo(() => {
    if (!filterDateRange) return [];
    return supplySales.filter(s => {
      if (s.status === 'voided') return false;
      const date = parseReportDate(s.date);
      return date !== null && date >= filterDateRange.startDate && date <= filterDateRange.endDate;
    }).sort((a, b) => (parseReportDate(b.date)?.getTime() || 0) - (parseReportDate(a.date)?.getTime() || 0));
  }, [supplySales, filterDateRange]);

  const filteredReturns = useMemo(() => {
    if (!filterDateRange) return [];
    return supplyReturns.filter(item => {
      const date = parseReportDate(item.returnedAt);
      return date !== null && date >= filterDateRange.startDate && date <= filterDateRange.endDate;
    }).sort((a, b) => (parseReportDate(b.returnedAt)?.getTime() || 0) - (parseReportDate(a.returnedAt)?.getTime() || 0));
  }, [supplyReturns, filterDateRange]);

  const filteredExpenses = useMemo(() => {
    if (!filterDateRange) return [];
    return expenses.filter(expense => {
      const date = parseReportDate(expense.date);
      return date !== null && date >= filterDateRange.startDate && date <= filterDateRange.endDate;
    }).sort((a, b) => (parseReportDate(b.date)?.getTime() || 0) - (parseReportDate(a.date)?.getTime() || 0));
  }, [expenses, filterDateRange]);

  // Financial Metrics
  const courseRevenue = useMemo(() => {
    return fromCents(filteredPayments.reduce((acc, p) => acc + toCents(p.amount), 0));
  }, [filteredPayments]);

  const suppliesRevenue = useMemo(() => {
    return fromCents(filteredSales.reduce((acc, s) => acc + toCents(s.totalAmount), 0)
      - filteredReturns.reduce((acc, item) => acc + toCents(item.totalRefund), 0));
  }, [filteredSales, filteredReturns]);

  const suppliesCost = useMemo(() => {
    return fromCents(filteredSales.reduce((acc, s) => acc + toCents(s.totalCost), 0)
      - filteredReturns.reduce((acc, item) => acc + toCents(item.restockedCost), 0));
  }, [filteredSales, filteredReturns]);

  const suppliesProfit = useMemo(() => {
    return suppliesRevenue - suppliesCost;
  }, [suppliesRevenue, suppliesCost]);

  const totalOperatingExpenses = fromCents(filteredExpenses.reduce((sum, expense) => sum + toCents(expense.amount), 0));
  const netOperatingResult = fromCents(toCents(courseRevenue) + toCents(suppliesProfit) - toCents(totalOperatingExpenses));

  const totalGrossRevenue = fromCents(toCents(courseRevenue) + toCents(suppliesRevenue));
  const suppliesMargin = suppliesRevenue > 0 ? Math.round((suppliesProfit / suppliesRevenue) * 100) : 0;

  // Receivables / Remaining Tuition
  const totalRemainingTuition = useMemo(() => {
    return enrollments.reduce((acc, e) => {
      const remaining = Math.max(0, e.totalAmount - e.totalPaid);
      return acc + toCents(remaining);
    }, 0) / 100;
  }, [enrollments]);

  // Inventory Asset Value (Current Stock * Cost)
  const inventoryAssetValue = useMemo(() => {
    return supplyItems.reduce((acc, i) => acc + toCents(i.costPrice) * i.stockQty, 0) / 100;
  }, [supplyItems]);

  // Payment Methods Breakdown (Combined)
  const paymentMethodsBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      cash: 0,
      transfer: 0,
      instapay: 0,
      vodafone: 0,
      card: 0
    };

    filteredPayments.forEach(p => {
      map[p.method] = (map[p.method] || 0) + toCents(p.amount);
    });

    filteredSales.forEach(s => {
      map[s.paymentMethod] = (map[s.paymentMethod] || 0) + toCents(s.totalAmount);
    });

    filteredReturns.forEach(item => {
      map[item.paymentMethod] = (map[item.paymentMethod] || 0) - toCents(item.totalRefund);
    });

    const labels: Record<string, string> = {
      cash: 'نقدًا',
      instapay: 'إنستاباي',
      vodafone: 'فودافون كاش',
      transfer: 'تحويل بنكي',
      card: 'بطاقة بنكية'
    };

    return Object.entries(map).map(([key, value]) => ({
      key,
      name: labels[key] || key,
      value: fromCents(value)
    })).filter(m => m.value > 0);
  }, [filteredPayments, filteredSales, filteredReturns]);

  // Revenue by Category Pie
  const revenueSourcesPie = useMemo(() => {
    return [
      { name: 'رسوم واشتراكات الكورسات', value: courseRevenue, color: '#0D9488' },
      { name: 'مبيعات متجر الأدوات والخامات', value: suppliesRevenue, color: '#3B82F6' }
    ].filter(i => i.value > 0);
  }, [courseRevenue, suppliesRevenue]);

  // Top Selling Supplies
  const topSellingSupplies = useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; revenueCents: number; profitCents: number }>();
    filteredSales.forEach(s => {
      const invoiceSubtotalCents = s.subtotalAmount !== undefined
        ? toCents(s.subtotalAmount)
        : s.items.reduce((sum, item) => sum + toCents(item.total), 0);
      const invoiceDiscountCents = toCents(s.discountAmount ?? 0);
      let allocatedDiscountCents = 0;
      let accumulatedLineTotalCents = 0;

      s.items.forEach(it => {
        const existing = itemMap.get(it.productId) || {
          name: it.productName,
          qty: 0,
          revenueCents: 0,
          profitCents: 0
        };
        const lineTotalCents = toCents(it.total);
        accumulatedLineTotalCents += lineTotalCents;
        const nextAllocatedDiscountCents = invoiceSubtotalCents > 0
          ? Math.round(invoiceDiscountCents * accumulatedLineTotalCents / invoiceSubtotalCents)
          : invoiceDiscountCents;
        const lineDiscountCents = nextAllocatedDiscountCents - allocatedDiscountCents;
        allocatedDiscountCents = nextAllocatedDiscountCents;
        const netLineRevenueCents = lineTotalCents - lineDiscountCents;
        const lineCostCents = toCents(it.costPrice) * it.quantity;
        itemMap.set(it.productId, {
          name: it.productName,
          qty: existing.qty + it.quantity,
          revenueCents: existing.revenueCents + netLineRevenueCents,
          profitCents: existing.profitCents + netLineRevenueCents - lineCostCents
        });
      });
    });

    filteredReturns.forEach(item => {
      item.items.forEach(line => {
        const existing = itemMap.get(line.productId) || {
          name: line.productName,
          qty: 0,
          revenueCents: 0,
          profitCents: 0
        };
        const refundCents = toCents(line.refundAmount);
        const restockedCostCents = toCents(line.costPrice) * line.restockQuantity;
        itemMap.set(line.productId, {
          name: line.productName,
          qty: Math.max(0, existing.qty - line.quantity),
          revenueCents: existing.revenueCents - refundCents,
          profitCents: existing.profitCents - refundCents + restockedCostCents
        });
      });
    });

    return Array.from(itemMap.values())
      .filter(item => item.qty > 0 || item.revenueCents > 0)
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        qty: item.qty,
        revenue: fromCents(item.revenueCents),
        profit: fromCents(item.profitCents),
      }));
  }, [filteredSales, filteredReturns]);

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['نوع العملية', 'المرجع / الفاتورة', 'العميل / الطالب', 'التاريخ', 'المبلغ المحصل (ج.م)', 'خصم الفاتورة (ج.م)', 'طريقة الدفع', 'مجمل ربح الأدوات (ج.م)'],
      ...filteredPayments.map(p => {
        const enr = enrollments.find(e => e.id === p.enrollmentId);
        const stu = students.find(s => s.id === enr?.studentId);
        return ['دفعة كورس', p.receiptNumber, stu?.name || 'طالب', p.date, p.amount, '', PAYMENT_METHOD_LABELS[p.method] || p.method, ''];
      }),
      ...filteredSales.map(s => {
        return ['بيع أدوات', s.invoiceNumber, s.customerName, s.date, s.totalAmount, s.discountAmount ?? 0, PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod, s.totalAmount - s.totalCost];
      }),
      ...filteredReturns.map(item => [
        'مرتجع أدوات', item.returnNumber, item.customerName, item.returnedAt,
        -item.totalRefund, '', PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod,
        -(item.totalRefund - item.restockedCost)
      ]),
      ...filteredExpenses.map(expense => [
        'مصروف تشغيل', EXPENSE_CATEGORY_LABELS[expense.category] + ': ' + expense.description, '', expense.date,
        -expense.amount, '', PAYMENT_METHOD_LABELS[expense.paymentMethod] || expense.paymentMethod, ''
      ])
    ];

    const escapeCsvCell = (value: unknown) => {
      const text = String(value ?? '');
      const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const csvContent = '\uFEFF' + rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
    const downloadUrl = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.setAttribute('href', downloadUrl);
    link.setAttribute('download', `تقرير_مالي_مرسم_${formatLocalDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Title and Global Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#115E59] border border-[#0D9488]/40 text-[#2DD4BF] text-xs font-bold mb-1.5">
            <ShieldCheck size={14} />
            <span>تقارير الإدارة المالية</span>
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
            <BarChart3 className="text-[#2DD4BF]" size={26} />
            التقارير المالية والتحصيل
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            ملخص التحصيل ومبيعات الأدوات والمصروفات التشغيلية خلال الفترة المحددة
          </p>
        </div>

        {/* Global Export & Print Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488] font-bold text-xs flex items-center gap-2 transition-all"
            title="طباعة التقرير المالي الرسمي"
          >
            <Printer size={15} /> طباعة التقرير
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-teal-900/30"
            title="تصدير كشيت إكسيل"
          >
            <Download size={15} /> تصدير Excel (CSV)
          </button>
        </div>
      </div>

      {/* 2. Date Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-[#1B2537] border border-[#2A3B56] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-[#94A3B8] flex items-center gap-1.5 ml-2">
            <Calendar size={14} className="text-[#2DD4BF]" /> الفترة:
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#0D9488] text-[#F8FAFC] shadow-md shadow-teal-900/30'
                    : 'bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488]'
                }`}
              >
                {labels[df]}
              </button>
            );
          })}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2A3B56]">
            <input
              type="date"
              className="p-1.5 px-3 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:border-[#0D9488] focus:outline-none"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
            <span className="text-xs text-[#94A3B8]">إلى</span>
            <input
              type="date"
              className="p-1.5 px-3 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:border-[#0D9488] focus:outline-none"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      {dateFilter === 'custom' && (!customStart || !customEnd || customStart > customEnd) && (
        <div role="alert" className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm">
          {!customStart || !customEnd ? 'اختر تاريخ البداية والنهاية لعرض الفترة المخصصة.' : 'تاريخ البداية يجب أن يسبق تاريخ النهاية.'}
        </div>
      )}

      {/* 3. Executive KPI Cards (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Gross Revenue */}
        <div className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[#94A3B8]">إجمالي المتحصلات</span>
              <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-[#2DD4BF] mt-1.5 font-mono">
              {totalGrossRevenue.toLocaleString()} ج
            </p>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2 font-medium">
            <span>كورسات + مبيعات خامات</span>
          </p>
        </div>

        {/* 2. Course Revenue */}
        <div className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[#94A3B8]">رسوم الكورسات المحصلة</span>
              <div className="w-8 h-8 rounded-xl bg-[#115E59]/40 border border-[#0D9488]/40 text-[#2DD4BF] flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-[#2DD4BF] mt-1.5 font-mono">
              {courseRevenue.toLocaleString()} ج
            </p>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2 font-medium">
            إجمالي الدفعات المسجلة قبل المصروفات
          </p>
        </div>

        {/* 3. Supplies Profit */}
        <div className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[#94A3B8]">مجمل ربح متجر الأدوات</span>
              <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#2A3B56] text-blue-400 flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-[#2DD4BF] mt-1.5 font-mono">
              +{suppliesProfit.toLocaleString()} ج
            </p>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2 font-medium">
            المبيعات: <strong className="font-mono text-[#F8FAFC]">{suppliesRevenue.toLocaleString()} ج</strong>
            <span className="mr-1.5">• هامش {suppliesMargin}%</span>
          </p>
        </div>

        {/* 4. Uncollected Receivables (Alert Highlighted Card) */}
        <div className="p-4 rounded-2xl border-2 border-[#D97706]/70 bg-[#1B2537] shadow-lg shadow-amber-950/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[#FBBF24]">أقساط ومستحقات قيد التحصيل</span>
              <div className="w-8 h-8 rounded-xl bg-[#78350F]/40 border border-[#D97706]/40 text-[#FBBF24] flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-black text-[#D97706] mt-1.5 font-mono">
              {totalRemainingTuition.toLocaleString()} ج
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#94A3B8] mt-2 font-medium leading-relaxed">
              رصيد مستحق بكل الاشتراكات الحالية؛ لا يتغير مع فلتر الفترة
            </p>
            <p className="text-[10px] text-[#94A3B8] mt-1 font-medium">
              قيمة المخزون بالتكلفة: <strong className="font-mono text-[#2DD4BF]">{inventoryAssetValue.toLocaleString()} ج</strong>
            </p>
          </div>
        </div>

        {/* 5. Net Operating Result */}
        <div className="p-4 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-[#94A3B8]">نتيجة النشاط بعد المصروفات</span>
              <div className="w-8 h-8 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#2DD4BF] flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className={`text-2xl md:text-3xl font-black mt-1.5 font-mono ${netOperatingResult >= 0 ? 'text-[#2DD4BF]' : 'text-red-400'}`}>
              {netOperatingResult.toLocaleString()} ج
            </p>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2 font-medium">
            مصروفات مسجلة: <strong className="font-mono text-[#F8FAFC]">{totalOperatingExpenses.toLocaleString()} ج</strong>
          </p>
        </div>
      </div>

      {/* 4. Visual Charts Section */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Distribution Pie Chart */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2 mb-3">
            <PieIcon size={16} className="text-[#2DD4BF]" />
            توزيع مصادر الدخل
          </h3>
          <div className="h-56 w-full flex items-center justify-center">
            {revenueSourcesPie.length === 0 ? (
              <p className="text-xs text-[#94A3B8]">لا توجد حركات مالية في هذه الفترة</p>
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
                    formatter={(val: number | string | readonly (number | string)[] | undefined) => `${Number(val).toLocaleString()} ج`}
                    contentStyle={{ borderRadius: '12px', background: '#111827', color: '#F8FAFC', border: '1px solid #2A3B56' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="pt-3 border-t border-[#2A3B56] space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">رسوم الكورسات:</span>
              <strong className="font-mono text-[#2DD4BF]">{courseRevenue.toLocaleString()} ج</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">مبيعات الأدوات:</span>
              <strong className="font-mono text-blue-400">{suppliesRevenue.toLocaleString()} ج</strong>
            </div>
          </div>
        </div>

        {/* Payment Methods Treasury Breakdown */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-[#2DD4BF]" />
            حركة الخزينة حسب طريقة الدفع
          </h3>
          <div className="space-y-3.5 my-auto">
            {paymentMethodsBreakdown.length === 0 ? (
              <p className="text-xs text-[#94A3B8] text-center py-8">لا توجد مدفوعات مسجلة في هذه الفترة</p>
            ) : (
              paymentMethodsBreakdown.map(pm => {
                const pct = totalGrossRevenue > 0 ? Math.round((pm.value / totalGrossRevenue) * 100) : 0;
                return (
                  <div key={pm.key} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#F8FAFC]">{pm.name}</span>
                      <span className="font-mono text-[#2DD4BF]">
                        {pm.value.toLocaleString()} ج ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#111827] border border-[#2A3B56] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#0D9488] to-[#2DD4BF] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="pt-3 border-t border-[#2A3B56] flex justify-between items-center text-xs">
            <span className="font-bold text-[#94A3B8]">إجمالي السيولة المحصلة:</span>
            <span className="font-black text-sm text-[#2DD4BF] font-mono">{totalGrossRevenue.toLocaleString()} ج</span>
          </div>
        </div>

        {/* Top Selling Art Supplies */}
        <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2 mb-3">
            <ShoppingBag size={16} className="text-[#2DD4BF]" />
            الأدوات والخامات الأكثر مبيعاً
          </h3>
          <div className="space-y-2.5 my-auto">
            {topSellingSupplies.length === 0 ? (
              <p className="text-xs text-[#94A3B8] text-center py-8">لا توجد مبيعات أدوات في هذه الفترة</p>
            ) : (
              topSellingSupplies.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-[#F8FAFC] truncate">{it.name}</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">تم بيع {it.qty} قطعة</p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="font-bold font-mono text-[#2DD4BF]">{it.revenue.toLocaleString()} ج</span>
                    <p className="text-[10px] text-teal-400 font-bold mt-0.5">ربح: +{it.profit.toLocaleString()} ج</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-3 border-t border-[#2A3B56] flex justify-between items-center text-xs">
            <span className="text-[#94A3B8]">إجمالي قطع المخزن:</span>
            <span className="font-bold text-[#F8FAFC]">
              {supplyItems.reduce((acc, i) => acc + i.stockQty, 0)} قطعة
            </span>
          </div>
        </div>
      </div>

      {/* 5. Detailed Tables with Tabs */}
      <div className="p-5 rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-sm space-y-4">
        {/* Table Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A3B56] pb-3">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'overview', label: `كشف حركة الخزينة العام (${filteredPayments.length + filteredSales.length + filteredExpenses.length})` },
              { id: 'supplies', label: `فواتير متجر الأدوات (${filteredSales.length})` },
              { id: 'courses', label: `إيصالات الكورسات (${filteredPayments.length})` },
              { id: 'receivables', label: 'المتبقيات والأقساط المستحقة' },
              { id: 'expenses', label: `المصروفات (${filteredExpenses.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeReportTab === tab.id
                    ? 'bg-[#0D9488] text-[#F8FAFC] shadow-md shadow-teal-900/30'
                    : 'bg-[#111827] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#0D9488]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB A: OVERVIEW */}
        {activeReportTab === 'overview' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#111827]/70 text-[#94A3B8] font-bold border-b border-[#2A3B56]">
                <tr>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">رقم الإيصال / الفاتورة</th>
                  <th className="p-3">الطرف / العميل</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">طريقة التحصيل</th>
                  <th className="p-3 text-left">المبلغ المحصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3B56]">
                {[
                  ...filteredPayments.map(p => ({
                    type: 'كورس',
                    ref: p.receiptNumber,
                    name: students.find(s => s.id === enrollments.find(e => e.id === p.enrollmentId)?.studentId)?.name || 'طالب',
                    date: p.date,
                    method: PAYMENT_METHOD_LABELS[p.method] || p.method,
                    amount: p.amount,
                    isPositive: p.amount >= 0
                  })),
                  ...filteredSales.map(s => ({
                    type: 'متجر أدوات',
                    ref: s.invoiceNumber,
                    name: s.customerName,
                    date: s.date,
                    method: PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod,
                    amount: s.totalAmount,
                    isPositive: true
                  })),
                  ...filteredReturns.map(item => ({
                    type: 'مرتجع متجر',
                    ref: item.returnNumber,
                    name: item.customerName,
                    date: item.returnedAt,
                    method: PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod,
                    amount: -item.totalRefund,
                    isPositive: false
                  })),
                  ...filteredExpenses.map(expense => ({
                    type: 'مصروف',
                    ref: EXPENSE_CATEGORY_LABELS[expense.category],
                    name: expense.description,
                    date: expense.date,
                    method: PAYMENT_METHOD_LABELS[expense.paymentMethod] || expense.paymentMethod,
                    amount: expense.amount,
                    isPositive: false
                  }))
                ]
                  .sort((a, b) => (parseReportDate(b.date)?.getTime() || 0) - (parseReportDate(a.date)?.getTime() || 0))
                  .slice(0, 30)
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#111827]/40 transition-colors">
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          row.type === 'كورس'
                            ? 'bg-[#115E59] text-[#2DD4BF]'
                            : row.type === 'مصروف'
                            ? 'bg-[#111827] border border-[#334155] text-[#94A3B8]'
                            : row.type === 'مرتجع متجر'
                            ? 'bg-[#78350F] text-[#D97706]'
                            : 'bg-blue-950/40 border border-blue-900/60 text-blue-400'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#2DD4BF]">{row.ref}</td>
                      <td className="p-3 font-semibold text-[#F8FAFC]">{row.name}</td>
                      <td className="p-3 text-[#94A3B8]">{row.date}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-[#111827] border border-[#2A3B56] text-[#94A3B8]">
                          {row.method}
                        </span>
                      </td>
                      <td className={`p-3 text-left font-black font-mono text-sm ${row.isPositive ? 'text-[#2DD4BF]' : 'text-red-400'}`}>
                        {row.isPositive ? '+' : '−'}{Math.abs(row.amount).toLocaleString()} ج
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
              <thead className="bg-[#111827]/70 text-[#94A3B8] font-bold border-b border-[#2A3B56]">
                <tr>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">اسم المشتري</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الأصناف المباعة</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">الخصم</th>
                  <th className="p-3">إجمالي الفاتورة</th>
                  <th className="p-3">المسترد</th>
                  <th className="p-3">صافي البيع</th>
                  <th className="p-3">تكلفة البضاعة</th>
                  <th className="p-3 text-left">مجمل الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3B56]">
                {filteredSales.map(s => {
                  const saleReturns = filteredReturns.filter(item => item.saleId === s.id);
                  const refunded = saleReturns.reduce((sum, item) => sum + item.totalRefund, 0);
                  const restockedCost = saleReturns.reduce((sum, item) => sum + item.restockedCost, 0);
                  const netRevenue = s.totalAmount - refunded;
                  const netCost = s.totalCost - restockedCost;
                  return (
                    <tr key={s.id} className="hover:bg-[#111827]/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#2DD4BF]">{s.invoiceNumber}</td>
                      <td className="p-3 font-semibold text-[#F8FAFC]">{s.customerName}</td>
                      <td className="p-3 text-[#94A3B8]">{s.date}</td>
                      <td className="p-3 text-[#CBD5E1]">
                        {s.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-[#111827] border border-[#2A3B56] text-[#94A3B8]">
                          {PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-amber-400">{(s.discountAmount ?? 0).toLocaleString()} ج</td>
                      <td className="p-3 font-bold text-[#F8FAFC] font-mono">{s.totalAmount} ج</td>
                      <td className="p-3 font-mono text-amber-400">{refunded > 0 ? `−${refunded.toLocaleString()} ج` : '—'}</td>
                      <td className="p-3 font-bold text-[#2DD4BF] font-mono">{netRevenue.toLocaleString()} ج</td>
                      <td className="p-3 text-[#94A3B8] font-mono">{netCost.toLocaleString()} ج</td>
                      <td className="p-3 text-left font-black text-[#2DD4BF] font-mono">{(netRevenue - netCost).toLocaleString()} ج</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB C: COURSES PAYMENTS */}
        {activeReportTab === 'courses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#111827]/70 text-[#94A3B8] font-bold border-b border-[#2A3B56]">
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
              <tbody className="divide-y divide-[#2A3B56]">
                {filteredPayments.map(p => {
                  const enr = enrollments.find(e => e.id === p.enrollmentId);
                  const stu = students.find(s => s.id === enr?.studentId);
                  const grp = groups.find(g => g.id === enr?.groupId);
                  const crs = courses.find(c => c.id === grp?.courseId);
                  return (
                    <tr key={p.id} className="hover:bg-[#111827]/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#2DD4BF]">{p.receiptNumber}</td>
                      <td className="p-3 font-semibold text-[#F8FAFC]">{stu?.name || 'طالب'}</td>
                      <td className="p-3 text-[#CBD5E1]">{crs?.name || 'دورة فنية'}</td>
                      <td className="p-3 text-[#94A3B8]">{p.date}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-[#111827] border border-[#2A3B56] text-[#94A3B8]">
                          {PAYMENT_METHOD_LABELS[p.method] || p.method}
                        </span>
                      </td>
                      <td className="p-3 text-[#94A3B8]">{p.notes || '-'}</td>
                      <td className={`p-3 text-left font-black font-mono ${p.amount >= 0 ? 'text-[#2DD4BF]' : 'text-red-400'}`}>
                        {p.amount >= 0 ? '+' : '−'}{Math.abs(p.amount).toLocaleString()} ج
                      </td>
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
              <thead className="bg-[#111827]/70 text-[#94A3B8] font-bold border-b border-[#2A3B56]">
                <tr>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الكورس المسجل به</th>
                  <th className="p-3">إجمالي الرسوم</th>
                  <th className="p-3">المسدد حتى الآن</th>
                  <th className="p-3 text-left">المبلغ المتبقي المطلوب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3B56]">
                {enrollments
                  .filter(e => (e.totalAmount - e.totalPaid) > 0)
                  .map(e => {
                    const stu = students.find(s => s.id === e.studentId);
                    const grp = groups.find(g => g.id === e.groupId);
                    const crs = courses.find(c => c.id === grp?.courseId);
                    const rem = e.totalAmount - e.totalPaid;
                    return (
                      <tr key={e.id} className="hover:bg-[#111827]/40 transition-colors">
                        <td className="p-3 font-semibold text-[#F8FAFC]">{stu?.name}</td>
                        <td className="p-3 text-[#CBD5E1]">{crs?.name}</td>
                        <td className="p-3 font-mono text-[#94A3B8]">{e.totalAmount} ج</td>
                        <td className="p-3 font-mono text-[#2DD4BF]">{e.totalPaid} ج</td>
                        <td className="p-3 text-left font-black text-red-400 font-mono">{rem} ج</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB E: OPERATING EXPENSES */}
        {activeReportTab === 'expenses' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              {editingExpenseId ? 'تعديل بيانات المصروف' : 'إضافة مصروف تشغيل'}
            </h3>
            <form
              className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 rounded-2xl bg-[#111827] border border-[#2A3B56]"
              onSubmit={event => {
                event.preventDefault();
                try {
                  const expenseData = {
                    date: expenseDate,
                    category: expenseCategory,
                    description: expenseDescription,
                    amount: Number(expenseAmount),
                    paymentMethod: expensePaymentMethod,
                    recordedBy: currentUser?.id || undefined,
                  };
                  if (editingExpenseId) {
                    updateOperatingExpense({
                      ...expenseData,
                      id: editingExpenseId,
                      updatedBy: currentUser?.id || undefined,
                    });
                    resetExpenseForm();
                  } else {
                    addOperatingExpense(expenseData);
                    setExpenseDescription('');
                    setExpenseAmount('');
                  }
                } catch {
                  // The store already displays the validation error.
                }
              }}
            >
              <label className="space-y-1 text-xs font-bold text-[#94A3B8]">
                التاريخ
                <input className="w-full mt-1 p-2 rounded-xl bg-[#0E1629] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:border-[#0D9488] focus:outline-none" type="date" required value={expenseDate} onChange={event => setExpenseDate(event.target.value)} />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#94A3B8]">
                البند
                <select className="w-full mt-1 p-2 rounded-xl bg-[#0E1629] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:border-[#0D9488] focus:outline-none" value={expenseCategory} onChange={event => setExpenseCategory(event.target.value as OperatingExpenseCategory)}>
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key} className="bg-[#111827] text-[#F8FAFC]">{label}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-[#94A3B8] lg:col-span-2">
                البيان
                <input className="w-full mt-1 p-2 rounded-xl bg-[#0E1629] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:border-[#0D9488] focus:outline-none" required minLength={2} maxLength={200} value={expenseDescription} onChange={event => setExpenseDescription(event.target.value)} placeholder="مثال: إيجار شهر أكتوبر" />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#94A3B8]">
                المبلغ (ج.م)
                <input className="w-full mt-1 p-2 rounded-xl bg-[#0E1629] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:border-[#0D9488] focus:outline-none" type="number" min="0.01" step="0.01" required value={expenseAmount} onChange={event => setExpenseAmount(event.target.value)} />
              </label>
              <label className="space-y-1 text-xs font-bold text-[#94A3B8]">
                طريقة الدفع
                <select className="w-full mt-1 p-2 rounded-xl bg-[#0E1629] border border-[#2A3B56] text-[#F8FAFC] text-xs focus:border-[#0D9488] focus:outline-none" value={expensePaymentMethod} onChange={event => setExpensePaymentMethod(event.target.value as typeof expensePaymentMethod)}>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => <option key={key} value={key} className="bg-[#111827] text-[#F8FAFC]">{label}</option>)}
                </select>
              </label>
              <div className="flex gap-2 lg:col-span-6 pt-1">
                <button className="flex-1 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-[#F8FAFC] text-xs font-bold transition-colors shadow-md shadow-teal-900/30" type="submit">
                  {editingExpenseId ? 'حفظ التعديل' : 'تسجيل المصروف'}
                </button>
                {editingExpenseId && (
                  <button className="px-5 py-2.5 rounded-xl bg-[#111827] border border-[#2A3B56] text-[#CBD5E1] hover:text-[#F8FAFC] flex items-center gap-1 text-xs transition-colors" type="button" onClick={resetExpenseForm}>
                    <X size={14} /> إلغاء التعديل
                  </button>
                )}
              </div>
            </form>

            <div className="flex flex-wrap justify-between items-center gap-2 text-sm pt-2">
              <span className="font-bold text-[#94A3B8]">إجمالي مصروفات الفترة</span>
              <strong className="font-mono text-red-400">{totalOperatingExpenses.toLocaleString()} ج.م</strong>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#111827]/70 text-[#94A3B8] font-bold border-b border-[#2A3B56]">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">البند</th>
                    <th className="p-3">البيان</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3 text-left">المبلغ</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3B56]">
                  {filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-[#111827]/40">
                      <td className="p-3 text-[#94A3B8]">{expense.date}</td>
                      <td className="p-3 font-semibold text-[#F8FAFC]">{EXPENSE_CATEGORY_LABELS[expense.category]}</td>
                      <td className="p-3 text-[#CBD5E1]">
                        <span>{expense.description}</span>
                        {expense.updatedAt && <span className="block mt-0.5 text-[10px] text-[#94A3B8]">آخر تعديل: {expense.updatedAt}</span>}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] bg-[#111827] border border-[#2A3B56] text-[#94A3B8]">
                          {PAYMENT_METHOD_LABELS[expense.paymentMethod] || expense.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-left font-black font-mono text-red-400">−{expense.amount.toLocaleString()} ج</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => startEditingExpense(expense)} className="text-[#2DD4BF] hover:text-teal-300 transition-colors" title="تعديل المصروف" aria-label={'تعديل المصروف ' + expense.description}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" onClick={() => handleDeleteExpense(expense)} className="text-red-400 hover:text-red-300 transition-colors" title="حذف المصروف" aria-label={'حذف المصروف ' + expense.description}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-[#94A3B8]">لا توجد مصروفات مسجلة في الفترة المحددة.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              نتيجة النشاط = دفعات الكورسات + مجمل ربح متجر الأدوات − المصروفات المسجلة. أي تكلفة أخرى تُضاف كبند مصروف حتى تظهر في الحساب.
            </p>
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
