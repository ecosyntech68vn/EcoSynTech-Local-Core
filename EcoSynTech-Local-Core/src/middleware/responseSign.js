'use strict';
const crypto = require('crypto');

const NONCE_STORE = new Map();

function canonicalJson(payload) {
  if (!payload || typeof payload !== 'object') return '{}';
  const keys = Object.keys(payload).sort();
  const obj = {};
  for (const k of keys) obj[k] = payload[k];
  return JSON.stringify(obj);
}

function lookupDeviceSecret(did) {
  const secrets = require('./deviceAuth').DEV_SECRETS || {};
  return secrets[did] || null;
}

function getDeviceSecret(did) {
  const secrets = global.DEVICE_SECRETS || {};
  return secrets[did] || null;
}

module.exports = function responseSignMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.signedJson = function(data) {
    const deviceId = req.deviceId || req.body._did;
    if (!deviceId) {
      return originalJson(data);
    }
    
    const secret = getDeviceSecret(deviceId);
    if (!secret) {
      console.warn('[responseSign] No secret for device:', deviceId);
      return originalJson(data);
    }
    
    const ts = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = { ...data, _ts: ts, _nonce: nonce };
    const canon = canonicalJson(payload);
    const msg = deviceId + '|' + nonce + '|' + ts + '|' + canon;
    const signature = crypto.createHmac('sha256', secret).update(msg).digest('hex');
    
    const envelope = {
      ...payload,
      _did: deviceId,
      signature: signature
    };
    
    return originalJson(envelope);
  };
  
  next();
};

module.exports.responseSign = responseSignMiddleware;
module.exports.lookupDeviceSecret = lookupDeviceSecret;
module.exports.getDeviceSecret = getDeviceSecret;
module.exports.canonicalJson = canonicalJson;
