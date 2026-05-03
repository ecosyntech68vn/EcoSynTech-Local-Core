import os from 'os';

export interface ProfileFeatures {
  aiEnabled: boolean;
  telemetryInterval: number;
  websocketEnabled: boolean;
  cacheEnabled: boolean;
  maxConnections: number;
  batchSize: number;
  logLevel: string;
  compressionEnabled: boolean;
}

export interface ProfileLimits {
  maxRequestSize: string;
  maxConcurrentRequests: number;
  cacheSize: number;
  queryTimeout: number;
}

export interface Profile {
  name: string;
  description: string;
  maxMemory: number;
  features: ProfileFeatures;
  limits: ProfileLimits;
}

export const PROFILES: Record<string, Profile> = {
  minimal: {
    name: 'Minimal',
    description: 'For ESP32, Arduino, devices with < 256MB RAM',
    maxMemory: 256 * 1024 * 1024,
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
      cacheSize: 1,
      queryTimeout: 5000
    }
  },

  low: {
    name: 'Low',
    description: 'For devices with 256-512MB RAM',
    maxMemory: 512 * 1024 * 1024,
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
    maxMemory: 1024 * 1024 * 1024,
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
    maxMemory: 2048 * 1024 * 1024,
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
    maxMemory: 8 * 1024 * 1024 * 1024,
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

export const PROFILE_ORDER = ['minimal', 'low', 'medium', 'high', 'maximum'];

export function getProfile(profileName: string): Profile {
  const profile = PROFILES[profileName];
  if (!profile) {
    return PROFILES['medium'] as Profile;
  }
  return profile;
}

export function autoDetectProfile(): string {
  const totalMemory = os.totalmem();
  
  if (totalMemory < 256 * 1024 * 1024) return 'minimal';
  if (totalMemory < 512 * 1024 * 1024) return 'low';
  if (totalMemory < 1024 * 1024 * 1024) return 'medium';
  if (totalMemory < 2048 * 1024 * 1024) return 'high';
  return 'maximum';
}

export function getActiveProfile(): Profile {
  const envProfile = process.env.RAM_PROFILE;
  
  if (envProfile && PROFILES[envProfile]) {
    return getProfile(envProfile);
  }
  
  return getProfile(autoDetectProfile());
}

export function isFeatureEnabled(featureName: string): boolean {
  const profile = getActiveProfile();
  return profile.features[featureName as keyof ProfileFeatures] === true;
}

export function getLimit(limitName: string): any {
  const profile = getActiveProfile();
  return profile.limits[limitName as keyof ProfileLimits];
}

export function getAvailableProfiles() {
  return PROFILE_ORDER.map(name => {
    const profile = PROFILES[name];
    if (!profile) return null;
    return {
      name: name,
      displayName: profile.name,
      description: profile.description,
      maxMemory: profile.maxMemory,
      features: profile.features,
      limits: profile.limits
    };
  }).filter(Boolean);
}

export default {
  PROFILES,
  PROFILE_ORDER,
  getProfile,
  autoDetectProfile,
  getActiveProfile,
  isFeatureEnabled,
  getLimit,
  getAvailableProfiles
};