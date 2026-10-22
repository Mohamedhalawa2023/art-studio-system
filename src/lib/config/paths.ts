import path from 'path';
import fs from 'fs';

/**
 * Enterprise Path Resolver for Desktop Deployments
 * Automatically routes database, logs, and backups away from restricted directories
 * (such as Program Files) into user-writable directories (%APPDATA% / User Profile).
 */

function isWritable(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, `.perm_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'test', 'utf-8');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

let resolvedBasePath: string | null = null;

export function getAppStorageBaseDir(): string {
  if (resolvedBasePath) return resolvedBasePath;

  // Packaged desktop builds must keep user data outside the install directory,
  // including per-user installs under LocalAppData\Programs where writes succeed.
  if (process.env.MARSAM_DESKTOP === '1') {
    const appData = process.env.APPDATA || process.env.LOCALAPPDATA || (
      process.platform === 'darwin'
        ? path.join(process.env.HOME || '', 'Library', 'Application Support')
        : path.join(process.env.HOME || '', '.config')
    );
    resolvedBasePath = path.join(appData, 'MarsamArtStudio');
    return resolvedBasePath;
  }

  const cwd = process.cwd();
  const isProgramFiles = cwd.toLowerCase().includes('program files');

  // If running in Program Files or non-writable directory, redirect to user AppData
  if (isProgramFiles || !isWritable(path.join(cwd, 'data'))) {
    const appData = process.env.APPDATA || process.env.LOCALAPPDATA || (
      process.platform === 'darwin'
        ? path.join(process.env.HOME || '', 'Library', 'Application Support')
        : path.join(process.env.HOME || '', '.config')
    );
    resolvedBasePath = path.join(appData, 'MarsamArtStudio');
  } else {
    // Standard workspace path
    resolvedBasePath = cwd;
  }

  return resolvedBasePath;
}

export function getDataDir(): string {
  const dir = path.join(getAppStorageBaseDir(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getBackupDir(): string {
  const dir = path.join(getDataDir(), 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDbPath(): string {
  return path.join(getDataDir(), 'data_store.json');
}

export function getDbTmpPath(): string {
  return path.join(getDataDir(), 'data_store.tmp.json');
}

export function getLogsDir(): string {
  const dir = path.join(getAppStorageBaseDir(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getLogFilePath(): string {
  return path.join(getLogsDir(), 'app.log');
}
