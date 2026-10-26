const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const projectRoot = path.resolve(__dirname, '..');
const resolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveProjectAliases(request, parent, isMain, options) {
  if (request.startsWith('@/lib/')) {
    request = path.join(projectRoot, 'src', 'lib', request.slice('@/lib/'.length));
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = (module, filename) => {
  const source = require('node:fs').readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { EnrollmentService } = require('../src/lib/services/enrollment.service.ts');
const { AttendanceService } = require('../src/lib/services/attendance.service.ts');
const { CatalogService } = require('../src/lib/services/catalog.service.ts');
const { PosService } = require('../src/lib/services/pos.service.ts');
const { BackupService } = require('../src/lib/services/backup.service.ts');
const { ValidationError, Validators } = require('@/lib/validators');
const { isSameOriginRequest } = require('../src/lib/auth/local-auth.ts');
const { getDatabaseIntegrityError } = require('../src/lib/db/schema.ts');
const { decryptStoredJson, encryptStoredJson, isEncryptedStoredJson } = require('../src/lib/db/local-storage.ts');
const {
  authenticateLocalAccount,
  changeLocalPassword,
  createLocalSessionCookie,
  recoverLocalManagerPassword,
  setLocalManagerRecoveryCode,
  setupLocalAdminAccounts,
} = require('../src/lib/auth/local-auth.ts');

test('desktop database encryption protects content and detects tampering', () => {
  const previousKey = process.env.MARSAM_DB_ENCRYPTION_KEY;
  process.env.MARSAM_DB_ENCRYPTION_KEY = '0123456789abcdef'.repeat(4);
  try {
    const database = JSON.stringify({ students: [{ name: 'بيانات سرية' }] });
    const encrypted = encryptStoredJson(database);
    assert.equal(isEncryptedStoredJson(encrypted), true);
    assert.equal(encrypted.includes('بيانات سرية'), false);
    assert.equal(decryptStoredJson(encrypted), database);
    assert.equal(decryptStoredJson(database), database, 'legacy plaintext remains readable for migration');
    const tampered = `${encrypted.slice(0, -2)}AA`;
    assert.throws(() => decryptStoredJson(tampered), /تعذر فك تشفير قاعدة البيانات/);
  } finally {
    if (previousKey === undefined) delete process.env.MARSAM_DB_ENCRYPTION_KEY;
    else process.env.MARSAM_DB_ENCRYPTION_KEY = previousKey;
  }
});

test('manager recovery code resets password and password changes invalidate old sessions', () => {
  const tempAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'marsam-auth-test-'));
  const previous = {
    desktop: process.env.MARSAM_DESKTOP,
    appData: process.env.APPDATA,
  };
  process.env.MARSAM_DESKTOP = '1';
  process.env.APPDATA = tempAppData;

  try {
    const manager = { username: 'manager', password: 'ManagerStrongPass123' };
    const employee = { username: 'employee', password: 'EmployeeStrongPass123' };
    const managerIdentity = setupLocalAdminAccounts([manager, employee]);
    const managerCookie = createLocalSessionCookie(new Request('http://127.0.0.1/api/auth'), managerIdentity).split(';')[0];
    const managerRequest = () => new Request('http://127.0.0.1/api/auth', { headers: { cookie: managerCookie } });

    const { recoveryCode } = setLocalManagerRecoveryCode(managerRequest(), manager.password);
    const recovery = recoverLocalManagerPassword(recoveryCode, 'NewManagerStrongPass456');
    assert.deepEqual(recovery?.identity, managerIdentity);
    assert.equal(recovery?.recoveryCode.length, 40);
    assert.notEqual(recovery?.recoveryCode, recoveryCode, 'recovery rotates the code after use');
    assert.equal(recoverLocalManagerPassword(recoveryCode, 'AnotherManagerStrongPass789'), null);
    assert.deepEqual(authenticateLocalAccount(manager.username, 'NewManagerStrongPass456'), managerIdentity);
    assert.deepEqual(authenticateLocalAccount(employee.username, employee.password), { username: employee.username, role: 'employee' });

    const currentCookie = createLocalSessionCookie(new Request('http://127.0.0.1/api/auth'), managerIdentity).split(';')[0];
    const authenticatedRequest = new Request('http://127.0.0.1/api/auth', { headers: { cookie: currentCookie } });
    changeLocalPassword(authenticatedRequest, 'NewManagerStrongPass456', 'FinalManagerStrongPass789');
    assert.equal(authenticateLocalAccount(manager.username, 'NewManagerStrongPass456'), null);
    assert.deepEqual(authenticateLocalAccount(manager.username, 'FinalManagerStrongPass789'), managerIdentity);
  } finally {
    if (previous.desktop === undefined) delete process.env.MARSAM_DESKTOP;
    else process.env.MARSAM_DESKTOP = previous.desktop;
    if (previous.appData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = previous.appData;
    fs.rmSync(tempAppData, { recursive: true, force: true });
  }
});

test('database integrity accepts optional empty email and phone fields for app users', () => {
  const data = {
    users: [
      { id: 'admin-1', role: 'admin', email: '', phone: '' },
      { id: 'supervisor-1', role: 'supervisor', email: '', phone: '' },
    ],
    students: [], courses: [], groups: [], sessions: [], enrollments: [],
    installments: [], payments: [], attendance: [], progress: [],
    supplyItems: [], supplySales: [], portfolio: [],
  };

  assert.equal(getDatabaseIntegrityError(data), null);

  data.users[0].email = 'owner@example.com';
  data.users[1].email = 'OWNER@example.com';
  assert.match(getDatabaseIntegrityError(data), /قيمة مكررة للحقل email/);
});

test('auth accepts loopback browser requests when Next rewrites its internal host, but rejects foreign origins', () => {
  const desktopRequest = new Request('http://localhost:3210/api/auth', {
    method: 'POST',
    headers: { host: '127.0.0.1:3210', origin: 'http://127.0.0.1:3210' },
  });
  assert.equal(isSameOriginRequest(desktopRequest), true);

  const developmentRequest = new Request('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
  });
  assert.equal(isSameOriginRequest(developmentRequest), true);

  const foreignRequest = new Request('http://localhost:3210/api/auth', {
    method: 'POST',
    headers: { host: 'attacker.example:3210', origin: 'http://attacker.example:3210' },
  });
  assert.equal(isSameOriginRequest(foreignRequest), false);
});

test('packaged desktop stores persistent data under the user profile, outside the install directory', () => {
  const pathsModulePath = require.resolve('../src/lib/config/paths.ts');
  const previous = {
    desktop: process.env.MARSAM_DESKTOP,
    appData: process.env.APPDATA,
    localAppData: process.env.LOCALAPPDATA,
  };
  const appData = path.join(projectRoot, 'temp-install-profile');

  try {
    process.env.MARSAM_DESKTOP = '1';
    process.env.APPDATA = appData;
    process.env.LOCALAPPDATA = path.join(projectRoot, 'temp-local-app-data');
    delete require.cache[pathsModulePath];

    const { getAppStorageBaseDir, getDbPath } = require(pathsModulePath);
    const userDataPath = path.join(appData, 'MarsamArtStudio');

    assert.equal(getAppStorageBaseDir(), userDataPath);
    assert.equal(getDbPath(), path.join(userDataPath, 'data', 'data_store.json'));
    assert.equal(userDataPath.startsWith(path.join(projectRoot, 'dist')), false);
  } finally {
    delete require.cache[pathsModulePath];
    if (previous.desktop === undefined) delete process.env.MARSAM_DESKTOP;
    else process.env.MARSAM_DESKTOP = previous.desktop;
    if (previous.appData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = previous.appData;
    if (previous.localAppData === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previous.localAppData;
  }
});

function createDatabase({ enrolled = 1, capacity = 3 } = {}) {
  const database = {
    students: [{ id: 'student-1', name: 'طالب تجريبي' }],
    courses: [{ id: 'course-1', price: 1000.01 }],
    groups: [{ id: 'group-1', courseId: 'course-1', status: 'active', capacity, enrolled }],
    enrollments: [],
    payments: [],
    installments: [],
  };

  return {
    state: database,
    executeTransaction(_name, action, onCommit) {
      const draft = structuredClone(this.state);
      const result = action(draft);
      this.state = draft;
      onCommit?.(this.state);
      return result;
    },
  };
}

function createAttendanceDatabase({ enrollmentGroupId = 'group-1' } = {}) {
  const database = {
    students: [{ id: 'student-1', name: 'طالب تجريبي', qrToken: 'QR-TEST' }],
    sessions: [{ id: 'session-1', groupId: 'group-1', status: 'scheduled' }],
    enrollments: [{ id: 'enrollment-1', studentId: 'student-1', groupId: enrollmentGroupId, totalAmount: 1000, totalPaid: 0, paymentStatus: 'partial' }],
    installments: [{ id: 'installment-1', enrollmentId: 'enrollment-1', amount: 1000, dueDate: '2999-01-01', status: 'pending' }],
    attendance: [],
  };
  const indexes = {
    studentsByQr: new Map([['qr-test', database.students[0]]]),
    enrollmentsByStudentId: new Map([['student-1', database.enrollments]]),
  };

  return {
    state: database,
    getState() { return this.state; },
    getIndexes() { return indexes; },
    executeTransaction(_name, action, onCommit) {
      const draft = structuredClone(this.state);
      const result = action(draft);
      this.state = draft;
      onCommit?.(this.state);
      return result;
    },
  };
}

function createCatalogDatabase() {
  return {
    state: {
      users: [{ id: 'supervisor-1', role: 'supervisor', name: 'مشرف' }],
      courses: [{ id: 'course-1', name: 'رسم', sessionsCount: 3, price: 500 }],
      groups: [], sessions: [], announcements: [],
    },
    getState() { return this.state; },
    executeTransaction(_name, action, onCommit) {
      const draft = structuredClone(this.state);
      const result = action(draft);
      this.state = draft;
      onCommit?.(this.state);
      return result;
    },
  };
}

function createPosDatabase() {
  const year = new Date().getFullYear();
  return {
    state: {
      students: [{ id: 'student-1', name: 'سلمى محمد' }],
      supplyItems: [
        { id: 'product-1', name: 'قلم رسم', barcode: 'PEN-1', category: 'أقلام', costPrice: 0.03, sellPrice: 0.1, stockQty: 3, minStock: 1 },
        { id: 'product-2', name: 'فرشاة', barcode: 'BRUSH-1', category: 'فرش', costPrice: 5, sellPrice: 10, stockQty: 1, minStock: 0 },
      ],
      supplySales: [
        { id: 'old-year-sale', invoiceNumber: 'SHP-2025-0099' },
        { id: 'existing-sale', invoiceNumber: `SHP-${year}-0008` },
      ],
    },
    executeTransaction(_name, action, onCommit) {
      const draft = structuredClone(this.state);
      const result = action(draft);
      this.state = draft;
      onCommit?.(this.state);
      return result;
    },
  };
}

test('installment enrollment saves three pending installments whose sum matches the course price', () => {
  const database = createDatabase();
  const service = new EnrollmentService(database);

  const { enrollment, payment } = service.createEnrollment({
    studentId: 'student-1',
    groupId: 'group-1',
    paymentPlan: 'installments',
    contractAccepted: true,
  });
  const installments = database.state.installments;

  assert.equal(payment, undefined);
  assert.equal(enrollment.totalAmount, 1000.01);
  assert.equal(enrollment.totalPaid, 0);
  assert.equal(enrollment.paymentStatus, 'unpaid');
  assert.equal(installments.length, 3);
  assert.ok(installments.every(item => item.status === 'pending'));
  assert.equal(Math.round(installments.reduce((sum, item) => sum + item.amount, 0) * 100), 100001);
  assert.equal(database.state.groups[0].enrolled, 2);
});

test('full payment applies the five percent discount and records the chosen payment method', () => {
  const database = createDatabase();
  const service = new EnrollmentService(database);

  const { enrollment, payment } = service.createEnrollment({
    studentId: 'student-1',
    groupId: 'group-1',
    paymentPlan: 'full',
    paymentMethod: 'instapay',
    contractAccepted: true,
  });

  assert.equal(enrollment.totalAmount, 950.01);
  assert.equal(enrollment.totalPaid, 950.01);
  assert.equal(enrollment.paymentStatus, 'completed');
  assert.equal(payment.amount, 950.01);
  assert.equal(payment.method, 'instapay');
  assert.equal(database.state.payments.length, 1);
  assert.equal(database.state.installments.length, 0);
});

test('duplicate enrollment is rejected without changing the database', () => {
  const database = createDatabase();
  const service = new EnrollmentService(database);
  service.createEnrollment({ studentId: 'student-1', groupId: 'group-1', paymentPlan: 'installments', contractAccepted: true });
  const before = structuredClone(database.state);

  assert.throws(
    () => service.createEnrollment({ studentId: 'student-1', groupId: 'group-1', paymentPlan: 'full', contractAccepted: true }),
    /مسجل بالفعل/
  );
  assert.deepEqual(database.state, before);
});

test('a full group is rejected without changing the database', () => {
  const database = createDatabase({ enrolled: 3, capacity: 3 });
  const service = new EnrollmentService(database);
  const before = structuredClone(database.state);

  assert.throws(
    () => service.createEnrollment({ studentId: 'student-1', groupId: 'group-1', paymentPlan: 'full', contractAccepted: true }),
    /مكتملة العدد/
  );
  assert.deepEqual(database.state, before);
});

test('enrollment cannot be created until contract consent is explicitly accepted', () => {
  const database = createDatabase();
  const service = new EnrollmentService(database);
  const before = structuredClone(database.state);

  assert.throws(
    () => service.createEnrollment({ studentId: 'student-1', groupId: 'group-1', paymentPlan: 'installments' }),
    /تسجيل موافقة ولي الأمر/
  );
  assert.deepEqual(database.state, before);
});

test('date and cart validators reject impossible dates and fractional quantities', () => {
  assert.equal(Validators.validateDateString('2024-02-29'), '2024-02-29');
  assert.throws(() => Validators.validateDateString('2024-02-30'), ValidationError);
  assert.throws(
    () => Validators.validateCartItems([{ productId: 'paint-1', quantity: 1.5 }], new Map([['paint-1', { stockQty: 10, name: 'ألوان' }]])),
    ValidationError
  );
  assert.throws(
    () => Validators.validateCartItems([null], new Map()),
    ValidationError
  );
});

test('attendance rejects students who are not enrolled in the selected session group', () => {
  const database = createAttendanceDatabase({ enrollmentGroupId: 'another-group' });
  const service = new AttendanceService(database);

  const result = service.processBarcodeScan('QR-TEST', 'session-1');

  assert.equal(result.success, false);
  assert.match(result.message, /غير مسجل/);
  assert.equal(database.state.attendance.length, 0);
});

test('repeated barcode scans do not duplicate attendance or label a future installment overdue', () => {
  const database = createAttendanceDatabase();
  const service = new AttendanceService(database);
  const first = service.processBarcodeScan('QR-TEST', 'session-1');
  const originalCheckIn = first.attendance.checkIn;
  const second = service.processBarcodeScan('QR-TEST', 'session-1');

  assert.equal(first.success, true);
  assert.equal(first.isOverdue, false);
  assert.equal(first.remainingBalance, 1000);
  assert.equal(second.success, true);
  assert.equal(second.attendance.checkIn, originalCheckIn);
  assert.equal(database.state.attendance.length, 1);
});

test('course groups generate real dated sessions and cancel only scheduled sessions', () => {
  const database = createCatalogDatabase();
  const service = new CatalogService(database);

  const group = service.createGroup({
    courseId: 'course-1', supervisorId: 'supervisor-1', weekdays: [0, 1], time: '16:00',
    capacity: 8, startDate: '2026-10-18', endDate: '2026-11-01', room: 'القاعة الأولى',
  });

  assert.equal(group.enrolled, 0);
  assert.deepEqual(database.state.sessions.map(session => session.date), ['2026-10-18', '2026-10-19', '2026-10-25']);
  assert.ok(database.state.sessions.every(session => session.groupId === group.id && session.status === 'scheduled'));
  service.cancelSession(database.state.sessions[0].id);
  assert.equal(database.state.sessions[0].status, 'cancelled');
  assert.throws(() => service.cancelSession(database.state.sessions[0].id), /المجدولة أو التعويضية فقط/);
});

test('announcement create, edit, and delete persist validated records', () => {
  const database = createCatalogDatabase();
  const service = new CatalogService(database);
  const draft = {
    title: 'معرض الربيع', content: 'افتتاح المعرض يوم الجمعة', type: 'exhibition',
    startDate: '2026-11-01', endDate: '2026-11-03', link: 'https://example.com/show',
  };

  const created = service.createAnnouncement(draft);
  assert.equal(database.state.announcements[0].title, draft.title);
  service.updateAnnouncement(created.id, { ...draft, title: 'معرض الطلاب' });
  assert.equal(database.state.announcements[0].title, 'معرض الطلاب');
  assert.throws(() => service.updateAnnouncement(created.id, { ...draft, endDate: '2026-10-01' }), /تاريخ الانتهاء/);
  assert.throws(() => service.createAnnouncement({ ...draft, link: 'javascript:alert(1)' }), /http/);
  assert.equal(database.state.announcements[0].title, 'معرض الطلاب');
  service.deleteAnnouncement(created.id);
  assert.deepEqual(database.state.announcements, []);
});

test('older valid backups receive the announcements collection during import', () => {
  const backup = {
    users: [], students: [], courses: [], groups: [], sessions: [], enrollments: [],
    installments: [], payments: [], attendance: [], progress: [], supplyItems: [],
    supplySales: [], portfolio: [], settings: {},
  };
  const result = BackupService.validateImportSchema(JSON.stringify(backup));
  assert.equal(result.valid, true);
  assert.ok(Array.isArray(result.data.announcements));
});

test('POS checkout aggregates duplicate cart lines and calculates currency in cents', () => {
  const database = createPosDatabase();
  const service = new PosService(database);
  const sale = service.createSupplySale({
    customerType: 'student', customerId: 'student-1', customerName: 'ignored client name',
    items: [{ productId: 'product-1', quantity: 1 }, { productId: 'product-1', quantity: 2 }],
    paymentMethod: 'card',
  });

  assert.equal(sale.invoiceNumber, `SHP-${new Date().getFullYear()}-0009`);
  assert.equal(sale.customerName, 'سلمى محمد');
  assert.equal(sale.items.length, 1);
  assert.equal(sale.items[0].quantity, 3);
  assert.equal(sale.items[0].total, 0.3);
  assert.equal(sale.totalAmount, 0.3);
  assert.equal(sale.totalCost, 0.09);
  assert.equal(sale.profit, 0.21);
  assert.equal(database.state.supplyItems[0].stockQty, 0);
  const next = service.createSupplySale({
    customerType: 'walkin', customerName: 'عميل عابر',
    items: [{ productId: 'product-2', quantity: 1 }], paymentMethod: 'cash',
  });
  assert.notEqual(sale.id, next.id);
  assert.equal(next.invoiceNumber, `SHP-${new Date().getFullYear()}-0010`);
});

test('POS rejects invalid stock, fractional counts, excessive quantities, and unsafe inventory deletion', () => {
  const database = createPosDatabase();
  const service = new PosService(database);
  const before = structuredClone(database.state);

  assert.throws(() => service.createSupplySale({
    customerType: 'walkin', customerName: 'عميل تجريبي',
    items: [{ productId: 'product-2', quantity: 1 }, { productId: 'product-2', quantity: 1 }],
    paymentMethod: 'cash',
  }), /غير متوفرة/);
  assert.deepEqual(database.state, before);
  assert.throws(() => service.createSupplySale({
    customerType: 'walkin', customerName: 'عميل تجريبي',
    items: [{ productId: 'product-1', quantity: 1.5 }], paymentMethod: 'cash',
  }), /صحيح/);
  assert.throws(() => service.updateSupplyStock('product-2', -2), /الرصيد الحالي/);
  assert.throws(() => service.updateSupplyStock('product-2', 0.5), /عددًا صحيحًا/);
  assert.throws(() => service.deleteSupplyItem('product-2'), /له رصيد/);
  assert.deepEqual(database.state, before);
});

test('POS refuses checkout against fractional stock values in legacy inventory data', () => {
  const database = createPosDatabase();
  database.state.supplyItems[0].stockQty = 1.5;
  const service = new PosService(database);
  const before = structuredClone(database.state);

  assert.throws(() => service.createSupplySale({
    customerType: 'walkin', customerName: 'عميل تجريبي',
    items: [{ productId: 'product-1', quantity: 1 }], paymentMethod: 'cash',
  }), /عددًا صحيحًا/);
  assert.deepEqual(database.state, before);
});
