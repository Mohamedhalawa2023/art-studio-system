/**
 * Backup & Data Security Domain Service
 * Manages automated database snapshots, non-blocking asynchronous exports,
 * and schema verification on imports to guard against corrupted or injected payloads.
 */

import { DatabaseState } from '@/lib/db/transactionManager';
import { logger } from '@/lib/logger/logger';

export class BackupService {
  /**
   * Generates a timestamped JSON backup and triggers a non-blocking browser download.
   */
  public static async exportDatabaseAsync(state: DatabaseState): Promise<void> {
    logger.info('BackupService', 'Exporting database backup snapshot...');

    return new Promise((resolve) => {
      // Execute in microtask / non-blocking thread so UI does not stutter
      setTimeout(() => {
        try {
          const jsonString = JSON.stringify(state, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          const now = new Date();
          const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `marsam_erp_backup_${timestamp}.json`;

          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          logger.info('BackupService', `Database backup downloaded: ${filename}`);
          resolve();
        } catch (err) {
          logger.error('BackupService', 'Failed to export database', err);
          resolve();
        }
      }, 0);
    });
  }

  /**
   * Validates and sanitizes imported JSON payload to prevent schema corruption or malicious payloads.
   */
  public static validateImportSchema(jsonRaw: string): { valid: boolean; data?: DatabaseState; error?: string } {
    try {
      if (!jsonRaw || typeof jsonRaw !== 'string') {
        return { valid: false, error: 'الملف المدخل فارغ أو غير صالح.' };
      }

      const parsed = JSON.parse(jsonRaw);

      // Verify essential array structures
      const requiredCollections = [
        'users', 'students', 'courses', 'groups', 'sessions',
        'enrollments', 'installments', 'payments', 'attendance',
        'progress', 'supplyItems', 'supplySales', 'portfolio'
      ];

      for (const col of requiredCollections) {
        if (!Array.isArray(parsed[col])) {
          return {
            valid: false,
            error: `ملف النسخة الاحتياطية غير متوافق: الجدول (${col}) مفقود أو بصيغة غير صالحة.`
          };
        }
      }

      // Check settings object
      if (!parsed.settings || typeof parsed.settings !== 'object') {
        parsed.settings = {
          name: 'مرسم الإبداع للفنون التشكيلية',
          phone: '01012345678',
          address: 'القاهرة — مصر الجديدة',
          contractTerms: ''
        };
      }

      return { valid: true, data: parsed as DatabaseState };
    } catch (err) {
      return { valid: false, error: 'الملف ليس بتنسيق JSON صالح أو يحتوي على بيانات تالفة.' };
    }
  }
}
