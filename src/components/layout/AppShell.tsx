'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, AlertTriangle, ArrowLeft, Award, BarChart3, Bell, BookOpen,
  Calendar, CalendarDays, Check, ChevronDown, CreditCard, FileCheck,
  LayoutDashboard, LogOut, Megaphone, Menu, Palette, QrCode, RotateCcw, Search,
  Settings, ShieldCheck, ShoppingBag, Sparkles, Users, Warehouse, X,
  type LucideIcon,
} from 'lucide-react';
import { useMarsam } from '@/lib/store';
import { formatLocalDate } from '@/lib/dates';
import { canLocalRoleAccessPath, EMPLOYEE_HOME, localRoleLabel } from '@/lib/auth/roles';

interface NavigationItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    label: 'الرئيسية',
    items: [{ href: '/', label: 'لوحة التحكم', description: 'نظرة عامة ومؤشرات اليوم', icon: LayoutDashboard, keywords: 'الرئيسية احصائيات ملخص' }],
  },
  {
    label: 'إدارة الأكاديمية',
    items: [
      { href: '/students', label: 'الطلاب', description: 'ملفات الطلاب وأولياء الأمور', icon: Users, keywords: 'طلاب طالب ولي امر شهادة' },
      { href: '/attendance', label: 'الحضور', description: 'تسجيل الحضور والباركود', icon: QrCode, keywords: 'حضور غياب سكانر باركود' },
      { href: '/progress', label: 'التقدم الفني', description: 'تقييمات ومستوى الطلاب', icon: Award, keywords: 'تقييم تقدم مستوى اعمال' },
      { href: '/courses', label: 'الكورسات والمجموعات', description: 'البرامج التدريبية والمجموعات', icon: BookOpen, keywords: 'كورس دورة ورشة مجموعات' },
      { href: '/enrollments', label: 'الاشتراكات والعقود', description: 'التسجيل وخطط السداد والعقود', icon: FileCheck, keywords: 'اشتراك حجز تعاقد عقد تسجيل' },
      { href: '/schedule', label: 'الجدول والحصص', description: 'مواعيد الحصص والتعويضات', icon: Calendar, keywords: 'جدول موعد حصة تقويم' },
      { href: '/announcements', label: 'الإعلانات', description: 'أخبار المرسم والفعاليات', icon: Megaphone, keywords: 'اعلان اخبار معرض فعاليات' },
      { href: '/portfolio', label: 'معرض الأعمال', description: 'أعمال الطلاب ومراجعتها', icon: Sparkles, keywords: 'معرض لوحات فن اعمال' },
    ],
  },
  {
    label: 'المالية والمتجر',
    items: [
      { href: '/payments', label: 'المدفوعات والأقساط', description: 'التحصيل والإيصالات والمتأخرات', icon: CreditCard, keywords: 'دفعات مدفوعات تحصيل اقساط مالية' },
      { href: '/supplies', label: 'متجر الأدوات والمخزون', description: 'نقطة البيع والأصناف والمخزون', icon: ShoppingBag, keywords: 'متجر بيع ادوات مخزن مخزون' },
      { href: '/returns', label: 'المرتجعات', description: 'إرجاع الأصناف ومتابعة الإيصالات', icon: RotateCcw, keywords: 'مرتجع استرداد رد فاتورة' },
      { href: '/reports', label: 'التقارير المالية', description: 'الإيرادات والمصروفات وصافي النشاط', icon: BarChart3, keywords: 'تقارير ربح مصروفات صافي' },
    ],
  },
  {
    label: 'إدارة النظام',
    items: [{ href: '/settings', label: 'الإعدادات والنسخ الاحتياطي', description: 'بيانات المرسم والمستخدمون والاستعادة', icon: Settings, keywords: 'اعدادات نسخة احتياطية مستخدم' }],
  },
];

