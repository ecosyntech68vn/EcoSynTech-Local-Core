import crypto from 'crypto';

const HMAC_SECRET = process.env.HMAC_SECRET || process.env.JWT_SECRET;

export function computeHmacSha256(message: string, key: string): string | null {
  if (!key) return null;
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

export function canonicalStringify(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${canonicalStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

export function responseSignatureMiddleware(req: any, res: any, next: any): void {
  if (!HMAC_SECRET) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function(data: any) {
    const timestamp = new Date().toISOString();
    const payload = canonicalStringify(data);
    const message = `${timestamp}.${req.method}.${req.originalUrl}.${payload}`;
    const signature = computeHmacSha256(message, HMAC_SECRET!);

    res.set({
      'X-Response-Signature': signature || '',
      'X-Response-Timestamp': timestamp
    });

    return originalJson(data);
  };

  next();
}

export function verifyResponseSignature(data: any, signature: string, timestamp: string, method: string, url: string): boolean {
  if (!HMAC_SECRET || !signature) return false;
  const payload = canonicalStringify(data);
  const message = `${timestamp}.${method}.${url}.${payload}`;
  const expected = computeHmacSha256(message, HMAC_SECRET);
  if (!expected) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export default {
  computeHmacSha256,
  canonicalStringify,
  responseSignatureMiddleware,
  verifyResponseSignature
};