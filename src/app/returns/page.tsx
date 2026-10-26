'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BadgeDollarSign, Check, FileText, PackageCheck, Printer, RotateCcw,
  Search, Undo2, X,
} from 'lucide-react';
import { useMarsam, type AcademySettings } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { SupplyReturn, SupplySale } from '@/lib/mockData';
import { printInvoice, type InvoicePaperSize } from '@/lib/printing';
import type { CreateSupplyReturnDTO } from '@/lib/services/pos.service';

const paymentMethodLabels: Record<SupplySale['paymentMethod'], string> = {
  cash: 'نقدًا', transfer: 'تحويل بنكي', instapay: 'إنستاباي',
  vodafone: 'فودافون كاش', card: 'بطاقة بنكية',
};

const reasonLabels = {
  changed_mind: 'تغيير الرأي', wrong_item: 'صنف غير صحيح', damaged: 'تالف أو مكسور',
  quality: 'مشكلة جودة', other: 'سبب آخر',
} as const;

const conditionLabels = {
  sealed: 'مغلق وبحالته الأصلية', opened: 'مفتوح وسليم', damaged: 'تالف وغير صالح للبيع',
} as const;

const paperLabels: Record<InvoicePaperSize, string> = {
  a4: 'A4', a5: 'A5', thermal: 'حراري 80 مم',
};

const formatMoney = (amount: number) =>
  `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(amount)} ج.م`;

