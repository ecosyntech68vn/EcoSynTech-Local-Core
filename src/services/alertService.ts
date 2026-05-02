/**
 * Alert Service - Monitoring & Notification System
 * Converted to TypeScript - Phase 1
 * 
 * Provides:
 * - Telegram notification
 * - Zalo notification  
 * - Anomaly detection alerting
 * - Configurable alert thresholds
 * 
 * CONFIGURATION:
 * Set environment variables to enable:
 * - TELEGRAM_BOT_TOKEN: Your Telegram bot token
 * - TELEGRAM_CHAT_ID: Target chat ID
 * - ZALO_ACCESS_TOKEN: Your Zalo OA access token
 * - ZALO_USER_ID: Target user ID
 * - ALERT_ENABLED: true/false to enable/disable alerts
 */

import axios from 'axios';
import logger from '../config/logger';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  apiUrl: string;
}

export interface ZaloConfig {
  enabled: boolean;
  accessToken: string;
  userId: string;
  apiUrl: string;
}

export interface AlertConfig {
  telegram: TelegramConfig;
  zalo: ZaloConfig;
  alertEnabled: boolean;
}

export interface AlertTypeConfig {
  severity: 'info' | 'warning' | 'error' | 'critical';
  emoji: string;
}

export interface AlertHistoryEntry {
  type: string;
  message: string;
  severity: string;
  timestamp: string;
  sent: boolean;
  error?: string;
}

export interface AlertOptions {
  type?: string;
  severity?: string;
  timestamp?: number;
  deviceId?: string;
  farmId?: string;
  metadata?: Record<string, any>;
}

const CONFIG: AlertConfig = {
  telegram: {
    enabled: process.env.TELEGRAM_ENABLED === 'true',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    apiUrl: 'https://api.telegram.org/bot'
  },
  zalo: {
    enabled: process.env.ZALO_ENABLED === 'true',
    accessToken: process.env.ZALO_ACCESS_TOKEN || '',
    userId: process.env.ZALO_USER_ID || '',
    apiUrl: 'https://api.zalo.me/v3/oa'
  },
  alertEnabled: process.env.ALERT_ENABLED !== 'false'
};

export const ALERT_TYPES: Record<string, AlertTypeConfig> = {
  SENSOR_OUTLIER: { severity: 'warning', emoji: '⚠️' },
  SENSOR_SPIKE: { severity: 'warning', emoji: '📈' },
  SENSOR_INVALID: { severity: 'error', emoji: '❌' },
  DEVICE_OFFLINE: { severity: 'critical', emoji: '🔴' },
  DEVICE_ONLINE: { severity: 'info', emoji: '🟢' },
  RULE_TRIGGERED: { severity: 'info', emoji: '🔄' },
  RULE_FAILED: { severity: 'error', emoji: '⚡' },
  LOGIN_FAILED: { severity: 'warning', emoji: '🔐' },
  LOGIN_LOCKOUT: { severity: 'critical', emoji: '🔒' },
  SYSTEM_ERROR: { severity: 'critical', emoji: '🚨' },
  DATA_QUALITY: { severity: 'info', emoji: '📊' }
};

export class AlertService {
  private alertHistory: AlertHistoryEntry[];
  private maxHistory: number;
  private cooldowns: Map<string, number>;

  constructor() {
    this.alertHistory = [];
    this.maxHistory = 100;
    this.cooldowns = new Map();
  }

