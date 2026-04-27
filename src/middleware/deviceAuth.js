'use strict';
const crypto = require('crypto');

const NONCE_STORE = new Map();

class NonceCache {
  constructor(tsWindowSec) {
    this.tsWindowSec = tsWindowSec || 300;
    this._cache = new Map();
    this._cleanupInterval = setInterval(() => this._cleanup(), this.tsWindowSec * 1000);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  _cleanup() {
    const now = Date.now();
    const windowMs = this.tsWindowSec * 1000 * 2;
    for (const [key, val] of this._cache) {
      if (now - val > windowMs) this._cache.delete(key);
    }
  }

  has(key) { return this._cache.has(key); }
  remember(key) { this._cache.set(key, Date.now()); }
  destroy() {
    if (this._cleanupInterval) clearInterval(this._cleanupInterval);
  }
}

function canonicalJson(payload) {
  if (!payload || typeof payload !== 'object') return '{}';
  const keys = Object.keys(payload).sort();
  const obj = {};
  for (const k of keys) obj[k] = payload[k];
  return JSON.stringify(obj);
}

function deviceAuth(opts) {
  if (!opts || typeof opts.lookupDeviceSecret !== 'function') {
    throw new Error('lookupDeviceSecret function required');
  }

  const lookupDeviceSecret = opts.lookupDeviceSecret;
  const nonceCache = opts.nonceCache || new NonceCache(opts.tsWindowSec ? opts.tsWindowSec * 2 : 600);
  const tsWindowSec = opts.tsWindowSec || 300;
  const logger = opts.logger || console;

  return async function deviceAuthMiddleware(req, res, next) {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ok: false, code: 'NO_BODY' });
    }

    const did = body._did || body.device_id;
    const nonce = body._nonce;
    const ts = parseInt(body._ts, 10);
    const sig = body.signature;
    const payload = body.payload;

    if (!did || !nonce || !ts || !sig || !payload) {
      return res.status(401).json({ ok: false, code: 'MISSING_AUTH_FIELDS' });
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > tsWindowSec) {
      logger.warn('deviceAuth', 'ts_out_of_window', { device_id: did, delta: now - ts });
      return res.status(401).json({ ok: false, code: 'TS_OUT_OF_WINDOW' });
    }

    let secret;
    try {
      const result = await lookupDeviceSecret(did);
      if (!result || !result.secret) {
        return res.status(401).json({ ok: false, code: 'UNKNOWN_DEVICE' });
      }
      secret = result.secret;
    } catch (e) {
      logger.error('deviceAuth', 'lookup_error', { device_id: did, error: String(e) });
      return res.status(500).json({ ok: false, code: 'AUTH_LOOKUP_ERROR' });
    }

    const msg = String(did) + '|' + nonce + '|' + ts + '|' + canonicalJson(payload);
    const expected = crypto.createHmac('sha256', secret).update(msg, 'utf8').digest('hex');

    let sigOk;
    try {
      const a = Buffer.from(String(sig), 'utf8');
      const b = Buffer.from(expected, 'utf8');
      sigOk = (a.length === b.length) && crypto.timingSafeEqual(a, b);
    } catch (e) {
      sigOk = false;
    }

    if (!sigOk) {
      logger.warn('deviceAuth', 'sig_invalid', { device_id: did });
      return res.status(401).json({ ok: false, code: 'SIG_INVALID' });
    }

    const nonceKey = did + ':' + nonce;
    if (nonceCache.has(nonceKey)) {
      logger.warn('deviceAuth', 'nonce_reused', { device_id: did, nonce: nonce });
      return res.status(401).json({ ok: false, code: 'NONCE_REUSED' });
    }
    nonceCache.remember(nonceKey);

    req.deviceId = did;
    req.deviceSecret = secret;
    req.deviceAuthVerified = true;

    next();
  };
}

function lookupDeviceSecret(did) {
  const DEV_SECRETS = {
    'ECOSYNTECH0001': '0123456789abcdef0123456789abcdef01234567'
  };
  const secret = DEV_SECRETS[did];
  if (!secret) return Promise.resolve(null);
  return Promise.resolve({ secret });
}

module.exports = deviceAuth;
module.exports.canonicalJson = canonicalJson;
module.exports.NonceCache = NonceCache;
module.exports.lookupDeviceSecret = lookupDeviceSecret;