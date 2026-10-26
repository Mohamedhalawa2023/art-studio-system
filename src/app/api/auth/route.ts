import { NextResponse } from 'next/server';
import {
  clearLocalSessionCookie,
  createLocalSessionCookie,
  getLocalSessionIdentity,
  getLocalAuthRequirements,
  isSameOriginRequest,
  setupLocalAdminAccounts,
  upgradeLocalAdminAccounts,
  authenticateLocalAccount,
  changeLocalPassword,
  isLocalRecoveryConfigured,
  recoverLocalManagerPassword,
  setLocalManagerRecoveryCode,
} from '@/lib/auth/local-auth';
import type { LocalAuthIdentity } from '@/lib/auth/roles';

function unauthorized() {
  return NextResponse.json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة، أو انتهت مهلة الدخول.' }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const requirements = getLocalAuthRequirements();
    const identity = getLocalSessionIdentity(request);
    return NextResponse.json(
      {
        success: true,
        ...requirements,
        recoveryConfigured: isLocalRecoveryConfigured(),
        authenticated: !requirements.setupRequired && !requirements.upgradeRequired && identity !== null,
        username: identity?.username ?? null,
        role: identity?.role ?? null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ success: false, error: 'تعذر قراءة إعداد حماية الدخول.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: 'الطلب غير مسموح.' }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) {
    return NextResponse.json({ success: false, error: 'حجم الطلب أكبر من المسموح.' }, { status: 413 });
  }

  try {
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ success: false, error: 'حجم الطلب أكبر من المسموح.' }, { status: 413 });
    const body = JSON.parse(raw) as {
      action?: unknown;
      username?: unknown;
      password?: unknown;
      accounts?: unknown;
      currentEmail?: unknown;
      currentPassword?: unknown;
      newPassword?: unknown;
      recoveryCode?: unknown;
    };
    if (!['setup', 'login', 'upgrade', 'change-password', 'set-recovery-code', 'recover-password'].includes(String(body.action))) {
      return NextResponse.json({ success: false, error: 'نوع طلب الدخول غير صالح.' }, { status: 400 });
    }

    let identity: LocalAuthIdentity | null;
    let recoveryCode: string | undefined;
    if (body.action === 'setup') {
      identity = setupLocalAdminAccounts(body.accounts);
    } else if (body.action === 'upgrade') {
      identity = upgradeLocalAdminAccounts(body.currentEmail, body.currentPassword, body.accounts);
      if (!identity) return unauthorized();
    } else if (body.action === 'change-password') {
      identity = changeLocalPassword(request, body.currentPassword, body.newPassword);
    } else if (body.action === 'set-recovery-code') {
      const result = setLocalManagerRecoveryCode(request, body.currentPassword);
      identity = result.identity;
      recoveryCode = result.recoveryCode;
    } else if (body.action === 'recover-password') {
      const recovery = recoverLocalManagerPassword(body.recoveryCode, body.newPassword);
      if (!recovery) return unauthorized();
      identity = recovery.identity;
      recoveryCode = recovery.recoveryCode;
    } else {
      identity = authenticateLocalAccount(body.username, body.password);
      if (!identity) return unauthorized();
    }

    const response = NextResponse.json({ success: true, ...identity, ...(recoveryCode ? { recoveryCode } : {}) });
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Set-Cookie', createLocalSessionCookie(request, identity));
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'تعذر إتمام الدخول.' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: 'الطلب غير مسموح.' }, { status: 403 });
  }
  const response = NextResponse.json({ success: true });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Set-Cookie', clearLocalSessionCookie(request));
  return response;
}
