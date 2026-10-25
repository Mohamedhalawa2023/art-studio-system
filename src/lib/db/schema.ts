type DatabaseRecord = Record<string, unknown>;

const REQUIRED_COLLECTIONS = [
  'users', 'students', 'courses', 'groups', 'sessions', 'enrollments',
  'installments', 'payments', 'attendance', 'progress', 'supplyItems',
  'supplySales', 'portfolio',
] as const;

const OPTIONAL_COLLECTIONS = ['announcements', 'expenses', 'supplyReturns'] as const;

const COLLECTION_LABELS: Record<string, string> = {
  users: 'المستخدمون',
  students: 'الطلاب',
  courses: 'الدورات',
  groups: 'المجموعات',
  sessions: 'الحصص',
  enrollments: 'الاشتراكات',
  installments: 'الأقساط',
  payments: 'المدفوعات',
  attendance: 'الحضور',
  progress: 'التقييمات',
  supplyItems: 'الأصناف',
  supplySales: 'فواتير البيع',
  portfolio: 'الأعمال الفنية',
  announcements: 'الإعلانات',
  expenses: 'المصروفات',
  supplyReturns: 'المرتجعات',
};

function isRecord(value: unknown): value is DatabaseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks the local JSON database's table shape, primary keys, unique business
 * identifiers, and the foreign-key relationships used by the application.
 * Optional collections stay optional so older backups remain importable.
 */
