/**
 * Backup & Restore Service
 * Converted to TypeScript - Phase 1
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import logger from '../config/logger';
import db from '../config/database';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

export interface BackupOptions {
  includeMedia?: boolean;
  compression?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  originalPath?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredPath?: string;
  error?: string;
}

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  created: string;
  compressed: boolean;
}

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function getBackupFilename(prefix: string = 'ecosyntech'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.db`;
}

export async function createBackup(options: BackupOptions = {}): Promise<BackupResult> {
  const { compression = true } = options;
  ensureBackupDir();

  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';
  const filename = getBackupFilename();
  const backupPath = path.join(BACKUP_DIR, filename);

  try {
    fs.copyFileSync(dbPath, backupPath);
    logger.info(`[Backup] Database copied to ${backupPath}`);

    if (compression) {
      const compressedPath = backupPath + '.gz';
      execSync(`gzip -c "${backupPath}" > "${compressedPath}"`, { stdio: 'ignore' });
      fs.unlinkSync(backupPath);
      logger.info(`[Backup] Compressed to ${compressedPath}`);
      return { success: true, backupPath: compressedPath, originalPath: backupPath };
    }

    return { success: true, backupPath, originalPath: backupPath };
  } catch (error: any) {
    logger.error(`[Backup] Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function restoreBackup(backupPath: string): Promise<RestoreResult> {
  if (!fs.existsSync(backupPath)) {
    return { success: false, error: 'Backup file not found' };
  }

  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';
  const tempPath = dbPath + '.restore';

  try {
    let sourcePath = backupPath;
    
    if (backupPath.endsWith('.gz')) {
      const decompressedPath = backupPath.replace('.gz', '');
      execSync(`gunzip -c "${backupPath}" > "${decompressedPath}"`, { stdio: 'ignore' });
      sourcePath = decompressedPath;
    }

    if (fs.existsSync(dbPath)) {
      const backupOriginal = dbPath + '.backup';
      fs.copyFileSync(dbPath, backupOriginal);
    }

    fs.copyFileSync(sourcePath, tempPath);
    fs.renameSync(tempPath, dbPath);

    logger.info(`[Restore] Database restored from ${backupPath}`);
    return { success: true, restoredPath: dbPath };
  } catch (error: any) {
    logger.error(`[Restore] Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export function listBackups(): BackupInfo[] {
  ensureBackupDir();
  
  const files = fs.readdirSync(BACKUP_DIR);
  const backups: BackupInfo[] = [];

  for (const file of files) {
    if (file.startsWith('ecosyntech_') && (file.endsWith('.db') || file.endsWith('.db.gz'))) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      
      backups.push({
        filename: file,
        path: filePath,
        size: stats.size,
        created: stats.mtime.toISOString(),
        compressed: file.endsWith('.gz')
      });
    }
  }

  return backups.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
}

export function deleteBackup(backupPath: string): boolean {
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      logger.info(`[Backup] Deleted ${backupPath}`);
      return true;
    }
    return false;
  } catch (error: any) {
    logger.error(`[Backup] Delete failed: ${error.message}`);
    return false;
  }
}

export function cleanOldBackups(): number {
  const backups = listBackups();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  let deleted = 0;
  
  for (const backup of backups) {
    const created = new Date(backup.created);
    if (created < cutoffDate) {
      if (deleteBackup(backup.path)) {
        deleted++;
      }
    }
  }

  logger.info(`[Backup] Cleaned ${deleted} old backups`);
  return deleted;
}

export function getBackupStats(): {
  total: number;
  totalSize: number;
  oldest: string | null;
  newest: string | null;
} {
  const backups = listBackups();
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  
  const oldestBackup = backups[backups.length - 1];
  const newestBackup = backups[0];
  
  return {
    total: backups.length,
    totalSize,
    oldest: oldestBackup?.created || null,
    newest: newestBackup?.created || null
  };
}

export default {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  cleanOldBackups,
  getBackupStats
};