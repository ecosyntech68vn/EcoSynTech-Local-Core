/**
 * Test Setup - Global mocks
 */

process.env.NODE_ENV = 'test';
delete process.env.JWT_SECRET;

const mockLogger = {
  error: function() {}, warn: function() {}, info: function() {}, debug: function() {},
  verbose: function() {}, silly: function() {}, log: function() { return this },
  profile: function() {}, add: function() {}, remove: function() {}
};

const mockDb = {
  query: async () => ({ rows: [], rowCount: 0 }),
  none: async () => ({}),
  many: async () => []
};

const mockConfig = {
  port: 3000, nodeEnv: 'test', logLevel: 'error',
  database: { path: ':memory:' },
  jwt: { secret: 'test-secret', expiresIn: '7d' }
};

const mockFeatures = {
  applyProfile: async () => ({ success: true }),
  getMemoryEstimate: () => 256
};

jest.mock('./config/logger', () => mockLogger);
jest.mock('./config/database', () => ({ initDatabase: () => Promise.resolve(mockDb), closeDatabase: () => Promise.resolve() }));
jest.mock('../config/logger', () => mockLogger);
jest.mock('../config/database', () => ({ initDatabase: () => Promise.resolve(mockDb), closeDatabase: () => Promise.resolve() }));

global.logger = mockLogger;

if (typeof jest !== 'undefined') {
  jest.setTimeout(10000);
}