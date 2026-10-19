import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getLogsDir, getLogFilePath } from '@/lib/config/paths';

const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const logsDir = getLogsDir();
    const logFile = getLogFilePath();
    const entry = await request.json();

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
