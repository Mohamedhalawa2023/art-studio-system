import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDataDir, getBackupDir, getDbPath, getDbTmpPath, getLogFilePath } from '@/lib/config/paths';

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
  } catch (err: any) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      try {
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      } catch {}
      fs.renameSync(tmpPath, targetPath);
    } else {
      throw err;
    }
  }
}

/**
 * Validates database JSON schema integrity
 */
function validateDatabaseIntegrity(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  const requiredArrays = ['students', 'courses', 'payments', 'attendance', 'supplyItems'];
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      return false;
    }
  }
  if (data.expenses !== undefined && !Array.isArray(data.expenses)) return false;
  if (data.supplyReturns !== undefined && !Array.isArray(data.supplyReturns)) return false;
  return true;
}

/**
 * Scans backup directory for the latest valid uncorrupted snapshot
 */
function tryRecoverFromLatestBackup(backupDir: string): { data: any; backupFilename: string } | null {
  if (!fs.existsSync(backupDir)) return null;
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  for (const file of files) {
    try {
      const fullPath = path.join(backupDir, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (validateDatabaseIntegrity(parsed)) {
        return { data: parsed, backupFilename: file };
      }
    } catch {
      // Continue searching older snapshots
    }
  }
  return null;
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
export async function GET() {
  try {
    const dbFile = getDbPath();
    const dbTmpFile = getDbTmpPath();
    const backupDir = getBackupDir();

    let needsRecovery = false;
    let loadedData: any = null;

    if (fs.existsSync(dbFile)) {
      try {
        const raw = fs.readFileSync(dbFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (validateDatabaseIntegrity(parsed)) {
          loadedData = parsed;
        } else {
          needsRecovery = true;
          appendIncidentLog('Database schema integrity check failed: missing essential table arrays.');
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
        atomicFsyncWrite(dbFile, dbTmpFile, JSON.stringify(recovered.data, null, 2));
        appendIncidentLog(`CRITICAL AUTO-RECOVERY: Restored database from healthy backup: ${recovered.backupFilename}`);
        return NextResponse.json({
          success: true,
          data: recovered.data,
          warning: `Database auto-recovered from backup: ${recovered.backupFilename}`
        });
      }

      if (loadedData) {
        return NextResponse.json({ success: true, data: loadedData });
      }

      return NextResponse.json({ success: false, message: 'No valid database file or backup found on disk.' });
    }

    return NextResponse.json({ success: true, data: loadedData });
  } catch (error) {
    appendIncidentLog(`GET /api/database fatal error: ${String(error)}`);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST: Save database with Concurrency Mutex (5000ms timeout) + Physical Flush (fsync)
export async function POST(request: Request) {
  let releaseLock: (() => void) | null = null;
  try {
    releaseLock = await dbMutex.acquire(5000);

    const body = await request.json();
    if (!validateDatabaseIntegrity(body)) {
      return NextResponse.json({ success: false, error: 'Integrity validation failed: payload missing required tables.' }, { status: 400 });
    }

    const dbFile = getDbPath();
    const dbTmpFile = getDbTmpPath();
    const backupDir = getBackupDir();
    const jsonString = JSON.stringify(body, null, 2);

    // 1. Atomic write with fsync
    atomicFsyncWrite(dbFile, dbTmpFile, jsonString);

    // 2. Automated Daily Snapshot
    const dateStr = new Date().toISOString().slice(0, 10);
    const backupFile = path.join(backupDir, `backup-${dateStr}.json`);
    if (!fs.existsSync(backupFile)) {
      atomicFsyncWrite(backupFile, path.join(backupDir, `backup-${dateStr}.tmp.json`), jsonString);
    }

    return NextResponse.json({ success: true, message: 'Database saved atomically with fsync' });
  } catch (error: any) {
    const isTimeout = error?.message?.includes('DATABASE_BUSY_TIMEOUT');
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