export function getDatabaseIntegrityError(value: unknown): string | null {
  if (!isRecord(value)) return 'ملف قاعدة البيانات ليس كائن JSON صالحًا.';

  const raw = value;
  for (const collection of REQUIRED_COLLECTIONS) {
    if (!Array.isArray(raw[collection])) {
      return `جدول ${COLLECTION_LABELS[collection]} مفقود أو بصيغة غير صالحة.`;
    }
  }
  for (const collection of OPTIONAL_COLLECTIONS) {
    if (raw[collection] !== undefined && !Array.isArray(raw[collection])) {
      return `جدول ${COLLECTION_LABELS[collection]} بصيغة غير صالحة.`;
    }
  }
  if (raw.settings !== undefined && !isRecord(raw.settings)) {
    return 'إعدادات المرسم بصيغة غير صالحة.';
  }
  if (raw.customDiplomas !== undefined && !isRecord(raw.customDiplomas)) {
    return 'بيانات الشهادات بصيغة غير صالحة.';
  }

  const collectionNames = [...REQUIRED_COLLECTIONS, ...OPTIONAL_COLLECTIONS];
  const rowsByCollection = new Map<string, DatabaseRecord[]>();
  const recordsById = new Map<string, Map<string, DatabaseRecord>>();

  for (const collection of collectionNames) {
    const rows = (raw[collection] ?? []) as unknown[];
    const byId = new Map<string, DatabaseRecord>();

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!isRecord(row)) {
        return `يوجد سجل غير صالح في جدول ${COLLECTION_LABELS[collection]} (رقم ${index + 1}).`;
      }
      if (typeof row.id !== 'string' || !row.id.trim()) {
        return `يوجد سجل بلا معرّف صالح في جدول ${COLLECTION_LABELS[collection]}.`;
      }
      if (byId.has(row.id)) {
        return `المعرّف ${row.id} مكرر في جدول ${COLLECTION_LABELS[collection]}.`;
      }
      byId.set(row.id, row);
    }

    rowsByCollection.set(collection, rows as DatabaseRecord[]);
    recordsById.set(collection, byId);
  }

  const requireUnique = (
    collection: string,
    field: string,
    normalize: (value: string) => string = value => value.trim(),
    allowEmpty = false,
  ): string | null => {
    const seen = new Set<string>();
    for (const row of rowsByCollection.get(collection) || []) {
      const value = row[field];
      if (typeof value !== 'string') return `الحقل ${field} غير صالح في جدول ${COLLECTION_LABELS[collection]}.`;
      if (!value.trim()) {
        if (allowEmpty) continue;
        return `الحقل ${field} مطلوب في جدول ${COLLECTION_LABELS[collection]}.`;
      }
      const key = normalize(value);
      if (seen.has(key)) return `${COLLECTION_LABELS[collection]} يحتوي على قيمة مكررة للحقل ${field}.`;
      seen.add(key);
    }
    return null;
  };

  const uniqueConstraints: Array<{
    collection: string;
    field: string;
    normalize?: (value: string) => string;
    allowEmpty?: boolean;
  }> = [
    // The local app user table is separate from login accounts. Email and
    // phone are optional profile fields, so empty values must not block any
    // unrelated transaction (especially on a newly initialized install).
    { collection: 'users', field: 'email', normalize: value => value.trim().toLocaleLowerCase('en-US'), allowEmpty: true },
    { collection: 'users', field: 'phone', allowEmpty: true },
    { collection: 'students', field: 'qrToken', normalize: value => value.trim().toLocaleLowerCase('en-US') },
    { collection: 'payments', field: 'receiptNumber' },
    { collection: 'supplyItems', field: 'barcode', allowEmpty: true },
    { collection: 'supplySales', field: 'invoiceNumber' },
    { collection: 'supplyReturns', field: 'returnNumber' },
  ];
  for (const constraint of uniqueConstraints) {
    const error = requireUnique(
      constraint.collection,
      constraint.field,
      constraint.normalize,
      constraint.allowEmpty,
    );
    if (error) return error;
  }

  const paymentMethods = ['cash', 'transfer', 'instapay', 'vodafone', 'card'] as const;
  const enumConstraints: Array<{
    collection: string;
    field: string;
    values: readonly string[];
    optional?: boolean;
  }> = [
    { collection: 'users', field: 'role', values: ['admin', 'supervisor', 'guardian'] },
    { collection: 'groups', field: 'status', values: ['active', 'completed', 'upcoming'] },
    { collection: 'sessions', field: 'status', values: ['scheduled', 'cancelled', 'makeup', 'completed'] },
    { collection: 'enrollments', field: 'paymentStatus', values: ['unpaid', 'partial', 'completed', 'overdue'] },
    { collection: 'installments', field: 'status', values: ['paid', 'pending', 'overdue', 'partial'] },
    { collection: 'payments', field: 'method', values: paymentMethods },
    { collection: 'payments', field: 'status', values: ['valid', 'cancelled'] },
    { collection: 'expenses', field: 'category', values: ['rent', 'salaries', 'materials', 'utilities', 'maintenance', 'transport', 'marketing', 'other'] },
    { collection: 'expenses', field: 'paymentMethod', values: paymentMethods },
    { collection: 'attendance', field: 'status', values: ['present', 'absent', 'late'] },
    { collection: 'portfolio', field: 'status', values: ['pending', 'approved', 'rejected'] },
    { collection: 'announcements', field: 'type', values: ['announcement', 'exhibition'] },
    { collection: 'supplySales', field: 'customerType', values: ['student', 'walkin'] },
    { collection: 'supplySales', field: 'paymentMethod', values: paymentMethods },
    { collection: 'supplySales', field: 'status', values: ['valid', 'partially_returned', 'returned', 'voided'], optional: true },
    { collection: 'supplyReturns', field: 'paymentMethod', values: paymentMethods },
    { collection: 'supplyReturns', field: 'reasonCategory', values: ['changed_mind', 'wrong_item', 'damaged', 'quality', 'other'], optional: true },
  ];
  for (const constraint of enumConstraints) {
    for (const row of rowsByCollection.get(constraint.collection) || []) {
      const value = row[constraint.field];
      if (constraint.optional && value === undefined) continue;
      if (typeof value !== 'string' || !constraint.values.includes(value)) {
        return `قيمة غير صالحة للحقل ${constraint.field} في جدول ${COLLECTION_LABELS[constraint.collection]}.`;
      }
    }
  }

  const requireReference = (
    sourceCollection: string,
    field: string,
    targetCollection: string,
    expectedRole?: string,
  ): string | null => {
    const targetById = recordsById.get(targetCollection);
    for (const row of rowsByCollection.get(sourceCollection) || []) {
      const id = row[field];
      const target = typeof id === 'string' ? targetById?.get(id) : undefined;
      if (!target) {
        return `يوجد ارتباط غير صالح: ${COLLECTION_LABELS[sourceCollection]}.${field} لا يشير إلى سجل موجود في ${COLLECTION_LABELS[targetCollection]}.`;
      }
      if (expectedRole && target.role !== expectedRole) {
        return `نوع المستخدم المرتبط بالحقل ${field} غير مناسب.`;
      }
    }
    return null;
  };

  const foreignKeys: Array<[string, string, string, string?]> = [
    ['students', 'guardianId', 'users', 'guardian'],
    ['groups', 'courseId', 'courses'],
    ['groups', 'supervisorId', 'users', 'supervisor'],
    ['sessions', 'groupId', 'groups'],
    ['enrollments', 'studentId', 'students'],
    ['enrollments', 'groupId', 'groups'],
    ['installments', 'enrollmentId', 'enrollments'],
    ['payments', 'enrollmentId', 'enrollments'],
    ['attendance', 'studentId', 'students'],
    ['attendance', 'sessionId', 'sessions'],
    ['progress', 'studentId', 'students'],
    ['progress', 'sessionId', 'sessions'],
    ['portfolio', 'supervisorId', 'users'],
    ['supplyReturns', 'saleId', 'supplySales'],
  ];
  for (const [source, field, target, role] of foreignKeys) {
    const error = requireReference(source, field, target, role);
    if (error) return error;
  }

  const uniquePairs = [
    { collection: 'enrollments', fields: ['studentId', 'groupId'], label: 'اشتراك الطالب في المجموعة' },
    { collection: 'attendance', fields: ['studentId', 'sessionId'], label: 'حضور الطالب للحصة' },
  ];
  for (const constraint of uniquePairs) {
    const seen = new Set<string>();
    for (const row of rowsByCollection.get(constraint.collection) || []) {
      const values = constraint.fields.map(field => row[field]);
      if (values.some(item => typeof item !== 'string' || !item.trim())) continue;
      const key = JSON.stringify(values);
      if (seen.has(key)) return `يوجد ${constraint.label} مكرر.`;
      seen.add(key);
    }
  }

  const paymentIds = recordsById.get('payments');
  const reversedPaymentIds = new Set<string>();
  for (const payment of rowsByCollection.get('payments') || []) {
    if (payment.reversalOf === undefined) continue;
    if (typeof payment.reversalOf !== 'string' || !payment.reversalOf.trim() || payment.reversalOf === payment.id) {
      return 'يوجد ربط غير صالح بين إيصال الإلغاء والإيصال الأصلي.';
    }
    const original = paymentIds?.get(payment.reversalOf);
    if (!original || original.reversalOf !== undefined || original.enrollmentId !== payment.enrollmentId) {
      return 'الإيصال المعكوس غير موجود أو لا يتبع الاشتراك نفسه.';
    }
    if (reversedPaymentIds.has(payment.reversalOf)) return 'لا يمكن عكس الإيصال نفسه أكثر من مرة.';
    reversedPaymentIds.add(payment.reversalOf);
  }

  for (const sale of rowsByCollection.get('supplySales') || []) {
    if (!Array.isArray(sale.items) || sale.items.some(item => !isRecord(item))) {
      return 'يوجد صنف غير صالح داخل فاتورة بيع.';
    }
  }
  for (const returned of rowsByCollection.get('supplyReturns') || []) {
    if (!Array.isArray(returned.items) || returned.items.some(item => !isRecord(item))) {
      return 'يوجد صنف غير صالح داخل مرتجع.';
    }
    for (const item of returned.items as DatabaseRecord[]) {
      if (item.condition !== undefined && !['sealed', 'opened', 'damaged'].includes(String(item.condition))) {
        return 'حالة صنف المرتجع غير صالحة.';
      }
    }
  }

  return null;
}
