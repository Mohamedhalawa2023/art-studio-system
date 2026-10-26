import fs from 'node:fs';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getAuthConfigPath } from '@/lib/config/paths';
import type { LocalAuthIdentity, LocalAuthRole } from '@/lib/auth/roles';

const COOKIE_NAME = 'marsam_local_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const PASSWORD_MIN_LENGTH = 10;

interface LocalAuthAccount {
  username: string;
  role: LocalAuthRole;
  passwordSalt: string;
  passwordHash: string;
}

interface LegacyLocalAuthConfig {
  version: 1;
  email?: string;
  passwordSalt: string;
  passwordHash: string;
  sessionSecret: string;
  createdAt: string;
}

interface TwoAccountLocalAuthConfig {
  version: 2;
  accounts: [{ username: string; passwordSalt: string; passwordHash: string }, { username: string; passwordSalt: string; passwordHash: string }];
  sessionSecret: string;
  createdAt: string;
}

interface LocalAuthConfig {
  version: 3;
  accounts: [LocalAuthAccount, LocalAuthAccount];
  sessionSecret: string;
  createdAt: string;
  recoverySalt?: string;
  recoveryHash?: string;
}

type AnyLocalAuthConfig = LegacyLocalAuthConfig | TwoAccountLocalAuthConfig | LocalAuthConfig;

interface SessionPayload {
  sub: 'local-user';
  username: string;
  role: LocalAuthRole;
  exp: number;
}

let failedLoginCount = 0;
let loginLockedUntil = 0;

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function normalizeUsername(username: unknown): string | null {
  if (typeof username !== 'string') return null;
  const normalized = username.trim().normalize('NFKC').toLowerCase();
  if (normalized.length < 3 || normalized.length > 32 || !/^[\p{L}\p{N}._-]+$/u.test(normalized)) return null;
  return normalized;
}

function readAuthConfig(): AnyLocalAuthConfig | null {
  const authPath = getAuthConfigPath();
  if (!fs.existsSync(authPath)) return null;

  const parsed = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
  if (
    parsed.version === 1 &&
    typeof parsed.passwordSalt === 'string' &&
    typeof parsed.passwordHash === 'string' &&
    typeof parsed.sessionSecret === 'string' &&
    typeof parsed.createdAt === 'string' &&
    (parsed.email === undefined || normalizeEmail(parsed.email) === parsed.email)
  ) {
    return parsed as unknown as LegacyLocalAuthConfig;
  }

  if (
    parsed.version === 2 &&
    typeof parsed.sessionSecret === 'string' &&
    typeof parsed.createdAt === 'string' &&
    Array.isArray(parsed.accounts) &&
    parsed.accounts.length === 2
  ) {
    const accounts = parsed.accounts as Record<string, unknown>[];
    const validAccounts = accounts.every(account =>
      typeof account.username === 'string' &&
      normalizeUsername(account.username) === account.username &&
      typeof account.passwordSalt === 'string' &&
      typeof account.passwordHash === 'string'
    );
    if (validAccounts && accounts[0].username !== accounts[1].username) {
      const migrated: LocalAuthConfig = {
        version: 3,
        accounts: [
          {
            username: accounts[0].username as string,
            passwordSalt: accounts[0].passwordSalt as string,
            passwordHash: accounts[0].passwordHash as string,
            role: 'manager',
          },
          {
            username: accounts[1].username as string,
            passwordSalt: accounts[1].passwordSalt as string,
            passwordHash: accounts[1].passwordHash as string,
            role: 'employee',
          },
        ],
        // Invalidate sessions created before account roles existed.
        sessionSecret: randomBytes(32).toString('hex'),
        createdAt: parsed.createdAt as string,
      };
      writeAuthConfig(migrated);
      return migrated;
    }
  }

  if (
    parsed.version === 3 &&
    typeof parsed.sessionSecret === 'string' &&
    typeof parsed.createdAt === 'string' &&
    Array.isArray(parsed.accounts) &&
    parsed.accounts.length === 2
  ) {
    const accounts = parsed.accounts as Record<string, unknown>[];
    const validAccounts = accounts.every(account =>
      typeof account.username === 'string' &&
      normalizeUsername(account.username) === account.username &&
      (account.role === 'manager' || account.role === 'employee') &&
      typeof account.passwordSalt === 'string' &&
      typeof account.passwordHash === 'string'
    );
    if (
      validAccounts && accounts[0].username !== accounts[1].username &&
      accounts[0].role === 'manager' && accounts[1].role === 'employee' &&
      ((parsed.recoverySalt === undefined && parsed.recoveryHash === undefined) ||
        (typeof parsed.recoverySalt === 'string' && /^[a-f0-9]{32}$/i.test(parsed.recoverySalt) &&
          typeof parsed.recoveryHash === 'string' && /^[a-f0-9]{128}$/i.test(parsed.recoveryHash)))
    ) {
      return parsed as unknown as LocalAuthConfig;
    }
  }

  throw new Error('ملف حماية الدخول غير صالح. احتفظ بنسخة البيانات واتصل بالدعم.');
}

