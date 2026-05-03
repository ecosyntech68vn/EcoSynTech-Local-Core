const { PricingService } = require('../services/pricingService');

export const PLANS = ['BASE', 'PRO', 'ENTERPRISE'];

export function planMiddleware(requiredFeature: string) {
  return (req: any, res: any, next: any): void => {
    const userPlan = req.user?.plan || 'BASE';
    const pricing = new PricingService(userPlan);
    
    if (!pricing.canAccess(requiredFeature)) {
      return res.status(403).json({
        ok: false,
        error: 'FEATURE_NOT_INCLUDED',
        message: `Tính năng "${requiredFeature}" không có trong gói ${userPlan}`,
        upgradeRequired: true,
        availablePlans: pricing.getAvailablePlans()
      });
    }
    
    if (req.deviceCount !== undefined) {
      const check = pricing.checkLimit('devices', req.deviceCount);
      if (!check.allowed) {
        return res.status(403).json({
          ok: false,
          error: 'DEVICE_LIMIT_EXCEEDED',
          current: check.current,
          max: check.max,
          upgradeRequired: true
        });
      }
    }
    
    req.pricing = pricing;
    next();
  };
}

export default { planMiddleware };