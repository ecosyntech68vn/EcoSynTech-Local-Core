'use strict';
const express = require('express');
const router = express.Router();
const deviceAuth = require('../middleware/deviceAuth');
const responseSign = require('../middleware/responseSign');
const { getInstance: getDeviceSecretsSync } = require('../services/deviceSecretsSync');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.post('/action', 
  deviceAuth, 
  responseSign.responseSign,
  asyncHandler(async (req, res) => {
    const { action, payload, readings } = req.body;
    const deviceId = req.deviceId;
    
    console.log(`[DeviceAction] Device ${deviceId} action: ${action}`);
    
    let result = { ok: false };
    
    switch (action) {
      case 'log_data':
      case 'log_sensor':
        result = await handleLogData(deviceId, readings || payload);
        break;
        
      case 'heartbeat':
        result = await handleHeartbeat(deviceId, payload);
        break;
        
      case 'status':
        result = await handleStatus(deviceId, payload);
        break;
        
      case 'alert':
        result = await handleAlert(deviceId, payload);
        break;
        
      case 'config_request':
        result = await handleConfigRequest(deviceId, payload);
        break;
        
      default:
        console.warn(`[DeviceAction] Unknown action: ${action}`);
        result = { ok: false, code: 'UNKNOWN_ACTION' };
    }
    
    res.signedJson(result);
  })
);

async function handleLogData(deviceId, readings) {
  if (!readings || !Array.isArray(readings)) {
    return { ok: false, code: 'INVALID_READINGS' };
  }
  
  let written = 0;
  let rejected = 0;
  
  for (const reading of readings) {
    if (!reading.sensor_type || reading.value === undefined) {
      rejected++;
      continue;
    }
    
    written++;
  }
  
  console.log(`[DeviceAction] Device ${deviceId} logged ${written} readings, ${rejected} rejected`);
  
  return {
    ok: true,
    written: written,
    rejected: rejected,
    timestamp: Date.now()
  };
}

async function handleHeartbeat(deviceId, payload) {
  const sync = getDeviceSecretsSync();
  
  return {
    ok: true,
    device_id: deviceId,
    status: 'online',
    server_time: Date.now(),
    secrets_sync: sync.isReady(),
    last_sync: sync.getLastSyncTime()
  };
}

async function handleStatus(deviceId, payload) {
  return {
    ok: true,
    device_id: deviceId,
    mode: payload?.mode || 'LENIENT',
    firmware_version: payload?.fw_version || 'V9.2.1',
    capabilities: ['log_data', 'heartbeat', 'status', 'alert', 'config_request']
  };
}

async function handleAlert(deviceId, payload) {
  console.log(`[DeviceAction] Alert from ${deviceId}:`, payload);
  
  return {
    ok: true,
    alert_id: `alert_${Date.now()}`,
    device_id: deviceId,
    acknowledged: true
  };
}

async function handleConfigRequest(deviceId, payload) {
  const config = {
    report_interval: 60,
    heartbeat_interval: 300,
    log_level: 'info',
    mode: 'LENIENT',
    features: {
      anomaly_detection: true,
      auto_reconnect: true,
      signed_response: true
    }
  };
  
  return {
    ok: true,
    config: config,
    signature_required: true
  };
}

module.exports = router;
