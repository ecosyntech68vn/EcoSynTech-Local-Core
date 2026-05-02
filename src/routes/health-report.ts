import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import * as healthReportService from '../services/healthReportService';

const router = Router();

interface UpdateSettingsBody {
  url?: string;
  apiKey?: string;
  customerId?: string;
  clientId?: string;
  intervalMin?: number;
  queueThreshold?: number;
  useHttps?: boolean;
}

router.get('/settings', auth, async (req: Request, res: Response) => {
  try {
    const settings = await healthReportService.getSettings();
    res.json({ ok: true, data: settings });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.put('/settings', auth, async (req: Request, res: Response) => {
  try {
    const { url, apiKey, customerId, clientId, intervalMin, queueThreshold, useHttps } = req.body as UpdateSettingsBody;
    const settings = await healthReportService.updateSettings({
      url, apiKey, customerId, clientId, intervalMin, queueThreshold, useHttps
    });
    res.json({ ok: true, data: settings });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/test', auth, async (req: Request, res: Response) => {
  try {
    await healthReportService.report();
    res.json({ ok: true, message: 'Test report sent' });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/queue', auth, async (req: Request, res: Response) => {
  try {
    const queue = healthReportService.loadQueue();
    res.json({ ok: true, data: { queue, count: queue.length } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.delete('/queue', auth, async (req: Request, res: Response) => {
  try {
    healthReportService.saveQueue([]);
    res.json({ ok: true, message: 'Queue cleared' });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

export default router;