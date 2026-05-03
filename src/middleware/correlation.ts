import crypto from 'crypto';
import { Response, NextFunction } from 'express';

export function generateCorrelationId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function correlationMiddleware(req: any, res: Response, next: NextFunction): void {
  const id = req.headers['x-correlation-id'] || generateCorrelationId();
  req.correlationId = id;
  res.setHeader('X-Correlation-ID', id);
  
  res.on('finish', () => {
    const logger = req.logger || console;
    if (logger && logger.info) {
      logger.info(`${req.method} ${req.path} completed`, {
        correlationId: id,
        status: res.statusCode,
        duration: Date.now() - (req.startTime || Date.now())
      });
    }
  });
  
  next();
}

export function withCorrelation(fn: (req: any, res: Response, next: NextFunction) => void) {
  return (req: any, res: Response, next: NextFunction): void => {
    const id = req.correlationId || generateCorrelationId();
    const originalSend = res.send;
    res.send = function(body: any) {
      res.setHeader('X-Correlation-ID', id);
      return originalSend.call(this, body);
    };
    fn(req, res, next);
  };
}

export default {
  generateCorrelationId,
  correlationMiddleware,
  withCorrelation
};