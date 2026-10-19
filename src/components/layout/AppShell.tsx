'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, QrCode, ShoppingBag,
  Settings, Menu, X, Palette, ShieldCheck, Sun, Moon,
  Award, Sparkles, BookOpen, FileCheck, Calendar, Megaphone
} from 'lucide-react';
import { useMarsam } from '@/lib/store';

const mainNav = [
  { href: '/', label: 'لوحة التحكم الرئيسية', icon: LayoutDashboard },
  { href: '/students', label: 'الطلاب والشهادات الملكية', icon: Users },
  { href: '/attendance', label: 'تسجيل الحضور والسكانر', icon: QrCode },
  { href: '/payments', label: 'ماليات الكورسات والأقساط', icon: CreditCard },
  { href: '/supplies', label: 'متجر ومخزن الأدوات', icon: ShoppingBag },
  { href: '/progress', label: 'متابعة وتقييم الطلاب', icon: Award },
  { href: '/portfolio', label: 'معرض الأعمال الفنية', icon: Sparkles },
  { href: '/courses', label: 'الكورسات والورش الفنية', icon: BookOpen },
  { href: '/enrollments', label: 'الحجوزات والعقود الرسمية', icon: FileCheck },
  { href: '/schedule', label: 'جدول الحصص والتقويم', icon: Calendar },
  { href: '/announcements', label: 'الإعلانات والمعارض', icon: Megaphone },
  { href: '/settings', label: 'الإعدادات والنسخ الاحتياطي', icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { settings, students, supplyItems, theme, toggleTheme } = useMarsam();

  const lowStockCount = supplyItems.filter(i => i.stockQty <= i.minStock).length;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-[#0f172a] dark:bg-[#0b1329] dark:text-[#f8fafc] transition-colors duration-150">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-blue-950/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar - Clean White & Blue */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-[#132247] text-[#0f172a] dark:text-[#f8fafc] z-50 flex flex-col justify-between transition-transform duration-200 border-l border-slate-200 dark:border-white/10 shadow-sm
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} lg:static lg:translate-x-0`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Studio Brand Header */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-[#132247]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
                <Palette size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">{settings.name || 'مرسم الإبداع'}</h1>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">نظام المرسم المكتبي</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-2.5 space-y-1">
            {mainNav.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isSupplies = item.href === '/supplies';
              const isStudents = item.href === '/students';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-white hover:bg-blue-50/80 dark:hover:bg-blue-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={17} className={isActive ? 'text-white' : 'text-blue-600/70 dark:text-blue-400'} />
                    <span>{item.label}</span>
                  </div>

                  {isSupplies && lowStockCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {lowStockCount}
                    </span>
                  )}
                  {isStudents && (
                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    }`}>
                      {students.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & theme toggle in sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2 shrink-0 bg-white dark:bg-[#132247]">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white hover:border-blue-400 transition-all text-xs font-bold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <>
                  <Sun size={15} className="text-blue-400" />
                  <span>الوضع النهاري (الأبيض والأزرق)</span>
                </>
              ) : (
                <>
                  <Moon size={15} className="text-blue-600" />
                  <span>الوضع الليلي (الداكن)</span>
                </>
              )}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-white/10 font-bold">
              {theme === 'dark' ? 'داكن' : 'أبيض وأزرق'}
            </span>
          </button>

          <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 dark:text-blue-300">
              <ShieldCheck size={14} className="text-blue-600 shrink-0" />
              <span>النسخة المحلية: نشطة ومحمية</span>
            </div>
            <p className="text-[10px] text-blue-700/80 dark:text-blue-400 leading-relaxed">
              تعمل أوفلاين بالكامل مع حفظ فوري على القرص الصلب.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar on mobile */}
        <header className="lg:hidden p-3.5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#132247] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Palette size={16} />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">{settings.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-600 border border-blue-200 dark:border-white/10"
              title="تغيير المظهر"
            >
              {theme === 'dark' ? <Sun size={16} className="text-blue-400" /> : <Moon size={16} className="text-blue-600" />}
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
