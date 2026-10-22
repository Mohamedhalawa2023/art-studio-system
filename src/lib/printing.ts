export type InvoicePaperSize = 'a4' | 'a5' | 'thermal';

const printPageRules: Record<InvoicePaperSize, string> = {
  a4: '@page { size: A4 portrait; margin: 12mm; }',
  a5: '@page { size: A5 portrait; margin: 8mm; }',
  thermal: '@page { size: 80mm 200mm; margin: 3mm; }',
};

/** Print only the active invoice or receipt using the requested paper size. */
export function printInvoice(paperSize: InvoicePaperSize) {
  const root = document.documentElement;
  const styleId = 'invoice-print-page-rules';
  let pageStyle = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = styleId;
    document.head.appendChild(pageStyle);
  }

  pageStyle.textContent = printPageRules[paperSize];
  root.classList.add('invoice-printing');
  root.dataset.invoicePaper = paperSize;

  const cleanup = () => {
    root.classList.remove('invoice-printing');
    delete root.dataset.invoicePaper;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.requestAnimationFrame(() => window.print());
  window.setTimeout(cleanup, 60_000);
}
