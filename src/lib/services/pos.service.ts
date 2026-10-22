/**
 * Point of Sale & Inventory Domain Service
 * Manages atomic store checkout, stock depletion, margin calculation, and POS invoice numbers.
 */

import { SupplySale, SupplyItem, Payment } from '@/lib/mockData';
import { DatabaseEngine, DatabaseState } from '@/lib/db/transactionManager';
import { Validators } from '@/lib/validators';
import { logger } from '@/lib/logger/logger';
import { formatLocalDateTime } from '@/lib/dates';

const PAYMENT_METHODS: Payment['method'][] = ['cash', 'transfer', 'instapay', 'vodafone', 'card'];

function createId(prefix: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomPart}`;
}

function moneyFromCents(cents: number): number {
  if (!Number.isSafeInteger(cents)) throw new Error('إجمالي الفاتورة يتجاوز الحد المالي المسموح.');
  return cents / 100;
}

export interface CreateSaleDTO {
  customerType: 'student' | 'walkin';
  customerName: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number }>;
  discountAmount?: number;
  paymentMethod: Payment['method'];
  notes?: string;
}

export interface VoidSaleDTO {
  saleId: string;
  voidedBy: string;
  reason: string;
}

export class PosService {
  constructor(private db: DatabaseEngine) {}

  /**
   * Executes atomic POS checkout:
   * 1. Validates stock availability for every requested item.
   * 2. Depletes inventory quantities.
   * 3. Calculates total revenue, cost, and net profit.
   * 4. Generates an official invoice record (SHP-YYYY-XXXX).
   * In case of any validation or stock error, state rolls back automatically.
   */
  public createSupplySale(
    dto: CreateSaleDTO,
    onStateCommit?: (state: DatabaseState) => void
  ): SupplySale {
    return this.db.executeTransaction(
      'CREATE_SUPPLY_SALE',
      (draft) => {
        if (dto.customerType !== 'student' && dto.customerType !== 'walkin') {
          throw new Error('نوع العميل غير صالح.');
        }
        if (!PAYMENT_METHODS.includes(dto.paymentMethod)) throw new Error('طريقة الدفع غير صالحة.');

        let customerId: string | undefined;
        let validatedCustomer: string;
        if (dto.customerType === 'student') {
          const student = dto.customerId && draft.students.find(item => item.id === dto.customerId);
          if (!student) throw new Error('الطالب المحدد غير موجود في سجل الطلاب.');
          customerId = student.id;
          validatedCustomer = Validators.requireText(student.name, 'اسم الطالب', 2, 80);
        } else {
          validatedCustomer = Validators.requireText(dto.customerName || 'عميل زائر', 'اسم العميل', 2, 80);
        }
        const validatedNotes = dto.notes?.trim()
          ? Validators.requireText(dto.notes, 'ملاحظات الفاتورة', 1, 500)
          : undefined;
        const discountAmount = Validators.requireNonNegativeMoney(dto.discountAmount ?? 0, 'خصم الفاتورة');
        const discountAmountCents = Math.round(discountAmount * 100);

        // Build temporary inventory map for fast stock checks
        const inventoryMap = new Map<string, { stockQty: number; name: string }>();
        for (const item of draft.supplyItems) {
          inventoryMap.set(item.id, { stockQty: item.stockQty, name: item.name });
        }

        // Validate cart items
        Validators.validateCartItems(dto.items, inventoryMap);

        const combinedItems = new Map<string, number>();
        for (const item of dto.items) {
          const quantity = (combinedItems.get(item.productId) || 0) + item.quantity;
          if (!Number.isSafeInteger(quantity)) throw new Error('إجمالي الكمية المطلوبة أكبر من الحد المسموح.');
          combinedItems.set(item.productId, quantity);
        }

        let totalAmountCents = 0;
        let totalCostCents = 0;
        const lineItems: SupplySale['items'] = [];

        // Deplete inventory and compute totals
        for (const [productId, quantity] of combinedItems) {
          const product = draft.supplyItems.find(p => p.id === productId);
          if (!product) {
            throw new Error(`الصنف ${productId} غير موجود.`);
          }

          product.stockQty = Validators.requireNonNegativeInteger(product.stockQty, 'الكمية بالمخزون');

          if (product.stockQty < quantity) {
            throw new Error(`الكمية المطلوبة من "${product.name}" غير متوفرة (المتاح: ${product.stockQty}).`);
          }

          const unitPriceCents = Math.round(Validators.requirePositiveMoney(product.sellPrice, 'سعر البيع') * 100);
          const unitCostCents = Math.round(Validators.requireNonNegativeMoney(product.costPrice, 'سعر التكلفة') * 100);
          const itemTotalCents = unitPriceCents * quantity;
          const itemCostCents = unitCostCents * quantity;
          if (!Number.isSafeInteger(itemTotalCents) || !Number.isSafeInteger(itemCostCents)) {
            throw new Error(`إجمالي الصنف "${product.name}" يتجاوز الحد المالي المسموح.`);
          }

          // Atomic deduction
          product.stockQty -= quantity;

          totalAmountCents += itemTotalCents;
          totalCostCents += itemCostCents;
          if (!Number.isSafeInteger(totalAmountCents) || !Number.isSafeInteger(totalCostCents)) {
            throw new Error('إجمالي الفاتورة يتجاوز الحد المالي المسموح.');
          }

          lineItems.push({
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice: moneyFromCents(unitPriceCents),
            total: moneyFromCents(itemTotalCents),
            costPrice: moneyFromCents(unitCostCents)
          });
        }

        const now = new Date();
        const yearStr = now.getFullYear();
        const invoicePrefix = `SHP-${yearStr}-`;
        const lastSequence = draft.supplySales.reduce((highest, sale) => {
          if (!sale.invoiceNumber.startsWith(invoicePrefix)) return highest;
          const match = new RegExp(`^SHP-${yearStr}-(\\d+)$`).exec(sale.invoiceNumber);
          return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0);
        const nextInvoiceNo = `${invoicePrefix}${String(lastSequence + 1).padStart(4, '0')}`;
        if (discountAmountCents > totalAmountCents) {
          throw new Error('خصم الفاتورة لا يمكن أن يتجاوز إجمالي الأصناف.');
        }

        const subtotalAmount = moneyFromCents(totalAmountCents);
        const totalAmount = moneyFromCents(totalAmountCents - discountAmountCents);
        const totalCost = moneyFromCents(totalCostCents);

        const sale: SupplySale = {
          id: createId('sale'),
          invoiceNumber: nextInvoiceNo,
          date: formatLocalDateTime(now),
          customerType: dto.customerType,
          customerName: validatedCustomer,
          customerId,
          items: lineItems,
          subtotalAmount,
          discountAmount: moneyFromCents(discountAmountCents),
          totalAmount,
          totalCost,
          profit: totalAmount - totalCost,
          paymentMethod: dto.paymentMethod,
          notes: validatedNotes
        };

        draft.supplySales.push(sale);
        logger.info('PosService', `Sale completed: ${sale.invoiceNumber} -> ${totalAmount} EGP (Profit: +${sale.profit} EGP)`);

        return sale;
      },
      onStateCommit
    );
  }

  public voidSupplySale(dto: VoidSaleDTO, onStateCommit?: (state: DatabaseState) => void): SupplySale {
    const reason = Validators.requireText(dto.reason, 'سبب إلغاء الفاتورة', 3, 300);
    return this.db.executeTransaction('VOID_SUPPLY_SALE', draft => {
      const sale = draft.supplySales.find(item => item.id === dto.saleId);
      if (!sale) throw new Error('فاتورة البيع المطلوبة غير موجودة.');
      if (sale.status === 'voided') throw new Error('الفاتورة ملغاة بالفعل.');
      for (const line of sale.items) {
        const product = draft.supplyItems.find(item => item.id === line.productId);
        if (!product) throw new Error(`لا يمكن إلغاء الفاتورة لأن الصنف «${line.productName}» لم يعد موجودًا بالمخزون.`);
        product.stockQty = Validators.requireNonNegativeInteger(product.stockQty + line.quantity, 'الكمية بعد إرجاع الأصناف');
      }
      sale.status = 'voided';
      sale.voidedAt = formatLocalDateTime(new Date());
      sale.voidedBy = dto.voidedBy;
      sale.voidReason = reason;
      logger.info('PosService', `Sale voided: ${sale.invoiceNumber}. Reason: ${reason}`);
      return sale;
    }, onStateCommit);
  }

  /**
   * Adds or updates inventory items with unique barcode enforcement
   */
  public addSupplyItem(
    item: Omit<SupplyItem, 'id'>,
    onStateCommit?: (state: DatabaseState) => void
  ): SupplyItem {
    return this.db.executeTransaction(
      'ADD_SUPPLY_ITEM',
      (draft) => {
        const name = Validators.requireText(item.name, 'اسم المنتج', 2, 100);
        const category = Validators.requireText(item.category, 'التصنيف', 2, 50);
        const costPrice = Validators.requireNonNegativeMoney(item.costPrice, 'سعر التكلفة');
        const sellPrice = Validators.requirePositiveMoney(item.sellPrice, 'سعر البيع');
        const stockQty = Validators.requireNonNegativeInteger(item.stockQty, 'الكمية الابتدائية');
        const minStock = Validators.requireNonNegativeInteger(item.minStock, 'الحد الأدنى للمخزون');

        const existingBarcodes = new Set(draft.supplyItems.map(s => s.barcode));
        const barcode = Validators.validateBarcode(item.barcode, existingBarcodes);

        const newItem: SupplyItem = {
          id: createId('sup'),
          name,
          category,
          costPrice,
          sellPrice,
          stockQty,
          minStock,
          barcode
        };

        draft.supplyItems.push(newItem);
        logger.info('PosService', `New inventory item added: ${newItem.name} [${newItem.barcode}]`);

        return newItem;
      },
      onStateCommit
    );
  }

  /**
   * Updates existing inventory item with validation and unique barcode enforcement
   */
  public updateSupplyItem(
    id: string,
    updates: Partial<Omit<SupplyItem, 'id'>>,
    onStateCommit?: (state: DatabaseState) => void
  ): SupplyItem {
    return this.db.executeTransaction(
      'UPDATE_SUPPLY_ITEM',
      (draft) => {
        const item = draft.supplyItems.find(s => s.id === id);
        if (!item) {
          throw new Error(`الصنف المراد تعديله غير موجود بالمخزن (ID: ${id}).`);
        }

        if (updates.name !== undefined) {
          item.name = Validators.requireText(updates.name, 'اسم المنتج', 2, 100);
        }
        if (updates.category !== undefined) {
          item.category = Validators.requireText(updates.category, 'التصنيف', 2, 50);
        }
        if (updates.costPrice !== undefined) {
          item.costPrice = Validators.requireNonNegativeMoney(updates.costPrice, 'سعر التكلفة');
        }
        if (updates.sellPrice !== undefined) {
          item.sellPrice = Validators.requirePositiveMoney(updates.sellPrice, 'سعر البيع');
        }
        if (updates.stockQty !== undefined) {
          item.stockQty = Validators.requireNonNegativeInteger(updates.stockQty, 'الكمية بالمخزن');
        }
        if (updates.minStock !== undefined) {
          item.minStock = Validators.requireNonNegativeInteger(updates.minStock, 'الحد الأدنى للمخزون');
        }
        if (updates.barcode !== undefined) {
          const existingBarcodes = new Set(
            draft.supplyItems.filter(s => s.id !== id).map(s => s.barcode)
          );
          item.barcode = Validators.validateBarcode(updates.barcode, existingBarcodes);
        }

        logger.info('PosService', `Inventory item updated: ${item.name} [${item.barcode}]`);
        return { ...item };
      },
      onStateCommit
    );
  }

  /**
   * Deletes an inventory item from database atomically
   */
  public deleteSupplyItem(
    id: string,
    onStateCommit?: (state: DatabaseState) => void
  ): void {
    return this.db.executeTransaction(
      'DELETE_SUPPLY_ITEM',
      (draft) => {
        const index = draft.supplyItems.findIndex(s => s.id === id);
        if (index === -1) {
          throw new Error(`الصنف المراد حذفه غير موجود بالمخزن (ID: ${id}).`);
        }

        if (draft.supplyItems[index].stockQty > 0) {
          throw new Error('لا يمكن حذف صنف له رصيد بالمخزن. سجّل تسوية المخزون حتى يصبح الرصيد صفرًا أولًا.');
        }

        draft.supplyItems[index].stockQty = Validators.requireNonNegativeInteger(
          draft.supplyItems[index].stockQty,
          'الكمية بالمخزون'
        );

        const removed = draft.supplyItems.splice(index, 1)[0];
        logger.info('PosService', `Inventory item deleted: ${removed.name} [${removed.barcode}]`);
      },
      onStateCommit
    );
  }

  /**
   * Adjusts stock quantity of an inventory item atomically
   */
  public updateSupplyStock(
    id: string,
    deltaQty: number,
    onStateCommit?: (state: DatabaseState) => void
  ): SupplyItem {
    return this.db.executeTransaction(
      'UPDATE_SUPPLY_STOCK',
      (draft) => {
        const item = draft.supplyItems.find(s => s.id === id);
        if (!item) {
          throw new Error(`الصنف المراد تعديل مخزونه غير موجود (ID: ${id}).`);
        }
        item.stockQty = Validators.requireNonNegativeInteger(item.stockQty, 'الكمية بالمخزون');
        if (!Number.isSafeInteger(deltaQty) || deltaQty === 0) {
          throw new Error('تسوية المخزون يجب أن تكون عددًا صحيحًا غير صفري.');
        }
        const adjustedQty = item.stockQty + deltaQty;
        if (adjustedQty < 0) throw new Error(`لا يمكن خصم ${Math.abs(deltaQty)} قطعة؛ الرصيد الحالي ${item.stockQty}.`);
        item.stockQty = Validators.requireNonNegativeInteger(adjustedQty, 'الرصيد بعد التسوية');
        logger.info('PosService', `Stock adjusted for: ${item.name} -> ${item.stockQty}`);
        return { ...item };
      },
      onStateCommit
    );
  }
}
