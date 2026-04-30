/**
 * Unit Tests - DDoS Protection / Rate Limiter
 * Test giới hạn request và progressive blocking
 */

jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const ddosProtection = require('../src/middleware/ddosProtection');
const logger = require('../src/config/logger');

describe('DDoS Protection Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset the modules to clear in-memory state
    jest.isolateModules(() => {
      // Re-require to get fresh state
    });

    req = {
      headers: {},
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('getClientIP', () => {
    it('should get IP from x-forwarded-for header', () => {
      req.headers['x-forwarded-for'] = '10.0.0.1, 192.168.1.1';
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('10.0.0.1');
    });

    it('should get IP from x-real-ip header', () => {
      req.headers['x-forwarded-for'] = undefined;
      req.headers['x-real-ip'] = '172.16.0.50';
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('172.16.0.50');
    });

    it('should fall back to req.ip', () => {
      req.headers['x-forwarded-for'] = undefined;
      req.headers['x-real-ip'] = undefined;
      req.ip = '10.10.10.10';
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('10.10.10.10');
    });

    it('should fall back to connection.remoteAddress', () => {
      req.headers['x-forwarded-for'] = undefined;
      req.headers['x-real-ip'] = undefined;
      req.ip = undefined;
      req.connection.remoteAddress = '192.168.1.1';
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('Rate Limiting Logic', () => {
    it('should allow request under normal limit', () => {
      // First request should always pass
      ddosProtection(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(429);
    });

    it('should block IP exceeding block threshold', () => {
      // Simulate multiple requests
      for (let i = 0; i < 600; i++) {
        ddosProtection(req, res, next);
      }
      
      // After exceeding block threshold, should return 429
      const lastCall = res.json.mock.calls[res.json.mock.calls.length - 1];
      expect(lastCall[0]).toHaveProperty('error');
      expect(lastCall[0]).toHaveProperty('retryAfter');
    });

    it('should return correct retry-after value', () => {
      // Block the IP first
      for (let i = 0; i < 600; i++) {
        ddosProtection(req, res, next);
      }
      
      // Next request should show retryAfter
      ddosProtection(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests. IP temporarily blocked.',
          retryAfter: expect.any(Number)
        })
      );
    });
  });

  describe('Window Reset', () => {
    it('should track requests within window', () => {
      // Multiple requests within window
      ddosProtection(req, res, next);
      ddosProtection(req, res, next);
      ddosProtection(req, res, next);
      
      // All should pass (under limit)
      expect(next).toHaveBeenCalledTimes(3);
    });
  });

  describe('IP Blocking Duration', () => {
    it('should block for BLOCK_DURATION_MS (5 minutes)', () => {
      // Get blocked
      for (let i = 0; i < 600; i++) {
        ddosProtection(req, res, next);
      }
      
      const response = res.json.mock.calls[res.json.mock.calls.length - 1][0];
      expect(response.retryAfter).toBeGreaterThan(200); // ~300 seconds = 5 min
    });
  });
});

describe('DDoS Protection - Constants', () => {
  it('should have correct window duration', () => {
    expect(ddosProtection.WINDOW_MS).toBe(60000); // 1 minute
  });

  it('should have correct thresholds', () => {
    expect(ddosProtection.MAX_REQUESTS_NORMAL).toBe(100);
    expect(ddosProtection.MAX_REQUESTS_WARNING).toBe(200);
    expect(ddosProtection.MAX_REQUESTS_BLOCK).toBe(500);
  });

  it('should have correct block duration', () => {
    expect(ddosProtection.BLOCK_DURATION_MS).toBe(300000); // 5 minutes
  });
});

describe('DDoS Protection - Edge Cases', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should handle empty headers', () => {
    req.headers = {};
    const ip = ddosProtection.getClientIP(req);
    expect(ip).toBeDefined();
  });

  it('should handle malformed x-forwarded-for', () => {
    req.headers['x-forwarded-for'] = '';
    const ip = ddosProtection.getClientIP(req);
    expect(ip).toBeDefined();
  });

  it('should handle missing connection object', () => {
    req.connection = undefined;
    const ip = ddosProtection.getClientIP(req);
    expect(ip).toBeDefined();
  });
});