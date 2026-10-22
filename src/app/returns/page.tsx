'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeDollarSign, PackageCheck, RotateCcw, Search, Undo2 } from 'lucide-react';
import { useMarsam } from '@/lib/store';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { SupplySale } from '@/lib/mockData';

const paymentMethodLabels: Record<SupplySale['paymentMethod'], string> = {
  cash: 'نقدًا',
  transfer: 'تحويل بنكي',
  instapay: 'إنستاباي',
  vodafone: 'فودافون كاش',
  card: 'بطاقة بنكية',
};

const formatMoney = (amount: number) =>
  `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(amount)} ج.م`;

export default function ReturnsPage() {
  const { supplySales, supplyReturns, supplyItems, users, currentUser, createSupplyReturn } = useMarsam();
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SupplySale['paymentMethod']>('cash');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [restockQuantities, setRestockQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
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

  const selectedLines = activeSale?.items.map(line => {
    const returned = returnedBySaleAndProduct.get(`${activeSale.id}:${line.productId}`) || 0;
    const remaining = Math.max(0, line.quantity - returned);
    const soldQuantity = line.quantity;
    const quantity = Math.min(remaining, Math.max(0, quantities[line.productId] || 0));
    const productExists = supplyItems.some(item => item.id === line.productId);
    const restockQuantity = productExists
      ? Math.min(quantity, Math.max(0, restockQuantities[line.productId] ?? quantity))
      : 0;
    return { ...line, soldQuantity, remaining, quantity, restockQuantity };
  }) || [];

  const estimatedRefund = activeSale ? selectedLines.reduce((total, line) => {
    if (!line.quantity || !line.soldQuantity) return total;
    const subtotal = activeSale.subtotalAmount ?? activeSale.items.reduce((sum, item) => sum + item.total, 0);
    const discount = activeSale.discountAmount ?? 0;
    const returnedGross = line.total * line.quantity / line.soldQuantity;
    return total + Math.max(0, returnedGross - (subtotal > 0 ? discount * returnedGross / subtotal : 0));
  }, 0) : 0;

  const handleSaleChange = (saleId: string) => {
    const nextSale = supplySales.find(sale => sale.id === saleId);
    setSelectedSaleId(saleId);
    setPaymentMethod(nextSale?.paymentMethod || 'cash');
    setQuantities({});
    setRestockQuantities({});
    setReason('');
    setFormError('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSale) {
      setFormError('اختار فاتورة بيع متاحة للإرجاع.');
      return;
    }
    const items = selectedLines
      .filter(line => line.quantity > 0)
      .map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        restockQuantity: line.restockQuantity,
      }));
    if (!items.length) {
      setFormError('أدخل كمية أكبر من صفر لصنف واحد على الأقل.');
      return;
    }
    if (reason.trim().length < 3) {
      setFormError('اكتب سبب الإرجاع، ثلاثة أحرف على الأقل.');
      return;
    }

    setFormError('');
    void execute(() => {
      createSupplyReturn({
        saleId: activeSale.id,
        returnedBy: currentUser?.id || 'admin',
        reason: reason.trim(),
        paymentMethod,
        items,
      });
      handleSaleChange('');
    }).catch(error => {
      setFormError(error instanceof Error ? error.message : 'تعذر تسجيل المرتجع.');
    });
  };

  const totalRefund = supplyReturns.reduce((sum, item) => sum + item.totalRefund, 0);
  const restockedUnits = supplyReturns.reduce((sum, item) =>
    sum + item.items.reduce((itemSum, line) => itemSum + line.restockQuantity, 0), 0);
  const filteredReturns = useMemo(() => supplyReturns
    .filter(item => `${item.returnNumber} ${item.invoiceNumber} ${item.customerName}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((left, right) => right.returnedAt.localeCompare(left.returnedAt)), [supplyReturns, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            <RotateCcw size={14} /> مرتجعات مبيعات المتجر
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#F8FAFC]">
            <Undo2 className="text-amber-400" size={25} /> تسجيل ومتابعة المرتجعات
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">سجّل الأصناف المرتجعة، مبلغ الرد، والكمية التي ستعود إلى المخزون.</p>
        </div>
        <Link href="/supplies" className="btn btn-secondary border border-[#2A3B56] text-xs">
          العودة لمتجر الأدوات <ArrowLeft size={15} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-4">
          <p className="text-xs font-bold text-[#94A3B8]">عدد مستندات الإرجاع</p>
          <p className="mt-1 text-2xl font-black text-[#F8FAFC]">{supplyReturns.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4">
          <p className="text-xs font-bold text-amber-200">إجمالي المبالغ المستردة</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-black text-amber-300"><BadgeDollarSign size={21} />{formatMoney(totalRefund)}</p>
        </div>
        <div className="rounded-2xl border border-teal-700/40 bg-teal-950/20 p-4">
          <p className="text-xs font-bold text-teal-200">قطع عادت إلى المخزون</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-black text-teal-300"><PackageCheck size={21} />{restockedUnits}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <section className="rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-black text-[#F8FAFC]"><RotateCcw size={18} className="text-amber-300" />إرجاع أصناف من فاتورة</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-bold text-[#CBD5E1]">
              فاتورة البيع
              <select className="input mt-1" value={selectedSaleId} onChange={event => handleSaleChange(event.target.value)}>
                <option value="">اختر فاتورة متاحة</option>
                {eligibleSales.map(sale => (
                  <option key={sale.id} value={sale.id}>{sale.invoiceNumber} — {sale.customerName} — {formatMoney(sale.totalAmount)}</option>
                ))}
              </select>
            </label>

            {activeSale && (
              <>
                <div className="rounded-xl border border-[#2A3B56] bg-[#111827] p-3 text-xs text-[#CBD5E1]">
                  <div className="flex flex-wrap justify-between gap-2"><span>الفاتورة: <bdi className="font-mono font-bold text-teal-300">{activeSale.invoiceNumber}</bdi></span><span>العميل: <strong>{activeSale.customerName}</strong></span></div>
                  <p className="mt-1 text-[#94A3B8]">خصم الفاتورة الأصلي: {formatMoney(activeSale.discountAmount ?? 0)} • مبلغ الاسترداد تقديري ويتحسب نهائيًا وقت الحفظ.</p>
                </div>

                <div className="space-y-2">
                  {selectedLines.map(line => {
                    const product = supplyItems.find(item => item.id === line.productId);
                    return (
                      <div key={line.productId} className="grid gap-3 rounded-xl border border-[#2A3B56] bg-[#111827] p-3 sm:grid-cols-[minmax(0,1fr)_90px_105px] sm:items-center">
                        <div>
                          <p className="text-sm font-bold text-[#F8FAFC]">{line.productName}</p>
                          <p className="mt-0.5 text-[11px] text-[#94A3B8]">المباع: {line.quantity} • المتاح للإرجاع: {line.remaining} • سعر الوحدة: {formatMoney(line.unitPrice)}</p>
                        </div>
                        <label className="text-[10px] font-bold text-[#94A3B8]">كمية الإرجاع
                          <input className="input mt-1 text-center" type="number" min={0} max={line.remaining} step={1} value={line.quantity} onChange={event => {
                            const quantity = Math.min(line.remaining, Math.max(0, Number(event.target.value) || 0));
                            setQuantities(current => ({ ...current, [line.productId]: quantity }));
                            setRestockQuantities(current => ({ ...current, [line.productId]: Math.min(quantity, current[line.productId] ?? quantity) }));
                          }} />
                        </label>
                        <label className="text-[10px] font-bold text-[#94A3B8]">تُعاد للمخزون
                          <input className="input mt-1 text-center" type="number" min={0} max={line.quantity} step={1} value={line.restockQuantity} disabled={!product} onChange={event => setRestockQuantities(current => ({ ...current, [line.productId]: Math.min(line.quantity, Math.max(0, Number(event.target.value) || 0)) }))} />
                        </label>
                        {!product && <p className="text-[10px] text-amber-300 sm:col-span-3">الصنف لم يعد موجودًا بالمخزون؛ يمكن تسجيل الرد المالي دون إعادة الكمية للمخزون.</p>}
                      </div>
                    );
                  })}
                </div>

                <label className="block text-xs font-bold text-[#CBD5E1]">طريقة رد المبلغ
                  <select className="input mt-1" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as SupplySale['paymentMethod'])}>
                    {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                <label className="block text-xs font-bold text-[#CBD5E1]">سبب الإرجاع
                  <textarea className="input mt-1" rows={2} maxLength={300} required value={reason} onChange={event => setReason(event.target.value)} placeholder="مثال: خامة غير مناسبة أو عيب في المنتج" />
                </label>

                <div className="flex items-center justify-between rounded-xl border border-amber-700/30 bg-amber-950/20 p-3 text-xs">
                  <span className="font-bold text-amber-100">المبلغ المتوقع رده</span>
                  <strong className="font-mono text-base text-amber-300">{formatMoney(estimatedRefund)}</strong>
                </div>
              </>
            )}

            {formError && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-2 text-xs text-red-300">{formError}</p>}
            <button type="submit" disabled={isSubmitting || !activeSale} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? 'جاري تسجيل المرتجع...' : 'تسجيل الإرجاع ورد المبلغ'}
            </button>
            {!eligibleSales.length && <p className="text-center text-xs text-[#94A3B8]">لا توجد فواتير بها كميات متاحة للإرجاع.</p>}
          </form>
        </section>

        <section className="rounded-2xl border border-[#2A3B56] bg-[#1B2537] p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base font-black text-[#F8FAFC]">سجل المرتجعات</h2><p className="mt-1 text-xs text-[#94A3B8]">إيصالات موثقة مرتبطة بفواتير البيع الأصلية</p></div>
            <label className="relative block sm:w-56"><Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" /><input className="input pr-9 text-xs" value={search} onChange={event => setSearch(event.target.value)} placeholder="بحث برقم المرتجع أو الفاتورة" /></label>
          </div>
          <div className="space-y-3">
            {filteredReturns.map(item => (
              <article key={item.id} className="rounded-xl border border-[#2A3B56] bg-[#111827] p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-mono text-xs font-black text-amber-300">{item.returnNumber}</p><p className="mt-1 text-xs text-[#94A3B8]">فاتورة {item.invoiceNumber} • {item.returnedAt}</p></div>
                  <strong className="font-mono text-sm text-amber-200">−{formatMoney(item.totalRefund)}</strong>
                </div>
                <p className="mt-2 text-xs font-bold text-[#F8FAFC]">{item.customerName}</p>
                <p className="mt-1 text-[11px] leading-5 text-[#CBD5E1]">{item.items.map(line => `${line.productName} (${line.quantity})`).join('، ')}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#2A3B56] pt-2 text-[10px] text-[#94A3B8]">
                  <span>رد عبر {paymentMethodLabels[item.paymentMethod]}</span><span>للمخزون: {item.items.reduce((sum, line) => sum + line.restockQuantity, 0)} قطعة</span><span>سجله: {users.find(user => user.id === item.returnedBy)?.name || item.returnedBy}</span>
                </div>
                <p className="mt-1 text-[10px] text-[#94A3B8]">السبب: {item.reason}</p>
              </article>
            ))}
            {!filteredReturns.length && <p className="rounded-xl border border-dashed border-[#2A3B56] py-10 text-center text-xs text-[#94A3B8]">لا توجد مرتجعات مسجلة حتى الآن.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
