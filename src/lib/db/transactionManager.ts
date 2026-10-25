/**
 * Marsam Enterprise Database & Transaction Engine
 * Implements ACID guarantees, Automated Rollback, Foreign Key Integrity Verification,
 * and In-Memory Indexing for sub-millisecond barcode & identity lookups.
 */

import {
  Student, User, Course, Group, Session, Enrollment,
  Installment, Payment, OperatingExpense, Attendance, Progress, SupplyItem,
  SupplySale, SupplyReturn, PortfolioItem, Announcement
} from '@/lib/mockData';
import { logger } from '@/lib/logger/logger';
import { AcademySettings } from '@/lib/store';
import { getDatabaseIntegrityError } from '@/lib/db/schema';

export interface DatabaseState {
  users: User[];
  students: Student[];
  courses: Course[];
  groups: Group[];
  sessions: Session[];
  enrollments: Enrollment[];
  installments: Installment[];
  payments: Payment[];
  expenses: OperatingExpense[];
  attendance: Attendance[];
  progress: Progress[];
  supplyItems: SupplyItem[];
  supplySales: SupplySale[];
  supplyReturns: SupplyReturn[];
  portfolio: PortfolioItem[];
  announcements: Announcement[];
  customDiplomas: Record<string, unknown>;
  settings: AcademySettings;
}

/** Adds newly introduced collections while loading databases created by older releases. */
export function normalizeDatabaseState(value: unknown): DatabaseState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('بيانات قاعدة البيانات غير صالحة.');
  }
  const state = value as Partial<DatabaseState>;
  return {
    ...state,
    announcements: Array.isArray(state.announcements) ? state.announcements : [],
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    supplyReturns: Array.isArray(state.supplyReturns) ? state.supplyReturns : [],
    customDiplomas: state.customDiplomas && typeof state.customDiplomas === 'object' && !Array.isArray(state.customDiplomas)
      ? state.customDiplomas
      : {},
    settings: state.settings && typeof state.settings === 'object' && !Array.isArray(state.settings)
      ? state.settings
      : { name: '', phone: '', address: '', contractTerms: '' },
  } as DatabaseState;
}

export interface DatabaseIndexes {
  studentsByQr: Map<string, Student>;
  studentsById: Map<string, Student>;
  enrollmentsByStudentId: Map<string, Enrollment[]>;
  enrollmentById: Map<string, Enrollment>;
  paymentsByReceiptNumber: Map<string, Payment>;
  supplyItemsByBarcode: Map<string, SupplyItem>;
  supplyItemsById: Map<string, SupplyItem>;
  salesByInvoiceNumber: Map<string, SupplySale>;
}

export class TransactionError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class DatabaseEngine {
  private state: DatabaseState;
  private indexes!: DatabaseIndexes;

  constructor(initialState: DatabaseState) {
    this.state = initialState;
    this.rebuildIndexes();
  }

  /**
   * Rebuilds high-performance O(1) indices across all critical lookup keys
   */
  public rebuildIndexes() {
    const start = performance.now();
    const idx: DatabaseIndexes = {
      studentsByQr: new Map(),
      studentsById: new Map(),
      enrollmentsByStudentId: new Map(),
      enrollmentById: new Map(),
      paymentsByReceiptNumber: new Map(),
      supplyItemsByBarcode: new Map(),
      supplyItemsById: new Map(),
      salesByInvoiceNumber: new Map(),
    };

    // 1. Student Indexes
    for (const student of this.state.students) {
      idx.studentsById.set(student.id, student);
      if (student.qrToken) {
        idx.studentsByQr.set(student.qrToken.trim().toLowerCase(), student);
      }
    }

    // 2. Enrollment Indexes
    for (const enr of this.state.enrollments) {
      idx.enrollmentById.set(enr.id, enr);
      const studentEnrs = idx.enrollmentsByStudentId.get(enr.studentId) || [];
      studentEnrs.push(enr);
      idx.enrollmentsByStudentId.set(enr.studentId, studentEnrs);
    }

    // 3. Payment Indexes
    for (const pay of this.state.payments) {
      if (pay.receiptNumber) {
        idx.paymentsByReceiptNumber.set(pay.receiptNumber.trim(), pay);
      }
    }

    // 4. Inventory Indexes
    for (const item of this.state.supplyItems) {
      idx.supplyItemsById.set(item.id, item);
      if (item.barcode) {
        idx.supplyItemsByBarcode.set(item.barcode.trim(), item);
      }
    }

    // 5. Sales Indexes
    for (const sale of this.state.supplySales) {
      if (sale.invoiceNumber) {
        idx.salesByInvoiceNumber.set(sale.invoiceNumber.trim(), sale);
      }
    }

    this.indexes = idx;
    if (typeof window !== 'undefined') {
      const duration = (performance.now() - start).toFixed(2);
      logger.info('DatabaseEngine', `Indexes rebuilt successfully in ${duration}ms`);
    }
  }

  /**
   * Returns fast indexed reference maps
   */
  public getIndexes(): DatabaseIndexes {
    return this.indexes;
  }

  /**
   * Returns current read-only state snapshot
   */
  public getState(): DatabaseState {
    return this.state;
  }

  /**
   * Directly sets state (used when syncing from local disk storage)
   */
  public hydrate(newState: DatabaseState) {
    this.state = newState;
    this.rebuildIndexes();
  }

  /** Checks database constraints before committing a transaction. */
  private verifyIntegrity(draft: DatabaseState) {
    const error = getDatabaseIntegrityError(draft);
    if (error) throw new TransactionError(`DATABASE_INTEGRITY_VIOLATION: ${error}`);
  }

  /**
   * Executes an ACID Database Transaction synchronously with Automatic Rollback on any failure
   */
  public executeTransaction<T>(
    transactionName: string,
    action: (draft: DatabaseState) => T,
    onSuccessSync?: (committedState: DatabaseState) => void
  ): T {
    logger.transaction(transactionName, 'START');

    // 1. Capture snapshot for Rollback
    const snapshot = JSON.parse(JSON.stringify(this.state)) as DatabaseState;
    // Create working draft
    const draft = JSON.parse(JSON.stringify(this.state)) as DatabaseState;

    try {
      // 2. Execute mutation closure
      const result = action(draft);

      // 3. Verify Constraints & Foreign Key Integrity
      this.verifyIntegrity(draft);

      // 4. COMMIT: replace state & rebuild index tables
      this.state = draft;
      this.rebuildIndexes();

      logger.transaction(transactionName, 'COMMIT');

      // 5. Notify the reactive store; it owns durable persistence and reports save status to the UI.
      if (onSuccessSync) {
        onSuccessSync(this.state);
      }

      return result;
    } catch (error) {
      // 6. ROLLBACK: restore exact pre-transaction state
      this.state = snapshot;
      this.rebuildIndexes();

      logger.transaction(transactionName, 'ROLLBACK', {
        reason: error instanceof Error ? error.message : String(error)
      });
      logger.error('DatabaseEngine', `Transaction failed: ${transactionName}`, error);

      throw error;
    }
  }

}
