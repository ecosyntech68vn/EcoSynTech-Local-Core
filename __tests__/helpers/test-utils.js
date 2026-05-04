/**
 * Test Utilities - Standardized helpers for EcoSynTech tests
 * 
 * 5S: Set in Order - Standardize test patterns
 * Standards: ISO 27001 compliant test patterns
 */

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
  remove: () => {}
};

const mockDb = {
  query: async () => ({ rows: [], rowCount: 0 }),
  none: async () => ({}),
  many: async () => [],
  one: async () => null,
  oneOrNone: async () => null,
  any: async () => []
};

const mockConfig = {
  port: 3000,
  nodeEnv: 'test',
  logLevel: 'error',
  database: { path: ':memory:' },
  jwt: { secret: 'test-secret', expiresIn: '7d' },
  mqtt: { brokerUrl: 'mqtt://localhost', username: '', password: '' },
  cors: { origin: '*', allowedOrigins: [] },
  rateLimit: { windowMs: 900000, maxRequests: 100 },
  webhook: { secret: 'test-webhook' },
  blockchain: { enabled: false },
  qrcode: { enabled: false },
  gasHybrid: { url: '', webId: '', hybridSecret: '' },
  weblocal: { webId: '', tsWindowSec: 300 },
  default: null
};
mockConfig.default = mockConfig;

const mockFeatures = {
  applyProfile: async () => ({ success: true, memoryMB: 256 }),
  getMemoryEstimate: () => ({ total: 256, active: [] }),
  getConfig: () => ({})
};

const mockValidator = {
  checkRequiredStartup: () => {},
  validate: async () => ({ valid: true }),
  validateSync: () => ({ valid: true })
};

function createMockServer() {
  return {
    getApp: () => ({ use: () => {}, get: () => {}, post: () => {}, put: () => {}, delete: () => {}, listen: () => {} }),
    initialize: async () => ({}),
    close: async () => {}
  };
}

function createMockRequest(overrides = {}) {
  return {
    headers: { 'content-type': 'application/json', 'authorization': '' },
    params: {},
    query: {},
    body: {},
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    ...overrides
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; },
    send: function(data) { this.data = data; return this; },
    set: function() { return this; },
    end: function() { return this; }
  };
  return res;
}

function createMockNext() {
  return function(err) { if (err) throw err; };
}

module.exports = {
  mockLogger,
  mockDb,
  mockConfig,
  mockFeatures,
  mockValidator,
  createMockServer,
  createMockRequest,
  createMockResponse,
  createMockNext
};