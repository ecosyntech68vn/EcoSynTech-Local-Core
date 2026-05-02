import logger from './logger';

export interface ESP32BaselineConfig {
  version: string;
  updated: string;
  wifi: {
    ssidPattern: string;
    hidden: boolean;
    minSecurity: string;
    timeout: number;
  };
  network: {
    dhcp: boolean;
    fallbackIP: string;
    fallbackGateway: string;
    dns: string[];
    ntpServer: string;
    ntpTimezone: string;
    connectionTimeout: number;
    keepAlive: boolean;
  };
  mqtt: {
    enabled: boolean;
    protocol: string;
    port: number;
    verifyServer: boolean;
    keepAlive: number;
    cleanSession: boolean;
    qos: number;
    retain: boolean;
    reconnectDelay: number;
    maxReconnectAttempts: number;
  };
  sensor: {
    readInterval: number;
    batchSize: number;
    calibrationRequired: boolean;
    minVoltage: number;
    maxVoltage: number;
  };
  security: {
    firmwareValidation: boolean;
    secureBoot: boolean;
    flashEncryption: boolean;
    jwtExpiry: number;
    apiKeyLength: number;
    tlsVersion: string;
    cipherSuites: string[];
  };
  storage: {
    useLittleFS: boolean;
    maxLogSize: number;
    logRotation: boolean;
    retainLogs: number;
  };
  ota: {
    enabled: boolean;
    checkInterval: number;
    autoUpdate: boolean;
    signatureRequired: boolean;
    rollbackEnabled: boolean;
    timeout: number;
  };
  monitoring: {
    healthCheckInterval: number;
    metricsEnabled: boolean;
    errorReporting: boolean;
    debugMode: boolean;
  };
  thresholds: {
    temperature: { min: number; max: number; critical: number };
    humidity: { min: number; max: number; critical: number };
    soilMoisture: { min: number; max: number; critical: number };
    battery: { min: number; max: number; critical: number };
    signalStrength: { min: number; max: number; critical: number };
  };
}

export const ESP32_SECURE_BASELINE: ESP32BaselineConfig = {
  version: '1.0.0',
  updated: new Date().toISOString(),
  
  wifi: {
    ssidPattern: '^EcoSynTech_.*$',
    hidden: false,
    minSecurity: 'WPA2',
    timeout: 30000
  },
  
  network: {
    dhcp: true,
    fallbackIP: '192.168.1.100',
    fallbackGateway: '192.168.1.1',
    dns: ['8.8.8.8', '8.8.4.4'],
    ntpServer: 'pool.ntp.org',
    ntpTimezone: 'Asia/Ho_Chi_Minh',
    connectionTimeout: 15000,
    keepAlive: true
  },
  
  mqtt: {
    enabled: true,
    protocol: 'mqtts',
    port: 8883,
    verifyServer: true,
    keepAlive: 60,
    cleanSession: true,
    qos: 1,
    retain: false,
    reconnectDelay: 5000,
    maxReconnectAttempts: 10
  },
  
  sensor: {
    readInterval: 5000,
    batchSize: 10,
    calibrationRequired: true,
    minVoltage: 3.0,
    maxVoltage: 3.6
  },
  
  security: {
    firmwareValidation: true,
    secureBoot: true,
    flashEncryption: true,
    jwtExpiry: 3600,
    apiKeyLength: 32,
    tlsVersion: 'TLSv1.2',
    cipherSuites: [
      'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
      'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384'
    ]
  },
  
  storage: {
    useLittleFS: true,
    maxLogSize: 1048576,
    logRotation: true,
    retainLogs: 7
  },
  
  ota: {
    enabled: true,
    checkInterval: 3600000,
    autoUpdate: false,
    signatureRequired: true,
    rollbackEnabled: true,
    timeout: 120000
  },
  
  monitoring: {
    healthCheckInterval: 60000,
    metricsEnabled: true,
    errorReporting: true,
    debugMode: false
  },
  
  thresholds: {
    temperature: { min: -40, max: 80, critical: 75 },
    humidity: { min: 0, max: 100, critical: 95 },
    soilMoisture: { min: 0, max: 100, critical: 5 },
    battery: { min: 2.5, max: 4.2, critical: 3.0 },
    signalStrength: { min: -120, max: -30, critical: -100 }
  }
};

export class ESP32SecureBaseline {
  baseline: ESP32BaselineConfig;
  devices: Map<string, any>;

  constructor() {
    this.baseline = { ...ESP32_SECURE_BASELINE };
    this.devices = new Map();
  }

  getBaseline(): ESP32BaselineConfig {
    return this.baseline;
  }

  getBaselineForDevice(deviceId: string): ESP32BaselineConfig {
    if (this.devices.has(deviceId)) {
      return { ...this.baseline, ...this.devices.get(deviceId) };
    }
    return this.baseline;
  }

  registerDevice(deviceId: string, customConfig: any = {}): void {
    this.devices.set(deviceId, customConfig);
    logger.info(`[ESP32Baseline] Device registered: ${deviceId}`);
  }

  unregisterDevice(deviceId: string): void {
    this.devices.delete(deviceId);
    logger.info(`[ESP32Baseline] Device unregistered: ${deviceId}`);
  }

  validateConfig(config: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.mqtt?.protocol === 'mqtt') {
      warnings.push('MQTT without TLS is not recommended for production');
    }

    if (config.security?.debugMode === true) {
      warnings.push('Debug mode should be disabled in production');
    }

    if (config.wifi?.minSecurity === 'WEP') {
      errors.push('WEP security is not acceptable');
    }

    if (config.ota?.autoUpdate === true && !config.ota?.signatureRequired) {
      warnings.push('Auto-OTA without signature verification is risky');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  getConfigTemplate(): any {
    return {
      ...this.baseline,
      deviceSpecific: {
        deviceId: 'ESP32_001',
        location: 'Field_A1',
        farmId: 'FARM_001'
      }
    };
  }

  generateDeviceConfig(deviceId: string, options: any = {}): ESP32BaselineConfig {
    const config = {
      ...this.baseline,
      deviceId,
      ...options,
      security: {
        ...this.baseline.security,
        jwtExpiry: options.jwtExpiry || this.baseline.security.jwtExpiry
      }
    };

    return config as ESP32BaselineConfig;
  }

  checkCompliance(deviceConfig: any): { compliant: boolean; issues: any[]; score: number } {
    const result = {
      compliant: true,
      issues: [] as any[],
      score: 100
    };

    if (deviceConfig.mqtt?.protocol !== 'mqtts') {
      result.issues.push({ type: 'security', severity: 'high', message: 'MQTT should use TLS' });
      result.score -= 20;
    }

    if (deviceConfig.security?.debugMode !== false) {
      result.issues.push({ type: 'security', severity: 'medium', message: 'Debug mode should be disabled' });
      result.score -= 10;
    }

    if (!deviceConfig.security?.firmwareValidation) {
      result.issues.push({ type: 'security', severity: 'high', message: 'Firmware validation should be enabled' });
      result.score -= 30;
    }

    if (deviceConfig.ota?.signatureRequired !== true) {
      result.issues.push({ type: 'security', severity: 'high', message: 'OTA signature verification required' });
      result.score -= 25;
    }

    result.compliant = result.score >= 70;
    return result;
  }
}

let baselineService: ESP32SecureBaseline | null = null;

export function getBaselineService(): ESP32SecureBaseline {
  if (!baselineService) {
    baselineService = new ESP32SecureBaseline();
  }
  return baselineService;
}

export default {
  ESP32SecureBaseline,
  getBaselineService,
  ESP32_SECURE_BASELINE
};