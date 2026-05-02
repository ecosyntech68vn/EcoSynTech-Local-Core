import crypto from 'crypto';
import { canonicalJson } from './deviceAuth';

interface ResponseSignOptions {
  logger?: any;
}

export function responseSign(opts: ResponseSignOptions = {}) {
  const logger = opts.logger || console;

  return function responseSignMiddleware(req: any, res: any, next: any): void {
    res.signedJson = function signedJson(payload: any) {
      if (!req.deviceId || !req.deviceSecret) {
        logger.warn('responseSign', 'unsigned_response',
          { reason: 'no_device_context', path: req.path });
        return res.json(payload);
      }

      const ts = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomBytes(8).toString('hex');
      const payloadObj = payload || {};
      const msg = req.deviceId + '|' + nonce + '|' + ts + '|' + canonicalJson(payloadObj);
      const signature = crypto.createHmac('sha256', req.deviceSecret)
        .update(msg, 'utf8')
        .digest('hex');

      const envelope = {
        _did: req.deviceId,
        _nonce: nonce,
        _ts: ts,
        payload: payloadObj,
        signature: signature
      };

      return res.json(envelope);
    };

    next();
  };
}

export default responseSign;