export default function ReturnsPage() {
  const { supplySales, supplyReturns, supplyItems, users, currentUser, createSupplyReturn, settings } = useMarsam();
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [reasonCategory, setReasonCategory] = useState<keyof typeof reasonLabels>('other');
  const [reasonDetails, setReasonDetails] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SupplySale['paymentMethod']>('cash');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [restockQuantities, setRestockQuantities] = useState<Record<string, number>>({});
  const [conditions, setConditions] = useState<Record<string, keyof typeof conditionLabels>>({});
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [completedReturn, setCompletedReturn] = useState<SupplyReturn | null>(null);
  const [pendingReturn, setPendingReturn] = useState<CreateSupplyReturnDTO | null>(null);
  const { isSubmitting, execute } = useAsyncAction();

  const activeSale = supplySales.find(sale => sale.id === selectedSaleId);
  const returnedBySaleAndProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of supplyReturns) {
      for (const line of item.items) {
        const key = `${item.saleId}:${line.productId}`;
        map.set(key, (map.get(key) || 0) + line.quantity);
      }
    }
    return map;
  }, [supplyReturns]);

  const eligibleSales = useMemo(() => supplySales
    .filter(sale => sale.status !== 'voided' && sale.items.some(line => {
      const returned = returnedBySaleAndProduct.get(`${sale.id}:${line.productId}`) || 0;
      return line.quantity - returned > 0;
    }))
    .sort((left, right) => right.date.localeCompare(left.date)), [supplySales, returnedBySaleAndProduct]);

  const matchingSales = useMemo(() => {
    const query = invoiceSearch.trim().toLocaleLowerCase('ar');
    if (!query) return [];
    return eligibleSales.filter(sale =>
      `${sale.invoiceNumber} ${sale.customerName}`.toLocaleLowerCase('ar').includes(query)
    ).slice(0, 8);
  }, [eligibleSales, invoiceSearch]);

  const selectedLines = activeSale?.items.map(line => {
    const returned = returnedBySaleAndProduct.get(`${activeSale.id}:${line.productId}`) || 0;
    const remaining = Math.max(0, line.quantity - returned);
    const quantity = Math.min(remaining, Math.max(0, quantities[line.productId] || 0));
    const productExists = supplyItems.some(item => item.id === line.productId);
    const condition = conditions[line.productId] || 'sealed';
    const restockQuantity = productExists
      ? Math.min(quantity, Math.max(0, restockQuantities[line.productId] ?? (condition === 'damaged' ? 0 : quantity)))
      : 0;
    return { ...line, soldQuantity: line.quantity, remaining, quantity, productExists, condition, restockQuantity };
  }) || [];

  const estimatedRefund = activeSale ? selectedLines.reduce((total, line) => {
    if (!line.quantity || !line.soldQuantity) return total;
    const subtotal = activeSale.subtotalAmount ?? activeSale.items.reduce((sum, item) => sum + item.total, 0);
    const discount = activeSale.discountAmount ?? 0;
    const actualGross = line.total * line.quantity / line.soldQuantity;
    const discountShare = subtotal > 0 ? discount * actualGross / subtotal : 0;
    return total + Math.max(0, actualGross - discountShare);
  }, 0) : 0;

  const handleSaleChange = (saleId: string) => {
    const nextSale = supplySales.find(sale => sale.id === saleId);
    setSelectedSaleId(saleId);
    setInvoiceSearch('');
    setPaymentMethod(nextSale?.paymentMethod || 'cash');
    setQuantities({});
    setRestockQuantities({});
    setConditions(Object.fromEntries((nextSale?.items || []).map(line => [line.productId, 'sealed'])) as Record<string, keyof typeof conditionLabels>);
    setReasonCategory('other');
    setReasonDetails('');
    setFormError('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSale) {
      setFormError('ابحث عن فاتورة بيع متاحة للإرجاع.');
      return;
    }
    const items = selectedLines
      .filter(line => line.quantity > 0)
      .map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        restockQuantity: line.restockQuantity,
        condition: line.condition,
      }));
    if (!items.length) {
      setFormError('أدخل كمية أكبر من صفر لصنف واحد على الأقل.');
      return;
    }
    if (reasonCategory === 'other' && reasonDetails.trim().length < 3) {
      setFormError('اكتب تفاصيل سبب الإرجاع، ثلاثة أحرف على الأقل.');
      return;
    }

    const fullReason = reasonDetails.trim()
      ? `${reasonLabels[reasonCategory]}: ${reasonDetails.trim()}`
      : reasonLabels[reasonCategory];
    setFormError('');
    setPendingReturn({
        saleId: activeSale.id,
        returnedBy: currentUser?.id || 'admin',
        reason: fullReason,
        reasonCategory,
        paymentMethod,
        items,
    });
  };

  const confirmReturn = () => {
    if (!pendingReturn) return;
    void execute(() => {
      const created = createSupplyReturn(pendingReturn);
      setCompletedReturn(created);
      setPendingReturn(null);
      handleSaleChange('');
    }).catch(error => {
      setPendingReturn(null);
      setFormError(error instanceof Error ? error.message : 'تعذر تسجيل المرتجع.');
    });
  };

  const totalRefund = supplyReturns.reduce((sum, item) => sum + item.totalRefund, 0);
  const restockedUnits = supplyReturns.reduce((sum, item) =>
    sum + item.items.reduce((itemSum, line) => itemSum + line.restockQuantity, 0), 0);
  const filteredReturns = supplyReturns
    .filter(item => `${item.returnNumber} ${item.invoiceNumber} ${item.customerName}`.toLocaleLowerCase('ar').includes(search.trim().toLocaleLowerCase('ar')))
    .sort((left, right) => right.returnedAt.localeCompare(left.returnedAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            <RotateCcw size={14} /> مرتجعات مبيعات المتجر
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#F8FAFC]">
            <Undo2 className="text-amber-400" size={25} /> إدارة المرتجعات
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">راجع فاتورة البيع، افحص حالة الصنف، وسجّل رد المبلغ بمستند قابل للطباعة.</p>
        </div>
        <Link href="/supplies" className="btn btn-secondary border border-[#2A3B56] text-xs">
          العودة لمتجر الأدوات <ArrowLeft size={15} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="مستندات الإرجاع" value={String(supplyReturns.length)} icon={<FileText size={20} />} tone="slate" />
        <SummaryCard label="إجمالي المبالغ المستردة" value={formatMoney(totalRefund)} icon={<BadgeDollarSign size={21} />} tone="amber" />
        <SummaryCard label="قطع عادت إلى المخزون" value={String(restockedUnits)} icon={<PackageCheck size={20} />} tone="teal" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <section className="rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h2 className="flex items-center gap-2 text-base font-black text-[#F8FAFC]"><RotateCcw size={18} className="text-amber-300" />بدء طلب إرجاع</h2><p className="mt-1 text-xs text-[#94A3B8]">كل مرتجع مرتبط بالفاتورة الأصلية وسجل المخزون.</p></div>
            <span className="rounded-lg bg-[#111827] px-2.5 py-1 text-[10px] font-bold text-[#94A3B8]">بدون مدة إرجاع مفروضة</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!activeSale ? (
              <div>
                <label htmlFor="invoice-search" className="mb-1 block text-xs font-bold text-[#CBD5E1]">ابحث برقم الفاتورة أو اسم العميل</label>
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input id="invoice-search" className="input pr-10" autoComplete="off" value={invoiceSearch} onChange={event => setInvoiceSearch(event.target.value)} placeholder="مثال: SHP-2026-0001" />
                </div>
                {invoiceSearch.trim() && <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#2A3B56] bg-[#111827]">
                  {matchingSales.map(sale => <button key={sale.id} type="button" onClick={() => handleSaleChange(sale.id)} className="flex w-full items-center justify-between gap-3 border-b border-[#2A3B56] p-3 text-right last:border-b-0 hover:bg-[#1B2537]">
                    <span><bdi className="block font-mono text-xs font-black text-teal-300">{sale.invoiceNumber}</bdi><span className="mt-1 block text-xs text-[#CBD5E1]">{sale.customerName} • {sale.date}</span></span>
                    <span className="text-xs font-bold text-[#F8FAFC]">{formatMoney(sale.totalAmount)} <ArrowLeft className="mr-1 inline" size={13} /></span>
                  </button>)}
                  {!matchingSales.length && <p className="p-4 text-center text-xs text-[#94A3B8]">لا توجد فاتورة متاحة تطابق البحث.</p>}
                </div>}
                {!eligibleSales.length && <p className="mt-3 rounded-lg bg-[#111827] p-3 text-center text-xs text-[#94A3B8]">لا توجد فواتير بها كميات متاحة للإرجاع.</p>}
              </div>
            ) : (
              <div className="rounded-xl border border-teal-700/40 bg-teal-950/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><span className="text-[10px] font-bold text-teal-200">الفاتورة المحددة</span><bdi className="mt-1 block font-mono text-sm font-black text-teal-300">{activeSale.invoiceNumber}</bdi></div>
                  <button type="button" onClick={() => handleSaleChange('')} className="rounded-lg border border-[#2A3B56] px-2.5 py-1.5 text-[10px] font-bold text-[#CBD5E1] hover:bg-[#111827]">تغيير الفاتورة</button>
                </div>
                <div className="mt-3 grid gap-2 border-t border-teal-900/60 pt-3 text-xs sm:grid-cols-3">
                  <div><span className="text-[#94A3B8]">العميل</span><strong className="mt-1 block text-[#F8FAFC]">{activeSale.customerName}</strong></div>
                  <div><span className="text-[#94A3B8]">تاريخ البيع</span><strong className="mt-1 block text-[#F8FAFC]">{activeSale.date}</strong></div>
                  <div><span className="text-[#94A3B8]">صافي الفاتورة</span><strong className="mt-1 block text-[#F8FAFC]">{formatMoney(activeSale.totalAmount)}</strong></div>
                </div>
                {(activeSale.discountAmount ?? 0) > 0 && <p className="mt-2 text-[10px] text-[#94A3B8]">يشمل صافي الاسترداد التوزيع النسبي لخصم الفاتورة الأصلي ({formatMoney(activeSale.discountAmount ?? 0)}).</p>}
              </div>
            )}

            {activeSale && <>
              <div>
                <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-black text-[#F8FAFC]">الأصناف وحالة الفحص</h3><span className="text-[10px] text-[#94A3B8]">المتاح من الكمية الأصلية فقط</span></div>
                <div className="space-y-2">
                  {selectedLines.map(line => {
                    const item = supplyItems.find(product => product.id === line.productId);
                    return <div key={line.productId} className="rounded-xl border border-[#2A3B56] bg-[#111827] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><p className="text-sm font-bold text-[#F8FAFC]">{line.productName}</p><p className="mt-1 text-[10px] text-[#94A3B8]">المباع: {line.quantity} • المتاح للإرجاع: {line.remaining} • سعر الوحدة: {formatMoney(line.unitPrice)}{item ? ` • رصيد المخزون: ${item.stockQty}` : ''}</p></div>
                        <label className="text-[10px] font-bold text-[#94A3B8]">الكمية المرتجعة<input className="input mt-1 w-24 text-center" type="number" min={0} max={line.remaining} step={1} value={line.quantity} onChange={event => {
                          const quantity = Math.min(line.remaining, Math.max(0, Number(event.target.value) || 0));
                          setQuantities(current => ({ ...current, [line.productId]: quantity }));
                          setRestockQuantities(current => ({ ...current, [line.productId]: Math.min(quantity, current[line.productId] ?? (line.condition === 'damaged' ? 0 : quantity)) }));
                        }} /></label>
                      </div>
                      {line.quantity > 0 && <div className="mt-3 grid gap-2 border-t border-[#2A3B56] pt-3 sm:grid-cols-2">
                        <label className="text-[10px] font-bold text-[#94A3B8]">حالة الصنف عند الاستلام<select className="input mt-1 text-xs" value={line.condition} onChange={event => {
                          const condition = event.target.value as keyof typeof conditionLabels;
                          setConditions(current => ({ ...current, [line.productId]: condition }));
                          if (condition === 'damaged') setRestockQuantities(current => ({ ...current, [line.productId]: 0 }));
                          else setRestockQuantities(current => ({ ...current, [line.productId]: Math.min(line.quantity, current[line.productId] ?? line.quantity) }));
                        }}>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <label className="text-[10px] font-bold text-[#94A3B8]">الكمية الصالحة لإعادة البيع<input className="input mt-1 text-center" type="number" min={0} max={line.quantity} step={1} value={line.restockQuantity} disabled={!line.productExists} onChange={event => setRestockQuantities(current => ({ ...current, [line.productId]: Math.min(line.quantity, Math.max(0, Number(event.target.value) || 0)) }))} /></label>
                      </div>}
                      {!line.productExists && <p className="mt-2 text-[10px] text-amber-300">الصنف غير موجود حاليًا في المخزون؛ سيسجل الرد المالي دون زيادة المخزون.</p>}
                    </div>;
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-[#CBD5E1]">تصنيف سبب الإرجاع<select className="input mt-1" value={reasonCategory} onChange={event => setReasonCategory(event.target.value as keyof typeof reasonLabels)}>{Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="block text-xs font-bold text-[#CBD5E1]">طريقة رد المبلغ<select className="input mt-1" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as SupplySale['paymentMethod'])}>{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              </div>
              <label className="block text-xs font-bold text-[#CBD5E1]">تفاصيل إضافية{reasonCategory === 'other' && <span className="mr-1 text-amber-300">(مطلوبة)</span>}
                <textarea className="input mt-1" rows={2} maxLength={240} required={reasonCategory === 'other'} value={reasonDetails} onChange={event => setReasonDetails(event.target.value)} placeholder="أضف وصفًا مختصرًا يساعد فريق المتجر في المراجعة" />
              </label>
              <div className="flex items-center justify-between rounded-xl border border-amber-700/30 bg-amber-950/20 p-3 text-xs"><span className="font-bold text-amber-100">صافي المبلغ المتوقع رده</span><strong className="font-mono text-base text-amber-300">{formatMoney(estimatedRefund)}</strong></div>
            </>}

            {formError && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-2 text-xs text-red-300">{formError}</p>}
            <button type="submit" disabled={isSubmitting || !activeSale} className="btn btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"><Check size={16} />{isSubmitting ? 'جاري تسجيل المرتجع...' : 'مراجعة المرتجع قبل التسجيل'}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base font-black text-[#F8FAFC]">سجل المرتجعات</h2><p className="mt-1 text-xs text-[#94A3B8]">إيصالات موثقة مرتبطة بفواتير البيع الأصلية</p></div>
            <label className="relative block sm:w-56"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input className="input pr-9 text-xs" value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث برقم المرتجع أو الفاتورة" /></label>
          </div>
          <div className="space-y-3">
            {filteredReturns.map(item => <article key={item.id} className="rounded-xl border border-[#2A3B56] bg-[#111827] p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-xs font-black text-amber-300">{item.returnNumber}</p><p className="mt-1 text-xs text-[#94A3B8]">فاتورة <bdi>{item.invoiceNumber}</bdi> • {item.returnedAt}</p></div><strong className="font-mono text-sm text-amber-200">−{formatMoney(item.totalRefund)}</strong></div>
              <p className="mt-2 text-xs font-bold text-[#F8FAFC]">{item.customerName}</p>
              <p className="mt-1 text-[11px] leading-5 text-[#CBD5E1]">{item.items.map(line => `${line.productName} (${line.quantity})`).join('، ')}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#2A3B56] pt-2 text-[10px] text-[#94A3B8]"><span>رد عبر {paymentMethodLabels[item.paymentMethod]}</span><span>للمخزون: {item.items.reduce((sum, line) => sum + line.restockQuantity, 0)} قطعة</span><span>سجله: {users.find(user => user.id === item.returnedBy)?.name || item.returnedBy}</span></div>
              <p className="mt-1 text-[10px] text-[#94A3B8]">السبب: {item.reason}</p>
              <button type="button" onClick={() => setCompletedReturn(item)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#2A3B56] px-3 py-2 text-[10px] font-bold text-teal-200 hover:bg-[#1B2537]"><Printer size={13} />عرض أو طباعة الإيصال</button>
            </article>)}
            {!filteredReturns.length && <p className="rounded-xl border border-dashed border-[#2A3B56] py-10 text-center text-xs text-[#94A3B8]">{search ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد مرتجعات مسجلة حتى الآن.'}</p>}
          </div>
        </section>
      </div>

      {pendingReturn && <ReturnConfirmationModal request={pendingReturn} sale={supplySales.find(sale => sale.id === pendingReturn.saleId)} isSubmitting={isSubmitting} onCancel={() => setPendingReturn(null)} onConfirm={confirmReturn} />}
      {completedReturn && <ReturnReceiptModal receipt={completedReturn} settings={settings} onClose={() => setCompletedReturn(null)} />}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: 'slate' | 'amber' | 'teal' }) {
  const tones = {
    slate: 'border-[#2A3B56] bg-[#1B2537] text-[#F8FAFC]',
    amber: 'border-amber-700/40 bg-amber-950/20 text-amber-300',
    teal: 'border-teal-700/40 bg-teal-950/20 text-teal-300',
  };
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><p className="text-xs font-bold opacity-80">{label}</p><p className="mt-1 flex items-center gap-2 text-xl font-black">{icon}{value}</p></div>;
}

function ReturnConfirmationModal({ request, sale, isSubmitting, onCancel, onConfirm }: {
  request: CreateSupplyReturnDTO;
  sale?: SupplySale;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const estimated = request.items.reduce((sum, item) => {
    const line = sale?.items.find(saleItem => saleItem.productId === item.productId);
    if (!line || line.quantity <= 0) return sum;
    const subtotal = sale?.subtotalAmount ?? sale?.items.reduce((total, saleItem) => total + saleItem.total, 0) ?? 0;
    const gross = line.total * item.quantity / line.quantity;
    const discountShare = subtotal > 0 ? (sale?.discountAmount ?? 0) * gross / subtotal : 0;
    return sum + Math.max(0, gross - discountShare);
  }, 0);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="return-confirm-title" className="w-full max-w-lg rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-5 text-[#F8FAFC] shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><h2 id="return-confirm-title" className="text-lg font-black">مراجعة تفاصيل المرتجع</h2><p className="mt-1 text-xs text-[#94A3B8]">تأكد من الكميات وطريقة الرد قبل تسجيل الحركة المالية والمخزنية.</p></div><button type="button" onClick={onCancel} aria-label="إغلاق" className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#111827]"><X size={18} /></button></div>
      <div className="mt-4 rounded-xl border border-[#2A3B56] bg-[#111827] p-3 text-xs"><div className="flex justify-between gap-3"><span className="text-[#94A3B8]">فاتورة البيع</span><bdi className="font-mono font-bold text-teal-300">{sale?.invoiceNumber || 'غير متاحة'}</bdi></div><div className="mt-2 flex justify-between gap-3"><span className="text-[#94A3B8]">العميل</span><strong>{sale?.customerName || '—'}</strong></div><div className="mt-2 flex justify-between gap-3"><span className="text-[#94A3B8]">سبب الإرجاع</span><strong>{request.reason}</strong></div><div className="mt-2 flex justify-between gap-3"><span className="text-[#94A3B8]">رد المبلغ عبر</span><strong>{paymentMethodLabels[request.paymentMethod]}</strong></div></div>
      <div className="mt-3 space-y-2">{request.items.map(line => <div key={line.productId} className="flex items-center justify-between gap-3 rounded-lg border border-[#2A3B56] px-3 py-2 text-xs"><span>{sale?.items.find(item => item.productId === line.productId)?.productName || line.productId} • كمية {line.quantity}<small className="mt-1 block text-[#94A3B8]">{conditionLabels[line.condition || 'opened']} • للمخزون {line.restockQuantity}</small></span><strong className="font-mono text-amber-300">{formatMoney(estimatedItemRefund(sale, line.productId, line.quantity))}</strong></div>)}</div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 text-sm"><span className="font-bold text-amber-100">إجمالي الرد التقديري</span><strong className="font-mono text-amber-300">{formatMoney(estimated)}</strong></div>
      <div className="mt-5 flex gap-2"><button type="button" onClick={onCancel} disabled={isSubmitting} className="btn btn-secondary flex-1">رجوع للتعديل</button><button type="button" onClick={onConfirm} disabled={isSubmitting || !sale} className="btn btn-primary flex-1">{isSubmitting ? 'جاري التسجيل...' : 'تأكيد وتسجيل المرتجع'}</button></div>
    </section>
  </div>;
}

function estimatedItemRefund(sale: SupplySale | undefined, productId: string, quantity: number) {
  const line = sale?.items.find(item => item.productId === productId);
  if (!sale || !line || line.quantity <= 0) return 0;
  const subtotal = sale.subtotalAmount ?? sale.items.reduce((total, item) => total + item.total, 0);
  const gross = line.total * quantity / line.quantity;
  const discountShare = subtotal > 0 ? (sale.discountAmount ?? 0) * gross / subtotal : 0;
  return Math.max(0, gross - discountShare);
}

function ReturnReceiptModal({ receipt, settings, onClose }: { receipt: SupplyReturn; settings: AcademySettings; onClose: () => void }) {
  const [paperSize, setPaperSize] = useState<InvoicePaperSize>('a5');
  return <div className="invoice-print-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
    <section className="invoice-modal-shell relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl" aria-label="إيصال مرتجع مبيعات">
      <button type="button" onClick={onClose} aria-label="إغلاق الإيصال" className="invoice-print-actions absolute left-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
      <article id="printable-document" className="invoice-paper invoice-paper-receipt" dir="rtl">
        <header className="invoice-brand border-b-2 border-slate-900 pb-4 text-center"><div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full border-2 border-amber-700 text-sm font-black text-amber-800">م</div><h1 className="text-xl font-black text-slate-950">{settings.name}</h1><p className="mt-1 text-sm font-semibold text-slate-700">إيصال مرتجع مبيعات</p><p className="mt-1 text-xs text-slate-600">{settings.address} • {settings.phone}</p><div className="mt-3 inline-flex rounded-md border border-slate-400 px-3 py-1 text-sm font-bold">رقم المرتجع: <bdi className="mr-1 font-mono">{receipt.returnNumber}</bdi></div></header>
        <dl className="invoice-details my-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm"><div><dt>رقم فاتورة البيع</dt><dd><bdi>{receipt.invoiceNumber}</bdi></dd></div><div><dt>العميل</dt><dd>{receipt.customerName}</dd></div><div><dt>تاريخ المرتجع</dt><dd><bdi>{receipt.returnedAt}</bdi></dd></div><div><dt>طريقة رد المبلغ</dt><dd>{paymentMethodLabels[receipt.paymentMethod]}</dd></div><div className="col-span-2"><dt>سبب الإرجاع</dt><dd>{receipt.reason}</dd></div></dl>
        <div className="overflow-x-auto"><table className="invoice-items w-full border-collapse text-right text-sm"><thead><tr className="border-y border-slate-700 bg-slate-100 text-slate-800"><th className="px-2 py-2">الصنف</th><th className="px-2 py-2 text-center">الكمية</th><th className="px-2 py-2 text-center">الحالة</th><th className="px-2 py-2 text-left">المسترد</th></tr></thead><tbody>{receipt.items.map((line, index) => <tr key={`${line.productId}-${index}`} className="border-b border-slate-200"><td className="px-2 py-2 font-semibold">{line.productName}<small className="block text-xs font-normal text-slate-600">خصم موزع: {formatMoney(line.discountShare)}</small></td><td className="px-2 py-2 text-center">{line.quantity}</td><td className="px-2 py-2 text-center text-xs">{line.condition ? conditionLabels[line.condition] : 'غير مسجل'}</td><td className="px-2 py-2 text-left font-bold">{formatMoney(line.refundAmount)}</td></tr>)}</tbody></table></div>
        <div className="invoice-amount-row mt-4 flex items-center justify-between border-y-2 border-slate-900 py-3"><span className="font-bold">إجمالي المبلغ المسترد</span><strong className="text-xl font-black"><bdi>{formatMoney(receipt.totalRefund)}</bdi></strong></div>
        <div className="mt-3 flex items-center justify-between text-sm"><span>الكمية المعادة للمخزون</span><strong>{receipt.items.reduce((sum, line) => sum + line.restockQuantity, 0)} قطعة</strong></div>
        <footer className="invoice-footer mt-8 border-t border-slate-300 pt-4 text-center text-xs text-slate-600"><div className="mb-5 flex justify-between text-slate-800"><span>توقيع العميل: __________________</span><span>توقيع المسؤول: __________________</span></div><p>يرجى الاحتفاظ بهذا الإيصال للمراجعة.</p></footer>
      </article>
      <div className="invoice-print-actions mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4"><label className="flex items-center gap-2 text-sm font-semibold text-slate-700">مقاس الورق<select value={paperSize} onChange={event => setPaperSize(event.target.value as InvoicePaperSize)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{(Object.keys(paperLabels) as InvoicePaperSize[]).map(size => <option key={size} value={size}>{paperLabels[size]}</option>)}</select></label><button type="button" onClick={() => printInvoice(paperSize)} className="btn btn-primary flex flex-1 items-center justify-center gap-2"><Printer size={16} />طباعة الإيصال</button><button type="button" onClick={onClose} className="btn btn-secondary">إغلاق</button></div>
    </section>
  </div>;
}
