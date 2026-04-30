/**
 * Unit Tests - Water Optimization Service (Tưới tiêu)
 * Test các công thức nông học: ET0, Kc, nhu cầu nước
 */

jest.mock('../src/config/database', () => ({
  getOne: jest.fn(),
  getAll: jest.fn(),
  runQuery: jest.fn()
}));

jest.mock('../src/services/circuitBreaker', () => ({
  getBreaker: jest.fn(() => ({
    run: jest.fn(fn => fn())
  }))
}));

jest.mock('../src/services/retryService', () => ({
  retry: jest.fn(fn => fn())
}));

jest.mock('../src/services/IrrigationFuzzyController', () => ({
  calculate: jest.fn()
}));

const waterService = require('../src/services/waterOptimizationService');

describe('Water Optimization Service - ET0 Calculation', () => {
  let service;

  beforeEach(() => {
    service = new waterService.WaterOptimizationService();
  });

  describe('calculateET0 (Penman-Monteith FAO-56)', () => {
    it('should return default ET0 when temp is null', () => {
      const result = service.calculateET0(null, 50, 2, 15);
      expect(result).toBe(4);
    });

    it('should return default ET0 when temp is undefined', () => {
      const result = service.calculateET0(undefined, 50, 2, 15);
      expect(result).toBe(4);
    });

    it('should calculate ET0 with normal parameters', () => {
      const result = service.calculateET0(25, 60, 2, 15);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10);
    });

    it('should calculate higher ET0 with high temperature', () => {
      const lowTemp = service.calculateET0(20, 60, 2, 15);
      const highTemp = service.calculateET0(35, 60, 2, 15);
      expect(highTemp).toBeGreaterThan(lowTemp);
    });

    it('should calculate lower ET0 with high humidity', () => {
      const lowHumidity = service.calculateET0(25, 30, 2, 15);
      const highHumidity = service.calculateET0(25, 90, 2, 15);
      expect(highHumidity).toBeLessThan(lowHumidity);
    });

    it('should calculate higher ET0 with high wind speed', () => {
      const lowWind = service.calculateET0(25, 60, 1, 15);
      const highWind = service.calculateET0(25, 60, 5, 15);
      expect(highWind).toBeGreaterThan(lowWind);
    });

    it('should handle missing wind parameter (default 2)', () => {
      const withWind = service.calculateET0(25, 60, 2, 15);
      const withoutWind = service.calculateET0(25, 60, undefined, 15);
      expect(withWind).toBeCloseTo(withoutWind, 5);
    });

    it('should handle missing solar radiation (default 15)', () => {
      const withSolar = service.calculateET0(25, 60, 2, 15);
      const withoutSolar = service.calculateET0(25, 60, 2, undefined);
      expect(withSolar).toBeCloseTo(withoutSolar, 5);
    });
  });

  describe('calculateCropET (ETC = ET0 * Kc)', () => {
    const et0 = 5; // mm/day

    it('should calculate ETC for rice initial stage', async () => {
      const kc = await service.getCropKc('rice', 'initial');
      const etc = et0 * kc;
      expect(etc).toBeCloseTo(4.5, 1);
    });

    it('should calculate ETC for rice mid stage (peak)', async () => {
      const kc = await service.getCropKc('rice', 'mid');
      const etc = et0 * kc;
      expect(etc).toBeCloseTo(6, 1);
    });

    it('should calculate ETC for maize mid stage', async () => {
      const kc = await service.getCropKc('maize', 'mid');
      const etc = et0 * kc;
      expect(etc).toBeCloseTo(5.75, 1);
    });

    it('should calculate ETC for vegetable mid stage', async () => {
      const kc = await service.getCropKc('vegetable', 'mid');
      const etc = et0 * kc;
      expect(etc).toBeCloseTo(5.5, 1);
    });

    it('should use default Kc for unknown crop type', async () => {
      const kc = await service.getCropKc('unknown_crop', 'mid');
      expect(kc).toBe(1.1);
    });
  });

  describe('getCropKc', () => {
    it('should return correct Kc for rice stages', async () => {
      expect(await service.getCropKc('rice', 'initial')).toBe(0.9);
      expect(await service.getCropKc('rice', 'mid')).toBe(1.2);
      expect(await service.getCropKc('rice', 'late')).toBe(0.9);
    });

    it('should return correct Kc for maize stages', async () => {
      expect(await service.getCropKc('maize', 'initial')).toBe(0.9);
      expect(await service.getCropKc('maize', 'mid')).toBe(1.15);
      expect(await service.getCropKc('maize', 'late')).toBe(0.7);
    });

    it('should return correct Kc for vegetable stages', async () => {
      expect(await service.getCropKc('vegetable', 'initial')).toBe(0.9);
      expect(await service.getCropKc('vegetable', 'mid')).toBe(1.1);
      expect(await service.getCropKc('vegetable', 'late')).toBe(0.8);
    });

    it('should return mid Kc for unknown stage', async () => {
      expect(await service.getCropKc('rice', 'unknown')).toBe(1.2);
    });

    it('should return default Kc for unknown crop', async () => {
      expect(await service.getCropKc('unknown', 'mid')).toBe(1.1);
    });
  });

  describe('Water Requirement Calculation', () => {
    it('should calculate daily water need (ETC - Rainfall)', async () => {
      const et0 = 5;
      const kc = 1.2;
      const etc = et0 * kc; // 6 mm/day
      const rainfall = 2;
      const waterNeed = Math.max(0, etc - rainfall);
      expect(waterNeed).toBe(4);
    });

    it('should return 0 when rainfall exceeds ETC', async () => {
      const et0 = 5;
      const kc = 0.9;
      const etc = et0 * kc; // 4.5 mm/day
      const rainfall = 10;
      const waterNeed = Math.max(0, etc - rainfall);
      expect(waterNeed).toBe(0);
    });

    it('should calculate weekly water requirement', async () => {
      const dailyNeed = 4; // mm/day
      const area = 10000; // 10,000 m2 = 1 hectare
      const weeklyNeedLiters = dailyNeed * 7 * area;
      expect(weeklyNeedLiters).toBe(280000); // 280,000 liters/week
    });

    it('should calculate irrigation duration (given flow rate)', async () => {
      const waterNeed = 4000; // liters
      const flowRate = 20; // liters per minute
      const duration = waterNeed / flowRate; // minutes
      expect(duration).toBe(200); // 200 minutes = 3h 20min
    });
  });
});

