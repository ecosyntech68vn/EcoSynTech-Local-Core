import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { PLANS, PricingService } from '../services/pricingService';

import router = Router();

router.get('/plans', async (req: Request, res: Response) => {
  try {
    const pricing = new PricingService('BASE');
    res.json({
      ok: true,
      data: pricing.getAvailablePlans()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/current', auth, async (req: Request, res: Response) => {
  try {
    const userPlan = (req as any).user?.plan || 'BASE';
    const pricing = new PricingService(userPlan);
    res.json({
      ok: true,
      data: pricing.getStatus()
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/upgrade', auth, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      res.status(400).json({ ok: false, error: 'Invalid plan' });
      return;
    }
    
    res.json({
      ok: true,
      message: `Đã nâng cấp lên gói ${PLANS[plan].name}`,
      newPlan: PLANS[plan].name
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/check-feature', auth, async (req: Request, res: Response) => {
  try {
    const { feature } = req.query;
    const userPlan = (req as any).user?.plan || 'BASE';
    const pricing = new PricingService(userPlan);
    
    res.json({
      ok: true,
      feature,
      allowed: pricing.canAccess(feature as string)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

export default router;