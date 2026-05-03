import { Request, Response, NextFunction } from 'express';

export const API_VERSIONS = ['v1', 'v2'] as const;
export const DEFAULT_VERSION = 'v1';

export type ApiVersion = typeof API_VERSIONS[number];

export function versionMiddleware(req: any, res: any, next: NextFunction): void {
  const acceptHeader = req.headers.accept || '';
  const versionFromHeader = acceptHeader.includes('version=') 
    ? acceptHeader.match(/version=(\w+)/)?.[1] 
    : null;
  
  const version = (req.query.api_version as string) || versionFromHeader || DEFAULT_VERSION;
  
  if (!API_VERSIONS.includes(version as ApiVersion)) {
    return res.status(400).json({
      error: 'Invalid API version',
      supported: API_VERSIONS,
      current: DEFAULT_VERSION
    });
  }
  
  req.apiVersion = version;
  res.setHeader('X-API-Version', version);
  next();
}

export function versionGuard(versions: readonly string[] = API_VERSIONS) {
  return (req: any, res: any, next: NextFunction): void => {
    if (!versions.includes(req.apiVersion)) {
      return res.status(410).json({
        error: 'API version no longer supported',
        supported: versions,
        yourVersion: req.apiVersion
      });
    }
    next();
  };
}

export function createVersionedRouter(version: string): any {
  const router = require('express').Router();
  router.apiVersion = version;
  return router;
}

export function deprecationMiddleware(req: any, res: Response, next: NextFunction): void {
  const version = req.apiVersion;
  const deprecationDate = new Date('2026-12-31');
  
  if (version === 'v1') {
    res.setHeader('Deprecation', deprecationDate.toISOString());
    res.setHeader('Link', '</api/v2>; rel="successor-version"');
  }
  next();
}

export default {
  versionMiddleware,
  versionGuard,
  createVersionedRouter,
  deprecationMiddleware,
  API_VERSIONS,
  DEFAULT_VERSION
};