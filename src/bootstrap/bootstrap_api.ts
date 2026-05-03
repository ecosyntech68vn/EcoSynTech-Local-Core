import express, { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import * as ml from './modelLoader';

import router: Router = express.Router();

router.get('/status', auth, (req: Request, res: Response): void => {
  try {
    res.json({ ok: true, ...ml.getStatus() });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/health', auth, (req: Request, res: Response): void => {
  try {
    res.json({ ok: true, ...ml.getHealth() });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/history', auth, (req: Request, res: Response): void => {
  try {
    const n = Math.min(parseInt(req.query.limit as string) || 20, 100);
    res.json({ ok: true, history: ml.getHistory(n) });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/configure', auth, (req: Request, res: Response): void => {
  const { small, large, largeUrl } = req.body || {};
  try {
    ml.applyConfig({ small, large, largeUrl });
    res.json({ ok: true, status: ml.getStatus() });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/reload', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await ml.reload();
    res.json({ ok: true, result });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/models', auth, (req: Request, res: Response): void => {
  try {
    res.json({ ok: true, models: ml.getModels() });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/predict', auth, (req: Request, res: Response): void => {
  try {
    const { modelId, input } = req.body || {};
    const result = ml.predict(modelId, input);
    res.json({ ok: true, result });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;