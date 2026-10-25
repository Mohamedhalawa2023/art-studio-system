'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, Palette, ShieldCheck } from 'lucide-react';

export type LocalAuthStage = 'checking' | 'setup' | 'upgrade' | 'login' | 'error' | 'authenticated';
export type LocalAuthAction = 'setup' | 'upgrade' | 'login';

export interface LocalAuthCredentials {
  username?: string;
  password?: string;
  currentEmail?: string;
  currentPassword?: string;
  accounts?: Array<{ username: string; password: string; role?: 'manager' | 'employee' }>;
}

interface LocalAuthScreenProps {
  stage: LocalAuthStage;
  error?: string;
  onSubmit: (action: LocalAuthAction, credentials: LocalAuthCredentials) => Promise<void>;
  onRetry: () => void;
}

export default function LocalAuthScreen({ stage, error, onSubmit, onRetry }: LocalAuthScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [secondUsername, setSecondUsername] = useState('');
  const [secondPassword, setSecondPassword] = useState('');
  const [secondConfirmation, setSecondConfirmation] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const isSetup = stage === 'setup';
  const isUpgrade = stage === 'upgrade';
  const isCredentialSetup = isSetup || isUpgrade;
  const inputClass = 'mt-2 w-full rounded-xl border border-[#34445F] bg-[#10192A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#73839A] focus:border-[#2DD4BF] focus:ring-4 focus:ring-[#2DD4BF]/10';

  const validateAccount = (accountUsername: string, accountPassword: string, accountConfirmation: string, label: string) => {
    if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(accountUsername.trim())) {
      return `اسم المستخدم ${label} يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا، دون مسافات.`;
    }
    if (accountPassword.length < 10 || accountPassword.length > 256) {
      return `كلمة مرور ${label} يجب أن تكون من 10 أحرف على الأقل.`;
    }
    if (accountPassword !== accountConfirmation) return `تأكيد كلمة مرور ${label} غير مطابق.`;
    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');
    let action: LocalAuthAction;
    let credentials: LocalAuthCredentials;
    if (isCredentialSetup) {
      const firstAccountError = validateAccount(username, password, confirmation, 'المدير');
      const secondAccountError = validateAccount(secondUsername, secondPassword, secondConfirmation, 'الموظف');
      if (firstAccountError || secondAccountError) {
        setLocalError(firstAccountError || secondAccountError);
        return;
      }
      if (username.trim().toLowerCase() === secondUsername.trim().toLowerCase()) {
        setLocalError('اختر اسمَي مستخدم مختلفين للحسابين.');
        return;
      }
      if (isUpgrade && currentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail.trim())) {
        setLocalError('البريد القديم غير صحيح.');
        return;
      }
      action = isUpgrade ? 'upgrade' : 'setup';
      credentials = {
        currentEmail: currentEmail.trim().toLowerCase(),
        currentPassword,
        accounts: [
          { username: username.trim().normalize('NFKC').toLowerCase(), password, role: 'manager' },
          { username: secondUsername.trim().normalize('NFKC').toLowerCase(), password: secondPassword, role: 'employee' },
        ],
      };
      if (isUpgrade && currentPassword.length === 0) {
        setLocalError('أدخل كلمة المرور القديمة لتأكيد التحديث.');
        return;
      }
    } else {
      if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(username.trim())) {
        setLocalError('اسم المستخدم يجب أن يكون من 3 إلى 32 حرفًا أو رقمًا، دون مسافات.');
        return;
      }
      if (password.length < 10) {
        setLocalError('استخدم كلمة مرور من 10 أحرف على الأقل.');
        return;
      }
      action = 'login';
      credentials = { username: username.trim().normalize('NFKC').toLowerCase(), password };
    }

    setSubmitting(true);
    try {
      await onSubmit(action, credentials);
      setUsername('');
      setPassword('');
      setConfirmation('');
      setSecondUsername('');
      setSecondPassword('');
      setSecondConfirmation('');
      setCurrentEmail('');
      setCurrentPassword('');
    } catch (submitError) {
      setLocalError(submitError instanceof Error ? submitError.message : 'تعذر إتمام الدخول.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#0B1220] px-4 py-6 text-[#F8FAFC] sm:px-6 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-48 h-[28rem] w-[28rem] rounded-full bg-[#0D9488]/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-40 h-[30rem] w-[30rem] rounded-full bg-[#2563EB]/10 blur-3xl" />
      </div>
      <section className={`relative w-full rounded-[2rem] border border-white/[0.08] bg-[#151F31]/95 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8 ${isCredentialSetup ? 'max-w-5xl' : 'max-w-md'}`}>
        <header className="mb-7 flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#20B2A5] to-[#0D766E] text-white shadow-lg shadow-[#0D9488]/20">
              <Palette size={24} />
            </span>
            <div>
              <p className="text-lg font-black tracking-wide">مرسم</p>
              <p className="mt-0.5 text-xs text-[#9AAAC0]">نظام إدارة المرسم</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2DD4BF]/20 bg-[#0D9488]/10 px-3 py-2 text-[11px] font-bold text-[#9FE8DD]">
            <ShieldCheck size={15} /> دخول محمي
          </span>
        </header>

        {stage === 'checking' && (
          <div role="status" className="py-10 text-center text-sm text-[#CBD5E1]">جارٍ التحقق من إعداد الحماية…</div>
        )}

        {stage === 'error' && (
          <div role="alert" className="space-y-5 py-5">
            <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-4">
              <LockKeyhole size={19} className="mt-0.5 shrink-0 text-red-300" />
              <p className="text-sm font-bold leading-6 text-red-200">{error || 'تعذر الاتصال بخدمة الدخول.'}</p>
            </div>
            <button type="button" onClick={onRetry} className="w-full rounded-xl bg-[#0D9488] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#0F766E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2DD4BF]/20">إعادة المحاولة</button>
          </div>
        )}

        {(stage === 'setup' || stage === 'upgrade' || stage === 'login') && (
          <>
            <div className="mb-6 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0D9488]/15 text-[#4DE0CC]">
                {isCredentialSetup ? <KeyRound size={20} /> : <LockKeyhole size={20} />}
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight sm:text-2xl">{isSetup ? 'إعداد حسابَي الدخول' : isUpgrade ? 'تحديث حسابَي الدخول' : 'أهلًا بعودتك'}</h1>
                <p className="mt-1.5 text-xs leading-6 text-[#9AAAC0] sm:text-sm">
                  {isSetup
                    ? 'أنشئ حساب المدير وحساب الموظف. صلاحية كل حساب ثابتة، وستظهر شاشة الدخول المعتادة بعد الحفظ.'
                    : isUpgrade
                      ? 'أدخل بيانات الدخول القديمة، ثم حدّد الحسابين المسموح لهما بفتح البرنامج.'
                      : 'سجّل الدخول باسم أحد المستخدمين المصرّح لهم.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
              {isCredentialSetup ? (
                <>
                  {isUpgrade && <div className="grid gap-4 rounded-2xl border border-white/[0.08] bg-[#10192A]/70 p-4 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-[#CBD5E1]">
                      البريد القديم إن كان مرتبطًا
                      <input name="legacy-email" type="email" autoComplete="off" value={currentEmail} onChange={event => setCurrentEmail(event.target.value)} maxLength={254} className={inputClass} />
                    </label>
                    <label className="block text-xs font-bold text-[#CBD5E1]">
                      كلمة المرور القديمة
                      <input name="legacy-password" autoComplete="new-password" type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} maxLength={256} required className={inputClass} />
                    </label>
                  </div>}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccountCard
                      number="١"
                      username={username}
                      setUsername={setUsername}
                      password={password}
                      setPassword={setPassword}
                      confirmation={confirmation}
                      setConfirmation={setConfirmation}
                      showPasswords={showPasswords}
                      autoFocus={!isUpgrade}
                      inputClass={inputClass}
                    />
                    <AccountCard
                      number="٢"
                      username={secondUsername}
                      setUsername={setSecondUsername}
                      password={secondPassword}
                      setPassword={setSecondPassword}
                      confirmation={secondConfirmation}
                      setConfirmation={setSecondConfirmation}
                      showPasswords={showPasswords}
                      inputClass={inputClass}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#10192A]/70 p-5">
                  <label className="block text-xs font-bold text-[#CBD5E1]">
                    اسم المستخدم
                    <input name="login-username" autoComplete="username" autoFocus value={username} onChange={event => setUsername(event.target.value)} minLength={3} maxLength={32} required className={inputClass} />
                  </label>
                  <label className="block text-xs font-bold text-[#CBD5E1]">
                    كلمة المرور
                    <input name="login-password" autoComplete="current-password" type={showPasswords ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} minLength={10} maxLength={256} required className={inputClass} />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  aria-pressed={showPasswords}
                  onClick={() => setShowPasswords(value => !value)}
                  className="inline-flex items-center gap-2 rounded-lg py-1 text-xs font-semibold text-[#9AAAC0] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                >
                  {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showPasswords ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}
                </button>
                {isCredentialSetup && <span className="text-[11px] text-[#8292A9]">كلمة المرور: ١٠ أحرف على الأقل</span>}
              </div>

              {(localError || error) && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs font-bold leading-5 text-red-200">{localError || error}</p>}

              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-gradient-to-l from-[#0D9488] to-[#0F766E] px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-[#0D9488]/15 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2DD4BF]/20 disabled:cursor-wait disabled:opacity-60">
                {submitting ? 'جارٍ التحقق…' : isSetup ? 'حفظ الحسابين وفتح البرنامج' : isUpgrade ? 'تحديث الحسابين وفتح البرنامج' : 'دخول إلى البرنامج'}
              </button>
            </form>

            <p className="mt-5 border-t border-white/[0.07] pt-4 text-center text-[11px] leading-5 text-[#8292A9]">يسمح البرنامج بحسابين فقط. تُحفظ كلمات المرور بصيغة مشفّرة على هذا الجهاز.</p>
          </>
        )}
      </section>
    </main>
  );
}

interface AccountCardProps {
  number: string;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmation: string;
  setConfirmation: (value: string) => void;
  showPasswords: boolean;
  autoFocus?: boolean;
  inputClass: string;
}

function AccountCard({
  number,
  username,
  setUsername,
  password,
  setPassword,
  confirmation,
  setConfirmation,
  showPasswords,
  autoFocus = false,
  inputClass,
}: AccountCardProps) {
  const suffix = number === '١' ? 'one' : 'two';

  return (
    <section className="rounded-2xl border border-white/[0.09] bg-[#1A2639] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0D9488]/15 text-sm font-black text-[#4DE0CC]">{number}</span>
        <div>
          <h2 className="text-sm font-black text-white">{number === '١' ? 'مدير المرسم' : 'موظف المرسم'}</h2>
          <p className="mt-0.5 text-[11px] text-[#8292A9]">{number === '١' ? 'كل الأقسام والإدارة المالية' : 'أقسام التشغيل والعمل اليومي'}</p>
        </div>
      </div>
      <div className="space-y-3.5">
        <label className="block text-xs font-bold text-[#CBD5E1]">
          اسم المستخدم
          <input name={`marsam-user-${suffix}`} autoComplete="off" autoFocus={autoFocus} spellCheck={false} value={username} onChange={event => setUsername(event.target.value)} minLength={3} maxLength={32} required className={inputClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#CBD5E1]">
            كلمة المرور
            <input name={`marsam-password-${suffix}`} autoComplete="new-password" type={showPasswords ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} minLength={10} maxLength={256} required className={inputClass} />
          </label>
          <label className="block text-xs font-bold text-[#CBD5E1]">
            تأكيد كلمة المرور
            <input name={`marsam-confirm-${suffix}`} autoComplete="new-password" type={showPasswords ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={10} maxLength={256} required className={inputClass} />
          </label>
        </div>
      </div>
    </section>
  );
}
