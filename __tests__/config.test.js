/**
 * Unit tests for Config Module
 */

describe('Config Module', () => {
  
  let config;
  
  beforeAll(() => {
    jest.resetModules();
    let rawConfig = require('../src/config');
    config = rawConfig.default || rawConfig;
  });
  
  describe('Config structure', () => {
    it('should have database configuration', () => {
      expect(config).toHaveProperty('database');
      expect(config.database).toHaveProperty('path');
    });
    
    it('should have server configuration', () => {
      expect(config).toHaveProperty('port');
      expect(typeof config.port).toBe('number');
    });
    
    it('should have JWT configuration', () => {
      expect(config).toHaveProperty('jwt');
      expect(config.jwt).toHaveProperty('secret');
      expect(config.jwt).toHaveProperty('expiresIn');
    });
    
    it('should have rate limiting configuration', () => {
      expect(config).toHaveProperty('rateLimit');
    });
  });
  
  describe('Database path', () => {
    it('should have default DB path', () => {
      expect(config.database.path).toBeDefined();
      expect(typeof config.database.path).toBe('string');
    });
  });
  
  describe('Security config', () => {
    it('should have rate limit configuration', () => {
      expect(config.rateLimit).toHaveProperty('maxRequests');
      expect(config.rateLimit).toHaveProperty('windowMs');
    });
    
    it('should have webhook secret', () => {
      expect(config).toHaveProperty('webhook');
      expect(config.webhook).toHaveProperty('secret');
    });
  });
});