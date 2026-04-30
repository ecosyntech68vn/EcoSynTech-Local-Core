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

describe('DDoS Protection Middleware', () => {
  describe('getClientIP', () => {
    it('should get IP from x-forwarded-for header', () => {
      const req = { headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' } };
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('10.0.0.1');
    });

    it('should get IP from x-real-ip header', () => {
      const req = { 
        headers: { 'x-forwarded-for': undefined, 'x-real-ip': '172.16.0.50' },
        ip: undefined
      };
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('172.16.0.50');
    });

    it('should fall back to req.ip', () => {
      const req = { 
        headers: { 'x-forwarded-for': undefined, 'x-real-ip': undefined },
        ip: '10.10.10.10'
      };
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('10.10.10.10');
    });

    it('should fall back to connection.remoteAddress', () => {
      const req = {
        headers: {},
        ip: undefined,
        connection: { remoteAddress: '192.168.1.1' }
      };
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('Constants', () => {
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

  describe('Edge Cases', () => {
    it('should handle empty headers', () => {
      const req = { headers: {} };
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBeUndefined();
    });

    it('should handle malformed x-forwarded-for', () => {
      const req = { headers: { 'x-forwarded-for': '' } };
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBeUndefined();
    });

    it('should handle missing connection object', () => {
      const req = { headers: {}, ip: undefined, connection: undefined };
      const ip = ddosProtection.getClientIP(req);
      expect(ip).toBeUndefined();
    });
  });

  describe('Middleware Export', () => {
    it('should export ddosProtection function', () => {
      expect(typeof ddosProtection.ddosProtection).toBe('function');
    });

    it('should export clearBlocklist function', () => {
      expect(typeof ddosProtection.clearBlocklist).toBe('function');
    });
  });
});