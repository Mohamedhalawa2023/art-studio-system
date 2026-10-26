import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/store';
import AppShell from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GlobalErrorHandler } from '@/components/common/GlobalErrorHandler';

export const metadata: Metadata = {
  title: 'مرسم | نظام إدارة المرسم',
  description: 'نظام متكامل لإدارة مرسم تعليمي — الحجز، الدفع، الحضور، ومتابعة المستوى',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'مرسم' },
};

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <GlobalErrorHandler />
        <ErrorBoundary>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
