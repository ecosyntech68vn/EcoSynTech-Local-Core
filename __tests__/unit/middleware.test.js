/**
 * Unit Tests - Core Loading Only
 */

describe('Config Loading', () => {
  it('main config loads', () => {
    expect(() => require('../src/config')).not.toThrow();
  });

  it('database loads', () => {
    expect(() => require('../src/config/database')).not.toThrow();
  });

  it('logger loads', () => {
    expect(() => require('./logger')).not.toThrow();
  });

  it('features loads', () => {
    expect(() => require('../src/config/features')).not.toThrow();
  });
});

describe('Error Handler', () => {
  it('loads', () => {
    expect(() => require('../src/middleware/errorHandler')).not.toThrow();
  });
});

describe('Validation', () => {
  it('loads', () => {
    expect(() => require('../src/middleware/validation')).not.toThrow();
  });
});