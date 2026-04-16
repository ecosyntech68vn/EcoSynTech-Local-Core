const { signEnvelope, verifyEnvelope } = require('../src/utils/envelope');

describe('Envelope Utilities', () => {
  function buildPayload(overrides = {}) {
    return Object.assign({
      _did: 'ESP-001',
      _ts: Math.floor(Date.now() / 1000),
      _nonce: 'nonce-test-' + Date.now(),
      device_id: 'ESP-001',
      fw_version: '8.5.0',
      readings: [{ sensor_type: 'temperature', value: 25, unit: 'C' }]
    }, overrides);
  }

  test('should create and verify valid envelope', () => {
    const payload = buildPayload();
    const envelope = signEnvelope(payload);
    const result = verifyEnvelope(envelope.payload, envelope.signature);
    expect(result.valid).toBe(true);
  });

  test('should detect replay attacks', () => {
    const payload = buildPayload();
    const envelope = signEnvelope(payload);
    const result1 = verifyEnvelope(envelope.payload, envelope.signature);
    expect(result1.valid).toBe(true);
    const result2 = verifyEnvelope(envelope.payload, envelope.signature);
    expect(result2.valid).toBe(false);
    expect(result2.error).toContain('detected');
  });

  test('should reject invalid signatures', () => {
    const payload = buildPayload();
    const badResult = verifyEnvelope(payload, 'invalid-signature');
    expect(badResult.valid).toBe(false);
  });

  test('should reject expired timestamps', () => {
    const payloadExpired = buildPayload({
      _ts: Math.floor(Date.now() / 1000) - 2000,
      _nonce: 'nonce-expired-' + Date.now()
    });
    const envExpired = signEnvelope(payloadExpired);
    const result = verifyEnvelope(payloadExpired, envExpired.signature);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });
});
