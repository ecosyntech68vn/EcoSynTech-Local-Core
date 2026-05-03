/**
 * Key Rotation Service - Key management and rotation
 * Converted to TypeScript - Phase 1
 * ISO 27001 A.8.24 compliance
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

const DEFAULT_ROTATION_DAYS = 90;
const KEY_DIR = path.join(__dirname, '..', '..', 'keys');

export interface KeyInfo {
  id: string;
  key: string;
  createdAt: string;
  expiresAt: string;
  rotated: boolean;
  version: number;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class KeyRotationServiceClass {
  private rotationDays: number;
  private keys: Map<string, KeyInfo>;
  private lastRotation: Date | null;
  private autoRotate: boolean;

  constructor(options: { rotationDays?: number; autoRotate?: boolean } = {}) {
    this.rotationDays = options.rotationDays || DEFAULT_ROTATION_DAYS;
    this.keys = new Map();
    this.lastRotation = null;
    this.autoRotate = options.autoRotate !== false;
  }

  private ensureKeyDir(): void {
    if (!fs.existsSync(KEY_DIR)) {
      fs.mkdirSync(KEY_DIR, { recursive: true });
    }
  }

  generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  createKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  }

  saveKey(keyId: string, keyData: string): boolean {
    this.ensureKeyDir();
    const keyPath = path.join(KEY_DIR, `${keyId}.json`);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.rotationDays);
    
    const keyInfo: KeyInfo = {
      id: keyId,
      key: keyData,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      rotated: false,
      version: 1
    };

    try {
      fs.writeFileSync(keyPath, JSON.stringify(keyInfo, null, 2));
      this.keys.set(keyId, keyInfo);
      logger.info(`[KeyRotation] Key saved: ${keyId}`);
      return true;
    } catch (error: any) {
      logger.error(`[KeyRotation] Save failed: ${error.message}`);
      return false;
    }
  }

  loadKey(keyId: string): KeyInfo | null {
    const cached = this.keys.get(keyId);
    if (cached) return cached;

    const keyPath = path.join(KEY_DIR, `${keyId}.json`);
    if (!fs.existsSync(keyPath)) return null;

    try {
      const data = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      this.keys.set(keyId, data);
      return data;
    } catch (error: any) {
      logger.error(`[KeyRotation] Load failed: ${error.message}`);
      return null;
    }
  }

  rotateKey(keyId: string): boolean {
    const oldKey = this.loadKey(keyId);
    if (!oldKey) return false;

    const newKey = this.generateKey();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + this.rotationDays);

    const newKeyInfo: KeyInfo = {
      id: keyId,
      key: newKey,
      createdAt: new Date().toISOString(),
      expiresAt: newExpiresAt.toISOString(),
      rotated: true,
      version: oldKey.version + 1
    };

    try {
      const keyPath = path.join(KEY_DIR, `${keyId}.json`);
      fs.writeFileSync(keyPath, JSON.stringify(newKeyInfo, null, 2));
      this.keys.set(keyId, newKeyInfo);
      this.lastRotation = new Date();
      logger.info(`[KeyRotation] Key rotated: ${keyId} v${newKeyInfo.version}`);
      return true;
    } catch (error: any) {
      logger.error(`[KeyRotation] Rotate failed: ${error.message}`);
      return false;
    }
  }

  isKeyExpired(keyId: string): boolean {
    const key = this.loadKey(keyId);
    if (!key) return true;
    
    return new Date(key.expiresAt) < new Date();
  }

  getKeyAge(keyId: string): number {
    const key = this.loadKey(keyId);
    if (!key) return -1;
    
    const created = new Date(key.createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  shouldRotate(keyId: string): boolean {
    const key = this.loadKey(keyId);
    if (!key) return false;
    
    const daysUntilExpiry = Math.floor(
      (new Date(key.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    return daysUntilExpiry <= 7;
  }

  autoRotateKeys(): number {
    if (!this.autoRotate) return 0;
    
    let rotated = 0;
    const files = fs.readdirSync(KEY_DIR).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const keyId = file.replace('.json', '');
      if (this.shouldRotate(keyId)) {
        if (this.rotateKey(keyId)) rotated++;
      }
    }
    
    return rotated;
  }

  deleteKey(keyId: string): boolean {
    const keyPath = path.join(KEY_DIR, `${keyId}.json`);
    try {
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }
      this.keys.delete(keyId);
      logger.info(`[KeyRotation] Key deleted: ${keyId}`);
      return true;
    } catch (error: any) {
      logger.error(`[KeyRotation] Delete failed: ${error.message}`);
      return false;
    }
  }

  listKeys(): string[] {
    this.ensureKeyDir();
    return fs.readdirSync(KEY_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  getRotationStatus(): {
    lastRotation: string | null;
    autoRotate: boolean;
    rotationDays: number;
  } {
    return {
      lastRotation: this.lastRotation?.toISOString() || null,
      autoRotate: this.autoRotate,
      rotationDays: this.rotationDays
    };
  }
}

export const KeyRotationService = new KeyRotationServiceClass();

export default KeyRotationService;