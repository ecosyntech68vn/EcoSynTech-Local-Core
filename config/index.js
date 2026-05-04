const mockConfig = {
  port: 3000,
  nodeEnv: 'test',
  logLevel: 'error',
  database: { path: './data/test.db' },
  jwt: { secret: 'test-secret', expiresIn: '7d' },
  mqtt: { brokerUrl: 'mqtt://localhost', username: '', password: '' },
  cors: { origin: '*', allowedOrigins: [] },
  rateLimit: { windowMs: 900000, maxRequests: 100 },
  webhook: { secret: 'test-webhook' },
  blockchain: { enabled: false },
  qrcode: { enabled: false },
  gasHybrid: { url: '', webId: '', hybridSecret: '', timeoutMs: 15000 },
  weblocal: { webId: '', tsWindowSec: 300 },
  default: null
};
mockConfig.default = mockConfig;

module.exports = mockConfig;