import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../config/logger';

interface AuthData {
  token?: string;
}

interface SubscribeData {
  topics?: string | string[];
}

interface ClientMessage {
  type: string;
  [key: string]: unknown;
}

interface WSClient extends WebSocket {
  clientId?: string;
  isAlive?: boolean;
  user?: jwt.JwtPayload;
  subscriptions?: Set<string>;
}

let wss: WebSocket.Server | null = null;
import clients = new Set<WSClient>();

export function initWebSocket(server: unknown): WebSocket.Server {
  wss = new WebSocket.Server({ 
    server: server as WebSocket.Server.Options['server'],
    path: '/ws'
  });

  wss.on('connection', (ws: WSClient, _req: unknown) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    ws.clientId = clientId;
    ws.isAlive = true;
    clients.add(ws);

    logger.info(`WebSocket client connected: ${clientId}`);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message: WebSocket.Data) => {
      try {
        const data = JSON.parse(message.toString()) as ClientMessage;
        handleClientMessage(ws, data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('Failed to parse WebSocket message:', errorMessage);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (err: Error) => {
      logger.error(`WebSocket error for ${clientId}:`, err);
      clients.delete(ws);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));
  });

  const interval = setInterval(() => {
    wss!.clients.forEach((ws: WebSocket) => {
      const client = ws as WSClient;
      if (client.isAlive === false) {
        clients.delete(client);
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  logger.info('WebSocket server initialized');
  return wss;
}

function handleClientMessage(ws: WSClient, data: ClientMessage): void {
  switch (data.type) {
  case 'auth':
    handleAuth(ws, data as unknown as AuthData);
    break;
  case 'ping':
    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
    break;
  case 'subscribe':
    handleSubscribe(ws, data as unknown as SubscribeData);
    break;
  case 'unsubscribe':
    handleUnsubscribe(ws, data as unknown as SubscribeData);
    break;
  default:
    ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${data.type}` }));
  }
}

function handleAuth(ws: WSClient, data: AuthData): void {
  const { token } = data;
  
  if (!token) {
    ws.send(JSON.stringify({ type: 'auth', success: false, message: 'Token required' }));
    return;
  }

  try {
    const decoded = jwt.verify(token, (config as { jwt: { secret: string } }).jwt.secret) as jwt.JwtPayload;
    ws.user = decoded;
    ws.send(JSON.stringify({ 
      type: 'auth', 
      success: true, 
      user: { id: decoded.id, email: decoded.email, role: decoded.role }
    }));
    logger.info(`WebSocket client authenticated: ${decoded.email}`);
  } catch (err) {
    ws.send(JSON.stringify({ type: 'auth', success: false, message: 'Invalid token' }));
  }
}

function handleSubscribe(ws: WSClient, data: SubscribeData): void {
  const { topics } = data;
  
  if (!ws.subscriptions) {
    ws.subscriptions = new Set();
  }
  
  if (Array.isArray(topics)) {
    topics.forEach(topic => ws.subscriptions!.add(topic));
  } else if (topics) {
    ws.subscriptions.add(topics);
  }
  
  ws.send(JSON.stringify({ 
    type: 'subscribed', 
    topics: Array.from(ws.subscriptions)
  }));
}

function handleUnsubscribe(ws: WSClient, data: SubscribeData): void {
  const { topics } = data;
  
  if (!ws.subscriptions) return;
  
  if (Array.isArray(topics)) {
    topics.forEach(topic => ws.subscriptions.delete(topic));
  } else if (topics) {
    ws.subscriptions.delete(topics);
  }
  
  ws.send(JSON.stringify({ 
    type: 'unsubscribed', 
    topics: Array.from(ws.subscriptions)
  }));
}

export function broadcast(data: unknown, topics: string[] | null = null): void {
  const message = JSON.stringify(data);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (topics && client.subscriptions) {
        const hasMatchingTopic = topics.some(topic => client.subscriptions!.has(topic));
        if (!hasMatchingTopic) return;
      }
      client.send(message);
    }
  });
}

export function broadcastSensorUpdate(sensorData: unknown): void {
  broadcast({
    type: 'sensor-update',
    data: sensorData,
    timestamp: new Date().toISOString()
  }, 'sensors');
}

export function broadcastAlert(alertData: unknown): void {
  broadcast({
    type: 'alert',
    data: alertData,
    timestamp: new Date().toISOString()
  }, 'alerts');
}

export function broadcastDeviceUpdate(deviceData: unknown): void {
  broadcast({
    type: 'device-update',
    data: deviceData,
    timestamp: new Date().toISOString()
  }, 'devices');
}

export function getConnectedClients(): number {
  return clients.size;
}

export default {
  initWebSocket,
  broadcast,
  broadcastSensorUpdate,
  broadcastAlert,
  broadcastDeviceUpdate,
  getConnectedClients
};