function derivePasswordHash(password: string, salt: string): string {
  return scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex');
}

function buildAccounts(value: unknown): [LocalAuthAccount, LocalAuthAccount] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error('أدخل حسابَي الدخول المطلوبين.');
  }

  const accounts = value.map((item: unknown, index: number) => {
    if (!item || typeof item !== 'object') throw new Error('بيانات أحد الحسابين غير مكتملة.');
    const account = item as { username?: unknown; password?: unknown };
    const username = normalizeUsername(account.username);
    if (!username) throw new Error('اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا، دون مسافات.');
    if (typeof account.password !== 'string' || account.password.length < PASSWORD_MIN_LENGTH || account.password.length > 256) {
      throw new Error(`كلمة مرور كل حساب يجب أن تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`);
    }
    const salt = randomBytes(16).toString('hex');
    return {
      username,
      role: index === 0 ? 'manager' as const : 'employee' as const,
      passwordSalt: salt,
      passwordHash: derivePasswordHash(account.password, salt),
    };
  });

  if (accounts[0].username === accounts[1].username) {
    throw new Error('اختر اسمَي مستخدم مختلفين للحسابين.');
  }
  return accounts as [LocalAuthAccount, LocalAuthAccount];
}

function createAuthConfig(accounts: [LocalAuthAccount, LocalAuthAccount]): LocalAuthConfig {
  return {
    version: 3,
    accounts,
    sessionSecret: randomBytes(32).toString('hex'),
    createdAt: new Date().toISOString(),
  };
}