const allNavigationItems: NavigationItem[] = navigationGroups.flatMap(group => group.items);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [today, setToday] = useState('');
  const [localServiceStatus, setLocalServiceStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    settings, students, supplyItems, installments, sessions, currentUser,
    localAuthRole, localAuthUsername, logout,
    persistenceStatus, conflictBackupAvailable, downloadConflictBackup, retryPendingSave, clearConflictBackup,
  } = useMarsam();

  const visibleNavigationGroups = useMemo(() => navigationGroups
    .map(group => ({
      ...group,
      label: group.label === 'المالية والمتجر' && localAuthRole === 'employee' ? 'المخزون والمتجر' : group.label,
      items: group.items.filter(item => localAuthRole === 'manager' || (localAuthRole !== null && canLocalRoleAccessPath(localAuthRole, item.href))),
    }))
    .filter(group => group.items.length > 0), [localAuthRole]);
  const visibleNavigationItems = useMemo(() => visibleNavigationGroups.flatMap(group => group.items), [visibleNavigationGroups]);
  const homeHref = localAuthRole === 'employee' ? EMPLOYEE_HOME : '/';
  const currentPage = visibleNavigationItems.find(item =>
    item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`)
  ) || visibleNavigationItems[0] || allNavigationItems[0];
  const routeAccessDenied = localAuthRole !== null && !canLocalRoleAccessPath(localAuthRole, pathname);

  const lowStockItems = useMemo(() => supplyItems.filter(item => item.stockQty <= item.minStock), [supplyItems]);
  const overdueInstallments = useMemo(() => {
    if (!today) return [];
    return installments.filter(installment => {
      const outstanding = Math.max(0, (installment.originalAmount ?? installment.amount) - (installment.paidAmount ?? (installment.status === 'paid' ? installment.amount : 0)));
      return installment.status !== 'paid' && installment.dueDate < today && outstanding > 0;
    });
  }, [installments, today]);

  const todaysSessions = useMemo(() => sessions.filter(session =>
    session.date === today && (session.status === 'scheduled' || session.status === 'makeup')
  ), [sessions, today]);

  const alerts = useMemo(() => [
    ...(localAuthRole === 'manager' && overdueInstallments.length ? [{ href: '/payments', label: `${overdueInstallments.length} أقساط متأخرة`, description: 'راجع الأرصدة المستحقة وتابع التحصيل.', icon: AlertTriangle, tone: 'danger' as const }] : []),
    ...(lowStockItems.length ? [{ href: '/supplies', label: `${lowStockItems.length} أصناف وصلت لحد إعادة الطلب`, description: 'راجع الرصيد وحدّث كميات المخزون.', icon: Warehouse, tone: 'warning' as const }] : []),
    ...(todaysSessions.length ? [{ href: '/schedule', label: `${todaysSessions.length} حصص مجدولة اليوم`, description: 'افتح الجدول لمراجعة المواعيد.', icon: CalendarDays, tone: 'info' as const }] : []),
  ], [localAuthRole, overdueInstallments.length, lowStockItems.length, todaysSessions.length]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ar');
    const items = visibleNavigationItems.filter(item => !query ||
      `${item.label} ${item.description} ${item.keywords}`.toLocaleLowerCase('ar').includes(query)
    );
    return query ? items.slice(0, 8) : items;
  }, [searchQuery, visibleNavigationItems]);

  useEffect(() => {
    if (routeAccessDenied) router.replace(EMPLOYEE_HOME);
  }, [routeAccessDenied, router]);

  useEffect(() => {
    const updateToday = () => setToday(formatLocalDate(new Date()));
    updateToday();
    const timer = window.setInterval(updateToday, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkService = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        const health = response.ok ? await response.json() : null;
        if (mounted) setLocalServiceStatus(health?.status === 'ok' ? 'ready' : 'error');
      } catch {
        if (mounted) setLocalServiceStatus('error');
      }
    };
    void checkService();
    const timer = window.setInterval(checkService, 60_000);
    window.addEventListener('online', checkService);
    window.addEventListener('focus', checkService);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener('online', checkService);
      window.removeEventListener('focus', checkService);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(open => !open);
        setAlertsOpen(false);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setAlertsOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const statusText = localServiceStatus === 'ready'
    ? 'التطبيق يعمل محليًا'
    : localServiceStatus === 'error' ? 'تعذر الاتصال بالتطبيق' : 'جارٍ فحص خدمة التطبيق';

  return (
    <div className="flex min-h-screen bg-[#0E1629] text-[#F8FAFC]">
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-teal-700 p-3 text-white focus:not-sr-only focus:fixed focus:right-4 focus:top-4">انتقل إلى محتوى الصفحة</a>

      {sidebarOpen && <button type="button" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" />}

      <aside className={`fixed inset-y-0 right-0 z-50 flex w-[min(86vw,290px)] flex-col border-l border-[#2A3B56] bg-[#1B2537] shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:translate-x-0 lg:shadow-none ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-[#2A3B56] p-4">
          <Link href={homeHref} onClick={() => setSidebarOpen(false)} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white shadow-lg shadow-[#0D9488]/25"><Palette size={23} /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-black text-[#F8FAFC]">{settings.name || 'مرسم الإبداع'}</span><span className="mt-0.5 block text-[10px] font-bold text-[#2DD4BF]">إدارة المرسم والأكاديمية</span></span>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#111827] hover:text-white lg:hidden"><X size={18} /></button>
        </div>

        <nav aria-label="القائمة الرئيسية" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {visibleNavigationGroups.map(group => <section key={group.label} aria-label={group.label}>
            <h2 className="mb-2 px-3 text-[10px] font-black tracking-wide text-[#64748B]">{group.label}</h2>
            <div className="space-y-1">{group.items.map(item => {
              const Icon = item.icon;
              const isActive = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} aria-current={isActive ? 'page' : undefined}
                className={`group flex min-h-10 items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 ${isActive ? 'border border-[#0D9488]/50 bg-[#0D9488]/15 text-[#F8FAFC]' : 'text-[#A9B7C9] hover:bg-[#111827] hover:text-white'}`}>
                <span className="flex min-w-0 items-center gap-2.5"><Icon size={16} className={`shrink-0 ${isActive ? 'text-[#2DD4BF]' : 'text-[#7DD3C7] group-hover:text-[#2DD4BF]'}`} /><span className="truncate">{item.label}</span></span>
                {item.href === '/supplies' && lowStockItems.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500/20 px-1 text-[10px] font-black text-red-300">{lowStockItems.length}</span>}
                {item.href === '/students' && <span className="rounded-md bg-[#111827] px-1.5 py-0.5 font-mono text-[10px] text-[#94A3B8]">{students.length}</span>}
                {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2DD4BF]" />}
              </Link>;
            })}</div>
          </section>)}
        </nav>

        <div className="border-t border-[#2A3B56] bg-[#111827]/70 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#2A3B56] bg-[#0E1629] p-3">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${localServiceStatus === 'error' ? 'bg-red-950 text-red-300' : 'bg-teal-950 text-teal-300'}`}><ShieldCheck size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold text-[#F8FAFC]">{statusText}</span><span className="mt-0.5 block truncate text-[9px] text-[#64748B]">ملفاتك محفوظة على هذا الجهاز</span></span>
            <span className={`h-2 w-2 rounded-full ${localServiceStatus === 'ready' ? 'bg-[#2DD4BF]' : localServiceStatus === 'error' ? 'bg-red-400' : 'animate-pulse bg-amber-400'}`} />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#2A3B56] bg-[#0E1629]/95 px-3 py-3 backdrop-blur-md sm:px-5 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#2A3B56] bg-[#1B2537] text-[#F8FAFC] hover:border-teal-700 lg:hidden"><Menu size={19} /></button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]"><Link href={homeHref} className="hover:text-[#2DD4BF]">مرسم</Link><ChevronDown size={12} className="-rotate-90" /><span className="truncate font-bold text-[#CBD5E1]">{currentPage.label}</span></div>
              <p className="mt-1 truncate text-xs font-black text-[#F8FAFC] sm:text-sm">{settings.name || 'مساحة العمل'}<span className="mr-2 hidden font-normal text-[#64748B] sm:inline">{currentPage.description}</span></p>
            </div>

            <div className="hidden items-center gap-2 text-[10px] text-[#94A3B8] xl:flex"><CalendarDays size={14} className="text-[#2DD4BF]" />{today ? new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${today}T12:00:00`)) : '—'}</div>

            <button type="button" onClick={() => { setSearchOpen(true); setAlertsOpen(false); }} aria-label="بحث سريع في الأقسام" className="flex h-10 items-center gap-2 rounded-xl border border-[#2A3B56] bg-[#1B2537] px-3 text-[#CBD5E1] transition-colors hover:border-teal-700 hover:text-white">
              <Search size={16} /><span className="hidden text-[11px] font-bold md:inline">بحث سريع</span><kbd className="hidden rounded border border-[#334155] bg-[#0E1629] px-1.5 py-0.5 font-mono text-[9px] text-[#64748B] md:inline">Ctrl K</kbd>
            </button>

            <div className="relative">
              <button type="button" onClick={() => { setAlertsOpen(open => !open); setSearchOpen(false); }} aria-label={`التنبيهات، ${alerts.length} تنبيهات`} aria-expanded={alertsOpen} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#2A3B56] bg-[#1B2537] text-[#CBD5E1] transition-colors hover:border-teal-700 hover:text-white">
                <Bell size={17} />{alerts.length > 0 && <span className="absolute -left-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-[#111827]">{alerts.length}</span>}
              </button>
              {alertsOpen && <div className="absolute left-0 top-12 z-40 w-[min(88vw,350px)] overflow-hidden rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#2A3B56] px-4 py-3"><div><h2 className="text-xs font-black text-white">تنبيهات العمل</h2><p className="mt-0.5 text-[10px] text-[#94A3B8]">مؤشرات تحتاج متابعة</p></div><button type="button" onClick={() => setAlertsOpen(false)} aria-label="إغلاق التنبيهات" className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#111827]"><X size={15} /></button></div>
                <div className="max-h-80 overflow-y-auto p-2">{alerts.map((alert, index) => {
                  const Icon = alert.icon;
                  const tone = alert.tone === 'danger' ? 'text-red-300 bg-red-950/50' : alert.tone === 'warning' ? 'text-amber-300 bg-amber-950/40' : 'text-teal-300 bg-teal-950/40';
                  return <Link key={`${alert.href}-${index}`} href={alert.href} onClick={() => setAlertsOpen(false)} className="flex items-start gap-3 rounded-xl p-3 hover:bg-[#111827]"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={17} /></span><span><span className="block text-xs font-black text-[#F8FAFC]">{alert.label}</span><span className="mt-1 block text-[10px] leading-5 text-[#94A3B8]">{alert.description}</span></span><ArrowLeft size={14} className="mr-auto mt-1 shrink-0 text-[#64748B]" /></Link>;
                })}{alerts.length === 0 && <div className="px-4 py-8 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-teal-950/50 text-teal-300"><Check size={19} /></span><p className="mt-3 text-xs font-bold text-[#F8FAFC]">كل شيء تحت السيطرة</p><p className="mt-1 text-[10px] text-[#94A3B8]">لا توجد أقساط متأخرة أو تنبيهات مخزون اليوم.</p></div>}</div>
              </div>}
            </div>

            <div className="hidden items-center gap-2 border-r border-[#2A3B56] pr-3 sm:flex"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#0D9488]/30 bg-[#0D9488]/15 text-[#2DD4BF]">{(localAuthUsername || currentUser?.name)?.trim().slice(0, 1) || <Activity size={15} />}</span><span className="max-w-28"><span className="block truncate text-[10px] font-black text-[#F8FAFC]">{localAuthUsername || currentUser?.name || 'مساحة العمل'}</span><span className="mt-0.5 block text-[9px] text-[#64748B]">{localAuthRole ? localRoleLabel(localAuthRole) : 'تشغيل محلي'}</span></span></div>
            <button type="button" onClick={() => void logout()} aria-label="قفل البرنامج وتسجيل الخروج" title="قفل البرنامج" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#2A3B56] bg-[#1B2537] text-[#CBD5E1] transition-colors hover:border-red-500/50 hover:bg-red-950/40 hover:text-red-200"><LogOut size={16} /></button>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1500px] flex-1 p-3 sm:p-5 lg:p-7">
          {routeAccessDenied
            ? <div role="alert" className="mx-auto mt-12 max-w-lg rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-6 text-center"><ShieldCheck size={28} className="mx-auto text-amber-300" /><h1 className="mt-3 text-lg font-black">القسم متاح لمدير المرسم فقط</h1><p className="mt-2 text-sm leading-6 text-[#A9B7C9]">تم تحويلك إلى قسم الحضور المسموح لحساب الموظف.</p></div>
            : children}
        </main>
        <footer className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 pb-4 text-[9px] text-[#64748B] sm:px-7">
          <span>مرسم للفنون • مساحة عمل محلية</span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${localServiceStatus === 'ready' ? 'bg-[#2DD4BF]' : localServiceStatus === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />{localServiceStatus === 'ready' ? 'خدمة التطبيق متاحة' : localServiceStatus === 'error' ? 'تحقق من خدمة التطبيق' : 'جارٍ التحقق'}</span>
            <span role="status" aria-live="polite" className={`flex items-center gap-1.5 ${persistenceStatus === 'error' || persistenceStatus === 'conflict' ? 'font-bold text-red-300' : persistenceStatus === 'saving' ? 'text-amber-300' : persistenceStatus === 'saved' ? 'text-[#2DD4BF]' : ''}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${persistenceStatus === 'error' || persistenceStatus === 'conflict' ? 'bg-red-400' : persistenceStatus === 'saving' ? 'animate-pulse bg-amber-400' : persistenceStatus === 'saved' ? 'bg-[#2DD4BF]' : 'bg-slate-500'}`} />
              {conflictBackupAvailable ? 'توجد تغييرات لم تُحفظ على الجهاز — احتفظ بنسختها قبل المغادرة' : persistenceStatus === 'conflict' ? 'تغيرت قاعدة البيانات من نافذة أخرى؛ أوقفنا الحفظ لتجنب استبدالها' : persistenceStatus === 'error' ? 'تعذر حفظ التغييرات على الجهاز' : persistenceStatus === 'saving' ? 'جارٍ حفظ التغييرات…' : persistenceStatus === 'saved' ? 'تم حفظ التغييرات على الجهاز' : 'لم يتم الحفظ بعد'}
            </span>
            {conflictBackupAvailable && <span className="flex items-center gap-2">
              <button type="button" onClick={downloadConflictBackup} className="font-bold text-teal-300 underline underline-offset-2 hover:text-teal-100">تنزيل التغييرات غير المحفوظة</button>
              {persistenceStatus === 'error' && <button type="button" onClick={retryPendingSave} className="font-bold text-amber-300 underline underline-offset-2 hover:text-amber-100">إعادة محاولة الحفظ</button>}
              <button type="button" onClick={clearConflictBackup} className="font-bold text-red-300 underline underline-offset-2 hover:text-red-100">تجاهلها وتحميل النسخة المحفوظة</button>
            </span>}
          </span>
        </footer>
      </div>

      {searchOpen && <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/75 p-3 pt-[12vh] backdrop-blur-sm sm:p-8 sm:pt-[15vh]" onMouseDown={event => { if (event.currentTarget === event.target) closeSearch(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="global-search-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#2A3B56] bg-[#1B2537] shadow-2xl">
          <h2 id="global-search-title" className="sr-only">البحث السريع في أقسام النظام</h2>
          <div className="flex items-center gap-3 border-b border-[#2A3B56] px-4"><Search size={19} className="shrink-0 text-[#2DD4BF]" /><input ref={searchInputRef} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && searchResults[0]) { router.push(searchResults[0].href); closeSearch(); } }} placeholder="ابحث عن قسم: طلاب، مدفوعات، مخزون..." className="h-14 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#64748B]" /><button type="button" onClick={closeSearch} aria-label="إغلاق البحث" className="rounded-lg border border-[#334155] px-2 py-1 text-[9px] font-bold text-[#94A3B8]">Esc</button></div>
          <div className="max-h-[55vh] overflow-y-auto p-2"><p className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[#64748B]">{searchQuery.trim() ? 'نتائج الأقسام' : 'الأقسام المتاحة'}</p>{searchResults.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return <Link key={item.href} href={item.href} onClick={closeSearch} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-right hover:bg-[#111827]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#2A3B56] bg-[#0E1629] text-[#2DD4BF]"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-[#F8FAFC]">{item.label}</span><span className="mt-0.5 block truncate text-[10px] text-[#94A3B8]">{item.description}</span></span>{isActive ? <span className="rounded-full bg-[#0D9488]/15 px-2 py-1 text-[9px] font-bold text-teal-300">مفتوح</span> : <ArrowLeft size={14} className="text-[#64748B]" />}</Link>;
          })}{searchResults.length === 0 && <p className="px-3 py-8 text-center text-xs text-[#94A3B8]">لا يوجد قسم مطابق. جرّب كلمة أبسط.</p>}</div>
          <div className="border-t border-[#2A3B56] px-4 py-2.5 text-[9px] text-[#64748B]">اضغط Enter لفتح أول نتيجة أو Esc للإغلاق. يمكنك فتح البحث في أي وقت بالاختصار Ctrl K.</div>
        </section>
      </div>}
    </div>
  );
}
