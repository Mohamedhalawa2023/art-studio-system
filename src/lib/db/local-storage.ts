import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENCRYPTED_PREFIX = 'MARSAM-ENC-JSON:1:';

function getEncryptionKey(): Buffer | null {
  const configured = process.env.MARSAM_DB_ENCRYPTION_KEY;
  if (!configured) return null;
  if (!/^[a-f0-9]{64}$/i.test(configured)) {
    throw new Error('مفتاح تشفير بيانات مرسم غير صالح. أعد تشغيل التطبيق أو تواصل مع الدعم.');
  }
  return Buffer.from(configured, 'hex');
}

export function isEncryptedStoredJson(contents: string): boolean {
  return contents.startsWith(ENCRYPTED_PREFIX);
}

export function encryptStoredJson(contents: string): string {
  const key = getEncryptionKey();
  if (!key) return contents;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(contents, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptStoredJson(contents: string): string {
  if (!isEncryptedStoredJson(contents)) return contents;
  const key = getEncryptionKey();
  if (!key) {
    throw new Error('قاعدة البيانات مشفرة على هذا الجهاز. افتحها من تطبيق مرسم المثبّت على حساب Windows نفسه.');
  }

  const encoded = contents.slice(ENCRYPTED_PREFIX.length).split(':');
  if (encoded.length !== 3) throw new Error('ملف قاعدة البيانات المشفر تالف.');
  try {
    const [ivValue, tagValue, dataValue] = encoded;
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('تعذر فك تشفير قاعدة البيانات. المفتاح غير متاح أو الملف تالف.');
  }
}
