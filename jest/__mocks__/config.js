const config = {
  port: 3000,
  nodeEnv: 'test',
  logLevel: 'error',
  database: {
    path: ':memory:'
  },
  jwt: {
    secret: 'test-secret',
    expiresIn: '7d'
  },
  mqtt: {
    brokerUrl: 'mqtt://localhost:1883',
    username: '',
    password: ''
  },
  cors: {
    origin: '*',
    allowedOrigins: []
  },
  rateLimit: {
    windowMs: 900000,
    maxRequests: 100
  },
  webhook: {
    secret: 'test-webhook-secret'
  },
  blockchain: {
    enabled: false,
    type: 'aptos',
    network: 'testnet',
    moduleAddress: '0x1',
    privateKey: ''
  },
  qrcode: {
    enabled: false,
    baseUrl: 'http://localhost'
  },
  gasHybrid: {
    url: '',
    webId: '',
    hybridSecret: '',
    timeoutMs: 15000
  },
  weblocal: {
    webId: '',
    tsWindowSec: 300
  }
};

config.default = config;

module.exports = config;