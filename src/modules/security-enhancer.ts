interface AuditEntry {
  timestamp: string;
  action: string;
  user: string;
  details: Record<string, unknown>;
  ip: string;
}

interface SecurityConfig {
  version: string;
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
  securityHeaders: Record<string, string>;
  twoFactor: {
    enabled: boolean;
    issuer: string;
    algorithm: string;
    digits: number;
    window: number;
  };
  auditLog: AuditEntry[];
  log(action: string, user: string | null, details: Record<string, unknown>): void;
  getAuditLog(limit?: number): AuditEntry[];
  clearAuditLog(): void;
}

const securityModule: SecurityConfig = {
  version: '2.3.2',
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.'
  },
  
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
  },
  
  twoFactor: {
    enabled: true,
    issuer: 'EcoSynTech',
    algorithm: 'sha1',
    digits: 6,
    window: 1
  },
  
  auditLog: [],
  
  log(action: string, user: string | null, details: Record<string, unknown>): void {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      user: user || 'anonymous',
      details: details || {},
      ip: (details?.ip as string) || 'unknown'
    };
    this.auditLog.push(entry);
  },

  getAuditLog(limit = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  },

  clearAuditLog(): void {
    this.auditLog = [];
  }
};

export = securityModule;