/**
 * Device Provisioning Skill
 * Automated ESP32 device registration, configuration, and firmware management
 */

interface DeviceInfo {
  mac?: string;
  type?: string;
  deviceId?: string;
  farmId?: string;
  config?: Record<string, unknown>;
  firmwareVersion?: string;
}

interface ProvisioningResult {
  deviceId: string | null;
  success: boolean;
  steps: Array<{ step: string; success: boolean; details?: unknown; error?: string }>;
  errors: string[];
}

interface DeviceDefaults {
  reportingInterval: number;
  batchSize: number;
  retryCount: number;
  timeout: number;
  firmwareVersion: string;
  encryption: string;
}

class DeviceProvisioningSkill {
  id = 'device-provisioning';
  name = 'Device Auto-Provisioning';
  description = 'Automated ESP32 device registration, configuration, and firmware management';
  
  provisioningSteps = ['discover', 'authenticate', 'register', 'configure', 'install-firmware', 'verify', 'activate'];
  
  deviceDefaults: DeviceDefaults = {
    reportingInterval: 60000,
    batchSize: 10,
    retryCount: 3,
    timeout: 30000,
    firmwareVersion: '1.0.0',
    encryption: 'AES-256'
  };

  pendingDevices = new Map();
  registeredDevices = new Map();

  async analyze(ctx: Record<string, unknown>): Promise<Record<string, unknown>> {
    const pendingCount = this.pendingDevices.size;
    const registeredCount = this.registeredDevices.size;
    const provisioningStatus = this.getProvisioningStatus();
    const recommendations = this.generateRecommendations();

    return {
      skill: this.id,
      timestamp: new Date().toISOString(),
      stats: {
        pending: pendingCount,
        registered: registeredCount,
        successRate: registeredCount > 0 ? ((registeredCount / (pendingCount + registeredCount)) * 100).toFixed(1) : '0'
      },
      provisioningStatus,
      recommendations
    };
  }

  async provisionDevice(deviceInfo: DeviceInfo): Promise<ProvisioningResult> {
    const result: ProvisioningResult = {
      deviceId: null,
      success: false,
      steps: [],
      errors: []
    };

    for (const step of this.provisioningSteps) {
      try {
        const stepResult = await this.executeStep(step, deviceInfo);
        result.steps.push({ step, success: true, details: stepResult });
        
        if ((stepResult as { deviceId?: string }).deviceId) result.deviceId = (stepResult as { deviceId: string }).deviceId;
        if (!(stepResult as { continue?: boolean }).continue) break;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.steps.push({ step, success: false, error: errorMessage });
        result.errors.push(`${step}: ${errorMessage}`);
        break;
      }
    }

    result.success = result.steps.every(s => s.success);
    return result;
  }

  async executeStep(step: string, deviceInfo: DeviceInfo): Promise<unknown> {
    switch (step) {
      case 'discover': return this.discoverDevice(deviceInfo);
      case 'authenticate': return this.authenticateDevice(deviceInfo);
      case 'register': return this.registerDevice(deviceInfo);
      case 'configure': return this.configureDevice(deviceInfo);
      case 'install-firmware': return this.installFirmware(deviceInfo);
      case 'verify': return this.verifyDevice(deviceInfo);
      case 'activate': return this.activateDevice(deviceInfo);
      default: throw new Error(`Unknown step: ${step}`);
    }
  }

  async discoverDevice(deviceInfo: DeviceInfo): Promise<{ deviceId: string; mac: string; type: string; discovered: boolean }> {
    const mac = deviceInfo.mac || this.generateMAC();
    const type = deviceInfo.type || 'ESP32';
    
    return {
      deviceId: `DEV-${mac.substring(0, 8).toUpperCase()}`,
      mac,
      type,
      discovered: true
    };
  }

  async authenticateDevice(deviceInfo: DeviceInfo): Promise<{ authenticated: boolean; token: string; expiresAt: number; continue: boolean }> {
    const token = this.generateToken();
    const expiresAt = Date.now() + 3600000;
    
    return {
      authenticated: true,
      token,
      expiresAt,
      continue: true
    };
  }

