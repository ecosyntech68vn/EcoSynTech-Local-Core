/**
 * Unit Tests - Simplified Loading
 */

describe('Config', () => {
  let config, db;
  beforeAll(() => {
    config = require('../src/config');
    db = require('../src/config/database');
  });

  it('loads', () => {
    expect(config).toBeDefined();
    expect(config.port).toBeDefined();
  });

  it('database loads', () => {
    expect(db).toBeDefined();
    expect(typeof db.initDatabase).toBe('function');
  });
});

describe('ErrorHandler', () => {
  let errorHandler;
  beforeAll(() => {
    errorHandler = require('../src/middleware/errorHandler');
  });

  it('loads', () => {
    expect(errorHandler).toBeDefined();
  });
});

describe('Validation', () => {
  let validation;
  beforeAll(() => {
    validation = require('../src/middleware/validation');
  });

  it('loads', () => {
    expect(validation).toBeDefined();
  });
});