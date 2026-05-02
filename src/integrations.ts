import { getAll, getOne, runQuery } from './config/database';
import logger from './config/logger';

interface InfluxConfig {
  url?: string;
  token?: string;
  org?: string;
  bucket?: string;
}

interface MQTTConfig {
  broker?: string;
  username?: string;
  password?: string;
}

interface AppConfig {
  influx?: InfluxConfig;
  mqtt?: MQTTConfig;
}

let influxClient: unknown = null;
let mqttClient: unknown = null;
let appConfig: AppConfig | null = null;

export function initIntegrations(config: AppConfig): void {
  appConfig = config;
  initInfluxDB(config.influx);
  initMQTTBridge(config.mqtt);
}

export async function initInfluxDB(config?: InfluxConfig): Promise<void> {
  if (!config?.url) {
    logger.info('InfluxDB not configured, skipping...');
    return;
  }
  
  try {
    const { InfluxDB, Point } = require('@influxdata/influxdb-client');
    influxClient = new InfluxDB({ url: config.url, token: config.token });
    logger.info('InfluxDB client initialized');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('InfluxDB initialization failed:', errorMessage);
  }
}

export async function writeSensorDataToInflux(sensorType: string, value: number, tags: Record<string, string> = {}): Promise<void> {
  if (!influxClient) return;
  
  try {
    const { Point } = require('@influxdata/influxdb-client');
    const writeApi = (influxClient as { getWriteApi: (org: string, bucket: string) => unknown }).getWriteApi(appConfig!.influx!.org, appConfig!.influx!.bucket);
    
    const point = new Point('sensor_data')
      .tag('type', sensorType)
      .floatField('value', value)
      .timestamp(new Date());
    
    Object.entries(tags).forEach(([key, val]) => point.tag(key, val));
    
    await (writeApi as { writePoint: (point: unknown) => Promise<void>; close: () => Promise<void> }).writePoint(point);
    await (writeApi as { writePoint: (point: unknown) => Promise<void>; close: () => Promise<void> }).close();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('InfluxDB write error:', errorMessage);
  }
}

export function initMQTTBridge(config?: MQTTConfig): void {
  if (!config?.broker) {
    logger.info('MQTT bridge not configured, skipping...');
    return;
  }
  
  try {
    const mqtt = require('mqtt');
    const client = mqtt.connect(config.broker, {
      clientId: 'ecosyntech-bridge',
      username: config.username,
      password: config.password
    });
    
    mqttClient = client;
    
    client.on('connect', () => {
      logger.info('MQTT bridge connected');
      client.subscribe('ecosyntech/#', { qos: 1 });
    });
    
    client.on('message', (topic: string, message: Buffer) => {
      handleMQTTMessage(topic, message.toString());
    });
    
    client.on('error', (err: Error) => {
      logger.error('MQTT bridge error:', err.message);
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('MQTT bridge initialization failed:', errorMessage);
  }
}

function handleMQTTMessage(topic: string, message: string): void {
  try {
    const data = JSON.parse(message);
    const parts = topic.split('/');
    
    if (parts[1] === 'sensors') {
      const sensorType = parts[2];
      const { v4: uuidv4 } = require('uuid');
      runQuery(
        'INSERT INTO sensor_readings (id, sensor_type, value, timestamp) VALUES (?, ?, ?, ?)',
        [uuidv4(), sensorType, data.value, new Date().toISOString()]
      );
      
      runQuery(
        'UPDATE sensors SET value = ?, timestamp = ? WHERE type = ?',
        [data.value, new Date().toISOString(), sensorType]
      );
    }
    
    if (parts[1] === 'devices') {
      const deviceId = parts[2];
      runQuery(
        'UPDATE devices SET status = ?, last_seen = ? WHERE id = ?',
        [data.status, new Date().toISOString(), deviceId]
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('MQTT message handling error:', errorMessage);
  }
}

export function publishToMQTT(topic: string, message: unknown): void {
  if (mqttClient && (mqttClient as { connected: boolean }).connected) {
    (mqttClient as { publish: (topic: string, msg: string, opts: { qos: number }) => void }).publish(topic, JSON.stringify(message), { qos: 1 });
  }
}

export function getInfluxClient(): unknown {
  return influxClient;
}

export function getMQTTClient(): unknown {
  return mqttClient;
}

export function closeIntegrations(): void {
  if (mqttClient) {
    (mqttClient as { end: () => void }).end();
  }
  logger.info('Integrations closed');
}

export default {
  initIntegrations,
  writeSensorDataToInflux,
  publishToMQTT,
  getInfluxClient,
  getMQTTClient,
  closeIntegrations
};