describe('Water Optimization Service - Configuration', () => {
  it('should have default min moisture threshold', () => {
    const service = new waterService.WaterOptimizationService();
    expect(service.minMoisture).toBe(30);
  });

  it('should have default max moisture threshold', () => {
    const service = new waterService.WaterOptimizationService();
    expect(service.maxMoisture).toBe(70);
  });

  it('should have default check interval', () => {
    const service = new waterService.WaterOptimizationService();
    expect(service.checkIntervalMs).toBe(300000); // 5 minutes
  });

  it('should be disabled by default', () => {
    const service = new waterService.WaterOptimizationService();
    expect(service.enabled).toBe(false);
  });
});

describe('Water Optimization - Kc Values Reference (FAO-56)', () => {
  const service = new waterService.WaterOptimizationService();

  const expectedKcValues = {
    rice: { initial: 0.9, mid: 1.2, late: 0.9 },
    maize: { initial: 0.9, mid: 1.15, late: 0.7 },
    vegetable: { initial: 0.9, mid: 1.1, late: 0.8 },
    fruit: { initial: 0.9, mid: 1.05, late: 0.85 }
  };

  it('should have FAO-56 compliant Kc values for rice', async () => {
    expect(await service.getCropKc('rice', 'initial')).toBe(expectedKcValues.rice.initial);
    expect(await service.getCropKc('rice', 'mid')).toBe(expectedKcValues.rice.mid);
    expect(await service.getCropKc('rice', 'late')).toBe(expectedKcValues.rice.late);
  });

  it('should have FAO-56 compliant Kc values for maize', async () => {
    expect(await service.getCropKc('maize', 'initial')).toBe(expectedKcValues.maize.initial);
    expect(await service.getCropKc('maize', 'mid')).toBe(expectedKcValues.maize.mid);
    expect(await service.getCropKc('maize', 'late')).toBe(expectedKcValues.maize.late);
  });
});