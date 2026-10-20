/**
 * Point of Sale & Inventory Domain Service
 * Manages atomic store checkout, stock depletion, margin calculation, and POS invoice numbers.
 */

import { SupplySale, SupplyItem, Payment } from '@/lib/mockData';
import { DatabaseEngine } from '@/lib/db/transactionManager';
import { Validators } from '@/lib/validators';
import { logger } from '@/lib/logger/logger';
import { formatLocalDateTime } from '@/lib/dates';

export interface CreateSaleDTO {
  customerType: 'student' | 'walkin';
  customerName: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: Payment['method'];
  notes?: string;
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
    onStateCommit?: (state: any) => void
  ): SupplySale {
    return this.db.executeTransaction(
      'CREATE_SUPPLY_SALE',
      (draft) => {
        const validatedCustomer = Validators.requireText(dto.customerName, 'اسم العميل / الطالب', 2, 80);

        // Build temporary inventory map for fast stock checks
        const inventoryMap = new Map<string, { stockQty: number; name: string }>();
        for (const item of draft.supplyItems) {
          inventoryMap.set(item.id, { stockQty: item.stockQty, name: item.name });
        }

        // Validate cart items
        Validators.validateCartItems(dto.items, inventoryMap);

        let totalAmount = 0;
        let totalCost = 0;
        const lineItems: SupplySale['items'] = [];

        // Deplete inventory and compute totals
        for (const cartItem of dto.items) {
          const product = draft.supplyItems.find(p => p.id === cartItem.productId);
          if (!product) {
            throw new Error(`الصنف ${cartItem.productId} غير موجود.`);
          }

          if (product.stockQty < cartItem.quantity) {
            throw new Error(`الكمية المطلوبة من "${product.name}" غير متوفرة (المتاح: ${product.stockQty}).`);
          }

          // Atomic deduction
          product.stockQty -= cartItem.quantity;

          const itemTotal = product.sellPrice * cartItem.quantity;
          const itemCost = product.costPrice * cartItem.quantity;

          totalAmount += itemTotal;
          totalCost += itemCost;

          lineItems.push({
            productId: product.id,
            productName: product.name,
            quantity: cartItem.quantity,
            unitPrice: product.sellPrice,
            total: itemTotal,
            costPrice: product.costPrice
          });
        }

        const now = new Date();
        const yearStr = now.getFullYear();
        const nextInvoiceNo = `SHP-${yearStr}-${String(draft.supplySales.length + 1).padStart(4, '0')}`;

        const sale: SupplySale = {
          id: `sale-${Date.now()}`,
          invoiceNumber: nextInvoiceNo,
          date: formatLocalDateTime(now),
          customerType: dto.customerType,
          customerName: validatedCustomer,
          customerId: dto.customerId,
          items: lineItems,
          totalAmount,
          totalCost,
          profit: totalAmount - totalCost,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes?.trim()
        };

        draft.supplySales.push(sale);
        logger.info('PosService', `Sale completed: ${sale.invoiceNumber} -> ${totalAmount} EGP (Profit: +${sale.profit} EGP)`);

        return sale;
      },
      onStateCommit
    );
  }

  /**
   * Adds or updates inventory items with unique barcode enforcement
   */
  public addSupplyItem(
    item: Omit<SupplyItem, 'id'>,
    onStateCommit?: (state: any) => void
  ): SupplyItem {
    return this.db.executeTransaction(
      'ADD_SUPPLY_ITEM',
      (draft) => {
        const name = Validators.requireText(item.name, 'اسم المنتج', 2, 100);
        const category = Validators.requireText(item.category, 'التصنيف', 2, 50);
        const costPrice = Validators.requireNonNegativeNumber(item.costPrice, 'سعر التكلفة');
        const sellPrice = Validators.requirePositiveMoney(item.sellPrice, 'سعر البيع');
        const stockQty = Validators.requireNonNegativeNumber(item.stockQty, 'الكمية الابتدائية');
        const minStock = Validators.requireNonNegativeNumber(item.minStock, 'الحد الأدنى للمخزون');

        const existingBarcodes = new Set(draft.supplyItems.map(s => s.barcode));
        const barcode = Validators.validateBarcode(item.barcode, existingBarcodes);

        const newItem: SupplyItem = {
          id: `sup-${Date.now()}`,
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
    onStateCommit?: (state: any) => void
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
          item.costPrice = Validators.requireNonNegativeNumber(updates.costPrice, 'سعر التكلفة');
        }
        if (updates.sellPrice !== undefined) {
          item.sellPrice = Validators.requirePositiveMoney(updates.sellPrice, 'سعر البيع');
        }
        if (updates.stockQty !== undefined) {
          item.stockQty = Validators.requireNonNegativeNumber(updates.stockQty, 'الكمية بالمخزن');
        }
        if (updates.minStock !== undefined) {
          item.minStock = Validators.requireNonNegativeNumber(updates.minStock, 'الحد الأدنى للمخزون');
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
    onStateCommit?: (state: any) => void
  ): void {
    return this.db.executeTransaction(
      'DELETE_SUPPLY_ITEM',
      (draft) => {
        const index = draft.supplyItems.findIndex(s => s.id === id);
        if (index === -1) {
          throw new Error(`الصنف المراد حذفه غير موجود بالمخزن (ID: ${id}).`);
        }

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
    onStateCommit?: (state: any) => void
  ): SupplyItem {
    return this.db.executeTransaction(
      'UPDATE_SUPPLY_STOCK',
      (draft) => {
        const item = draft.supplyItems.find(s => s.id === id);
        if (!item) {
          throw new Error(`الصنف المراد تعديل مخزونه غير موجود (ID: ${id}).`);
        }
        item.stockQty = Math.max(0, item.stockQty + deltaQty);
        logger.info('PosService', `Stock adjusted for: ${item.name} -> ${item.stockQty}`);
        return { ...item };
      },
      onStateCommit
    );
  }
}