  async sendTelegramAlert(message: string, severity: string = 'info'): Promise<boolean> {
    if (!CONFIG.telegram.enabled || !CONFIG.telegram.botToken) {
      logger.debug('[Alert] Telegram not enabled or no token');
      return false;
    }

    try {
      const url = `${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: CONFIG.telegram.chatId,
        text: message,
        parse_mode: 'HTML'
      });
      logger.info('[Alert] Telegram alert sent');
      return true;
    } catch (error: any) {
      logger.error('[Alert] Telegram send failed:', error.message);
      return false;
    }
  }

  async sendZaloAlert(message: string, severity: string = 'info'): Promise<boolean> {
    if (!CONFIG.zalo.enabled || !CONFIG.zalo.accessToken) {
      logger.debug('[Alert] Zalo not enabled or no token');
      return false;
    }

    try {
      const url = `${CONFIG.zalo.apiUrl}/message`;
      await axios.post(url, {
        recipient: { user_id: CONFIG.zalo.userId },
        message: { text: message }
      }, {
        headers: { Authorization: `Bearer ${CONFIG.zalo.accessToken}` }
      });
      logger.info('[Alert] Zalo alert sent');
      return true;
    } catch (error: any) {
      logger.error('[Alert] Zalo send failed:', error.message);
      return false;
    }
  }

  async sendAlert(message: string, options: AlertOptions = {}): Promise<boolean> {
    if (!CONFIG.alertEnabled) {
      return false;
    }

    const { type = 'SYSTEM_ERROR', severity = 'info', deviceId, farmId, metadata } = options;
    const alertType = ALERT_TYPES[type] || { severity: 'info', emoji: '' };
    
    const fullMessage = `${alertType.emoji} <b>${type}</b>\n${message}${deviceId ? `\n📱 Device: ${deviceId}` : ''}${farmId ? `\n🌾 Farm: ${farmId}` : ''}`;

    const historyEntry: AlertHistoryEntry = {
      type,
      message,
      severity: alertType.severity,
      timestamp: new Date().toISOString(),
      sent: false
    };

    const telegramResult = await this.sendTelegramAlert(fullMessage, alertType.severity);
    const zaloResult = await this.sendZaloAlert(fullMessage, alertType.severity);

    historyEntry.sent = telegramResult || zaloResult;

    this.alertHistory.push(historyEntry);
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory.shift();
    }

    return historyEntry.sent;
  }

  async sendSensorAlert(sensorType: string, value: number, issue: string, deviceId: string): Promise<boolean> {
    const message = `Cảm biến <b>${sensorType}</b> có vấn đề:\n- Giá trị: ${value}\n- Vấn đề: ${issue}`;
    return this.sendAlert(message, { type: 'SENSOR_INVALID', severity: 'error', deviceId });
  }

  async sendDeviceStatusAlert(deviceId: string, status: 'online' | 'offline'): Promise<boolean> {
    const type = status === 'online' ? 'DEVICE_ONLINE' : 'DEVICE_OFFLINE';
    const message = `Thiết bị <b>${deviceId}</b> đã ${status === 'online' ? 'hoạt động trở lại' : 'ngừng hoạt động'}`;
    return this.sendAlert(message, { type, severity: status === 'offline' ? 'critical' : 'info', deviceId });
  }

  async sendSecurityAlert(alertType: string, details: string): Promise<boolean> {
    const typeMap: Record<string, string> = {
      failed_login: 'LOGIN_FAILED',
      lockout: 'LOGIN_LOCKOUT'
    };
    const message = `🔐 Cảnh báo bảo mật: <b>${alertType}</b>\n${details}`;
    return this.sendAlert(message, { type: typeMap[alertType] || 'SYSTEM_ERROR', severity: 'warning' });
  }

  setCooldown(key: string, durationMs: number = 60000): void {
    this.cooldowns.set(key, Date.now() + durationMs);
  }

  checkCooldown(key: string): boolean {
    const cooldownUntil = this.cooldowns.get(key);
    if (cooldownUntil && cooldownUntil > Date.now()) {
      return true;
    }
    this.cooldowns.delete(key);
    return false;
  }

  getHistory(limit: number = 50): AlertHistoryEntry[] {
    return this.alertHistory.slice(-limit);
  }

  getConfig(): AlertConfig {
    return { ...CONFIG };
  }

  clearHistory(): void {
    this.alertHistory = [];
  }

  isEnabled(): boolean {
    return CONFIG.alertEnabled;
  }
}

export default new AlertService();