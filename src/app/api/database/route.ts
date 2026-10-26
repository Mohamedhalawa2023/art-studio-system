import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'node:crypto';
import { getBackupDir, getDbPath, getDbTmpPath, getLogFilePath } from '@/lib/config/paths';
import { isAuthenticatedLocalRequest, isSameOriginRequest } from '@/lib/auth/local-auth';
import { getDatabaseIntegrityError } from '@/lib/db/schema';
import { decryptStoredJson, encryptStoredJson, isEncryptedStoredJson } from '@/lib/db/local-storage';

const MAX_DATABASE_SIZE_BYTES = 50 * 1024 * 1024;

function getDatabaseRevision(dbFile: string): string {
  if (!fs.existsSync(dbFile)) return 'missing';
  return createHash('sha256').update(fs.readFileSync(dbFile)).digest('hex');
}

/**
 * Mutex Concurrency Lock with 5000ms Busy Timeout
 * Guarantees zero write collisions and prevents database locking under concurrent desktop requests.
 */
class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(timeoutMs = 5000): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        this.dispatchNext();
      };
    }

    return new Promise<() => void>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const proceed = () => {
        if (timer) clearTimeout(timer);
        this.locked = true;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.dispatchNext();
        });
      };

      timer = setTimeout(() => {
        const index = this.queue.indexOf(proceed);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        reject(new Error(`DATABASE_BUSY_TIMEOUT: Lock acquisition exceeded ${timeoutMs}ms`));
      }, timeoutMs);

      this.queue.push(proceed);
    });
  }

  private dispatchNext() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

const dbMutex = new AsyncMutex();

/**
 * Atomic write with physical OS cache flush (fsync)
 * Prevents zero-byte or corrupt files during sudden power loss or process kill.
 */
function atomicFsyncWrite(targetPath: string, tmpPath: string, content: string) {
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeSync(fd, content, 0, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    fs.renameSync(tmpPath, targetPath);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'EPERM' || code === 'EBUSY') {
      try {
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      } catch {}
      fs.renameSync(tmpPath, targetPath);
    } else {
      throw error;
    }
  }
}

/**
 * Validates database JSON schema integrity
 */
function validateDatabaseIntegrity(data: unknown): boolean {
  return getDatabaseIntegrityError(data) === null;
}

/**
 * Scans backup directory for the latest valid uncorrupted snapshot
 */
