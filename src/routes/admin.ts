import express from 'express';
const router = express.Router();
import authMiddleware from '../middleware/auth';

const authenticate = (authMiddleware as any).auth || ((req: any, res: any, next: any) => next());

router.get('/ping', authenticate, (req: any, res: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ status: 'ok', admin: true, user: req.user });
});

export default router;