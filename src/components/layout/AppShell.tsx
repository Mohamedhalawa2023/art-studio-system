'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, QrCode, ShoppingBag,
  Settings, Menu, X, Palette, ShieldCheck, Database
} from 'lucide-react';
import { useMarsam } from '@/lib/store';

// ONLY the 6 core required modules
const mainNav = [
  { href: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/students', label: 'الطلاب والتعاقدات', icon: Users },
  { href: '/payments', label: 'ماليات الكورسات والأقساط', icon: CreditCard },
  { href: '/attendance', label: 'تسجيل الحضور والسكانر', icon: QrCode },
  { href: '/supplies', label: 'متجر ومخزن الأدوات', icon: ShoppingBag },
  { href: '/settings', label: 'الإعدادات والنسخ الاحتياطي', icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { settings, students, supplyItems } = useMarsam();

  const lowStockCount = supplyItems.filter(i => i.stockQty <= i.minStock).length;

  return (
    <div className="flex min-h-screen bg-[#0f0d2a] text-[#f8fafc]">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 glass-dark z-50 flex flex-col justify-between transition-transform duration-300 border-l border-white/10
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} lg:static lg:translate-x-0`}
      >
        <div>
          {/* Studio Brand Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
                <Palette size={22} />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-100 tracking-tight">{settings.name || 'مرسم الإبداع'}</h1>
                <p className="text-[11px] text-amber-400 font-semibold">نظام إدارة المرسم المكتبي</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            {mainNav.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isSupplies = item.href === '/supplies';
              const isStudents = item.href === '/students';

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25 border border-violet-400/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>

                  {isSupplies && lowStockCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {lowStockCount}
                    </span>
                  )}
                  {isStudents && (
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {students.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <ShieldCheck size={15} className="text-emerald-400" />
              <span>النسخة المحلية: نشطة</span>
            </div>
            <p className="text-[11px] text-slate-400">
              قاعدة البيانات مخزنة محلياً بالكامل على هذا الجهاز (بدون إنترنت).
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar on mobile */}
        <header className="lg:hidden p-4 border-b border-white/10 flex items-center justify-between glass">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-amber-400" />
            <span className="font-bold text-sm">{settings.name}</span>
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
