/**
 * @fileoverview Feature Flags Configuration
 * @description Enable/disable modules to optimize memory usage
 * @module config/features
 * 
 * Frugal Innovation Philosophy:
 * - Pay only for what you use
 * - Modular architecture
 * - Memory-efficient defaults
 * 
 * Usage:
 *   - Set PROFILE=minimal|basic|standard|ai|full in .env
 *   - Or set individual ENABLE_* flags
 *   - Some features require restart, some are hot-swap
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} FeatureConfig
 * @property {boolean} enabled - Enable/disable feature
 * @property {boolean} required - Feature is required (cannot disable)
 * @property {number} memoryMB - Estimated memory usage in MB
 * @property {string} description - Feature description
 * @property {string[]} dependencies - Other features required
 */

/**
 * Feature flags configuration
 * Set enabled: true/false to control memory usage
 */
const FEATURES = {
  // ==================== CORE (Required) ====================
  api: {
    enabled: true,
    required: true,
    memoryMB: 50,
    description: 'REST API Server (Express.js)',
    dependencies: []
  },
  
  database: {
    enabled: true,
    required: true,
    memoryMB: 80,
    description: 'SQLite Database with WAL mode',
    dependencies: []
  },

  // ==================== IoT LAYER ====================
  mqtt: {
    enabled: process.env.ENABLE_MQTT !== 'false',
    required: false,
    memoryMB: 60,
    description: 'MQTT Broker for IoT devices',
    dependencies: ['api'],
    envVar: 'ENABLE_MQTT'
  },
  
  websocket: {
    enabled: process.env.ENABLE_WEBSOCKET !== 'false',
    required: false,
    memoryMB: 30,
    description: 'Real-time WebSocket for dashboards',
    dependencies: ['api'],
    envVar: 'ENABLE_WEBSOCKET'
  },

  // ==================== AI/ML LAYER ====================
  aiInference: {
    enabled: process.env.ENABLE_AI === 'true',
    required: false,
    memoryMB: 300,
    description: 'AI/ML inference engine (TensorFlow/ONNX)',
    dependencies: ['api', 'database'],
    envVar: 'ENABLE_AI'
  },
  
  aiModels: {
    enabled: process.env.ENABLE_AI === 'true',
    required: false,
    memoryMB: 100,
    description: 'AI Model Management API',
    dependencies: ['aiInference'],
    envVar: 'ENABLE_AI'
  },

  // ==================== CACHE LAYER ====================
  redisCache: {
    enabled: process.env.ENABLE_REDIS === 'true',
    required: false,
    memoryMB: 150,
    description: 'Redis cache (requires Redis server)',
    dependencies: ['api'],
    envVar: 'ENABLE_REDIS',
    note: 'Requires external Redis service'
  },
  
  memoryCache: {
    enabled: process.env.ENABLE_MEMORY_CACHE !== 'false',
    required: false,
    memoryMB: 20,
    description: 'In-memory LRU cache (built-in)',
    dependencies: ['api'],
    envVar: 'ENABLE_MEMORY_CACHE'
  },

  // ==================== DATA LAYER ====================
  ingestQueue: {
    enabled: process.env.ENABLE_INGEST_QUEUE !== 'false',
    required: false,
    memoryMB: 40,
    description: 'Sensor data buffer/queue',
    dependencies: ['database'],
    envVar: 'ENABLE_INGEST_QUEUE'
  },

  // ==================== AUTH LAYER ====================
  jwtAuth: {
    enabled: process.env.ENABLE_JWT_AUTH !== 'false',
    required: false,
    memoryMB: 20,
    description: 'JWT Authentication',
    dependencies: ['api'],
    envVar: 'ENABLE_JWT_AUTH'
  },
  
  hmacAuth: {
    enabled: process.env.ENABLE_HMAC_AUTH !== 'false',
    required: false,
    memoryMB: 10,
    description: 'HMAC signature for ESP32 devices',
    dependencies: ['api'],
    envVar: 'ENABLE_HMAC_AUTH'
  },
  
  accountLockout: {
    enabled: process.env.ENABLE_LOCKOUT !== 'false',
    required: false,
    memoryMB: 5,
    description: 'Account lockout after failed attempts',
    dependencies: ['jwtAuth'],
    envVar: 'ENABLE_LOCKOUT'
  },

  // ==================== MONITORING ====================
  telemetry: {
    enabled: process.env.ENABLE_TELEMETRY !== 'false',
    required: false,
    memoryMB: 30,
    description: 'System telemetry & monitoring',
    dependencies: ['api'],
    envVar: 'ENABLE_TELEMETRY'
  },
  
  auditLogging: {
    enabled: process.env.ENABLE_AUDIT !== 'false',
    required: false,
    memoryMB: 20,
    description: 'Tamper-proof audit logging',
    dependencies: ['database'],
    envVar: 'ENABLE_AUDIT'
  },

  // ==================== INTEGRATIONS ====================
  telegramBot: {
    enabled: process.env.ENABLE_TELEGRAM === 'true',
    required: false,
    memoryMB: 30,
    description: 'Telegram notification bot',
    dependencies: ['api'],
    envVar: 'ENABLE_TELEGRAM'
  },
  
  gasSync: {
    enabled: process.env.ENABLE_GAS === 'true',
    required: false,
    memoryMB: 20,
    description: 'Google Apps Script sync',
    dependencies: ['api'],
    envVar: 'ENABLE_GAS'
  }
};

