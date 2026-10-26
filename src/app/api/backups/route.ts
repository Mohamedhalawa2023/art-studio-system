import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getBackupDir, getDbPath } from '@/lib/config/paths';
import { isLocalAdminRequest, isSameOriginRequest } from '@/lib/auth/local-auth';
import { getDatabaseIntegrityError } from '@/lib/db/schema';
import { decryptStoredJson, encryptStoredJson } from '@/lib/db/local-storage';

const BACKUP_FILENAME = /^backup-\d{4}-\d{2}-\d{2}(?:T\d{2}-\d{2}-\d{2}(?:-\d+)?-pre-restore)?\.json$/;

function atomicBackupWrite(targetPath: string, contents: string) {
  const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
  const descriptor = fs.openSync(temporaryPath, 'wx');
  try {
    fs.writeSync(descriptor, contents, 0, 'utf-8');
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporaryPath, targetPath);
}

function listBackups() {
  const backupDir = getBackupDir();
  return fs.readdirSync(backupDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && BACKUP_FILENAME.test(entry.name))
    .map(entry => {
      const fullPath = path.join(backupDir, entry.name);
      const stats = fs.statSync(fullPath);
      return { filename: entry.name, modifiedAt: stats.mtime.toISOString(), size: stats.size };
    })
    .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

export async function GET(request: Request) {
  try {
    if (!isLocalAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'يلزم تسجيل دخول المدير.' }, { status: 401 });
    }
    const backups = listBackups();
    return NextResponse.json(
      { success: true, automaticBackupEnabled: true, backups, latestBackup: backups[0] || null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, error: 'الطلب غير مسموح.' }, { status: 403 });
    }
    if (!isLocalAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'يلزم تسجيل دخول المدير.' }, { status: 401 });
    }
    const body = await request.json();
    if (body?.action === 'snapshot-current') {
      const currentDatabasePath = getDbPath();
      if (!fs.existsSync(currentDatabasePath)) {
        return NextResponse.json({ success: true, safetyBackup: null });
      }

      const currentData = JSON.parse(decryptStoredJson(fs.readFileSync(currentDatabasePath, 'utf-8'))) as unknown;
      const currentDataError = getDatabaseIntegrityError(currentData);
      if (currentDataError) {
        return NextResponse.json({ success: false, error: `البيانات الحالية غير سليمة: ${currentDataError}` }, { status: 422 });
      }

      const backupDir = getBackupDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let sequence = 1;
      let filename = `backup-${timestamp}-pre-restore.json`;
      while (fs.existsSync(path.join(backupDir, filename))) {
        filename = `backup-${timestamp}-${sequence}-pre-restore.json`;
        sequence += 1;
      }
      atomicBackupWrite(path.join(backupDir, filename), encryptStoredJson(JSON.stringify(currentData, null, 2)));
      return NextResponse.json({ success: true, safetyBackup: filename });
    }

    if (typeof body?.filename !== 'string' || !BACKUP_FILENAME.test(body.filename) || path.basename(body.filename) !== body.filename) {
      return NextResponse.json({ success: false, error: 'اسم ملف النسخة الاحتياطية غير صالح.' }, { status: 400 });
    }

    const backupDir = getBackupDir();
    const targetPath = path.resolve(backupDir, body.filename);
    if (path.dirname(targetPath) !== path.resolve(backupDir)) {
      return NextResponse.json({ success: false, error: 'مسار النسخة الاحتياطية غير صالح.' }, { status: 400 });
    }
    const targetStats = fs.lstatSync(targetPath);
    if (!targetStats.isFile() || targetStats.isSymbolicLink()) {
      return NextResponse.json({ success: false, error: 'ملف النسخة الاحتياطية غير صالح.' }, { status: 400 });
    }

    const parsedBackup = JSON.parse(decryptStoredJson(fs.readFileSync(targetPath, 'utf-8'))) as unknown;
    const backupError = getDatabaseIntegrityError(parsedBackup);
    if (backupError) {
      return NextResponse.json({ success: false, error: `النسخة الاحتياطية تالفة أو غير متوافقة: ${backupError}` }, { status: 422 });
    }
    const restoredData = parsedBackup as Record<string, unknown>;
    if (restoredData.expenses === undefined) restoredData.expenses = [];

    // Preserve the current on-disk state immediately before returning data to the restore UI.
    let safetyBackup: string | null = null;
    const currentDatabasePath = getDbPath();
    if (fs.existsSync(currentDatabasePath)) {
      try {
        const currentRaw = decryptStoredJson(fs.readFileSync(currentDatabasePath, 'utf-8'));
        let currentData: unknown = null;
        try {
          currentData = JSON.parse(currentRaw) as unknown;
        } catch {
          // A corrupt current file should not prevent restoring a known-good backup.
        }
        if (!getDatabaseIntegrityError(currentData)) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          let sequence = 1;
          let filename = `backup-${timestamp}-pre-restore.json`;
          while (fs.existsSync(path.join(backupDir, filename))) {
            filename = `backup-${timestamp}-${sequence}-pre-restore.json`;
            sequence += 1;
          }
          atomicBackupWrite(path.join(backupDir, filename), encryptStoredJson(JSON.stringify(currentData, null, 2)));
          safetyBackup = filename;
        }
      } catch {
        return NextResponse.json({ success: false, error: 'تعذر إنشاء نسخة أمان من البيانات الحالية، ولم تتم الاستعادة.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: restoredData, safetyBackup });
  } catch (error) {
    const status = error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT' ? 404 : 500;
    return NextResponse.json({ success: false, error: status === 404 ? 'ملف النسخة الاحتياطية غير موجود.' : String(error) }, { status });
  }
}
