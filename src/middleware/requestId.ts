import { Response, NextFunction } from 'express';
import crypto from 'crypto';

export function requestId(req: any, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex');
  
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

export default { requestId };