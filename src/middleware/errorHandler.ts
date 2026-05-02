import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const ERROR_CATEGORIES = {
  VALIDATION: 'ValidationError',
  AUTH: 'UnauthorizedError',
  NOT_FOUND: 'NotFoundError',
  CONFLICT: 'ConflictError',
  RATE_LIMIT: 'RateLimitError',
  EXTERNAL: 'ExternalServiceError',
  INTERNAL: 'InternalError',
  TIMEOUT: 'TimeoutError'
} as const;

export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(err: CustomError, req: any, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || uuidv4();
  
  const errorInfo = {
    requestId,
    error: err.message,
    category: categorizeError(err),
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  };

  const logger = require('../config/logger');
  logger.error('Error occurred:', {
    ...errorInfo,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.statusCode || (err as any).status || 500;
  const message = getErrorMessage(err, statusCode);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || errorInfo.category,
      message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: err.details 
      })
    }
  });
}

export function categorizeError(err: CustomError): string {
  if (err.name === 'ValidationError') return ERROR_CATEGORIES.VALIDATION;
  if (err.name === 'UnauthorizedError' || err.message?.includes('token')) {
    return ERROR_CATEGORIES.AUTH;
  }
  if (err.statusCode === 404 || err.name === 'NotFoundError') {
    return ERROR_CATEGORIES.NOT_FOUND;
  }
  if (err.code === 'SQLITE_CONSTRAINT') return ERROR_CATEGORIES.CONFLICT;
  if (err.statusCode === 429 || err.message?.includes('rate limit')) {
    return ERROR_CATEGORIES.RATE_LIMIT;
  }
  if (err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
    return ERROR_CATEGORIES.TIMEOUT;
  }
  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch')) {
    return ERROR_CATEGORIES.EXTERNAL;
  }
  return ERROR_CATEGORIES.INTERNAL;
}

export function getErrorMessage(err: CustomError, statusCode: number): string {
  if (statusCode === 500) {
    return process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error';
  }
  return err.message;
}

export function notFoundHandler(req: any, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId || uuidv4()
    }
  });
}

export function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction): void => {
    req.requestId = req.requestId || uuidv4();
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createError(category: string, message: string, statusCode: number = 500): CustomError {
  const error = new Error(message) as CustomError;
  error.name = category;
  error.statusCode = statusCode;
  (error as any).timestamp = new Date().toISOString();
  return error;
}

export function isRetryable(error: CustomError): boolean {
  const retryableCategories = [
    ERROR_CATEGORIES.EXTERNAL,
    ERROR_CATEGORIES.TIMEOUT
  ];
  return retryableCategories.includes(categorizeError(error) as any);
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  isRetryable,
  ERROR_CATEGORIES
};