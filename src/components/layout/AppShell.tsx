'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, QrCode, ShoppingBag,
  Settings, Menu, X, Palette, ShieldCheck, Sun, Moon,
  Award, Sparkles, BookOpen, FileCheck, Calendar, Megaphone, BarChart3
} from 'lucide-react';
import { useMarsam } from '@/lib/store';

const mainNav = [
  { href: '/', label: 'لوحة التحكم الرئيسية', icon: LayoutDashboard },
  { href: '/students', label: 'الطلاب والشهادات الملكية', icon: Users },
  { href: '/attendance', label: 'تسجيل الحضور والسكانر', icon: QrCode },
  { href: '/payments', label: 'ماليات الكورسات والأقساط', icon: CreditCard },
  { href: '/supplies', label: 'متجر ومخزن الأدوات', icon: ShoppingBag },
  { href: '/reports', label: 'التقارير المالية والأرباح', icon: BarChart3 },
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
  const { settings, students, supplyItems } = useMarsam();

  const lowStockCount = supplyItems.filter(i => i.stockQty <= i.minStock).length;

  return (
    <div className="flex min-h-screen bg-[#0F172A] text-[#F3F4F6]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar - Warm Atelier Slate */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-[#131D2D] text-[#F3F4F6] z-50 flex flex-col justify-between transition-transform duration-200 border-l border-white/10 shadow-xl
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} lg:static lg:translate-x-0`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Studio Brand Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#182335]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
                <Palette size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-slate-100 tracking-tight truncate">
                  {settings.name || 'مرسم الإبداع'}
                </h1>
                <p className="text-[11px] text-teal-400 font-bold">نظام المرسم المكتبي</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
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
                      ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-500/20 border border-white/15'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={17} className={isActive ? 'text-white' : 'text-teal-400'} />
                    <span>{item.label}</span>
                  </div>

                  {isSupplies && lowStockCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">
                      {lowStockCount}
                    </span>
                  )}
                  {isStudents && (
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400">
                      {students.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-white/10 shrink-0 bg-[#0F172A]">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 py-1">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <ShieldCheck size={14} className="text-emerald-400" />
              النسخة المحلية نشطة
            </span>
            <span className="text-[10px] font-mono text-teal-400 font-bold">v1.2</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar on mobile */}
        <header className="lg:hidden p-4 border-b border-white/10 flex items-center justify-between glass">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-teal-400" />
            <span className="font-bold text-sm text-slate-100">{settings.name}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/5 text-slate-300"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
