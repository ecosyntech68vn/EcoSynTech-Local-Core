/**
 * Health Report Service - System health monitoring
 * Converted to TypeScript - Phase 1
 */

import axios from 'axios';
import https from 'https';
import os from 'os';
import si from 'systeminformation';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger';
import pkg from '../../package.json';
import { getBreaker } from './circuitBreaker';

export interface SystemHealth {
  cpu: {
    load: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    usedPct: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    usagePct: number;
  };
  docker: boolean;
  network: {
    online: boolean;
  };
}

export interface DeviceHealth {
  total: number;
  online: number;
  offline: number;
}

export interface HealthReport {
  timestamp: string;
  version: string;
  customerId: string;
  system: SystemHealth;
  devices: DeviceHealth;
  uptime: number;
  healthScore: number;
  deductions: string[];
  recommendations: string[];
}

export class HealthReportServiceClass {
  private webLocalUrl: string;
  private webLocalApiKey: string;
  private customerId: string;
  private clientId: string;
  private useHttps: boolean;
  private queuePath: string;
  private timer: NodeJS.Timeout | null;
  private currentIntervalMs: number;
  private lastReportTime: Date | null;
  private consecutiveFailures: number;
  private lastHealthScore: number | null;
  private queueThreshold: number;
  private webLocalBreaker: any;

  constructor() {
    this.webLocalUrl = process.env.WEBLOCAL_WEBAPP_URL || process.env.WEBLOCAL_URL || process.env.GAS_WEBAPP_URL || '';
    this.webLocalApiKey = process.env.WEBLOCAL_API_KEY || process.env.WEBLOCAL_APIKEY || process.env.GAS_API_KEY || '';
    this.customerId = process.env.CUSTOMER_ID || '';
    this.clientId = process.env.CLIENT_ID || 'default_client';
    this.useHttps = process.env.WEBLOCAL_USE_HTTPS === 'true' || this.webLocalUrl.startsWith('https://');
    this.queuePath = path.join(__dirname, '..', '..', 'data', 'health_report_queue.json');
    this.ensureQueueFile();
    this.timer = null;
    this.currentIntervalMs = this.parseInterval();
    this.lastReportTime = null;
    this.consecutiveFailures = 0;
    this.lastHealthScore = null;
    this.queueThreshold = parseInt(process.env.HEALTH_REPORT_QUEUE_THRESHOLD || '5', 10);
    
    this.webLocalBreaker = getBreaker('healthreport-weblocal', { 
      failureThreshold: 5, 
      timeout: 60000 
    });
  }

  private parseInterval(): number {
    const val = parseInt(process.env.HEALTH_REPORT_INTERVAL_MIN || '30', 10);
    return isNaN(val) ? 30 * 60 * 1000 : val * 60 * 1000;
  }

  private computeInterval(cpuLoad: number, memUsedPct: number): number {
    if (cpuLoad > 80 || memUsedPct > 85) return 60 * 60 * 1000;
    if (cpuLoad < 40 && memUsedPct < 60) return 10 * 60 * 1000;
    return 30 * 60 * 1000;
  }

  private calculateHealthScore(cpuLoad: number, memUsedPct: number, diskUsage: number, dockerOk: boolean, activeDevices: number, uptime: number): { score: number; deductions: string[]; recommendations: string[] } {
    let score = 100;
    const deductions: string[] = [];
    const recommendations: string[] = [];

    if (cpuLoad > 80) { score -= 20; deductions.push('CPU overload'); }
    else if (cpuLoad > 60) { score -= 10; deductions.push('CPU high'); }

    if (memUsedPct > 85) { score -= 15; deductions.push('Memory critical'); }
    else if (memUsedPct > 70) { score -= 10; deductions.push('Memory high'); }

    if (diskUsage > 90) { score -= 20; deductions.push('Disk full'); }
    else if (diskUsage > 80) { score -= 10; deductions.push('Disk high'); }

    if (!dockerOk) { score -= 10; deductions.push('Docker issues'); }

    if (activeDevices === 0 && uptime > 60000) { score -= 15; deductions.push('No devices'); }

    if (score < 50) recommendations.push('Check system resources immediately');
    if (cpuLoad > 60) recommendations.push('Consider reducing load');
    if (memUsedPct > 70) recommendations.push('Free up memory');

    return { score: Math.max(0, score), deductions, recommendations };
  }

