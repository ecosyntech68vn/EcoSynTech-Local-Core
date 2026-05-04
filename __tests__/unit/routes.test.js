/**
 * Unit Tests - Routes (Simplified)
 */

describe('Server Routes', () => {
  it('main routes loads', () => {
    expect(() => require('../src/server/routes')).not.toThrow();
  });
});

describe('Agriculture Routes', () => {
  it('loads', () => {
    expect(() => require('../src/routes/agriculture')).not.toThrow();
  });
});

describe('Device Management', () => {
  it('loads', () => {
    expect(() => require('../src/routes/devicemgmt')).not.toThrow();
  });
});

describe('Stats Routes', () => {
  it('loads', () => {
    expect(() => require('../src/routes/stats')).not.toThrow();
  });
});

describe('Firmware Routes', () => {
  it('loads', () => {
    expect(() => require('../src/routes/firmware')).not.toThrow();
  });
});

describe('Security Routes', () => {
  it('loads', () => {
    expect(() => require('../src/routes/security')).not.toThrow();
  });
});

describe('IoT Engine', () => {
  it('loads', () => {
    expect(() => require('../src/modules/iot-engine')).not.toThrow();
  });
});