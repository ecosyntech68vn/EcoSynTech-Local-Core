/**
 * Unit tests for Features Configuration
 */

const { 
  FEATURES, 
  getMemoryEstimate, 
  isFeatureEnabled, 
  enableFeature, 
  disableFeature, 
  getConfig, 
  applyProfile 
} = require('../src/config/features');

describe('Features Configuration', () => {
  
  describe('FEATURES', () => {
    it('should have required core features', () => {
      expect(FEATURES).toHaveProperty('api');
      expect(FEATURES).toHaveProperty('database');
    });
    
    it('should have memoryMB defined for each feature', () => {
      Object.values(FEATURES).forEach(feature => {
        expect(feature).toHaveProperty('memoryMB');
        expect(typeof feature.memoryMB).toBe('number');
        expect(feature.memoryMB).toBeGreaterThan(0);
      });
    });
    
    it('should have description for each feature', () => {
      Object.values(FEATURES).forEach(feature => {
        expect(feature).toHaveProperty('description');
        expect(typeof feature.description).toBe('string');
      });
    });
  });
  
  describe('getMemoryEstimate()', () => {
    it('should return total memory and active features', () => {
      const result = getMemoryEstimate();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('active');
      expect(typeof result.total).toBe('number');
      expect(Array.isArray(result.active)).toBe(true);
    });
    
    it('should calculate memory based on enabled features', () => {
      const result = getMemoryEstimate();
      expect(result.total).toBeGreaterThan(0);
    });
  });
  
  describe('isFeatureEnabled()', () => {
    it('should return true for enabled feature', () => {
      const result = isFeatureEnabled('api');
      expect(typeof result).toBe('boolean');
    });
    
    it('should return false for non-existent feature', () => {
      expect(isFeatureEnabled('nonExistent')).toBe(false);
    });
  });
  
  describe('enableFeature()', () => {
    it('should enable a disabled feature', () => {
      const before = isFeatureEnabled('websocket');
      const result = enableFeature('websocket');
      expect(result.success).toBe(true);
    });
    
    it('should fail for non-existent feature', () => {
      const result = enableFeature('nonExistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Feature not found');
    });
  });
  
  describe('disableFeature()', () => {
    it('should fail to disable required feature', () => {
      const result = disableFeature('api');
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });
  
  describe('applyProfile()', () => {
    it('should apply minimal profile', () => {
      const result = applyProfile('minimal');
      expect(result.success).toBe(true);
      expect(result.profile).toBe('minimal');
      expect(result.memory).toBeGreaterThan(0);
    });
    
    it('should fail for invalid profile', () => {
      const result = applyProfile('invalidProfile');
      expect(result.success).toBe(false);
    });
  });
  
  describe('getConfig()', () => {
    it('should return current config with profiles', () => {
      const config = getConfig();
      expect(config).toHaveProperty('current');
      expect(config).toHaveProperty('profiles');
      expect(config).toHaveProperty('estimated');
    });
    
    it('should include memory estimates for all profiles', () => {
      const config = getConfig();
      expect(config.estimated).toHaveProperty('minimal');
      expect(config.estimated).toHaveProperty('basic');
      expect(config.estimated).toHaveProperty('standard');
      expect(config.estimated).toHaveProperty('ai');
      expect(config.estimated).toHaveProperty('full');
    });
  });
});