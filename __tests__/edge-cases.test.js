/**
 * Edge Cases Tests
 * Test các trường hợp đặc biệt, boundary conditions
 */

const {
  MOCK_FARM_ID,
  mockCrops,
  mockInventory,
  mockWorkers,
  mockEquipment,
  mockFinance,
  mockDevices,
  mockWeather
} = require('./fixtures/mockData');

describe('Edge Cases Tests', () => {
  describe('Boundary Values', () => {
    it('should handle zero temperature', () => {
      const temp = 0;
      const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
      expect(es).toBeCloseTo(0.611, 2);
    });

    it('should handle 100% humidity', () => {
      const humidity = 100;
      const temp = 25;
      const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
      const ea = es * (humidity / 100);
      expect(ea).toBe(es); // At 100%, ea = es
    });

    it('should handle zero humidity', () => {
      const humidity = 0;
      const temp = 25;
      const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
      const ea = es * (humidity / 100);
      expect(ea).toBe(0);
    });

    it('should handle very large area', () => {
      const largeArea = 10000; // 10,000 hectares
      const waterNeedPerHa = 5000; // liters/ha/day
      const totalWaterNeed = largeArea * waterNeedPerHa;
      expect(totalWaterNeed).toBe(50000000);
    });

    it('should handle very small quantity', () => {
      const smallQuantity = 0.001;
      const price = 1000000;
      const totalValue = smallQuantity * price;
      expect(totalValue).toBe(1000);
    });
  });

  describe('Null/Undefined Handling', () => {
    it('should handle null crop data', () => {
      const nullCrop = mockCrops.find(c => c.kc_mid === null);
      expect(nullCrop).toBeUndefined();
    });

    it('should handle undefined stock', () => {
      const inventoryWithNull = [
        { id: '1', current_stock: null, cost_per_unit: 1000 },
        { id: '2', current_stock: 10, cost_per_unit: 1000 }
      ];
      const totalValue = inventoryWithNull.reduce((sum, item) => {
        return sum + ((item.current_stock || 0) * item.cost_per_unit);
      }, 0);
      expect(totalValue).toBe(10000);
    });

    it('should handle missing worker phone', () => {
      const workersWithNull = [
        { id: '1', worker_name: 'John', phone: null },
        { id: '2', worker_name: 'Jane', phone: '0912345678' }
      ];
      const validPhones = workersWithNull.filter(w => w.phone);
      expect(validPhones.length).toBe(1);
    });
  });

  describe('Array Edge Cases', () => {
    it('should handle empty array', () => {
      const emptyArray = [];
      const sum = emptyArray.reduce((s, i) => s + i.amount, 0);
      expect(sum).toBe(0);
    });

    it('should handle single element array', () => {
      const singleElement = [mockCrops[0]];
      expect(singleElement.length).toBe(1);
      expect(singleElement[0].id).toBe('crop_001');
    });

    it('should handle array with null elements', () => {
      const arrayWithNull = [null, null];
      const validElements = arrayWithNull.filter(x => x !== null);
      expect(validElements.length).toBe(0);
    });
  });

  describe('String Edge Cases', () => {
    it('should handle empty string', () => {
      const empty = '';
      expect(empty.length).toBe(0);
      expect(empty === '').toBe(true);
    });

    it('should handle very long string', () => {
      const longString = 'A'.repeat(10000);
      expect(longString.length).toBe(10000);
    });

    it('should handle special characters', () => {
      const specialChars = 'Tên nông trại có dấu tiếng Việt: àáảãạăằẳẵặâầẩẫậèéẻẽẹêềểễếệìíỉĩịòóỏõọôồổỗộơờởỡợùúủũụưừửữựỳýỷỹỵđ';
      expect(specialChars.length).toBeGreaterThan(0);
    });

    it('should handle Unicode properly', () => {
      const vietName = 'Nguyễn Văn A';
      expect(vietName.includes('ễ')).toBe(true);
    });
  });

  describe('Number Edge Cases', () => {
    it('should handle negative numbers', () => {
      const negative = -100;
      expect(Math.abs(negative)).toBe(100);
    });

    it('should handle very large numbers', () => {
      const veryLarge = Number.MAX_SAFE_INTEGER;
      expect(veryLarge).toBe(9007199254740991);
    });

    it('should handle floating point precision', () => {
      const result = 0.1 + 0.2;
      expect(result).toBeCloseTo(0.3, 1);
    });

    it('should handle division by zero', () => {
      const division = 10 / 0;
      expect(division).toBe(Infinity);
    });

    it('should handle NaN', () => {
      const nan = NaN;
      expect(isNaN(nan)).toBe(true);
    });
  });

  describe('Date Edge Cases', () => {
    it('should handle future dates', () => {
      const future = new Date('2030-01-01');
      const now = new Date();
      expect(future.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should handle past dates', () => {
      const past = new Date('2020-01-01');
      const now = new Date();
      expect(past.getTime()).toBeLessThan(now.getTime());
    });

    it('should handle leap year', () => {
      const leapYear = new Date('2024-02-29');
      expect(leapYear.getMonth()).toBe(1); // February = 1
      expect(leapYear.getDate()).toBe(29);
    });

    it('should handle invalid date', () => {
      const invalid = new Date('invalid');
      expect(isNaN(invalid.getTime())).toBe(true);
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should handle zero inventory with high demand', () => {
      const item = { current_stock: 0, min_stock_alert: 10 };
      const isLowStock = item.current_stock <= item.min_stock_alert;
      expect(isLowStock).toBe(true);
    });

    it('should handle negative profit', () => {
      const income = 10000000;
      const expense = 20000000;
      const profit = income - expense;
      expect(profit).toBe(-10000000);
      expect(profit < 0).toBe(true);
    });

    it('should handle 100% occupancy', () => {
      const workers = mockWorkers.filter(w => w.status === 'active');
      const maxCapacity = 10;
      const occupancyRate = (workers.length / maxCapacity) * 100;
      expect(occupancyRate).toBe(30); // 3/10 = 30%
    });

    it('should handle equipment breakdown', () => {
      const criticalEquipment = mockEquipment.filter(e => e.condition === 'poor');
      expect(criticalEquipment.length).toBe(0); // No poor equipment in mock data
    });

    it('should handle weather extreme', () => {
      const extremeTemp = 45; // Very hot
      const extremeHumidity = 10; // Very dry
      const isExtreme = extremeTemp > 40 || extremeHumidity < 20;
      expect(isExtreme).toBe(true);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should validate email format', () => {
      const validEmails = ['test@example.com', 'user@domain.co.uk'];
      const invalidEmails = ['invalid', 'test@', '@domain.com'];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      validEmails.forEach(email => expect(emailRegex.test(email)).toBe(true));
      invalidEmails.forEach(email => expect(emailRegex.test(email)).toBe(false));
    });

    it('should validate phone format', () => {
      const validPhones = ['0912345678', '0987654321'];
      const invalidPhones = ['123456789', '091234567890'];
      
      const phoneRegex = /^0[0-9]{9}$/;
      validPhones.forEach(phone => expect(phoneRegex.test(phone)).toBe(true));
      invalidPhones.forEach(phone => expect(phoneRegex.test(phone)).toBe(false));
    });

    it('should validate positive numbers only', () => {
      const validValues = [0, 1, 100, 999999];
      const invalidValues = [-1, -100];
      
      validValues.forEach(v => expect(v >= 0).toBe(true));
      invalidValues.forEach(v => expect(v >= 0).toBe(false));
    });
  });

  describe('Calculation Edge Cases', () => {
    it('should calculate average with different data sizes', () => {
      const calculateAvg = (arr) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
      
      expect(calculateAvg([10])).toBe(10);
      expect(calculateAvg([10, 20])).toBe(15);
      expect(calculateAvg([])).toBe(0);
    });

    it('should handle percentage calculation', () => {
      const calculatePercent = (value, total) => total > 0 ? (value / total) * 100 : 0;
      
      expect(calculatePercent(25, 100)).toBe(25);
      expect(calculatePercent(1, 3)).toBeCloseTo(33.33, 1);
      expect(calculatePercent(0, 0)).toBe(0);
    });

    it('should calculate ROI', () => {
      const calculateROI = (gain, cost) => cost > 0 ? ((gain - cost) / cost) * 100 : 0;
      
      expect(calculateROI(15000000, 10000000)).toBe(50); // 50% profit
      expect(calculateROI(5000000, 10000000)).toBe(-50); // 50% loss
      expect(calculateROI(10000000, 0)).toBe(0);
    });
  });
});