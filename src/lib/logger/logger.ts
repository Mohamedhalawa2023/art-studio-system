/**
 * Marsam ERP Production Logging System
 * Writes structured audit logs and error tracking locally to disk (logs/app.log)
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'TRANSACTION';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class Logger {
  private isBrowser = typeof window !== 'undefined';

  /**
   * Internal format and dispatch to local log storage
   */
  private async dispatchLog(entry: LogEntry) {
    const formattedConsole = `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`;

    // 1. Console stream with semantic styling
    if (entry.level === 'ERROR') {
      console.error(formattedConsole, entry.metadata || '', entry.error || '');
    } else if (entry.level === 'WARN') {
      console.warn(formattedConsole, entry.metadata || '');
    } else {
      console.log(formattedConsole, entry.metadata || '');
    }

    // 2. Dispatch to server-side file writer (logs/app.log)
    if (this.isBrowser) {
      try {
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
          // Ensure non-blocking async execution
          keepalive: true,
        }).catch(() => {
          // Silent catch to prevent logging recursion if offline
        });
      } catch {
        // Fallback gracefully
      }
    }
  }

  private getTimestamp(): string {
    if (typeof window === 'undefined') {
      return 'PRERENDER_BUILD';
    }
    return new Date().toISOString();
  }

  /**
   * Informational runtime event
   */
  public info(context: string, message: string, metadata?: Record<string, any>) {
    this.dispatchLog({
      timestamp: this.getTimestamp(),
      level: 'INFO',
      context,
      message,
      metadata
    });
  }

  /**
   * Warning event (non-fatal unexpected condition)
   */
  public warn(context: string, message: string, metadata?: Record<string, any>) {
    this.dispatchLog({
      timestamp: this.getTimestamp(),
      level: 'WARN',
      context,
      message,
      metadata
    });
  }

  /**
   * Error event with stack trace capturing
   */
  public error(context: string, message: string, err?: unknown, metadata?: Record<string, any>) {
    const errorDetails = err instanceof Error ? {
      name: err.name,
      message: err.message,
      stack: err.stack
    } : err ? { message: String(err) } : undefined;

    this.dispatchLog({
      timestamp: this.getTimestamp(),
      level: 'ERROR',
      context,
      message,
      error: errorDetails,
      metadata
    });
  }

  /**
   * ACID Transaction lifecycle event
   */
  public transaction(txName: string, status: 'START' | 'COMMIT' | 'ROLLBACK', metadata?: Record<string, any>) {
    this.dispatchLog({
      timestamp: this.getTimestamp(),
      level: 'TRANSACTION',
      context: 'DatabaseTransaction',
      message: `Transaction [${txName}] -> ${status}`,
      metadata
    });
  }

  /**
   * Converts any raw exception into a polite, user-friendly Arabic explanation
   */
  public formatUserError(error: unknown, fallbackMessage = 'حدث خطأ غير متوقع أثناء معالجة البيانات.'): string {
    if (!error) return fallbackMessage;

    const message = error instanceof Error ? error.message : String(error);

    // Common mapped domain validation errors
    if (message.includes('DUPLICATE_BARCODE')) {
      return 'كود الباركود المدخل مسجل بالفعل لطالب أو منتج آخر. يرجى استخدام كود فريد.';
    }
    if (message.includes('INVALID_AMOUNT')) {
      return 'المبلغ المالي يجب أن يكون رقماً موجباً أكبر من الصفر.';
    }
    if (message.includes('INSUFFICIENT_STOCK')) {
      return 'الكمية المطلوبة في الفاتورة تتجاوز الرصيد المتوفر حالياً في المخزن.';
    }
    if (message.includes('FOREIGN_KEY_VIOLATION')) {
      return 'تعذر تنفيذ العملية بسبب ارتباطها بسجل غير موجود أو تم حذفه.';
    }
    if (message.includes('INVALID_DATE')) {
      return 'تاريخ المدخلات غير صحيح، يرجى مراجعة التاريخ والوقت.';
    }

    return message || fallbackMessage;
  }
}

export const logger = new Logger();
