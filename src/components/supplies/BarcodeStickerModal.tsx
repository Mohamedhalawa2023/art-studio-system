'use client';
import { useState, useMemo } from 'react';
import { Printer, X, Barcode as BarcodeIcon, Tag, Check, Copy } from 'lucide-react';
import { encodeCode128, generateBarcodeSvgElements } from '@/lib/barcode/code128';

interface BarcodeStickerModalProps {
  product: {
    id: string;
    name: string;
    barcode: string;
    sellPrice: number;
    category: string;
    stockQty: number;
  };
  studioName?: string;
  onClose: () => void;
}

export function BarcodeStickerModal({ product, studioName = 'مرسم الإبداع', onClose }: BarcodeStickerModalProps) {
  const [printCount, setPrintCount] = useState<number>(Math.max(1, Math.min(product.stockQty, 24)));
  const [stickerSize, setStickerSize] = useState<'standard' | 'compact'>('standard');

  const { rects, totalWidth, height } = useMemo(() => {
    const patterns = encodeCode128(product.barcode);
    const barWidth = stickerSize === 'standard' ? 1.6 : 1.2;
    const barHeight = stickerSize === 'standard' ? 42 : 30;
    return generateBarcodeSvgElements(patterns, barWidth, barHeight);
  }, [product.barcode, stickerSize]);

  const stickers = useMemo(() => {
    return Array.from({ length: printCount }, (_, i) => i);
  }, [printCount]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <BarcodeIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                طباعة باركود القطع والملصقات
              </h3>
              <p className="text-xs text-slate-500">
                طباعة استيكرات باركود للصقها على كل قطعة لبيعها بالسكانر
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Product Details & Controls */}
        <div className="grid sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">اسم الصنف:</span>
            <strong className="text-slate-900 dark:text-white truncate block text-sm">{product.name}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">سعر البيع:</span>
            <strong className="text-teal-400 font-mono text-sm">{product.sellPrice} جنيه</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">كود الباركود:</span>
            <strong className="font-mono text-slate-700 dark:text-slate-200 text-sm">{product.barcode}</strong>
          </div>
        </div>

        {/* Print Configuration Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300">عدد الملصقات المطلوب:</span>
            <div className="flex items-center gap-1">
              {[1, 5, 10, 20].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setPrintCount(cnt)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                    printCount === cnt
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {cnt}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={200}
                value={printCount}
                onChange={e => setPrintCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="input w-16 text-center text-xs py-1 px-1 font-mono font-bold"
                title="أو اكتب أي عدد مخصص"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">حجم الملصق:</span>
            <select
              value={stickerSize}
              onChange={e => setStickerSize(e.target.value as any)}
              className="input text-xs py-1 px-2.5"
            >
              <option value="standard">قياسي (50x30 مم / ورق A4)</option>
              <option value="compact">صغير (38x25 مم / طابعة فواتير)</option>
            </select>
          </div>
        </div>

        {/* Live Stickers Preview & Printable Section */}
        <div className="flex-1 overflow-y-auto p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-black/20">
          <div
            id="printable-barcode-stickers"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2 print:m-0"
          >
            {stickers.map(idx => (
              <div
                key={idx}
                className="bg-white text-slate-900 border border-slate-300 rounded-lg p-2.5 flex flex-col items-center justify-between text-center shadow-xs page-break-inside-avoid print:shadow-none print:border-black"
                style={{ width: '100%', minHeight: stickerSize === 'standard' ? '120px' : '95px' }}
              >
                {/* Header */}
                <div className="w-full flex items-center justify-between text-[10px] text-slate-500 font-bold border-b border-slate-100 pb-1 mb-1">
                  <span className="truncate max-w-[90px]">{studioName}</span>
                  <span className="text-teal-700 font-bold">{product.sellPrice} ج.م</span>
                </div>

                {/* Product Name */}
                <p className="text-[11px] font-black text-slate-900 line-clamp-1 leading-tight mb-1">
                  {product.name}
                </p>

                {/* SVG Barcode */}
                <div className="flex justify-center items-center my-0.5">
                  <svg
                    width="100%"
                    height={height}
                    viewBox={`0 0 ${totalWidth} ${height}`}
                    className="max-w-[170px]"
                  >
                    {rects.map((r, rIdx) => (
                      <rect
                        key={rIdx}
                        x={r.x}
                        y={r.y}
                        width={r.width}
                        height={r.height}
                        fill="#000000"
                      />
                    ))}
                  </svg>
                </div>

                {/* Barcode Number */}
                <p className="font-mono text-[10px] tracking-wider text-slate-800 font-bold">
                  {product.barcode}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500">
            جاهز للطباعة على طابعات الاستيكرات الحرارية (Xprinter / Zebra) أو ورق استيكر A4
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="btn btn-primary flex items-center gap-1.5 text-xs font-bold py-2 px-4 shadow-md shadow-teal-500/15"
            >
              <Printer size={15} /> طباعة {printCount} ملصق باركود
            </button>
            <button onClick={onClose} className="btn btn-secondary text-xs">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
