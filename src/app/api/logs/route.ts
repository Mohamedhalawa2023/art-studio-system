import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getLogsDir, getLogFilePath } from '@/lib/config/paths';
import { isLocalAdminRequest, isSameOriginRequest } from '@/lib/auth/local-auth';

const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ENTRY_SIZE_BYTES = 32 * 1024;

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, error: 'الطلب غير مسموح.' }, { status: 403 });
    }
    if (!isLocalAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'يلزم تسجيل دخول المدير.' }, { status: 401 });
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_ENTRY_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'حجم السجل أكبر من المسموح.' }, { status: 413 });
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_ENTRY_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'حجم السجل أكبر من المسموح.' }, { status: 413 });
    }
    const entry: unknown = JSON.parse(raw);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return NextResponse.json({ success: false, error: 'صيغة السجل غير صالحة.' }, { status: 400 });
    }

    const logsDir = getLogsDir();
    const logFile = getLogFilePath();

    const logLine = JSON.stringify(entry) + '\n';

    // Log rotation if size exceeds limit
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size > MAX_LOG_SIZE_BYTES) {
        const rotatedFile = path.join(logsDir, `app-${Date.now()}.log`);
        fs.renameSync(logFile, rotatedFile);
      }
    }

    // Atomic synchronous append with immediate physical flush
    fs.appendFileSync(logFile, logLine, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
