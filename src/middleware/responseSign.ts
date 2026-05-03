'use strict';
import crypto from('crypto');
import { canonicalJson } from('./deviceAuth');

function responseSign(opts) {
  opts = opts || {};
  const logger = opts.logger || console;

  return function responseSignMiddleware(req, res, next) {
    res.signedJson = function signedJson(payload) {
      if (!req.deviceId || !req.deviceSecret) {
        logger.warn('responseSign', 'unsigned_response',
          { reason: 'no_device_context', path: req.path });
        return res.json(payload);
      }

      const ts = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomBytes(8).toString('hex');
      const msg = req.deviceId + '|' + nonce + '|' + ts + '|' + canonicalJson(payload || {});
      const signature = crypto.createHmac('sha256', req.deviceSecret)
        .update(msg, 'utf8')
        .digest('hex');

      const envelope = {
        _did: req.deviceId,
        _nonce: nonce,
        _ts: ts,
        payload: payload || {},
        signature: signature
      };

      return res.json(envelope);
    };

    next();
  };
}

module.exports = responseSign;