function writeAuthConfig(config: LocalAuthConfig): void {
  const authPath = getAuthConfigPath();
  const temporaryPath = `${authPath}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(config), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    fs.renameSync(temporaryPath, authPath);
  } catch {
    try { fs.unlinkSync(temporaryPath); } catch {}
    throw new Error('تعذر حفظ حسابَي الدخول على هذا الجهاز.');
  }
}

function recordLoginAttempt(valid: boolean): void {
  if (valid) {
    failedLoginCount = 0;
    loginLockedUntil = 0;
  } else {
    failedLoginCount += 1;
    if (failedLoginCount >= 5) {
      loginLockedUntil = Date.now() + 60_000;
      failedLoginCount = 0;
    }
  }
}

export function getLocalAuthRequirements(): { setupRequired: boolean; upgradeRequired: boolean } {
  const config = readAuthConfig();
  return {
    setupRequired: config === null,
    upgradeRequired: config?.version === 1,
  };
}

export function isLocalAuthConfigured(): boolean {
  return fs.existsSync(getAuthConfigPath());
}

export function setupLocalAdminAccounts(accounts: unknown): LocalAuthIdentity {
  if (isLocalAuthConfigured()) {
    throw new Error('تم إعداد حسابَي الدخول بالفعل. سجّل الدخول بدلًا من إعدادهما مرة أخرى.');
  }
  const authPath = getAuthConfigPath();
  const config = createAuthConfig(buildAccounts(accounts));
  let descriptor: number | null = null;
  try {
    descriptor = fs.openSync(authPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(config), 'utf8');
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch {}
      try { fs.unlinkSync(authPath); } catch {}
    }
    if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') {
      throw new Error('تم إعداد حسابَي الدخول بالفعل. سجّل الدخول بدلًا من إعدادهما مرة أخرى.');
    }
    throw new Error('تعذر حفظ حسابَي الدخول على هذا الجهاز.');
  }
  if (descriptor !== null) fs.closeSync(descriptor);
  return { username: config.accounts[0].username, role: 'manager' };
}

export function authenticateLocalAccount(username: unknown, password: unknown): LocalAuthIdentity | null {
  if (Date.now() < loginLockedUntil) return null;

  const config = readAuthConfig();
  if (!config || config.version !== 3) return null;
  const normalizedUsername = normalizeUsername(username);
  const validPasswordInput = typeof password === 'string' && password.length > 0 && password.length <= 256;
  const suppliedPassword = validPasswordInput ? password : '';
  let matched: LocalAuthIdentity | null = null;

  for (const account of config.accounts) {
    const supplied = Buffer.from(derivePasswordHash(suppliedPassword, account.passwordSalt), 'hex');
    const expected = Buffer.from(account.passwordHash, 'hex');
    const passwordMatches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
    if (passwordMatches && normalizedUsername === account.username) {
      matched = { username: account.username, role: account.role };
    }
  }

  const valid = validPasswordInput && matched !== null;
  recordLoginAttempt(valid);
  return valid ? matched : null;
}

function verifyAccountPassword(account: LocalAuthAccount, password: unknown): boolean {
  const validInput = typeof password === 'string' && password.length > 0 && password.length <= 256;
  const supplied = Buffer.from(derivePasswordHash(validInput ? password : '', account.passwordSalt), 'hex');
  const expected = Buffer.from(account.passwordHash, 'hex');
  return validInput && supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function validateNewPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH || password.length > 256) {
    throw new Error(`كلمة المرور يجب أن تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل.`);
  }
}

export function changeLocalPassword(request: Request, currentPassword: unknown, newPassword: unknown): LocalAuthIdentity {
  const identity = getLocalSessionIdentity(request);
  const config = readAuthConfig();
  if (!identity || !config || config.version !== 3) throw new Error('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.');
  validateNewPassword(newPassword);
  const account = config.accounts.find(item => item.username === identity.username && item.role === identity.role);
  if (!account || !verifyAccountPassword(account, currentPassword)) throw new Error('كلمة المرور الحالية غير صحيحة.');

  const salt = randomBytes(16).toString('hex');
  account.passwordSalt = salt;
  account.passwordHash = derivePasswordHash(newPassword, salt);
  config.sessionSecret = randomBytes(32).toString('hex');
  writeAuthConfig(config);
  return identity;
}

export function setLocalManagerRecoveryCode(request: Request, currentPassword: unknown): { identity: LocalAuthIdentity; recoveryCode: string } {
  const identity = getLocalSessionIdentity(request);
  const config = readAuthConfig();
  if (!identity || identity.role !== 'manager' || !config || config.version !== 3) {
    throw new Error('يلزم تسجيل دخول المدير لإعداد رمز الاستعادة.');
  }
  const account = config.accounts[0];
  if (!verifyAccountPassword(account, currentPassword)) throw new Error('كلمة مرور المدير غير صحيحة.');

  const recoveryCode = randomBytes(20).toString('hex').toUpperCase();
  const salt = randomBytes(16).toString('hex');
  config.recoverySalt = salt;
  config.recoveryHash = derivePasswordHash(recoveryCode, salt);
  writeAuthConfig(config);
  return { identity, recoveryCode };
}

export function recoverLocalManagerPassword(recoveryCode: unknown, newPassword: unknown): { identity: LocalAuthIdentity; recoveryCode: string } | null {
  if (Date.now() < loginLockedUntil) return null;
  const config = readAuthConfig();
  if (!config || config.version !== 3 || !config.recoverySalt || !config.recoveryHash) return null;
  validateNewPassword(newPassword);

  const normalizedCode = typeof recoveryCode === 'string' ? recoveryCode.trim().replace(/[\s-]/g, '').toUpperCase() : '';
  const supplied = Buffer.from(derivePasswordHash(normalizedCode, config.recoverySalt), 'hex');
  const expected = Buffer.from(config.recoveryHash, 'hex');
  const valid = normalizedCode.length === 40 && supplied.length === expected.length && timingSafeEqual(supplied, expected);
  recordLoginAttempt(valid);
  if (!valid) return null;

  const manager = config.accounts[0];
  const salt = randomBytes(16).toString('hex');
  manager.passwordSalt = salt;
  manager.passwordHash = derivePasswordHash(newPassword, salt);
  const nextRecoveryCode = randomBytes(20).toString('hex').toUpperCase();
  const nextRecoverySalt = randomBytes(16).toString('hex');
  config.recoverySalt = nextRecoverySalt;
  config.recoveryHash = derivePasswordHash(nextRecoveryCode, nextRecoverySalt);
  config.sessionSecret = randomBytes(32).toString('hex');
  writeAuthConfig(config);
  return { identity: { username: manager.username, role: 'manager' }, recoveryCode: nextRecoveryCode };
}

export function isLocalRecoveryConfigured(): boolean {
  const config = readAuthConfig();
  return Boolean(config && config.version === 3 && config.recoverySalt && config.recoveryHash);
}

export function upgradeLocalAdminAccounts(
  currentEmail: unknown,
  currentPassword: unknown,
  accounts: unknown,
): LocalAuthIdentity | null {
  if (Date.now() < loginLockedUntil) return null;
  const config = readAuthConfig();
  if (!config || config.version !== 1) return null;

  const newAccounts = buildAccounts(accounts);
  const normalizedEmail = currentEmail === '' || currentEmail === undefined ? null : normalizeEmail(currentEmail);
  const validEmail = config.email === undefined
    ? normalizedEmail !== null || currentEmail === '' || currentEmail === undefined
    : normalizedEmail === config.email;
  const validPasswordInput = typeof currentPassword === 'string' && currentPassword.length > 0 && currentPassword.length <= 256;
  const supplied = Buffer.from(derivePasswordHash(validPasswordInput ? currentPassword : '', config.passwordSalt), 'hex');
  const expected = Buffer.from(config.passwordHash, 'hex');
  const passwordMatches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  const valid = validPasswordInput && passwordMatches && validEmail;
  recordLoginAttempt(valid);
  if (!valid) return null;

  writeAuthConfig(createAuthConfig(newAccounts));
  return { username: newAccounts[0].username, role: 'manager' };
}

function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const prefix = `${COOKIE_NAME}=`;
  const item = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

export function createLocalSessionCookie(request: Request, identity: LocalAuthIdentity): string {
  const config = readAuthConfig();
  if (!config) throw new Error('إعداد حسابَي الدخول غير موجود.');
  if (config.version !== 3 || !config.accounts.some(account => account.username === identity.username && account.role === identity.role)) {
    throw new Error('حساب الدخول غير صالح.');
  }

  const payload: SessionPayload = {
    sub: 'local-user',
    username: identity.username,
    role: identity.role,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', Buffer.from(config.sessionSecret, 'hex'))
    .update(encodedPayload)
    .digest('base64url');
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${encodedPayload}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearLocalSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function getLocalSessionIdentity(request: Request): LocalAuthIdentity | null {
  const token = readSessionCookie(request.headers.get('cookie'));
  if (!token) return null;

  const config = readAuthConfig();
  if (!config || config.version !== 3) return null;

  const [encodedPayload, suppliedSignature, extra] = token.split('.');
  if (!encodedPayload || !suppliedSignature || extra !== undefined) return null;
  const expectedSignature = createHmac('sha256', Buffer.from(config.sessionSecret, 'hex'))
    .update(encodedPayload)
    .digest();
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    if (
      payload.sub !== 'local-user' || typeof payload.username !== 'string' ||
      (payload.role !== 'manager' && payload.role !== 'employee') ||
      typeof payload.exp !== 'number' || payload.exp <= Date.now()
    ) return null;

    const account = config.accounts.find(item => item.username === payload.username && item.role === payload.role);
    return account ? { username: account.username, role: account.role } : null;
  } catch {
    return null;
  }
}

export function isAuthenticatedLocalRequest(request: Request): boolean {
  return getLocalSessionIdentity(request) !== null;
}

export function isLocalAdminRequest(request: Request): boolean {
  return getLocalSessionIdentity(request)?.role === 'manager';
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const requestProtocol = new URL(request.url).protocol;
    const suppliedOrigin = new URL(origin);
    const requestOrigin = new URL(`${requestProtocol}//${host}`);
    const isLoopbackHost = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(requestOrigin.hostname.toLowerCase());
    return isLoopbackHost && suppliedOrigin.origin === requestOrigin.origin;
  } catch {
    return false;
  }
}

export function getLocalAuthCookieName(): string {
  return COOKIE_NAME;
}
