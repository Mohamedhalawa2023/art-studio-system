'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary', 'Unhandled UI Exception Caught', error, {
      componentStack: errorInfo.componentStack
    });
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">حدث تنبيه في عرض الواجهة</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                تم التقاط هذا الاستثناء تلقائياً وتوثيقه في سجلات النظام المحلية (<code className="font-mono text-teal-300">logs/app.log</code>). بياناتك وقاعدة بياناتك محفوظة بأمان تام على القرص الصلب.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-[11px] font-mono text-slate-700 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="btn btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 shadow-xs"
              >
                <RefreshCw size={14} /> إعادة المحاولة
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-secondary flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4"
              >
                <Home size={14} /> الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
