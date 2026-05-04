const telegramAlertService = require('./telegramAlertService');
const telegramService = require('./telegramService');
const ZaloService = require('./zaloService');
const { textToSpeech, getTempDir } = require('./ttsService');
const path = require('path');

const ALERT_LEVELS = {
  CRITICAL: 'critical',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

let zaloServiceInstance = null;
let alertHistory = [];
const MAX_HISTORY = 1000;

const CONFIG = {
  telegramEnabled: true,
  zaloEnabled: true,
  voiceEnabled: false,
  criticalChannels: ['telegram', 'zalo'],
  warningChannels: ['telegram'],
  infoChannel: ['telegram']
};

function initZalo(accessToken, oaId) {
  if (accessToken && oaId) {
    zaloServiceInstance = new ZaloService(accessToken, oaId);
    CONFIG.zaloEnabled = true;
    console.log('[Alert] Zalo service initialized');
  }
}

function formatAlertMessage(level, title, details) {
  const icons = {
    critical: '🔴',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  const icon = icons[level] || 'ℹ️';
  
  let message = `${icon} *EcoSynTech Alert: ${title}*\n`;
  message += `Level: \`${level.toUpperCase()}\`\n`;
  message += `Time: \`${new Date().toLocaleString('vi-VN')}\`\n\n`;
  
  if (details) {
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
    message += `Details:\n\`\`\`\n${detailsStr}\n\`\`\``;
  }
  
  return message;
}

function getAlertStats() {
  return {
    total: alertHistory.length,
    critical: alertHistory.filter(a => a.level === ALERT_LEVELS.CRITICAL).length,
    error: alertHistory.filter(a => a.level === ALERT_LEVELS.ERROR).length,
    warning: alertHistory.filter(a => a.level === ALERT_LEVELS.WARNING).length,
    info: alertHistory.filter(a => a.level === ALERT_LEVELS.INFO).length
  };
}

async function sendAlert(title, data) {
  const level = data.level || ALERT_LEVELS.WARNING;
  const details = data.details || data;
  const userIds = data.userIds || [];
  const isVoice = data.isVoice === true || title.toLowerCase().includes('khẩn') || title.toLowerCase().includes('báo động');
  
  const message = formatAlertMessage(level, title, details);
  
  const alertRecord = {
    id: Date.now(),
    level,
    title,
    details,
    timestamp: new Date().toISOString()
  };
  alertHistory.unshift(alertRecord);
  if (alertHistory.length > MAX_HISTORY) {
    alertHistory = alertHistory.slice(0, MAX_HISTORY);
  }
  
  const results = { telegram: null, zalo: null, voice: null };
  
  const channels = level === ALERT_LEVELS.CRITICAL || level === ALERT_LEVELS.ERROR
    ? CONFIG.criticalChannels
    : level === ALERT_LEVELS.WARNING
      ? CONFIG.warningChannels
      : CONFIG.infoChannel;
  
  for (const channel of channels) {
    if (channel === 'telegram') {
      try {
        results.telegram = await telegramService.sendTelegramMessage(message);
      } catch (e) {
        console.error('[Alert] Telegram error:', e.message);
      }
    }
    
    if (channel === 'zalo' && zaloServiceInstance) {
      try {
        for (const userId of userIds) {
          results.zalo = await zaloServiceInstance.sendText(userId, message);
          
          if (isVoice && CONFIG.voiceEnabled) {
            await sendVoiceAlert(userId, message);
          }
        }
      } catch (e) {
        console.error('[Alert] Zalo error:', e.message);
      }
    }
  }
  
  return results;
}

async function sendVoiceAlert(userId, text) {
  if (!zaloServiceInstance || !CONFIG.voiceEnabled) {
    return null;
  }
  
  try {
    const voicePath = await textToSpeech(text, 'vi', false);
    if (voicePath) {
      const voiceUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/temp/${path.basename(voicePath)}`;
      const result = await zaloServiceInstance.sendVoice(userId, voiceUrl, 15);
      return result;
    }
  } catch (error) {
    console.error('[Alert] Voice error:', error);
  }
  
  return null;
}

function getAlertHistory(limit = 50) {
  return alertHistory.slice(0, limit);
}

function setAlertConfig(config) {
  Object.assign(CONFIG, config);
}

function getAlertConfig() {
  return { ...CONFIG };
}

function getZaloService() {
  return zaloServiceInstance;
}

function isZaloEnabled() {
  return CONFIG.zaloEnabled && zaloServiceInstance !== null;
}

module.exports = {
  ALERT_LEVELS,
  initZalo,
  sendAlert,
  sendVoiceAlert,
  getAlertStats,
  getAlertHistory,
  setConfig: setAlertConfig,
  getConfig: getAlertConfig,
  getZaloService,
  isZaloEnabled,
  getAlertService: () => ({
    sendAlert,
    getAlertStats,
    getAlertHistory,
    setConfig: setAlertConfig,
    getConfig: getAlertConfig
  })
};