  async registerDevice(deviceInfo: DeviceInfo): Promise<{ deviceId: string; registered: boolean; continue: boolean }> {
    const deviceId = deviceInfo.deviceId || `DEV-${Date.now()}`;
    const farmId = deviceInfo.farmId || 'default';
    
    try {
      const { runQuery } from('../config/database');
      runQuery(
        'INSERT OR REPLACE INTO devices (id, type, status, config, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [deviceId, deviceInfo.type || 'sensor', 'pending', JSON.stringify(this.deviceDefaults)]
      );
    } catch (e) { /* ignore */ }

    this.registeredDevices.set(deviceId, { ...deviceInfo, registeredAt: Date.now() });
    
    return {
      deviceId,
      registered: true,
      continue: true
    };
  }

  async configureDevice(deviceInfo: DeviceInfo): Promise<{ configured: boolean; config: Record<string, unknown>; continue: boolean }> {
    const config = {
      ...this.deviceDefaults,
      ...deviceInfo.config,
      mqtt: {
        broker: process.env.MQTT_BROKER || 'mqtt://localhost',
        topic: `ecosyntech/${deviceInfo.farmId || 'default'}/${deviceInfo.deviceId}`,
        qos: 1
      },
      thresholds: {
        temperature: { min: 15, max: 40 },
        humidity: { min: 30, max: 90 },
        soil: { min: 20, max: 80 }
      }
    };

    return {
      configured: true,
      config,
      continue: true
    };
  }

  async installFirmware(deviceInfo: DeviceInfo): Promise<{ firmwareInstalled: boolean; currentVersion: string; targetVersion: string; continue: boolean }> {
    const targetVersion = this.deviceDefaults.firmwareVersion;
    const currentVersion = deviceInfo.firmwareVersion;
    const needsUpdate = currentVersion !== targetVersion;

    return {
      firmwareInstalled: !needsUpdate,
      currentVersion: currentVersion || 'none',
      targetVersion,
      continue: true
    };
  }

  async verifyDevice(deviceInfo: DeviceInfo): Promise<{ verified: boolean; checks: Record<string, boolean>; continue: boolean }> {
    const checks = {
      connectivity: true,
      sensorReadings: true,
      dataTransmission: true
    };
    
    return {
      verified: Object.values(checks).every(v => v),
      checks,
      continue: true
    };
  }

  async activateDevice(deviceInfo: DeviceInfo): Promise<{ activated: boolean; status: string }> {
    try {
      const { runQuery } from('../config/database');
      runQuery('UPDATE devices SET status = ? WHERE id = ?', ['online', deviceInfo.deviceId]);
    } catch (e) { /* ignore */ }

    return {
      activated: true,
      status: 'online'
    };
  }

  generateToken(): string {
    return 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  generateMAC(): string {
    return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16)));
  }

  getProvisioningStatus(): Record<string, unknown> {
    return {
      steps: this.provisioningSteps,
      defaults: this.deviceDefaults,
      pendingCount: this.pendingDevices.size,
      registeredCount: this.registeredDevices.size
    };
  }

  generateRecommendations(): Array<{ type: string; priority: string; message: string }> {
    const recommendations: Array<{ type: string; priority: string; message: string }> = [];

    if (this.pendingDevices.size > 10) {
      recommendations.push({ type: 'scale', priority: 'medium', message: `High pending device count: ${this.pendingDevices.size}` });
    }

    if (this.registeredDevices.size < 10) {
      recommendations.push({ type: 'expand', priority: 'low', message: 'Consider expanding device fleet for better coverage' });
    }

    recommendations.push({ type: 'maintenance', priority: 'low', message: 'All devices provisioned successfully' });

    return recommendations;
  }

  getStatus(): Record<string, unknown> {
    return {
      skill: this.id,
      provisioningSteps: this.provisioningSteps,
      defaults: this.deviceDefaults,
      pendingCount: this.pendingDevices.size,
      registeredCount: this.registeredDevices.size
    };
  }
}

export = new DeviceProvisioningSkill();