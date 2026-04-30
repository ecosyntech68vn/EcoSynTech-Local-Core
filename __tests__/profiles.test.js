/**
 * Unit Tests - Profiles Configuration
 * Test 5 profiles tối ưu RAM load cho different hardware
 */

const profiles = require('../src/config/profiles');

describe('Profiles Configuration', () => {
  describe('PROFILES', () => {
    it('should have exactly 5 profiles', () => {
      expect(Object.keys(profiles.PROFILES)).toHaveLength(5);
    });

    it('should have minimal profile', () => {
      expect(profiles.PROFILES).toHaveProperty('minimal');
      expect(profiles.PROFILES.minimal.name).toBe('Minimal');
    });

    it('should have low profile', () => {
      expect(profiles.PROFILES).toHaveProperty('low');
      expect(profiles.PROFILES.low.name).toBe('Low');
    });

    it('should have medium profile', () => {
      expect(profiles.PROFILES).toHaveProperty('medium');
      expect(profiles.PROFILES.medium.name).toBe('Medium');
    });

    it('should have high profile', () => {
      expect(profiles.PROFILES).toHaveProperty('high');
      expect(profiles.PROFILES.high.name).toBe('High');
    });

    it('should have maximum profile', () => {
      expect(profiles.PROFILES).toHaveProperty('maximum');
      expect(profiles.PROFILES.maximum.name).toBe('Maximum');
    });
  });

  describe('Profile Features', () => {
    it('minimal profile should have correct features', () => {
      const minimal = profiles.PROFILES.minimal;
      
      expect(minimal.features.aiEnabled).toBe(false);
      expect(minimal.features.websocketEnabled).toBe(false);
      expect(minimal.features.cacheEnabled).toBe(false);
      expect(minimal.features.maxConnections).toBe(10);
    });

    it('low profile should have correct features', () => {
      const low = profiles.PROFILES.low;
      
      expect(low.features.aiEnabled).toBe(false);
      expect(low.features.websocketEnabled).toBe(true);
      expect(low.features.cacheEnabled).toBe(true);
      expect(low.features.maxConnections).toBe(25);
    });

    it('medium profile should have AI enabled', () => {
      const medium = profiles.PROFILES.medium;
      
      expect(medium.features.aiEnabled).toBe(true);
      expect(medium.features.compressionEnabled).toBe(true);
    });

    it('high profile should have higher limits', () => {
      const high = profiles.PROFILES.high;
      
      expect(high.features.maxConnections).toBe(100);
      expect(high.features.batchSize).toBe(50);
    });

    it('maximum profile should have highest limits', () => {
      const maximum = profiles.PROFILES.maximum;
      
      expect(maximum.features.maxConnections).toBe(500);
      expect(maximum.features.batchSize).toBe(100);
      expect(maximum.limits.maxConcurrentRequests).toBe(200);
    });
  });

  describe('Profile Limits', () => {
    it('minimal profile should have lowest limits', () => {
      const minimal = profiles.PROFILES.minimal;
      
      expect(minimal.limits.maxConcurrentRequests).toBe(5);
      expect(minimal.limits.cacheSize).toBe(1);
      expect(minimal.limits.queryTimeout).toBe(5000);
    });

    it('maximum profile should have highest limits', () => {
      const maximum = profiles.PROFILES.maximum;
      
      expect(maximum.limits.maxConcurrentRequests).toBe(200);
      expect(maximum.limits.cacheSize).toBe(500);
      expect(maximum.limits.queryTimeout).toBe(30000);
    });
  });

  describe('getProfile', () => {
    it('should return profile by name', () => {
      const profile = profiles.getProfile('minimal');
      expect(profile.name).toBe('Minimal');
    });

    it('should return medium profile for unknown name', () => {
      const profile = profiles.getProfile('unknown-profile');
      expect(profile.name).toBe('Medium');
    });

    it('should return profile with all required properties', () => {
      const profile = profiles.getProfile('high');
      
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('description');
      expect(profile).toHaveProperty('maxMemory');
      expect(profile).toHaveProperty('features');
      expect(profile).toHaveProperty('limits');
    });
  });

  describe('autoDetectProfile', () => {
    it('should return a valid profile name', () => {
      const profileName = profiles.autoDetectProfile();
      const validProfiles = ['minimal', 'low', 'medium', 'high', 'maximum'];
      
      expect(validProfiles).toContain(profileName);
    });
  });

  describe('getActiveProfile', () => {
    it('should return a profile object', () => {
      const profile = profiles.getActiveProfile();
      
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('features');
      expect(profile).toHaveProperty('limits');
    });

    it('should respect RAM_PROFILE environment variable', () => {
      const originalEnv = process.env.RAM_PROFILE;
      process.env.RAM_PROFILE = 'minimal';
      
      const profile = profiles.getActiveProfile();
      expect(profile.name).toBe('Minimal');
      
      process.env.RAM_PROFILE = originalEnv || '';
    });
  });

  describe('isFeatureEnabled', () => {
    it('should check feature in active profile', () => {
      const originalEnv = process.env.RAM_PROFILE;
      process.env.RAM_PROFILE = 'medium';
      
      expect(profiles.isFeatureEnabled('aiEnabled')).toBe(true);
      expect(profiles.isFeatureEnabled('websocketEnabled')).toBe(true);
      
      process.env.RAM_PROFILE = originalEnv || '';
    });

    it('should return false for disabled feature', () => {
      const originalEnv = process.env.RAM_PROFILE;
      process.env.RAM_PROFILE = 'minimal';
      
      expect(profiles.isFeatureEnabled('aiEnabled')).toBe(false);
      
      process.env.RAM_PROFILE = originalEnv || '';
    });
  });

  describe('getLimit', () => {
    it('should return limit from active profile', () => {
      const originalEnv = process.env.RAM_PROFILE;
      process.env.RAM_PROFILE = 'high';
      
      expect(profiles.getLimit('maxConcurrentRequests')).toBe(50);
      
      process.env.RAM_PROFILE = originalEnv || '';
    });
  });

  describe('getAvailableProfiles', () => {
    it('should return all profiles in order', () => {
      const available = profiles.getAvailableProfiles();
      
      expect(available).toHaveLength(5);
      expect(available[0].name).toBe('minimal');
      expect(available[1].name).toBe('low');
      expect(available[2].name).toBe('medium');
      expect(available[3].name).toBe('high');
      expect(available[4].name).toBe('maximum');
    });

    it('should include description in each profile', () => {
      const available = profiles.getAvailableProfiles();
      
      available.forEach(profile => {
        expect(profile.description).toBeDefined();
      });
    });
  });

  describe('PROFILE_ORDER', () => {
    it('should have correct order', () => {
      expect(profiles.PROFILE_ORDER).toEqual(['minimal', 'low', 'medium', 'high', 'maximum']);
    });
  });
});

describe('Profile Memory Thresholds', () => {
  it('minimal should have 256MB threshold', () => {
    expect(profiles.PROFILES.minimal.maxMemory).toBe(256 * 1024 * 1024);
  });

  it('low should have 512MB threshold', () => {
    expect(profiles.PROFILES.low.maxMemory).toBe(512 * 1024 * 1024);
  });

  it('medium should have 1GB threshold', () => {
    expect(profiles.PROFILES.medium.maxMemory).toBe(1024 * 1024 * 1024);
  });

  it('high should have 2GB threshold', () => {
    expect(profiles.PROFILES.high.maxMemory).toBe(2048 * 1024 * 1024);
  });
});