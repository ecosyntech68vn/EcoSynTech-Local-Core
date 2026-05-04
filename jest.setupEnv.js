process.env.NODE_ENV = 'test'
delete process.env.JWT_SECRET

const mockLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  verbose: () => {},
  silly: () => {},
  log: function() { return this },
  profile: () => {},
  add: () => {},
  remove: () => {},
  clearContext: () => {},
  setContext: () => {}
};

const mockWinston = {
  createLogger: () => mockLogger,
  format: { 
    combine: () => mockWinston, 
    timestamp: () => mockWinston, 
    printf: () => mockWinston, 
    colorize: () => mockWinston,
    errors: () => mockWinston
  },
  transports: { Console: () => ({}), File: () => ({}) }
};

const mockDb = {
  query: async () => ({ rows: [], rowCount: 0 }),
  none: async () => ({}),
  many: async () => [],
  one: async () => null,
  oneOrNone: async () => null,
  any: async () => []
};

const mockFeatures = {
  applyProfile: async () => ({ success: true, memoryMB: 256, profile: 'low-memory' }),
  getMemoryEstimate: () => ({ total: 256, active: [] }),
  getConfig: () => ({})
};

const mockValidator = {
  checkRequiredStartup: () => {},
  validate: async () => ({ valid: true }),
  validateSync: () => ({ valid: true })
};

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
  enabledFeatures: {},
  default: null
};
mockConfig.default = mockConfig;

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'winston' || id.includes('winston')) {
    return mockWinston;
  }
  if (id.endsWith('logger') || id.includes('/config/logger')) {
    return mockLogger;
  }
  if (id.endsWith('database') || id.includes('/config/database')) {
    return { initDatabase: () => Promise.resolve(mockDb), closeDatabase: () => Promise.resolve(), default: mockDb, db: mockDb };
  }
  if (id.endsWith('features') || id.includes('/config/features')) {
    return mockFeatures;
  }
  if (id.endsWith('envValidator') || id.includes('/config/envValidator')) {
    return mockValidator;
  }
  if (id === '../config' || id === '../config/index' || id.includes('src/config') || (id.includes('config') && id.includes('index'))) {
    return mockConfig;
  }
  return originalRequire.apply(this, arguments);
};

global.logger = mockLogger;

if (typeof jest !== 'undefined') {
  jest.setTimeout(10000);
}