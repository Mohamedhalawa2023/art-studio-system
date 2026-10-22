'use client';

import { useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { AcademySettings } from '@/lib/store';
import { printInvoice, type InvoicePaperSize } from '@/lib/printing';

export interface CoursePaymentReceipt {
  receiptNumber: string;
  date: string;
  studentName: string;
  courseName: string;
  amount: number;
  remaining: number;
  method: string;
  notes?: string;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'نقداً',
  transfer: 'تحويل بنكي',
  instapay: 'إنستاباي',
  vodafone: 'فودافون كاش',
  card: 'بطاقة بنكية',
};

const paperLabels: Record<InvoicePaperSize, string> = {
  a4: 'A4',
  a5: 'A5',
  thermal: 'حراري 80 مم',
};

function formatMoney(amount: number) {
  return `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(amount)} ج.م`;
}

export function PaymentReceiptModal({
  receipt,
  settings,
  onClose,
}: {
  receipt: CoursePaymentReceipt;
  settings: AcademySettings;
  onClose: () => void;
}) {
  const [paperSize, setPaperSize] = useState<InvoicePaperSize>('a5');

  return (
    <div className="invoice-print-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <section className="invoice-modal-shell relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl" aria-label="إيصال سداد رسوم الدورة">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق الإيصال"
          className="invoice-print-actions absolute left-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X size={20} />
        </button>

        <article id="printable-document" className="invoice-paper invoice-paper-receipt" dir="rtl">
          <header className="invoice-brand border-b-2 border-slate-900 pb-4 text-center">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full border-2 border-teal-700 text-sm font-black text-teal-800">م</div>
            <h1 className="text-xl font-black text-slate-950">{settings.name}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-700">إيصال استلام رسوم دورة تدريبية</p>
            <p className="mt-1 text-xs text-slate-600">{settings.address} • {settings.phone}</p>
            <div className="mt-3 inline-flex rounded-md border border-slate-400 px-3 py-1 text-sm font-bold text-slate-900">
              رقم الإيصال: <bdi className="mr-1 font-mono">{receipt.receiptNumber}</bdi>
            </div>
          </header>

          <dl className="invoice-details my-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
            <div><dt>اسم الطالب</dt><dd>{receipt.studentName}</dd></div>
            <div><dt>الدورة التدريبية</dt><dd>{receipt.courseName}</dd></div>
            <div><dt>تاريخ السداد</dt><dd><bdi>{receipt.date}</bdi></dd></div>
            <div><dt>طريقة السداد</dt><dd>{paymentMethodLabels[receipt.method] || receipt.method}</dd></div>
            {receipt.notes && <div className="col-span-2"><dt>بيان السداد</dt><dd>{receipt.notes}</dd></div>}
          </dl>

          <div className="invoice-amount-row flex items-center justify-between border-y-2 border-slate-900 py-3">
            <span className="font-bold">المبلغ المستلم</span>
            <strong className="text-xl font-black"><bdi>{formatMoney(receipt.amount)}</bdi></strong>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span>الرصيد المتبقي على الدورة</span>
            <strong><bdi>{formatMoney(receipt.remaining)}</bdi></strong>
          </div>

          <footer className="invoice-footer mt-8 border-t border-slate-300 pt-4 text-center text-xs text-slate-600">
            <div className="mb-5 flex justify-between text-slate-800">
              <span>توقيع المستلم: __________________</span>
              <span>ختم المرسم: __________________</span>
            </div>
            <p>يرجى الاحتفاظ بهذا الإيصال للمراجعة.</p>
          </footer>
        </article>

        <div className="invoice-print-actions mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            مقاس الورق
            <select value={paperSize} onChange={event => setPaperSize(event.target.value as InvoicePaperSize)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              {(Object.keys(paperLabels) as InvoicePaperSize[]).map(size => <option key={size} value={size}>{paperLabels[size]}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => printInvoice(paperSize)} className="btn btn-primary flex flex-1 items-center justify-center gap-2">
            <Printer size={16} /> طباعة الإيصال
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary">إغلاق</button>
        </div>
      </section>
    </div>
  );
}