  private ensureQueueFile(): void {
    try {
      const dir = path.dirname(this.queuePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(this.queuePath)) {
        fs.writeFileSync(this.queuePath, '[]');
      }
    } catch (e: any) {
      logger.warn('[HealthReport] Queue init error:', e.message);
    }
  }

  private loadQueue(): any[] {
    try {
      return JSON.parse(fs.readFileSync(this.queuePath, 'utf8') || '[]');
    } catch (e: any) { return []; }
  }

  private saveQueue(queue: any[]): void {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify(queue, null, 2));
    } catch (e: any) {
      logger.warn('[HealthReport] Queue save error:', e.message);
    }
  }

  async collectHealthData(): Promise<HealthReport> {
    try {
const [cpuData, memData, diskData, networkData] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats()
  ]);
  
  let dockerData: any = null;
  try {
    if (typeof (si as any).docker !== 'undefined') {
      dockerData = await (si as any).docker.info();
    }
  } catch (e) { dockerData = null; }

      const cpuLoad = cpuData.currentLoad;
      const memUsedPct = (memData.used / memData.total) * 100;
      const diskUsage = diskData[0] ? (diskData[0].used / diskData[0].size) * 100 : 0;
      const dockerOk = dockerData && dockerData !== null && !(dockerData as any).error;
      const uptime = os.uptime() * 1000;

      const { score, deductions, recommendations } = this.calculateHealthScore(
        cpuLoad, memUsedPct, diskUsage, dockerOk, 0, uptime
      );

      this.lastHealthScore = score;

      return {
        timestamp: new Date().toISOString(),
        version: pkg.version,
        customerId: this.customerId,
        system: {
          cpu: { load: cpuLoad, cores: os.cpus().length },
          memory: { total: memData.total, used: memData.used, usedPct: memUsedPct, free: memData.free },
          disk: { total: diskData[0]?.size || 0, used: diskData[0]?.used || 0, usagePct: diskUsage },
          docker: dockerOk,
          network: { online: networkData && networkData[0]?.operstate === 'up' || false }
        },
        devices: { total: 0, online: 0, offline: 0 },
        uptime,
        healthScore: score,
        deductions,
        recommendations
      };
    } catch (error: any) {
      logger.error('[HealthReport] Collect error:', error.message);
      return {
        timestamp: new Date().toISOString(),
        version: pkg.version,
        customerId: this.customerId,
        system: { cpu: { load: 0, cores: 0 }, memory: { total: 0, used: 0, usedPct: 0, free: 0 }, disk: { total: 0, used: 0, usagePct: 0 }, docker: false, network: { online: false } },
        devices: { total: 0, online: 0, offline: 0 },
        uptime: 0,
        healthScore: 0,
        deductions: ['Collection failed'],
        recommendations: ['Check system']
      };
    }
  }

  async sendReport(report: HealthReport): Promise<boolean> {
    if (!this.webLocalUrl || !this.webLocalApiKey) {
      logger.debug('[HealthReport] Not configured, skipping');
      return false;
    }

    try {
      const protocol = this.useHttps ? https : require('http');
      
      const response = await axios.post(`${this.webLocalUrl}/health-report`, report, {
        headers: { 'x-api-key': this.webLocalApiKey },
        timeout: 10000
      });

      this.consecutiveFailures = 0;
      this.lastReportTime = new Date();
      return true;
    } catch (error: any) {
      this.consecutiveFailures++;
      logger.error('[HealthReport] Send error:', error.message);
      return false;
    }
  }

  async generateAndSend(): Promise<void> {
    const report = await this.collectHealthData();
    await this.sendReport(report);
  }

  getStatus(): { lastReport: string | null; consecutiveFailures: number; healthScore: number | null } {
    return {
      lastReport: this.lastReportTime?.toISOString() || null,
      consecutiveFailures: this.consecutiveFailures,
      healthScore: this.lastHealthScore
    };
  }
}

export const HealthReportService = new HealthReportServiceClass();

export default HealthReportService;