/**
 * Get memory estimate based on enabled features
 * @returns {number} Total memory in MB
 */
function getMemoryEstimate() {
  let total = 0;
  let active = [];
  
  for (const [name, config] of Object.entries(FEATURES)) {
    if (config.enabled) {
      total += config.memoryMB;
      active.push(`${name} (${config.memoryMB}MB)`);
    }
  }
  
  return { total, active };
}

/**
 * Check if feature is available
 * @param {string} featureName - Feature to check
 * @returns {boolean}
 */
function isFeatureEnabled(featureName) {
  const feature = FEATURES[featureName];
  if (!feature) return false;
  
  // Check dependencies
  if (feature.dependencies && feature.dependencies.length > 0) {
    for (const dep of feature.dependencies) {
      if (!FEATURES[dep] || !FEATURES[dep].enabled) {
        return false;
      }
    }
  }
  
  return feature.enabled;
}

/**
 * Enable a feature
 * @param {string} featureName - Feature to enable
 * @returns {Object} Result with success status
 */
function enableFeature(featureName) {
  const feature = FEATURES[featureName];
  if (!feature) {
    return { success: false, error: 'Feature not found' };
  }
  
  // Check dependencies can be met
  if (feature.dependencies) {
    const missingDeps = feature.dependencies.filter(dep => !FEATURES[dep] || !FEATURES[dep].enabled);
    if (missingDeps.length > 0) {
      return { 
        success: false, 
        error: `Missing dependencies: ${missingDeps.join(', ')}` 
      };
    }
  }
  
  feature.enabled = true;
  return { success: true, message: `Enabled ${featureName}` };
}

/**
 * Disable a feature
 * @param {string} featureName - Feature to disable
 * @returns {Object} Result with success status
 */
function disableFeature(featureName) {
  const feature = FEATURES[featureName];
  if (!feature) {
    return { success: false, error: 'Feature not found' };
  }
  
  if (feature.required) {
    return { success: false, error: 'Cannot disable required feature' };
  }
  
  // Check if other features depend on this
  const dependents = Object.entries(FEATURES)
    .filter(([_, config]) => config.dependencies?.includes(featureName))
    .map(([name]) => name);
    
  if (dependents.length > 0) {
    return { 
      success: false, 
      error: `Cannot disable - required by: ${dependents.join(', ')}` 
    };
  }
  
  feature.enabled = false;
  return { success: true, message: `Disabled ${featureName}` };
}

/**
 * Get system configuration for current setup
 * @returns {Object} Configuration summary
 */
function getConfig() {
  const memory = getMemoryEstimate();
  const profiles = {
    minimal: ['api', 'database', 'jwtAuth', 'accountLockout'],
    basic: ['api', 'database', 'websocket', 'mqtt', 'jwtAuth', 'accountLockout', 'ingestQueue', 'memoryCache', 'telemetry'],
    standard: ['api', 'database', 'websocket', 'mqtt', 'jwtAuth', 'accountLockout', 'ingestQueue', 'memoryCache', 'telemetry', 'auditLogging'],
    full: Object.keys(FEATURES),
    ai: ['api', 'database', 'websocket', 'mqtt', 'aiInference', 'aiModels', 'redisCache', 'jwtAuth', 'telemetry']
  };
  
  return {
    current: {
      memory: memory.total,
      active: memory.active.length,
      features: Object.entries(FEATURES).filter(([_, c]) => c.enabled).map(([n]) => n)
    },
    profiles,
    estimated: {
      minimal: 130,
      basic: 260,
      standard: 320,
      full: 905,
      ai: 750
    }
  };
}

/**
 * Apply profile
 * @param {string} profileName - Profile to apply
 */
function applyProfile(profileName) {
  const profiles = {
    minimal: ['api', 'database', 'jwtAuth', 'accountLockout'],
    basic: ['api', 'database', 'websocket', 'mqtt', 'jwtAuth', 'accountLockout', 'ingestQueue', 'memoryCache', 'telemetry'],
    standard: ['api', 'database', 'websocket', 'mqtt', 'jwtAuth', 'accountLockout', 'ingestQueue', 'memoryCache', 'telemetry', 'auditLogging'],
    full: Object.keys(FEATURES),
    ai: ['api', 'database', 'websocket', 'mqtt', 'aiInference', 'aiModels', 'redisCache', 'jwtAuth', 'telemetry']
  };
  
  const enabled = profiles[profileName];
  if (!enabled) {
    return { success: false, error: 'Profile not found' };
  }
  
  // Reset all to false
  for (const name of Object.keys(FEATURES)) {
    if (!FEATURES[name].required) {
      FEATURES[name].enabled = false;
    }
  }
  
  // Enable profile features
  for (const name of enabled) {
    if (FEATURES[name]) {
      FEATURES[name].enabled = true;
    }
  }
  
  return { 
    success: true, 
    profile: profileName,
    memory: getMemoryEstimate().total
  };
}

module.exports = {
  FEATURES,
  getMemoryEstimate,
  isFeatureEnabled,
  enableFeature,
  disableFeature,
  getConfig,
  applyProfile
};