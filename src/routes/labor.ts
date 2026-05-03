import express, { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validateMiddleware } from '../middleware/validation';
import * as laborService from '../services/laborService';

const router: Router = express.Router();

export const WORKER_POSITIONS = [
  'Quản lý', 'Kỹ thuật viên', 'Công nhân nông nghiệp', 'Thợ máy', 'Bảo vệ', 'Tổng vệ sinh', 'Khác'
];

export const SKILL_LEVELS = ['junior', 'middle', 'senior', 'expert'];

export const TASK_TYPES = [
  'arable', 'irrigation', 'fertilizing', 'harvesting', 'maintenance', 'monitoring', 'other'
];

router.get('/positions', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ ok: true, data: WORKER_POSITIONS });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/skill-levels', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ ok: true, data: SKILL_LEVELS });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/task-types', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ ok: true, data: TASK_TYPES });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/workers', auth, validateMiddleware('labor.workerCreate'), async (req: Request, res: Response): Promise<void> => {
  try {
    const worker = laborService.createWorker(req.body);
    res.status(201).json({ ok: true, data: worker });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    let status = 500;
    const low = message.toLowerCase();
    if (low.includes('missing') || low.includes('invalid') || low.includes('required') || low.includes('cannot')) {
      status = 400;
    }
    res.status(status).json({ ok: false, error: message });
  }
});

router.get('/workers', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id, position, status } = req.query;
    const workers = laborService.getWorkers(farm_id as string, position as string, status as string);
    res.json({ ok: true, data: workers });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/workers/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const worker = laborService.getWorkerById(req.params.id);
    if (!worker) {
      res.status(404).json({ ok: false, error: 'Worker not found' });
      return;
    }
    res.json({ ok: true, data: worker });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.put('/workers/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const worker = laborService.updateWorker(req.params.id, req.body);
    res.json({ ok: true, data: worker });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.delete('/workers/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    laborService.deleteWorker(req.params.id);
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/attendance', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, worker_id, farm_id } = req.query;
    const records = laborService.getAttendance(date as string, worker_id as string, farm_id as string);
    res.json({ ok: true, data: records });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/attendance', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const record = laborService.recordAttendance(req.body);
    res.status(201).json({ ok: true, data: record });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;