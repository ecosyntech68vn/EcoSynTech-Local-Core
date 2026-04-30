/**
 * Profile Configuration - RAM Load Optimization
 * V5.1.0 - 5 Profiles tối ưu cho different hardware configurations
 * 
 * Profiles:
 * 1. minimal   - For devices with < 256MB RAM (ESP32, Arduino)
 * 2. low       - For devices with 256-512MB RAM
 * 3. medium    - For devices with 512-1024MB RAM (Raspberry Pi 3)
 * 4. high      - For devices with 1024-2048MB RAM (Raspberry Pi 4)
 * 5. maximum   - For devices with > 2048MB RAM (Server/Cloud)
 */

const os = require('os');

const PROFILES = {
  minimal: {
    name: 'Minimal',
    description: 'For ESP32, Arduino, devices with < 256MB RAM',
    maxMemory: 256 * 1024 * 1024, // 256MB
    features: {
      aiEnabled: false,
      telemetryInterval: 60000,
      websocketEnabled: false,
      cacheEnabled: false,
      maxConnections: 10,
      batchSize: 5,
      logLevel: 'error',
      compressionEnabled: false
    },
    limits: {
      maxRequestSize: '50kb',
      maxConcurrentRequests: 5,
      cacheSize: 1, // entries
      queryTimeout: 5000
    }
  },

  low: {
    name: 'Low',
    description: 'For devices with 256-512MB RAM',
    maxMemory: 512 * 1024 * 1024, // 512MB
    features: {
      aiEnabled: false,
      telemetryInterval: 30000,
      websocketEnabled: true,
      cacheEnabled: true,
      maxConnections: 25,
      batchSize: 10,
      logLevel: 'warn',
      compressionEnabled: false
    },
    limits: {
      maxRequestSize: '100kb',
      maxConcurrentRequests: 10,
      cacheSize: 10,
      queryTimeout: 10000
    }
  },

  medium: {
    name: 'Medium',
    description: 'For Raspberry Pi 3, devices with 512-1024MB RAM',
    maxMemory: 1024 * 1024 * 1024, // 1GB
    features: {
      aiEnabled: true,
      telemetryInterval: 15000,
      websocketEnabled: true,
      cacheEnabled: true,
      maxConnections: 50,
      batchSize: 20,
      logLevel: 'info',
      compressionEnabled: true
    },
    limits: {
      maxRequestSize: '500kb',
      maxConcurrentRequests: 25,
      cacheSize: 50,
      queryTimeout: 15000
    }
  },

  high: {
    name: 'High',
    description: 'For Raspberry Pi 4, devices with 1024-2048MB RAM',
    maxMemory: 2048 * 1024 * 1024, // 2GB
    features: {
      aiEnabled: true,
      telemetryInterval: 10000,
      websocketEnabled: true,
      cacheEnabled: true,
      maxConnections: 100,
      batchSize: 50,
      logLevel: 'debug',
      compressionEnabled: true
    },
    limits: {
      maxRequestSize: '1mb',
      maxConcurrentRequests: 50,
      cacheSize: 100,
      queryTimeout: 20000
    }
  },

  maximum: {
    name: 'Maximum',
    description: 'For Server/Cloud, devices with > 2048MB RAM',
    maxMemory: 8 * 1024 * 1024 * 1024, // 8GB (virtual limit)
    features: {
      aiEnabled: true,
      telemetryInterval: 5000,
      websocketEnabled: true,
      cacheEnabled: true,
      maxConnections: 500,
      batchSize: 100,
      logLevel: 'debug',
      compressionEnabled: true
    },
    limits: {
      maxRequestSize: '5mb',
      maxConcurrentRequests: 200,
      cacheSize: 500,
      queryTimeout: 30000
    }
  }
};

const PROFILE_ORDER = ['minimal', 'low', 'medium', 'high', 'maximum'];

/**
 * Get profile by name
 * @param {string} profileName - Profile name
 * @returns {Object} Profile configuration
 */
function getProfile(profileName) {
  const profile = PROFILES[profileName];
  if (!profile) {
    return PROFILES.medium;
  }
  return profile;
}

/**
 * Auto-detect profile based on system memory
 * @returns {string} Recommended profile name
 */
function autoDetectProfile() {
  const totalMemory = os.totalmem();
  
  if (totalMemory < 256 * 1024 * 1024) return 'minimal';
  if (totalMemory < 512 * 1024 * 1024) return 'low';
  if (totalMemory < 1024 * 1024 * 1024) return 'medium';
  if (totalMemory < 2048 * 1024 * 1024) return 'high';
  return 'maximum';
}

/**
 * Get profile from environment or auto-detect
 * @returns {Object} Active profile configuration
 */
function getActiveProfile() {
  const envProfile = process.env.RAM_PROFILE;
  
  if (envProfile && PROFILES[envProfile]) {
    return getProfile(envProfile);
  }
  
  return getProfile(autoDetectProfile());
}

/**
 * Check if feature is enabled in current profile
 * @param {string} featureName - Feature name
 * @returns {boolean}
 */
function isFeatureEnabled(featureName) {
  const profile = getActiveProfile();
  return profile.features[featureName] === true;
}

/**
 * Get limit value
 * @param {string} limitName - Limit name
 * @returns {*} Limit value
 */
function getLimit(limitName) {
  const profile = getActiveProfile();
  return profile.limits[limitName];
}

/**
 * Get all available profiles
 * @returns {Array} List of profile names
 */
function getAvailableProfiles() {
  return PROFILE_ORDER.map(name => ({
    name: name,
    displayName: PROFILES[name].name,
    description: PROFILES[name].description,
    maxMemory: PROFILES[name].maxMemory,
    features: PROFILES[name].features,
    limits: PROFILES[name].limits
  }));
}

module.exports = {
  PROFILES,
  PROFILE_ORDER,
  getProfile,
  autoDetectProfile,
  getActiveProfile,
  isFeatureEnabled,
  getLimit,
  getAvailableProfiles
};