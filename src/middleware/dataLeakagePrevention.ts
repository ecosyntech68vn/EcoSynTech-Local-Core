import logger from '../config/logger';

interface SensitivePattern {
  pattern: RegExp;
  field: string;
  action: 'mask' | 'block' | 'partial';
}

export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  { pattern: /password/i, field: 'password', action: 'mask' },
  { pattern: /secret/i, field: 'secret', action: 'mask' },
  { pattern: /token/i, field: 'token', action: 'mask' },
  { pattern: /api[_-]?key/i, field: 'apiKey', action: 'mask' },
  { pattern: /jwt/i, field: 'jwt', action: 'mask' },
  { pattern: /private[_-]?key/i, field: 'privateKey', action: 'block' },
  { pattern: /credit[_-]?card/i, field: 'creditCard', action: 'block' },
  { pattern: /ssn/i, field: 'ssn', action: 'block' },
  { pattern: /passport/i, field: 'passport', action: 'block' },
  { pattern: /phone/i, field: 'phone', action: 'partial' },
  { pattern: /email/i, field: 'email', action: 'partial' }
];

const BLOCKED_VALUES = [
  'password',
  '123456',
  'admin',
  'root',
  'test'
];

interface CheckResult {
  allowed?: boolean;
  blocked?: boolean;
  masked?: boolean;
  reason?: string;
  field?: string;
}

export class DataLeakagePrevention {
  mode: string;
  blockedFields: Set<string>;
  maskChar: string;

  constructor(options: any = {}) {
    this.mode = options.mode || 'log';
    this.blockedFields = new Set(options.blockedFields || ['password', 'privateKey', 'creditCard', 'ssn', 'passport']);
    this.maskChar = options.maskChar || '*';
  }

  maskValue(value: any, fieldName: string): any {
    if (typeof value !== 'string') return value;
    
    if (fieldName.includes('email') && value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${this.maskChar.repeat(3)}@${domain}`;
    }
    
    if (value.length <= 4) {
      return this.maskChar.repeat(value.length);
    }
    
    return value.substring(0, 2) + this.maskChar.repeat(Math.min(value.length - 2, 6));
  }

  checkValue(key: string, value: any): CheckResult {
    if (typeof value === 'object' && value !== null) {
      return this.checkObject(value);
    }
    
    if (typeof value === 'string') {
      if (BLOCKED_VALUES.includes(value.toLowerCase())) {
        return { blocked: true, reason: 'blocked_value' };
      }
      
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.pattern.test(key)) {
          if (pattern.action === 'block') {
            return { blocked: true, reason: 'sensitive_field', field: pattern.field };
          }
          return { masked: true, field: pattern.field };
        }
      }
    }
    
    return { allowed: true };
  }

  checkObject(obj: any): any {
    const result: any = {
      clean: true,
      masked: [],
      blocked: [],
      issues: []
    };

    for (const [key, value] of Object.entries(obj)) {
      const check = this.checkValue(key, value);
      
      if (check.blocked) {
        result.clean = false;
        result.blocked.push(key);
        result.issues.push({ field: key, reason: check.reason });
      } else if (check.masked) {
        result.masked.push(key);
      }
    }

    return result;
  }

  sanitizeRequest(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    const result = this.checkObject(body);
    
    if (result.blocked.length > 0) {
      logger.warn(`[DLP] Request blocked fields: ${result.blocked.join(', ')}`);
      return null;
    }

    return body;
  }

  sanitizeResponse(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const result = this.checkObject(data);
    const sanitized = { ...data };
    
    for (const key of result.masked) {
      if (sanitized[key]) {
        sanitized[key] = this.maskValue(sanitized[key], key);
      }
    }

    return sanitized;
  }

  middleware(req: any, res: any, next: any): void {
    req.on('body', () => {
      if (req.body) {
        const sanitized = this.sanitizeRequest(req.body);
        if (sanitized === null) {
          return res.status(400).json({ 
            error: 'Invalid request: sensitive data not allowed' 
          });
        }
        req.body = sanitized;
      }
    });

    next();
  }
}

export function dataLeakagePrevention(options: any = {}) {
  const dlp = new DataLeakagePrevention(options);
  
  return (req: any, res: any, next: any) => {
    dlp.middleware(req, res, next);
  };
}

export default {
  DataLeakagePrevention,
  dataLeakagePrevention,
  SENSITIVE_PATTERNS
};