import logger from '../config/logger';
import { sendMessage as telegramSendMessage } from './telegramService';

const ALERT_LEVELS: Record<string, string> = {
  CRITICAL: 'critical',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

type AlertLevel = 'critical' | 'error' | 'warning' | 'info';

interface AlertResult {
  success: boolean;
  error?: string;
}

interface NotifyOptions {
  context?: Record<string, unknown>;
  farmId?: string;
}

function formatAlertMessage(level: AlertLevel, title: string, details?: unknown): string {
  const icons: Record<AlertLevel, string> = {
    critical: '🔴',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  const icon = icons[level] || 'ℹ️';

  let message = `*${icon} EcoSynTech Alert: ${title}*\n`;
  message += `Level: \`${level.toUpperCase()}\`\n`;
  message += `Time: \`${new Date().toISOString()}\`\n\n`;

  if (details) {
    message += `Details:\n\`\`\`\n${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}\n\`\`\``;
  }

  return message;
}

async function alert(level: AlertLevel, title: string, details?: unknown): Promise<AlertResult> {
  if (level === ALERT_LEVELS.INFO) {
    logger.info(title, details);
    return { success: true };
  }

  const message = formatAlertMessage(level, title, details);
  logger.warn(`${title}: ${JSON.stringify(details)}`);

  if (level === ALERT_LEVELS.CRITICAL || level === ALERT_LEVELS.ERROR) {
    const success = await telegramSendMessage(message);
    return { success };
  }
  
  return { success: false, error: 'Below threshold' };
}

async function notifyError(error: Error, context: Record<string, unknown> = {}): Promise<AlertResult> {
  const isCritical = error.message?.includes('database') ||
    error.message?.includes('connection') ||
    error.message?.includes('MQTT');

  const level: AlertLevel = isCritical ? 'critical' : 'error';
  const title = `Error: ${error.message || 'Unknown error'}`;
  const details = {
    error: error.message,
    stack: error.stack,
    ...context
  };

  return alert(level, title, details);
}

async function notifyDeviceOffline(deviceId: string, farmId: string): Promise<AlertResult> {
  return alert(
    'warning' as AlertLevel,
    'Thiết bị offline',
    { deviceId, farmId, timestamp: new Date().toISOString() }
  );
}

async function notifySensorAnomaly(sensorType: string, value: number, threshold: number): Promise<AlertResult> {
  return alert(
    'warning' as AlertLevel,
    'Cảm biến bất thường',
    { sensorType, value, threshold, timestamp: new Date().toISOString() }
  );
}

async function notifyIrrigationComplete(farmId: string, duration: number): Promise<AlertResult> {
  return alert(
    'info' as AlertLevel,
    'Tưới tiêu hoàn tất',
    { farmId, duration, timestamp: new Date().toISOString() }
  );
}

async function notifySecurityAlert(alertType: string, details: Record<string, unknown>): Promise<AlertResult> {
  return alert(
    'critical' as AlertLevel,
    `Cảnh báo bảo mật: ${alertType}`,
    details
  );
}

export {
  ALERT_LEVELS,
  alert,
  notifyError,
  notifyDeviceOffline,
  notifySensorAnomaly,
  notifyIrrigationComplete,
  notifySecurityAlert,
  formatAlertMessage
};