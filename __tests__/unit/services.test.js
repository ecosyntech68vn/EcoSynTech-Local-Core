/**
 * Unit Tests - Services (Path-safe)
 */

const pathExists = (p) => {
  try { require.resolve(p); return true; } catch(e) { return false; }
};

describe('Core Services', () => {
  it('authService loads', () => {
    expect(() => require('../src/services/authService')).not.toThrow();
  });

  it('cacheService loads', () => {
    expect(() => require('../src/services/cacheService')).not.toThrow();
  });

  it('circuitBreaker loads', () => {
    expect(() => require('../src/services/circuitBreaker')).not.toThrow();
  });

  it('batchService loads', () => {
    expect(() => require('../src/services/batchService')).not.toThrow();
  });
});

describe('Business Services', () => {
  it('inventoryService loads', () => {
    expect(() => require('../src/services/inventoryService')).not.toThrow();
  });

  it('cropService loads', () => {
    expect(() => require('../src/services/cropService')).not.toThrow();
  });

  it('equipmentService loads', () => {
    expect(() => require('../src/services/equipmentService')).not.toThrow();
  });

  it('financeService loads', () => {
    expect(() => require('../src/services/financeService')).not.toThrow();
  });
});

describe('Support Services', () => {
  it('laborService loads', () => {
    expect(() => require('../src/services/laborService')).not.toThrow();
  });

  it('orderService loads', () => {
    expect(() => require('../src/services/orderService')).not.toThrow();
  });

  it('pricingService loads', () => {
    expect(() => require('../src/services/pricingService')).not.toThrow();
  });
});