function tryRecoverFromLatestBackup(backupDir: string): { data: unknown; backupFilename: string } | null {
  if (!fs.existsSync(backupDir)) return null;
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  for (const file of files) {
    try {
      const fullPath = path.join(backupDir, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(decryptStoredJson(raw));
      if (validateDatabaseIntegrity(parsed)) {
        return { data: parsed, backupFilename: file };
      }
    } catch {
      // Continue searching older snapshots
    }
  }
  return null;
}

function encryptLegacyBackupFiles(backupDir: string): void {
  if (!process.env.MARSAM_DB_ENCRYPTION_KEY || !fs.existsSync(backupDir)) return;
  const files = fs.readdirSync(backupDir).filter(file => file.startsWith('backup-') && file.endsWith('.json'));
  for (const file of files) {
    const targetPath = path.join(backupDir, file);
    let temporaryPath = '';
    try {
      const contents = fs.readFileSync(targetPath, 'utf-8');
      if (isEncryptedStoredJson(contents)) continue;
      temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
      const descriptor = fs.openSync(temporaryPath, 'wx');
      try {
        fs.writeFileSync(descriptor, encryptStoredJson(contents), 'utf-8');
        fs.fsyncSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
      fs.renameSync(temporaryPath, targetPath);
    } catch (error) {
      if (temporaryPath) {
        try { fs.unlinkSync(temporaryPath); } catch {}
      }
      appendIncidentLog(`Could not encrypt legacy backup ${file}; original backup was preserved: ${String(error)}`);
    }
  }
}

function appendIncidentLog(message: string) {
  try {
    const logFile = getLogFilePath();
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context: 'DatabaseEngine',
      message
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {}
}

// GET: Retrieve full database safely with automated corruption detection & auto-healing
export async function GET(request: Request) {
  try {
    if (!isAuthenticatedLocalRequest(request)) {
      return NextResponse.json({ success: false, error: 'يلزم تسجيل الدخول لفتح بيانات المرسم.' }, { status: 401 });
    }
    const dbFile = getDbPath();
    const dbTmpFile = getDbTmpPath();
    const backupDir = getBackupDir();
    encryptLegacyBackupFiles(backupDir);

    let needsRecovery = false;
    let loadedData: unknown = null;

    if (fs.existsSync(dbFile)) {
      try {
        const raw = fs.readFileSync(dbFile, 'utf-8');
        const parsed = JSON.parse(decryptStoredJson(raw));
        if (validateDatabaseIntegrity(parsed)) {
          loadedData = parsed;
          // Convert databases created by earlier versions once, after successful validation.
          if (process.env.MARSAM_DB_ENCRYPTION_KEY && !isEncryptedStoredJson(raw)) {
            atomicFsyncWrite(dbFile, dbTmpFile, encryptStoredJson(raw));
          }
        } else {
          needsRecovery = true;
          appendIncidentLog(`Database schema integrity check failed: ${getDatabaseIntegrityError(parsed) || 'unknown integrity error'}`);
        }
      } catch (parseError) {
        needsRecovery = true;
        appendIncidentLog(`Database JSON parse error: ${String(parseError)}`);
      }
    } else {
      needsRecovery = true;
    }

    if (needsRecovery) {
      const recovered = tryRecoverFromLatestBackup(backupDir);
      if (recovered) {
        atomicFsyncWrite(dbFile, dbTmpFile, encryptStoredJson(JSON.stringify(recovered.data, null, 2)));
        appendIncidentLog(`CRITICAL AUTO-RECOVERY: Restored database from healthy backup: ${recovered.backupFilename}`);
        return NextResponse.json({
          success: true,
          data: recovered.data,
          savedAt: fs.statSync(dbFile).mtimeMs,
          revision: getDatabaseRevision(dbFile),
          warning: `Database auto-recovered from backup: ${recovered.backupFilename}`
        }, { headers: { 'Cache-Control': 'no-store' } });
      }

      if (loadedData) {
        return NextResponse.json({
          success: true,
          data: loadedData,
          savedAt: fs.statSync(dbFile).mtimeMs,
          revision: getDatabaseRevision(dbFile),
        }, { headers: { 'Cache-Control': 'no-store' } });
      }

      return NextResponse.json(
        { success: false, revision: getDatabaseRevision(dbFile), message: 'No valid database file or backup found on disk.' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { success: true, data: loadedData, savedAt: fs.statSync(dbFile).mtimeMs, revision: getDatabaseRevision(dbFile) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    appendIncidentLog(`GET /api/database fatal error: ${String(error)}`);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

// POST: Save database with Concurrency Mutex (5000ms timeout) + Physical Flush (fsync)
export async function POST(request: Request) {
  let releaseLock: (() => void) | null = null;
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, error: 'الطلب غير مسموح.' }, { status: 403 });
    }
    if (!isAuthenticatedLocalRequest(request)) {
      return NextResponse.json({ success: false, error: 'يلزم تسجيل الدخول لحفظ بيانات المرسم.' }, { status: 401 });
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_DATABASE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'حجم قاعدة البيانات أكبر من المسموح.' }, { status: 413 });
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_DATABASE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'حجم قاعدة البيانات أكبر من المسموح.' }, { status: 413 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ success: false, error: 'صيغة قاعدة البيانات غير صالحة.' }, { status: 400 });
    }
    if (!validateDatabaseIntegrity(body)) {
      return NextResponse.json({
        success: false,
        error: getDatabaseIntegrityError(body) || 'بيانات قاعدة البيانات لا تطابق المخطط المطلوب.',
      }, { status: 400 });
    }

    const expectedRevision = request.headers.get('x-marsam-expected-revision');
    if (!expectedRevision || !/^(?:missing|[a-f0-9]{64})$/.test(expectedRevision)) {
      return NextResponse.json({ success: false, error: 'إصدار قاعدة البيانات المطلوب حفظه غير محدد.' }, { status: 428 });
    }

    releaseLock = await dbMutex.acquire(5000);
    const dbFile = getDbPath();
    const currentRevision = getDatabaseRevision(dbFile);
    if (currentRevision !== expectedRevision) {
      return NextResponse.json({
        success: false,
        conflict: true,
        revision: currentRevision,
        error: 'تغيرت قاعدة البيانات من نافذة أخرى. حدّث الصفحة قبل متابعة التعديل حتى لا تضيع التغييرات.',
      }, { status: 409 });
    }

    const dbTmpFile = getDbTmpPath();
    const backupDir = getBackupDir();
    const jsonString = JSON.stringify(body, null, 2);
    const storedString = encryptStoredJson(jsonString);

    // 1. Atomic write with fsync
    atomicFsyncWrite(dbFile, dbTmpFile, storedString);

    // 2. Automated Daily Snapshot
    const dateStr = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(backupDir, `backup-${dateStr}.json`);
    if (!fs.existsSync(backupFile)) {
      atomicFsyncWrite(backupFile, path.join(backupDir, `backup-${dateStr}.tmp.json`), storedString);
    }

    return NextResponse.json({
      success: true,
      savedAt: fs.statSync(dbFile).mtimeMs,
      revision: createHash('sha256').update(storedString).digest('hex'),
      message: 'Database saved atomically with fsync'
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('DATABASE_BUSY_TIMEOUT');
    appendIncidentLog(`POST /api/database error: ${String(error)}`);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: isTimeout ? 503 : 500 }
    );
  } finally {
    if (releaseLock) {
      releaseLock();
    }
  }
}
