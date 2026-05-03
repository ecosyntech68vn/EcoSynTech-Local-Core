import { Response, NextFunction } from 'express';
import prom_client from 'prom-client';

const register = new prom_client.Registry();

const httpRequestDurationHistogram = new prom_client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestTotalCounter = new prom_client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const monitoringMiddleware = (req: any, res: any, next: NextFunction): void => {
  const end = httpRequestDurationHistogram.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    end({ method: req.method, route, status_code: res.statusCode });
    httpRequestTotalCounter.inc({ method: req.method, route, status_code: res.statusCode });
  });
  next();
};

export const metricsEndpoint = (req: any, res: Response): void => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

export { register };

export default {
  monitoringMiddleware,
  metricsEndpoint,
  register
};