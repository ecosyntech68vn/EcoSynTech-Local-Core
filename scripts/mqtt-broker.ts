#!/usr/bin/env node
'use strict';

import Aedes from('aedes');
import http from('http');
import websocket from('websocket-stream');
import net from('net');
import { WebSocketServer } from('ws');

import PORT = parseInt(process.env.MQTT_PORT || '1883', 10);
import WS_PORT = parseInt(process.env.MQTT_WS_PORT || '8884', 10);
import MQTT_USERNAME = process.env.MQTT_USERNAME || 'ecosyntech';
import MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'change_me';

import aedes = Aedes({
  authenticate: authenticate,
  authorizePublish: authorizePublish,
  authorizeSubscribe: authorizeSubscribe
});

function authenticate(client, username, password, callback) {
  if (username === MQTT_USERNAME && password === MQTT_PASSWORD) {
    console.log(`[MQTT] Client ${client.id} authenticated`);
    callback(null, true);
  } else {
    console.log(`[MQTT] Auth failed for ${username}`);
    callback(new Error('Invalid credentials'), false);
  }
}

function authorizePublish(client, topic, payload, callback) {
  console.log(`[MQTT] Publish: ${client.id} -> ${topic}`);
  callback(null);
}

function authorizeSubscribe(client, topic, callback) {
  console.log(`[MQTT] Subscribe: ${client.id} -> ${topic}`);
  callback(null, topic);
}

// TCP Server for MQTT
import tcpServer = net.createServer(aedes.handle);

tcpServer.listen(PORT, () => {
  console.log(`[MQTT] TCP broker running on port ${PORT}`);
});

// WebSocket Server for MQTT over WebSocket
import httpServer = http.createServer();
import wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const stream = websocket.createStream({ websocket: ws });
  aedes.handle(stream);
});

httpServer.listen(WS_PORT, () => {
  console.log(`[MQTT] WebSocket broker running on port ${WS_PORT}`);
});

aedes.on('client', (client) => {
  console.log(`[MQTT] Client connected: ${client.id}`);
});

aedes.on('clientDisconnect', (client) => {
  console.log(`[MQTT] Client disconnected: ${client.id}`);
});

aedes.on('publish', (packet, client) => {
  if (client) {
    const payload = packet.payload.toString();
    console.log(`[MQTT] ${client.id} -> ${packet.topic}: ${payload.substring(0, 80)}${payload.length > 80 ? '...' : ''}`);
  }
});

aedes.on('subscribe', (subscriptions, client) => {
  console.log(`[MQTT] ${client.id} subscribed: ${subscriptions.map(s => s.topic).join(', ')}`);
});

process.on('SIGINT', () => {
  console.log('[MQTT] Shutting down...');
  tcpServer.close();
  httpServer.close();
  aedes.close();
  process.exit(0);
});

console.log(`[MQTT] EcoSynTech MQTT Broker v2.0.0`);
console.log(`[MQTT] TCP: port ${PORT}, WS: port ${WS_PORT}`);
console.log(`[MQTT] Auth: ${MQTT_USERNAME} / ${MQTT_PASSWORD}`);
