/**
 * Unit Tests - Simple Loading
 */

describe('Core Config', () => {
  it('src/config loads', () => {
    expect(() => require('../src/config')).not.toThrow();
  });

  it('config index loads', () => {
    expect(() => require('../config')).not.toThrow();
  });

  it('config/logger loads', () => {
    expect(() => require('../config/logger')).not.toThrow();
  });
});

describe('Middleware', () => {
  it('errorHandler loads', () => {
    expect(() => require('../src/middleware/errorHandler')).not.toThrow();
  });
});