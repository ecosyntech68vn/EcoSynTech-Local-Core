/**
 * Encryption Middleware
 * AES-256-GCM encryption for sensitive data
 * Converted to TypeScript - Phase 1
 */

import crypto, { CipherGCMTypes } from 'crypto';

export interface EncryptedData {
  iv: string;
  data: string;
  tag: string;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
const ALGORITHM: CipherGCMTypes = 'aes-256-gcm';

export function getEncryptionKey(): Buffer | null {
  if (!ENCRYPTION_KEY) return null;
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encrypt(plaintext: string): string | EncryptedData {
  const key = getEncryptionKey();
  if (!key || !plaintext) return plaintext;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    data: encrypted,
    tag: authTag.toString('hex')
  };
}

export function decrypt(encryptedObj: string | EncryptedData | null): string | null {
  const key = getEncryptionKey();
  if (!key || !encryptedObj || typeof encryptedObj !== 'object') {
    if (typeof encryptedObj === 'string') return encryptedObj;
    return null;
  }

  try {
    const iv = Buffer.from((encryptedObj as EncryptedData).iv, 'hex');
    const authTag = Buffer.from((encryptedObj as EncryptedData).tag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update((encryptedObj as EncryptedData).data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err: any) {
    return null;
  }
}

export function encryptField(fieldValue: string | null | undefined): string {
  if (!fieldValue) return '';
  if (typeof fieldValue !== 'string') return String(fieldValue);
  
  const encrypted = encrypt(fieldValue);
  if (typeof encrypted === 'string') return encrypted;
  return JSON.stringify(encrypted);
}

export function decryptField(fieldValue: string | null | undefined): string {
  if (!fieldValue) return '';
  if (typeof fieldValue !== 'string') return String(fieldValue);

  try {
    const parsed = JSON.parse(fieldValue);
    if (parsed.iv && parsed.data && parsed.tag) {
      const decrypted = decrypt(parsed);
      return decrypted || fieldValue;
    }
    return fieldValue;
  } catch {
    return fieldValue;
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = JSON.parse(value);
    return !!(parsed.iv && parsed.data && parsed.tag);
  } catch {
    return false;
  }
}

export function encryptMiddleware(req: any, res: any, next: any): void {
  const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'privateKey', 'creditCard'];
  
  if (req.body) {
    for (const field of sensitiveFields) {
      if (req.body[field] && typeof req.body[field] === 'string' && !isEncrypted(req.body[field])) {
        req.body[field] = encryptField(req.body[field]);
      }
    }
  }
  next();
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function verifyHash(data: string, hash: string): boolean {
  const computedHash = hashData(data);
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

export function generateRandomKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateRandomIV(): string {
  return crypto.randomBytes(16).toString('hex');
}

export {
  ENCRYPTION_KEY,
  ALGORITHM
};

export default {
  encrypt,
  decrypt,
  encryptField,
  decryptField,
  isEncrypted,
  encryptMiddleware,
  hashData,
  verifyHash,
  generateRandomKey,
  generateRandomIV
};