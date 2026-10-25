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

/** Print formal contract document isolated strictly as a single A4 page. */
export function printContractDocument() {
  const root = document.documentElement;
  const styleId = 'contract-print-page-rules';
  let pageStyle = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = styleId;
    document.head.appendChild(pageStyle);
  }

  pageStyle.textContent = '@page { size: A4 portrait; margin: 0; }';
  root.classList.add('contract-printing');

  const cleanup = () => {
    root.classList.remove('contract-printing');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.requestAnimationFrame(() => window.print());
  window.setTimeout(cleanup, 10_000);
}

/** Print student ID badge card centered strictly on a single A4 page. */
export function printStudentIdCard() {
  const root = document.documentElement;
  const styleId = 'id-print-page-rules';
  let pageStyle = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = styleId;
    document.head.appendChild(pageStyle);
  }

  pageStyle.textContent = '@page { size: A4 portrait; margin: 0; }';
  root.classList.add('student-id-printing');

  const cleanup = () => {
    root.classList.remove('student-id-printing');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.requestAnimationFrame(() => window.print());
  window.setTimeout(cleanup, 10_000);
}

/** Print Luxury Art Diploma strictly as a single A4 page in chosen orientation. */
export function printArtDiploma(orientation: 'portrait' | 'landscape' = 'portrait') {
  const root = document.documentElement;
  const styleId = 'diploma-print-page-rules';
  let pageStyle = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!pageStyle) {
    pageStyle = document.createElement('style');
    pageStyle.id = styleId;
    document.head.appendChild(pageStyle);
  }

  pageStyle.textContent = '@page { size: A4 ' + orientation + '; margin: 0; }';
  const classModifier = orientation === 'landscape' ? 'diploma-printing-landscape' : 'diploma-printing-portrait';
  root.classList.add('diploma-printing', classModifier);

  const cleanup = () => {
    root.classList.remove('diploma-printing', 'diploma-printing-portrait', 'diploma-printing-landscape');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.requestAnimationFrame(() => window.print());
  window.setTimeout(cleanup, 10_000);
}
