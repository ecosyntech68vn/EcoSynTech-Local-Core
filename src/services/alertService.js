/**
 * Alert Service - Monitoring & Notification System
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

const axios = require('axios');
const logger = require('../config/logger');

const CONFIG = {
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

const ALERT_TYPES = {
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

class AlertService {
  constructor() {
    this.alertHistory = [];
    this.maxHistory = 100;
    this.cooldowns = new Map();
  }

  async sendTelegramAlert(message, severity = 'info') {
    if (!CONFIG.telegram.enabled || !CONFIG.telegram.botToken) {
      logger.debug('[Alert] Telegram not configured');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const url = `${CONFIG.telegram.apiUrl}${CONFIG.telegram.botToken}/sendMessage`;
      const emoji = this.getSeverityEmoji(severity);
      
      const response = await axios.post(url, {
        chat_id: CONFIG.telegram.chatId,
        text: `${emoji} ${message}`,
        parse_mode: 'Markdown'
      });

      logger.info('[Alert] Telegram alert sent');
      return { success: true, messageId: response.data.result.message_id };
    } catch (err) {
      logger.error('[Alert] Telegram failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async sendZaloAlert(message, severity = 'info') {
    if (!CONFIG.zalo.enabled || !CONFIG.zalo.accessToken) {
      logger.debug('[Alert] Zalo not configured');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const url = `${CONFIG.zalo.apiUrl}/message`;
      
      const response = await axios.post(url, {
        recipient: { user_id: CONFIG.zalo.userId },
        message: {
          text: message
        }
      }, {
        headers: {
          'access_token': CONFIG.zalo.accessToken,
          'Content-Type': 'application/json'
        }
      });

      logger.info('[Alert] Zalo alert sent');
      return { success: true, details: response.data };
    } catch (err) {
      logger.error('[Alert] Zalo failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  getSeverityEmoji(severity) {
    const map = {
      critical: '🔴',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    return map[severity] || 'ℹ️';
  }

  formatAlertMessage(alertType, data) {
    const type = ALERT_TYPES[alertType] || { emoji: '📢' };
    const timestamp = new Date().toLocaleString('vi-VN');
    
    let message = `${type.emoji} *EcoSynTech Alert*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🔔 *${alertType.replace(/_/g, ' ')}*\n`;
    message += `🕐 ${timestamp}\n\n`;
    
    if (data.device) {
      message += `📡 Thiết bị: ${data.device}\n`;
    }
    if (data.sensor) {
      message += `🌡️ Cảm biến: ${data.sensor}\n`;
    }
    if (data.value !== undefined) {
      message += `📊 Giá trị: ${data.value}\n`;
    }
    if (data.expected) {
      message += `📈 Mong đợi: ${data.expected}\n`;
    }
    if (data.message) {
      message += `\n📝 ${data.message}\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━`;
    
    return message;
  }

  async sendAlert(alertType, data = {}) {
    if (!CONFIG.alertEnabled) {
      logger.debug('[Alert] Alerts disabled');
      return { success: false, reason: 'disabled' };
    }

    const cooldownKey = `${alertType}_${data.device || 'system'}`;
    const now = Date.now();
    const cooldownMs = 300000;

    if (this.cooldowns.has(cooldownKey)) {
      const lastAlert = this.cooldowns.get(cooldownKey);
      if (now - lastAlert < cooldownMs) {
        logger.debug(`[Alert] Cooldown active for ${cooldownKey}`);
        return { success: false, reason: 'cooldown' };
      }
    }

    const type = ALERT_TYPES[alertType] || { severity: 'info' };
    const message = this.formatAlertMessage(alertType, data);

    const results = {
      timestamp: now,
      alertType,
      severity: type.severity,
      telegram: null,
      zalo: null
    };

    if (CONFIG.telegram.enabled) {
      results.telegram = await this.sendTelegramAlert(message, type.severity);
    }

    if (CONFIG.zalo.enabled) {
      results.zalo = await this.sendZaloAlert(message, type.severity);
    }

    this.alertHistory.push(results);
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory.shift();
    }

    this.cooldowns.set(cooldownKey, now);

    return {
      success: results.telegram?.success || results.zalo?.success || false,
      results
    };
  }

  async sendSensorAlert(sensorType, value, issues) {
    return this.sendAlert('SENSOR_INVALID', {
      sensor: sensorType,
      value: value,
      message: issues.join(', ')
    });
  }

  async sendOutlierAlert(deviceId, sensorType, value, zScore) {
    return this.sendAlert('SENSOR_OUTLIER', {
      device: deviceId,
      sensor: sensorType,
      value: value.toFixed(2),
      message: `Z-score: ${zScore}`
    });
  }

  async sendSpikeAlert(deviceId, sensorType, value, deltaPercent) {
    return this.sendAlert('SENSOR_SPIKE', {
      device: deviceId,
      sensor: sensorType,
      value: value.toFixed(2),
      expected: `±${deltaPercent}%`
    });
  }

  async sendDeviceStatusAlert(deviceId, status) {
    const alertType = status === 'online' ? 'DEVICE_ONLINE' : 'DEVICE_OFFLINE';
    return this.sendAlert(alertType, {
      device: deviceId,
      message: `Thiết bị ${status === 'online' ? 'kết nối lại' : 'mất kết nối'}`
    });
  }

  async sendRuleAlert(ruleName, triggered, error = null) {
    return this.sendAlert(triggered ? 'RULE_TRIGGERED' : 'RULE_FAILED', {
      message: error ? `Rule "${ruleName}" thất bại: ${error}` : `Rule "${ruleName}" đã kích hoạt`
    });
  }

  async sendLoginAlert(email, status, attempts = 0) {
    if (status === 'lockout') {
      return this.sendAlert('LOGIN_LOCKOUT', {
        message: `Tài khoản ${email} bị khóa sau ${attempts} lần thử sai`
      });
    }
    return this.sendAlert('LOGIN_FAILED', {
      message: `Đăng nhập thất bại: ${email} (${attempts} lần)`
    });
  }

  getAlertHistory(limit = 10) {
    return this.alertHistory.slice(-limit);
  }

  getStats() {
    const total = this.alertHistory.length;
    const bySeverity = { critical: 0, error: 0, warning: 0, info: 0 };
    
    this.alertHistory.forEach(a => {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    });

    return {
      total,
      bySeverity,
      lastAlert: this.alertHistory[this.alertHistory.length - 1]
    };
  }
}

let alertService = null;

function getAlertService() {
  if (!alertService) {
    alertService = new AlertService();
  }
  return alertService;
}

module.exports = {
  AlertService,
  getAlertService,
  CONFIG,
  ALERT_TYPES
};