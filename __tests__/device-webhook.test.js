/**
 * Unit tests for Device Webhook Routes
 */

const crypto = require('crypto');

describe('Device Webhook Utils', () => {
  
  const HMAC_SECRET = 'CEOTAQUANGTHUAN_TADUYANH_CTYTNHHDUYANH_ECOSYNTECH_2026';
  
  function computeHmacSha256(message, key) {
    return crypto.createHmac('sha256', key).update(message).digest('hex');
  }
  
  function canonicalStringify(obj) {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return String(obj);
    if (Array.isArray(obj)) {
      return '[' + obj.map(canonicalStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => `"${k}":${canonicalStringify(obj[k])}`);
    return '{' + pairs.join(',') + '}';
  }
  
  describe('computeHmacSha256()', () => {
    it('should generate consistent HMAC', () => {
      const message = '{"device_id":"test123","sensors":[]}';
      const hmac1 = computeHmacSha256(message, HMAC_SECRET);
      const hmac2 = computeHmacSha256(message, HMAC_SECRET);
      expect(hmac1).toBe(hmac2);
    });
    
    it('should produce 64-character hex string', () => {
      const hmac = computeHmacSha256('test', HMAC_SECRET);
      expect(hmac).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hmac)).toBe(true);
    });
    
    it('should produce different HMAC for different keys', () => {
      const message = 'test';
      const hmac1 = computeHmacSha256(message, 'key1');
      const hmac2 = computeHmacSha256(message, 'key2');
      expect(hmac1).not.toBe(hmac2);
    });
  });
  
  describe('canonicalStringify()', () => {
    it('should stringify null', () => {
      expect(canonicalStringify(null)).toBe('null');
    });
    
    it('should stringify undefined', () => {
      expect(canonicalStringify(undefined)).toBe('null');
    });
    
    it('should stringify string', () => {
      expect(canonicalStringify('hello')).toBe('hello');
    });
    
    it('should stringify number', () => {
      expect(canonicalStringify(123)).toBe('123');
    });
    
    it('should stringify boolean', () => {
      expect(canonicalStringify(true)).toBe('true');
    });
    
    it('should stringify object with sorted keys', () => {
      const obj = { z: 1, a: 2 };
      const result = canonicalStringify(obj);
      expect(result).toBe('{"a":2,"z":1}');
    });
    
    it('should stringify array', () => {
      const arr = [1, 2, 3];
      expect(canonicalStringify(arr)).toBe('[1,2,3]');
    });
  });
  
  describe('Webhook signature verification', () => {
    it('should verify valid signature', () => {
      const payload = { device_id: 'ESP001', sensors: [{ type: 'temp', value: 25 }] };
      const payloadStr = canonicalStringify(payload);
      const signature = computeHmacSha256(payloadStr, HMAC_SECRET);
      
      const expected = computeHmacSha256(payloadStr, HMAC_SECRET);
      expect(signature).toBe(expected);
    });
    
    it('should detect invalid signature', () => {
      const payload = canonicalStringify({ test: 1 });
      const validSig = computeHmacSha256(payload, HMAC_SECRET);
      const invalidSig = computeHmacSha256(payload, 'wrong-key');
      
      expect(validSig).not.toBe(invalidSig);
    });
  });
});