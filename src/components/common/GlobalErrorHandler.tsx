'use client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger/logger';

/**
 * Enterprise Global Unhandled Exception & Rejection Interceptor
 * Captures unhandled client errors and async promise rejections,
 * logs them to disk via /api/logs, and prevents silent application failure.
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      logger.error('GlobalWindowError', event.message || 'Unhandled window error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      logger.error(
        'UnhandledPromiseRejection',
        typeof reason === 'string' ? reason : reason?.message || 'Unhandled asynchronous rejection',
        reason
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
