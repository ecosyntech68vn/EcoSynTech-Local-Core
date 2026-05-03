/**
 * Telegram Service - Notification system with queue
 * Converted to TypeScript - Phase 1
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger';
import { getBreaker } from './circuitBreaker';

import TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
import TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

import MESSAGE_QUEUE_PATH = path.join(__dirname, '..', '..', 'data', 'telegram_queue.json');

export interface AlertTemplate {
  critical: string;
  high: string;
  medium: string;
  low: string;
  info: string;
}

export interface TelegramMessage {
  id?: string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_notification?: boolean;
  reply_to_message_id?: number;
}

export interface QueuedMessage {
  id: string;
  text: string;
  priority: string;
  timestamp: string;
  retries: number;
}

export const ALERT_TEMPLATE: AlertTemplate = {
  critical: '🔴 CRITICAL',
  high: '🟠 HIGH',
  medium: '🟡 MEDIUM',
  low: '🔵 LOW',
  info: 'ℹ️ INFO'
};

import telegramBreaker = getBreaker('telegram', { 
  failureThreshold: 5, 
  timeout: 60000 
});

function ensureQueueFile(): void {
  try {
    const dir = path.dirname(MESSAGE_QUEUE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(MESSAGE_QUEUE_PATH)) {
      fs.writeFileSync(MESSAGE_QUEUE_PATH, '[]');
    }
  } catch (e: any) {
    logger.warn('[Telegram] Queue init error:', e.message);
  }
}

function loadQueue(): QueuedMessage[] {
  try {
    ensureQueueFile();
    return JSON.parse(fs.readFileSync(MESSAGE_QUEUE_PATH, 'utf8') || '[]');
  } catch (e: any) { 
    logger.error('[Telegram] Queue load error:', e.message);
    return []; 
  }
}

function saveQueue(queue: QueuedMessage[]): void {
  try {
    fs.writeFileSync(MESSAGE_QUEUE_PATH, JSON.stringify(queue, null, 2));
  } catch (e: any) {
    logger.warn('[Telegram] Queue save error:', e.message);
  }
}

export function isEnabled(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

export async function sendMessage(text: string, parseMode: 'Markdown' | 'HTML' = 'HTML'): Promise<boolean> {
  if (!isEnabled()) {
    logger.debug('[Telegram] Not configured, skipping');
    return false;
  }

  return telegramBreaker.execute(async () => {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: parseMode
    });

    if (response.data.ok) {
      logger.info('[Telegram] Message sent successfully');
      return true;
    } else {
      logger.error('[Telegram] API error:', response.data.description);
      return false;
    }
  }).then(() => true).catch((err: any) => {
    logger.error('[Telegram] Send failed:', err.message);
    return false;
  });
}

export async function sendAlert(message: string, priority: string = 'info'): Promise<boolean> {
  const prefix = ALERT_TEMPLATE[priority as keyof AlertTemplate] || ALERT_TEMPLATE.info;
  const text = `${prefix}\n\n${message}`;
  return sendMessage(text);
}

export async function sendDeviceAlert(deviceName: string, status: 'online' | 'offline'): Promise<boolean> {
  const statusText = status === 'online' ? '🟢 Online' : '🔴 Offline';
  const message = `Device Status Update\n\n📱 Device: ${deviceName}\n⚡ Status: ${statusText}`;
  return sendAlert(message, status === 'offline' ? 'high' : 'info');
}

export async function sendSensorAlert(sensorName: string, value: number, unit: string, alertType: string): Promise<boolean> {
  const message = `Sensor Alert\n\n🌡️ Sensor: ${sensorName}\n📊 Value: ${value} ${unit}\n⚠️ Type: ${alertType}`;
  return sendAlert(message, 'medium');
}

export async function sendBatchMessage(messages: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const text of messages) {
    const result = await sendMessage(text);
    if (result) success++;
    else failed++;
  }

  return { success, failed };
}

export function queueMessage(text: string, priority: string = 'low'): void {
  const queue = loadQueue();
  const message: QueuedMessage = {
    id: Date.now().toString(36),
    text,
    priority,
    timestamp: new Date().toISOString(),
    retries: 0
  };
  queue.push(message);
  saveQueue(queue);
  logger.info(`[Telegram] Queued message: ${message.id}`);
}

export async function processQueue(): Promise<{ processed: number; success: number }> {
  const queue = loadQueue();
  let processed = 0;
  let success = 0;

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  queue.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  const remaining: QueuedMessage[] = [];

  for (const msg of queue) {
    const result = await sendMessage(msg.text);
    processed++;
    if (result) {
      success++;
    } else {
      msg.retries++;
      if (msg.retries < 3) {
        remaining.push(msg);
      }
    }
  }

  saveQueue(remaining);
  return { processed, success };
}

export function clearQueue(): void {
  saveQueue([]);
  logger.info('[Telegram] Queue cleared');
}

export function getQueueStatus(): { pending: number; oldest: string | null } {
  const queue = loadQueue();
  return {
    pending: queue.length,
    oldest: queue.length > 0 && queue[0] ? queue[0].timestamp : null
  };
}

export default {
  isEnabled,
  sendMessage,
  sendAlert,
  sendDeviceAlert,
  sendSensorAlert,
  sendBatchMessage,
  queueMessage,
  processQueue,
  clearQueue,
  getQueueStatus
};