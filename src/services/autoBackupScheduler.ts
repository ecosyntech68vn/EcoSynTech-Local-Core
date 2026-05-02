import backupService, { BackupResult as BackupResultType } from './backupRestoreService';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

const BACKUP_ENABLED = process.env.AUTO_BACKUP_ENABLED === 'true';
const BACKUP_CRON = process.env.AUTO_BACKUP_CRON || '0 2 * * *';
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
const BACKUP_MAX_COUNT = parseInt(process.env.BACKUP_MAX_COUNT || '7', 10);
const MIN_DISK_SPACE_MB = 100;

let intervalHandle: NodeJS.Timeout | null = null;

function checkDiskSpace(dir: string): boolean {
  try {
    const stat = fs.statfsSync(dir);
    const freeMB = (stat.bsize * stat.blocks) / 1024 / 1024;
    return freeMB >= MIN_DISK_SPACE_MB;
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown';
    logger.warn('[AutoBackup] Cannot check disk space:', errMsg);
    return true;
  }
}

interface CronParsed {
  minute: number;
  hour: number;
}

function parseCron(cron: string): CronParsed | null {
  const parts = cron.split(' ');
  if (parts.length !== 5) return null;
  const minute = parts[1] ?? '0';
  const hour = parts[2] ?? '0';
  return { minute: parseInt(minute), hour: parseInt(hour) };
}

function shouldRunNow(cron: string): boolean {
  const parsed = parseCron(cron);
  if (!parsed) return false;
  
  const now = new Date();
  return now.getMinutes() === parsed.minute && now.getHours() === parsed.hour;
}

interface BackupResult {
  success: boolean;
  error?: string;
  backupId?: string;
}

async function runScheduledBackup(): Promise<BackupResultType> {
  logger.info('[AutoBackup] Running scheduled backup...');
  
  const backDir = process.env.BACKUP_DIR || './backups';
  if (!checkDiskSpace(backDir)) {
    logger.error('[AutoBackup] Low disk space, skipping backup');
    return { success: false, error: 'Low disk space' };
  }
  
  try {
    const result = await backupService.createBackup({ compression: true }) as BackupResultType;
    
    logger.info('[AutoBackup] Scheduled backup completed:', result.backupPath);
    return { success: true, backupPath: result.backupPath };
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown';
    logger.error('[AutoBackup] Backup failed:', errMsg);
    return { success: false, error: errMsg };
  }
}

async function cleanupOldBackups(): Promise<number> {
  const backDir = process.env.BACKUP_DIR || './backups';
  
  try {
    if (!fs.existsSync(backDir)) return 0;
    
    const files = fs.readdirSync(backDir)
      .map(f => ({ name: f, path: path.join(backDir, f), time: fs.statSync(path.join(backDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);
    
    let deleted = 0;
    const cutoffTime = Date.now() - (BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    for (let i = BACKUP_MAX_COUNT; i < files.length; i++) {
      const file = files[i];
      if (file && file.path) {
        fs.unlinkSync(file.path);
        deleted++;
      }
    }
    
    for (const file of files) {
      if (file.time < cutoffTime) {
        fs.unlinkSync(file.path);
        deleted++;
      }
    }
    
    logger.info(`[AutoBackup] Cleaned up ${deleted} old backups`);
    return deleted;
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Unknown';
    logger.error('[AutoBackup] Cleanup failed:', errMsg);
    return 0;
  }
}

function startScheduler() {
  if (!BACKUP_ENABLED) {
    logger.info('[AutoBackup] Auto backup disabled');
    return;
  }
  
  logger.info('[AutoBackup] Starting auto backup scheduler');
  
  intervalHandle = setInterval(() => {
    if (shouldRunNow(BACKUP_CRON)) {
      runScheduledBackup().then(() => cleanupOldBackups());
    }
  }, 60000);
  
  logger.info(`[AutoBackup] Scheduler running with cron: ${BACKUP_CRON}`);
}

function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[AutoBackup] Scheduler stopped');
  }
}

function getStatus() {
  return {
    enabled: BACKUP_ENABLED,
    cron: BACKUP_CRON,
    retentionDays: BACKUP_RETENTION_DAYS,
    maxCount: BACKUP_MAX_COUNT,
    running: intervalHandle !== null
  };
}

export {
  startScheduler,
  stopScheduler,
  runScheduledBackup,
  cleanupOldBackups,
  getStatus
};