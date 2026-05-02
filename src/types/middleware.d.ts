/**
 * Middleware Layer Type Definitions
 * Phase 1: TypeScript Migration
 */

import { Request, Response, NextFunction } from 'express';

export type MiddlewareFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export interface IAuthMiddleware {
  authenticate: MiddlewareFunction;
  authorize: (...roles: string[]) => MiddlewareFunction;
  optionalAuth: MiddlewareFunction;
}

export interface IDeviceAuthConfig {
  apiKeyHeader: string;
  validateDeviceId: boolean;
}

export interface IDeviceAuthMiddleware {
  authenticateDevice: MiddlewareFunction;
  validateDeviceStatus: MiddlewareFunction;
  rateLimitByDevice: MiddlewareFunction;
}

export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  handler?: MiddlewareFunction;
}

export interface IRateLimitMiddleware {
  general: MiddlewareFunction;
  strict: MiddlewareFunction;
  device: MiddlewareFunction;
  custom: (config: IRateLimitConfig) => MiddlewareFunction;
}

export interface ISecurityAuditConfig {
  logLevel: 'info' | 'warn' | 'error';
  includeBody: boolean;
  excludePaths: string[];
}

export interface ISecurityAuditMiddleware {
  logRequest: MiddlewareFunction;
  logResponse: MiddlewareFunction;
  detectThreats: MiddlewareFunction;
}

export interface IEncryptionConfig {
  algorithm: string;
  keyLength: number;
}

export interface IEncryptionMiddleware {
  encrypt: MiddlewareFunction;
  decrypt: MiddlewareFunction;
  hashData: (data: string) => string;
  verifyHash: (data: string, hash: string) => boolean;
}

export interface IDDoSProtectionConfig {
  blockedIPs: Set<string>;
  suspiciousPatterns: RegExp[];
  maxRequestsPerMinute: number;
}

export interface IDDoSProtectionMiddleware {
  checkIP: MiddlewareFunction;
  detectPattern: MiddlewareFunction;
  blockIP: MiddlewareFunction;
}

export interface IValidationSchema {
  body?: any;
  query?: any;
  params?: any;
}

export interface IValidationMiddleware {
  validate: (schema: IValidationSchema) => MiddlewareFunction;
  sanitize: MiddlewareFunction;
}

export interface ITelemetryRBACConfig {
  deviceRoles: string[];
  adminRoles: string[];
}

export interface ITelemetryRBACMiddleware {
  checkDeviceAccess: MiddlewareFunction;
  checkAdminAccess: MiddlewareFunction;
}

export interface IDataLeakagePreventionConfig {
  blockedKeywords: string[];
  maxResponseSize: number;
}

export interface IDataLeakagePreventionMiddleware {
  scanRequest: MiddlewareFunction;
  scanResponse: MiddlewareFunction;
}

export interface ICORSConfig {
  origin: string | string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface ICORSMiddleware {
  handle: MiddlewareFunction;
}

export interface IHelmetConfig {
  contentSecurityPolicy: boolean;
  crossDomain: boolean;
  hsts: boolean;
  noSniff: boolean;
  frameguard: boolean;
  xssFilter: boolean;
}

export interface IHelmetMiddleware {
  configure: (config?: IHelmetConfig) => MiddlewareFunction;
}

export interface ICompressionMiddleware {
  handle: MiddlewareFunction;
}

export interface IErrorHandlerConfig {
  logErrors: boolean;
  showStack: boolean;
}

export interface IErrorHandlerMiddleware {
  handle: (config?: IErrorHandlerConfig) => MiddlewareFunction;
  notFound: MiddlewareFunction;
}

export interface IMiddlewareChain {
  use(middleware: MiddlewareFunction): void;
  execute(req: Request, res: Response): Promise<void>;
}

export type MiddlewareType =
  | 'auth'
  | 'deviceAuth'
  | 'rateLimit'
  | 'security'
  | 'encryption'
  | 'ddos'
  | 'validation'
  | 'cors'
  | 'helmet'
  | 'compression'
  | 'errorHandler';

export interface IMiddlewareMap {
  [key: string]: MiddlewareFunction;
}