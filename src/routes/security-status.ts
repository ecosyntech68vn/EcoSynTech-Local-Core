import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getSecurityStatus } from '../middleware/security-audit';

const router = Router();

router.get('/status', auth, (req: Request, res: Response) => {
  const status = getSecurityStatus();
  const issues: string[] = [];
  
  if (status.nodeEnv === 'production' && !status.jwtConfigured) {
    issues.push('JWT_SECRET is not configured - cannot run in production');
  }
  
  res.json({
    ok: true,
    environment: status.nodeEnv,
    secretsConfigured: {
      JWT: status.jwtConfigured,
      HMAC: status.hmacConfigured
    },
    issues: issues.length > 0 ? issues : null,
    auditTime: status.auditTime
  });
});

export default router;