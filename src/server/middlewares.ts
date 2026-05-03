/**
 * Middleware Registry
 * 
 * Centralized middleware configuration
 * Standards: ISO 27001, Security Best Practices
 */

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import express, { Application } from 'express';

import config from '../config';
import logger from '../config/logger';

const requestId = require('../middleware/requestId').requestId;
const responseSignatureMiddleware = require('../middleware/response-sign').responseSignatureMiddleware;
const getAuditHashMiddleware = require('../middleware/audit-tamper-proof').getAuditHashMiddleware;
const requestDeduplication = require('../middleware/requestDeduplication').requestDeduplication;
const responseOptimizer = require('../middleware/responseOptimizer').responseOptimizer;
const rateLimitPerDevice = require('../middleware/deviceRateLimit').rateLimitPerDevice;
const ddosProtection = require('../middleware/ddosProtection').ddosProtection;
const replayProtection = require('../middleware/replayProtection').replayProtection;

function registerMiddlewares(app: Application): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.use(cors({
    origin: config.cors.origin,
    credentials: true
  }));

  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    hsts: isProduction
  }));

  app.use(compression());

  const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api', apiLimiter);

  app.use(requestId);
  app.use(responseSignatureMiddleware);
  app.use(getAuditHashMiddleware);
  app.use(requestDeduplication);
  app.use(responseOptimizer);
  app.use(rateLimitPerDevice);
  app.use(ddosProtection);
  app.use(replayProtection);

  console.log('[MIDDLEWARE] All middlewares registered');
}

export = { registerMiddlewares };