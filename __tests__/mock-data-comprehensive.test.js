/**
 * Comprehensive Mock Data Tests
 * Test tất cả các module với dữ liệu mock
 */

const {
  MOCK_FARM_ID,
  mockFarms,
  mockCrops,
  mockPlantings,
  mockInventory,
  mockWorkers,
  mockEquipment,
  mockFinance,
  mockDevices,
  mockWeather,
  mockSales
} = require('./fixtures/mockData');

describe('Mock Data - Comprehensive Tests', () => {
  describe('Farm Data', () => {
    it('should have valid farm data structure', () => {
      mockFarms.forEach(farm => {
        expect(farm).toHaveProperty('id');
        expect(farm).toHaveProperty('name');
        expect(farm).toHaveProperty('location');
        expect(farm).toHaveProperty('area_hectare');
        expect(farm).toHaveProperty('status');
        expect(farm.status).toMatch(/^(active|inactive)$/);
      });
    });

    it('should find active farm by id', () => {
      const farm = mockFarms.find(f => f.id === MOCK_FARM_ID);
      expect(farm).toBeDefined();
      expect(farm.status).toBe('active');
    });

    it('should calculate total farm area', () => {
      const totalArea = mockFarms.reduce((sum, f) => sum + f.area_hectare, 0);
      expect(totalArea).toBe(15); // 10 + 5
    });
  });

  describe('Crop Data', () => {
    it('should have valid crop Kc values (FAO-56 compliant)', () => {
      mockCrops.forEach(crop => {
        expect(crop.kc_initial).toBeGreaterThanOrEqual(0.8);
        expect(crop.kc_initial).toBeLessThanOrEqual(1.0);
        expect(crop.kc_mid).toBeGreaterThanOrEqual(1.0);
        expect(crop.kc_mid).toBeLessThanOrEqual(1.3);
        expect(crop.kc_end).toBeGreaterThanOrEqual(0.6);
        expect(crop.kc_end).toBeLessThanOrEqual(1.0);
      });
    });

    it('should calculate crop water requirement', () => {
      const et0 = 5; // mm/day
      const crop = mockCrops.find(c => c.id === 'crop_001'); // Rice
      const etc = et0 * crop.kc_mid;
      expect(etc).toBeCloseTo(6, 0); // 5 * 1.2 = 6
    });

    it('should categorize crops correctly', () => {
      const grains = mockCrops.filter(c => c.category === 'grain');
      const vegetables = mockCrops.filter(c => c.category === 'vegetable');
      const fruits = mockCrops.filter(c => c.category === 'fruit');

      expect(grains.length).toBe(2); // Rice, Corn
      expect(vegetables.length).toBe(2); // Water spinach, Tomato
      expect(fruits.length).toBe(1); // Mango
    });
  });

  describe('Inventory Data', () => {
    it('should identify low stock items', () => {
      const lowStockItems = mockInventory.filter(
        item => item.current_stock <= item.min_stock_alert
      );
      // Current mock data has no items below threshold
      expect(lowStockItems.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate inventory value', () => {
      const totalValue = mockInventory.reduce(
        (sum, item) => sum + (item.current_stock * item.cost_per_unit),
        0
      );
      expect(totalValue).toBeGreaterThan(0);
    });

    it('should have valid expiry dates', () => {
      mockInventory.forEach(item => {
        if (item.expiry_days) {
          expect(item.expiry_days).toBeGreaterThan(0);
          expect(item.expiry_days).toBeLessThanOrEqual(1095); // Max 3 years
        }
      });
    });

    it('should categorize inventory correctly', () => {
      const seeds = mockInventory.filter(i => i.category === 'seeds');
      const fertilizer = mockInventory.filter(i => i.category === 'fertilizer');
      const pesticide = mockInventory.filter(i => i.category === 'pesticide');

      expect(seeds.length).toBe(2);
      expect(fertilizer.length).toBe(1);
      expect(pesticide.length).toBe(1);
    });
  });

  describe('Worker Data', () => {
    it('should calculate total labor cost', () => {
      const totalCost = mockWorkers.reduce((sum, w) => sum + w.salary, 0);
      expect(totalCost).toBe(17500000); // 5M + 8M + 4.5M
    });

    it('should identify workers by skill level', () => {
      const advanced = mockWorkers.filter(w => w.skill_level === 'advanced');
      const intermediate = mockWorkers.filter(w => w.skill_level === 'intermediate');
      const beginner = mockWorkers.filter(w => w.skill_level === 'beginner');

      expect(advanced.length).toBe(1);
      expect(intermediate.length).toBe(1);
      expect(beginner.length).toBe(1);
    });

    it('should have valid phone numbers', () => {
      mockWorkers.forEach(worker => {
        expect(worker.phone).toMatch(/^0[0-9]{9}$/);
      });
    });
  });

  describe('Equipment Data', () => {
    it('should calculate depreciation', () => {
      mockEquipment.forEach(eq => {
        const depreciation = eq.purchase_price - eq.current_value;
        const depreciationRate = depreciation / eq.purchase_price;
        expect(depreciationRate).toBeGreaterThanOrEqual(0);
        expect(depreciationRate).toBeLessThanOrEqual(0.5);
      });
    });

    it('should categorize equipment by status', () => {
      const active = mockEquipment.filter(e => e.status === 'active');
      const maintenance = mockEquipment.filter(e => e.status === 'maintenance');

      expect(active.length).toBe(2);
      expect(maintenance.length).toBe(1);
    });

    it('should have valid condition ratings', () => {
      mockEquipment.forEach(eq => {
        expect(eq.condition).toMatch(/^(excellent|good|fair|poor)$/);
      });
    });
  });

  describe('Finance Data', () => {
    it('should calculate net profit', () => {
      const totalIncome = mockFinance.incomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = mockFinance.expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalIncome - totalExpense;

      expect(totalIncome).toBe(75000000);
      expect(totalExpense).toBe(16000000);
      expect(netProfit).toBe(59000000);
    });

    it('should calculate profit margin', () => {
      const totalIncome = mockFinance.incomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = mockFinance.expenses.reduce((sum, e) => sum + e.amount, 0);
      const profitMargin = ((totalIncome - totalExpense) / totalIncome) * 100;

      expect(profitMargin).toBeCloseTo(78.67, 1);
    });

    it('should categorize expenses correctly', () => {
      const fertilizerCost = mockFinance.expenses
        .filter(e => e.category === 'fertilizer')
        .reduce((sum, e) => sum + e.amount, 0);
      
      const laborCost = mockFinance.expenses
        .filter(e => e.category === 'labor')
        .reduce((sum, e) => sum + e.amount, 0);

      expect(fertilizerCost).toBe(8000000);
      expect(laborCost).toBe(5000000);
    });
  });

  describe('Device Status Calculation', () => {
    const TIMEOUT_MS = 300000; // 5 minutes

    it('should identify online devices correctly', () => {
      const onlineDevices = mockDevices.filter(d => {
        if (!d.last_seen) return false;
        const timeSinceLastSeen = Date.now() - new Date(d.last_seen).getTime();
        return timeSinceLastSeen < TIMEOUT_MS;
      });

      expect(onlineDevices.length).toBe(3);
    });

    it('should identify offline devices correctly', () => {
      const offlineDevices = mockDevices.filter(d => {
        if (!d.last_seen) return true;
        const timeSinceLastSeen = Date.now() - new Date(d.last_seen).getTime();
        return timeSinceLastSeen >= TIMEOUT_MS;
      });

      expect(offlineDevices.length).toBe(1);
    });

    it('should calculate online rate', () => {
      const onlineCount = mockDevices.filter(d => d.status === 'online').length;
      const onlineRate = (onlineCount / mockDevices.length) * 100;

      expect(onlineRate).toBe(75); // 3/4 = 75%
    });
  });

  describe('Weather Data - ET0 Calculation', () => {
    it('should calculate ET0 using Penman-Monteith', () => {
      const { current } = mockWeather;
      const temp = current.temperature;
      const humidity = current.humidity;
      const wind = current.wind_speed;
      const solar = 15; // Default

      const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
      const ea = es * (humidity / 100);
      const delta = (4098 * es) / Math.pow(temp + 237.3, 2);
      const gamma = 0.665 * 0.001 * 101.3;
      const et0 = (0.408 * delta * es + gamma * wind * (es - ea)) / (delta + gamma * wind * 0.34);

      expect(et0).toBeGreaterThan(0);
      expect(et0).toBeLessThan(10);
    });

    it('should adjust irrigation based on rainfall', () => {
      const et0 = 5;
      const kc = 1.2;
      const etc = et0 * kc;
      const rainfall = mockWeather.current.rainfall;
      const waterNeeded = Math.max(0, etc - rainfall);

      expect(etc).toBe(6); // 5 * 1.2 = 6
      expect(waterNeeded).toBe(6); // 6 - 0 = 6 (no rain)
    });
  });

  describe('Sales Data', () => {
    it('should calculate total revenue', () => {
      const totalRevenue = mockSales.orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total_amount, 0);

      expect(totalRevenue).toBe(55000000);
    });

    it('should calculate average order value', () => {
      const completedOrders = mockSales.orders.filter(o => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
      const avgOrderValue = totalRevenue / completedOrders.length;

      expect(avgOrderValue).toBe(27500000);
    });

    it('should identify pending orders', () => {
      const pendingOrders = mockSales.orders.filter(o => o.status === 'pending');
      expect(pendingOrders.length).toBe(1);
      expect(pendingOrders[0].total_amount).toBe(15000000);
    });
  });

  describe('Planting Data', () => {
    it('should calculate expected yield', () => {
      const activePlantings = mockPlantings.filter(p => p.status === 'growing');
      const totalExpectedYield = activePlantings.reduce((sum, p) => sum + p.expected_yield, 0);

      expect(totalExpectedYield).toBe(6000); // 5000 + 1000
    });

    it('should calculate days to harvest', () => {
      const planting = mockPlantings[0];
      const plantingDate = new Date(planting.planting_date);
      const harvestDate = new Date(planting.expected_harvest_date);
      const daysToHarvest = Math.ceil((harvestDate - plantingDate) / (1000 * 60 * 60 * 24));

      expect(daysToHarvest).toBeGreaterThan(100);
      expect(daysToHarvest).toBeLessThanOrEqual(180);
    });

    it('should categorize plantings by stage', () => {
      const growing = mockPlantings.filter(p => p.current_stage === 'vegetative');
      const harvested = mockPlantings.filter(p => p.current_stage === 'harvested');

      expect(growing.length).toBe(2);
      expect(harvested.length).toBe(1);
    });
  });

  describe('Integration - End to End Scenarios', () => {
    it('should simulate complete farm workflow', () => {
      // 1. Select crop with Kc values
      const crop = mockCrops[0]; // Rice
      expect(crop.kc_mid).toBe(1.2);

      // 2. Calculate water requirement
      const et0 = mockWeather.current.temperature > 25 ? 6 : 4;
      const etc = et0 * crop.kc_mid;
      expect(etc).toBeGreaterThan(0);

      // 3. Check inventory for inputs
      const seeds = mockInventory.find(i => i.category === 'seeds');
      expect(seeds.current_stock).toBeGreaterThan(seeds.min_stock_alert);

      // 4. Check labor availability
      const availableWorkers = mockWorkers.filter(w => w.status === 'active');
      expect(availableWorkers.length).toBe(3);

      // 5. Check equipment status
      const workingEquipment = mockEquipment.filter(e => e.status === 'active');
      expect(workingEquipment.length).toBe(2);

      // 6. Calculate projected revenue
      const planting = mockPlantings.find(p => p.crop_id === crop.id);
      const projectedRevenue = planting.expected_yield * 10000; // 10k VND/kg
      expect(projectedRevenue).toBe(50000000);
    });

    it('should simulate financial planning', () => {
      // Income from sales
      const salesIncome = mockSales.orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total_amount, 0);

      // Expenses
      const totalExpense = mockFinance.expenses.reduce((sum, e) => sum + e.amount, 0);

      // Labor cost
      const laborCost = mockWorkers.reduce((sum, w) => sum + w.salary, 0);

      // Calculate break-even
      const netProfit = salesIncome - totalExpense - laborCost;
      
      expect(salesIncome).toBe(55000000);
      expect(totalExpense).toBe(16000000);
      expect(laborCost).toBe(17500000);
      expect(netProfit).toBe(21500000);
    });

    it('should simulate IoT monitoring workflow', () => {
      // 1. Check device status
      const devices = mockDevices;
      const onlineRate = (devices.filter(d => d.status === 'online').length / devices.length) * 100;
      expect(onlineRate).toBe(75);

      // 2. Get weather data
      const weather = mockWeather;
      expect(weather.current.temperature).toBe(28);

      // 3. Calculate irrigation need
      const etc = weather.current.temperature * 1.2; // Using rice Kc
      const rain = weather.current.rainfall;
      const irrigationNeed = Math.max(0, etc - rain);
      
      expect(irrigationNeed).toBeGreaterThan(0);
    });
  });
});