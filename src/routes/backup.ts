import { Router, Request, Response } from 'express';
import { auth as authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  verifyBackup,
  BACKUP_DIR
} from '../services/backupRestoreService';

const router = Router();

interface CreateBackupBody {
  includeMedia?: boolean;
  compression?: boolean;
}

interface RestoreBackupBody {
  backupPath: string;
}

interface VerifyBackupBody {
  backupPath: string;
}

router.post('/create', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if ((req as any).user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const { includeMedia, compression } = req.body as CreateBackupBody;
  const result = await createBackup({ includeMedia, compression });

  res.json(result);
}));

router.post('/restore', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if ((req as any).user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const { backupPath } = req.body as RestoreBackupBody;
  if (!backupPath) {
    res.status(400).json({ error: 'backupPath required' });
    return;
  }

  const result = await restoreBackup(backupPath);
  res.json(result);
}));

router.get('/list', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if ((req as any).user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const files = await listBackups();
  res.json({ success: true, backups: files, backupDir: BACKUP_DIR });
}));

router.post('/cleanup', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if ((req as any).user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const result = await cleanupOldBackups();
  res.json({ success: true, ...result });
}));

router.post('/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
  if ((req as any).user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const { backupPath } = req.body as VerifyBackupBody;
  if (!backupPath) {
    res.status(400).json({ error: 'backupPath required' });
    return;
  }

  const result = await verifyBackup(backupPath);
  res.json(result);
}));

export default router;