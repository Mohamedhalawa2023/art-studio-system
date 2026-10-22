/**
 * Marsam Enterprise Schema & Input Validation Engine
 * Guards the system against negative amounts, duplicate barcodes, corrupt dates, and out-of-stock operations.
 */

export class ValidationError extends Error {
  public field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const Validators = {
  /**
   * Validates non-empty string with min/max length
   */
  requireText(value: unknown, fieldName: string, minLength = 2, maxLength = 120): string {
    if (typeof value !== 'string' || value.trim().length < minLength) {
      throw new ValidationError(`حقل ${fieldName} مطلوب ويجب ألا يقل عن ${minLength} أحرف.`, fieldName);
    }
    if (value.trim().length > maxLength) {
      throw new ValidationError(`حقل ${fieldName} يتجاوز الحد الأقصى المسموح به (${maxLength} حرفاً).`, fieldName);
    }
    return value.trim();
  },

  /**
   * Validates financial monetary amounts (must be positive and reasonable)
   */
  requirePositiveMoney(amount: unknown, fieldName = 'المبلغ'): number {
    const num = Number(amount);
    if (isNaN(num) || !isFinite(num)) {
      throw new ValidationError(`قيمة ${fieldName} غير صحيحة، يرجى إدخال رقم صحيح.`, fieldName);
    }
    if (num <= 0) {
      throw new ValidationError(`قيمة ${fieldName} يجب أن تكون أكبر من الصفر (INVALID_AMOUNT).`, fieldName);
    }
    if (num > 1_000_000) {
      throw new ValidationError(`قيمة ${fieldName} تتجاوز الحد المنطقي المسموح به.`, fieldName);
    }
    return Math.round(num * 100) / 100; // 2 decimal precision
  },

  requireNonNegativeMoney(amount: unknown, fieldName = 'المبلغ'): number {
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 0) {
      throw new ValidationError(`قيمة ${fieldName} يجب ألا تكون سالبة.`, fieldName);
    }
    if (num > 1_000_000) {
      throw new ValidationError(`قيمة ${fieldName} تتجاوز الحد المنطقي المسموح به.`, fieldName);
    }
    return Math.round((num + Number.EPSILON) * 100) / 100;
  },

  requireNonNegativeInteger(value: unknown, fieldName: string): number {
    const num = Number(value);
    if (!Number.isSafeInteger(num) || num < 0) {
      throw new ValidationError(`قيمة ${fieldName} يجب أن تكون عددًا صحيحًا موجبًا أو صفرًا.`, fieldName);
    }
    return num;
  },

  /**
   * Validates non-negative quantity or money (>= 0)
   */
  requireNonNegativeNumber(value: unknown, fieldName: string): number {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num < 0) {
      throw new ValidationError(`قيمة ${fieldName} يجب ألا تكون سالبة.`, fieldName);
    }
    return num;
  },

  /**
   * Validates barcode uniqueness and format
   */
  validateBarcode(barcode: string | undefined, existingBarcodes: Set<string>, allowCurrentBarcode?: string): string {
    const clean = barcode?.trim();
    const normalizeBarcode = (value: string) => value.trim().toUpperCase();
    const normalizedExisting = new Set(Array.from(existingBarcodes, normalizeBarcode));

    if (!clean) {
      // Auto-generate unique Code 128 barcode if left empty
      let candidate = `ART-${Math.floor(100000 + Math.random() * 900000)}`;
      while (normalizedExisting.has(normalizeBarcode(candidate))) {
        candidate = `ART-${Math.floor(100000 + Math.random() * 900000)}`;
      }
      return candidate;
    }
    if (clean.length < 3) {
      throw new ValidationError('كود الباركود يجب أن يحتوي على 3 خانات على الأقل.', 'barcode');
    }
    if (!/^[\x20-\x7E]+$/.test(clean)) {
      throw new ValidationError('الباركود يجب أن يتكوّن من أحرف وأرقام ورموز إنجليزية قابلة للطباعة.', 'barcode');
    }
    if (normalizedExisting.has(normalizeBarcode(clean)) && normalizeBarcode(clean) !== normalizeBarcode(allowCurrentBarcode || '')) {
      throw new ValidationError('كود الباركود هذا مسجل مسبقاً، يرجى استخدام كود آخر (DUPLICATE_BARCODE).', 'barcode');
    }
    return clean;
  },

  /**
   * Validates dates (ISO YYYY-MM-DD or readable format)
   */
  validateDateString(dateStr: string, fieldName = 'التاريخ'): string {
    if (!dateStr || typeof dateStr !== 'string') {
      throw new ValidationError(`حقل ${fieldName} غير صحيح أو فارغ (INVALID_DATE).`, fieldName);
    }
    const clean = dateStr.trim();
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
    if (isoDate) {
      const [, year, month, day] = isoDate;
      const parsedIsoDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      if (Number.isNaN(parsedIsoDate.getTime()) || parsedIsoDate.toISOString().slice(0, 10) !== clean) {
        throw new ValidationError(`صيغة ${fieldName} غير صالحة (INVALID_DATE).`, fieldName);
      }
      return clean;
    }

    const timestamp = Date.parse(clean);
    if (isNaN(timestamp)) {
      throw new ValidationError(`صيغة ${fieldName} غير صالحة (INVALID_DATE).`, fieldName);
    }
    return clean;
  },

  /**
   * Validates Egyptian or general contact phone numbers
   */
  validatePhone(phone: string): string {
    const clean = phone?.replace(/[\s\-\(\)]/g, '') || '';
    if (!clean || clean.length < 9 || clean.length > 15) {
      throw new ValidationError('رقم الهاتف غير صالح، يرجى إدخال رقم هاتف صحيح بين 9 إلى 15 خانة.', 'phone');
    }
    return clean;
  },

  /**
   * Validates POS Cart items before checkout
   */
  validateCartItems(
    items: Array<{ productId: string; quantity: number }>,
    inventoryMap: Map<string, { stockQty: number; name: string }>
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('سلة المشتريات فارغة، يرجى إضافة صنف واحد على الأقل.', 'items');
    }

    const requestedByProduct = new Map<string, number>();
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        throw new ValidationError('يوجد صنف غير صالح في سلة المشتريات.', 'items');
      }
      if (!item.productId) {
        throw new ValidationError('يوجد صنف غير معرف في سلة المشتريات.', 'productId');
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationError('كمية الصنف يجب أن تكون عدداً صحيحاً موجباً.', 'quantity');
      }

      const inv = inventoryMap.get(item.productId);
      if (!inv) {
        throw new ValidationError(`الصنف ذو الكود ${item.productId} غير موجود في المخزن (FOREIGN_KEY_VIOLATION).`, 'productId');
      }
      const requested = (requestedByProduct.get(item.productId) || 0) + item.quantity;
      if (!Number.isSafeInteger(requested)) {
        throw new ValidationError('إجمالي الكمية المطلوبة أكبر من الحد المسموح.', 'quantity');
      }
      requestedByProduct.set(item.productId, requested);
    }

    for (const [productId, requested] of requestedByProduct) {
      const inv = inventoryMap.get(productId);
      if (inv && inv.stockQty < requested) {
        throw new ValidationError(`الكمية المطلوبة من "${inv.name}" غير متوفرة حالياً (المتاح في المخزن: ${inv.stockQty}) (INSUFFICIENT_STOCK).`, 'quantity');
      }
    }
  }
};
