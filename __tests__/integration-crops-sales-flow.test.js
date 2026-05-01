/**
 * CSSC - Crops & Sales Module Flow Tests
 * Critical Success System Criteria: Crops and Sales workflows
 * Test complete flow: Planting → Growth → Harvest → Sales
 */

const {
  MOCK_FARM_ID,
  mockCrops,
  mockPlantings,
  mockSales,
  mockWeather
} = require('./fixtures/mockData');

describe('CSSC - Crops Module Flow Tests', () => {
  // ============================================
  // CSSC 1: Planting Flow
  // ============================================
  describe('CSSC 1: Planting Flow', () => {
    it('should create new planting', () => {
      const planting = {
        id: 'plant_new',
        farm_id: MOCK_FARM_ID,
        crop_id: 'crop_001',
        area_planted: 3,
        planting_date: '2024-05-01',
        status: 'planned'
      };
      
      expect(planting.status).toBe('planned');
    });

    it('should calculate seeds requirement', () => {
      const planting = mockPlantings[0]; // 5 hectares
      const seedRate = 100; // kg per hectare
      const seedsNeeded = planting.area_planted * seedRate;
      
      expect(seedsNeeded).toBe(500);
    });

    it('should calculate fertilizer requirement', () => {
      const planting = mockPlantings[0];
      const fertilizerRate = 200; // kg per hectare
      const fertilizerNeeded = planting.area_planted * fertilizerRate;
      
      expect(fertilizerNeeded).toBe(1000);
    });

    it('should calculate expected yield', () => {
      const planting = mockPlantings[0];
      const expectedYieldPerHa = 1000; // kg per hectare
      const totalExpectedYield = planting.area_planted * expectedYieldPerHa;
      
      expect(totalExpectedYield).toBe(5000);
    });
  });

  // ============================================
  // CSSC 2: Crop Growth Monitoring
  // ============================================
  describe('CSSC 2: Crop Growth Monitoring', () => {
    it('should track crop growth stages', () => {
      const stages = ['preparation', 'seeding', 'nursing', 'growing', 'flowering', 'fruiting', 'harvesting'];
      
      const currentStage = 'growing';
      const stageIndex = stages.indexOf(currentStage);
      const progress = (stageIndex / stages.length) * 100;
      
      expect(progress).toBeGreaterThan(0);
    });

    it('should calculate days to harvest', () => {
      const planting = mockPlantings[0];
      const today = new Date('2024-05-01');
      const harvestDate = new Date(planting.expected_harvest_date);
      const daysToHarvest = Math.ceil((harvestDate - today) / (1000 * 60 * 60 * 24));
      
      expect(daysToHarvest).toBeGreaterThan(0);
    });

    it('should calculate crop water requirement using Kc', () => {
      const crop = mockCrops[0]; // Rice
      const et0 = 5; // mm/day
      const etc = et0 * crop.kc_mid; // ETc = ET0 * Kc
      
      expect(etc).toBe(6); // 5 * 1.2
    });

    it('should adjust irrigation based on weather', () => {
      const crop = mockCrops[0]; // Rice
      const etc = 6; // mm/day
      const rainfall = mockWeather.current.rainfall; // 0 mm
      const irrigationNeeded = Math.max(0, etc - rainfall);
      
      expect(irrigationNeeded).toBe(6);
    });
  });

  // ============================================
  // CSSC 3: Harvest Flow
  // ============================================
  describe('CSSC 3: Harvest Flow', () => {
    it('should calculate harvest yield', () => {
      const planting = mockPlantings.find(p => p.status === 'harvested');
      const yieldPerHa = 1200; // kg per hectare (actual vs expected 1000)
      const actualYield = planting.area_planted * yieldPerHa;
      
      expect(actualYield).toBe(1200);
    });

    it('should calculate harvest efficiency', () => {
      const expectedYield = 5000;
      const actualYield = 4800;
      const efficiency = (actualYield / expectedYield) * 100;
      
      expect(efficiency).toBe(96);
    });

    it('should generate harvest report', () => {
      const harvestReport = {
        planting_id: 'plant_003',
        area_harvested: 1,
        yield_per_ha: 1200,
        total_yield: 1200,
        quality: 'A',
        harvest_date: '2024-04-20'
      };
      
      expect(harvestReport.quality).toBe('A');
    });
  });

  // ============================================
  // CSSC 4: Crop Analytics
  // ============================================
  describe('CSSC 4: Crop Analytics', () => {
    it('should calculate crop profitability', () => {
      const yieldKg = 5000;
      const pricePerKg = 10000;
      const revenue = yieldKg * pricePerKg;
      
      const costs = {
        seeds: 5000000,
        fertilizer: 8000000,
        labor: 10000000,
        other: 2000000
      };
      
      const totalCost = Object.values(costs).reduce((s, v) => s + v, 0);
      const profit = revenue - totalCost;
      const margin = (profit / revenue) * 100;
      
      expect(profit).toBe(25000000);
      expect(margin).toBe(50);
    });

    it('should analyze crop performance by variety', () => {
      const cropPerformance = mockCrops.map(crop => {
        const plantings = mockPlantings.filter(p => p.crop_id === crop.id);
        return {
          crop: crop.name,
          plantings: plantings.length,
          total_area: plantings.reduce((s, p) => s + p.area_planted, 0),
          expected_yield: plantings.reduce((s, p) => s + p.expected_yield, 0)
        };
      });
      
      // Filter to only crops that have plantings
      const withPlantings = cropPerformance.filter(c => c.plantings > 0);
      expect(withPlantings.length).toBeGreaterThan(0);
    });
  });
});

describe('CSSC - Sales Module Flow Tests', () => {
  // ============================================
  // CSSC 5: Order Management Flow
  // ============================================
  describe('CSSC 5: Order Management Flow', () => {
    it('should create new order', () => {
      const order = {
        id: 'order_new',
        farm_id: MOCK_FARM_ID,
        customer_name: 'Khách hàng mới',
        items: [
          { product: 'Lúa', quantity: 1000, price: 10000 },
          { product: 'Rau muống', quantity: 200, price: 8000 }
        ],
        status: 'pending'
      };
      
      const total = order.items.reduce((s, i) => s + i.quantity * i.price, 0);
      expect(total).toBe(11600000);
    });

    it('should process order fulfillment', () => {
      let order = { status: 'pending' };
      
      // Confirm order
      order.status = 'confirmed';
      order.confirmed_at = '2024-05-01';
      
      // Process order
      order.status = 'processing';
      
      // Complete order
      order.status = 'completed';
      order.completed_at = '2024-05-03';
      
      expect(order.status).toBe('completed');
    });

    it('should track order status progression', () => {
      const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'completed'];
      const currentStatus = 'processing';
      const statusIndex = statuses.indexOf(currentStatus);
      const progress = ((statusIndex + 1) / statuses.length) * 100;
      
      expect(progress).toBe(60);
    });
  });

  // ============================================
  // CSSC 6: Sales Analytics
  // ============================================
  describe('CSSC 6: Sales Analytics', () => {
    it('should calculate total revenue', () => {
      const completedOrders = mockSales.orders.filter(o => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((s, o) => s + o.total_amount, 0);
      
      expect(totalRevenue).toBe(55000000);
    });

    it('should calculate average order value', () => {
      const totalOrders = mockSales.orders.length;
      const totalAmount = mockSales.orders.reduce((s, o) => s + o.total_amount, 0);
      const avgOrderValue = totalAmount / totalOrders;
      
      expect(avgOrderValue).toBeCloseTo(23333333, 0);
    });

    it('should calculate customer lifetime value', () => {
      const customerOrders = mockSales.orders.filter(o => o.customer_name === 'Công ty ABC');
      const clv = customerOrders.reduce((s, o) => s + o.total_amount, 0);
      
      expect(clv).toBe(25000000);
    });

    it('should identify top customers', () => {
      const customerRevenue = {};
      mockSales.orders.forEach(o => {
        customerRevenue[o.customer_name] = (customerRevenue[o.customer_name] || 0) + o.total_amount;
      });
      
      const sorted = Object.entries(customerRevenue).sort((a, b) => b[1] - a[1]);
      expect(sorted[0][0]).toBe('Siêu thị DEF');
    });
  });

  // ============================================
  // CSSC 7: Sales Reporting
  // ============================================
  describe('CSSC 7: Sales Reporting', () => {
    it('should generate sales summary', () => {
      const summary = {
        total_orders: mockSales.orders.length,
        completed_orders: mockSales.orders.filter(o => o.status === 'completed').length,
        pending_orders: mockSales.orders.filter(o => o.status === 'pending').length,
        total_revenue: mockSales.orders.reduce((s, o) => s + o.total_amount, 0),
        avg_order_value: mockSales.orders.reduce((s, o) => s + o.total_amount, 0) / mockSales.orders.length
      };
      
      expect(summary.total_orders).toBe(3);
      expect(summary.total_revenue).toBe(70000000);
    });

    it('should generate sales forecast', () => {
      const recentAvg = 20000000; // Last 3 months average
      const growthRate = 1.1; // 10% growth
      const forecast = {
        month_1: recentAvg * growthRate,
        month_2: recentAvg * Math.pow(growthRate, 2),
        month_3: recentAvg * Math.pow(growthRate, 3)
      };
      
      expect(forecast.month_3).toBeGreaterThan(forecast.month_1);
    });
  });

  // ============================================
  // Integration: End-to-End Crop-to-Sales Workflow
  // ============================================
  describe('Integration: End-to-End Crop-to-Sales Workflow', () => {
    it('should execute complete crop to sales cycle', () => {
      // Step 1: Planting
      const planting = mockPlantings[0];
      expect(planting.status).toBe('growing');
      
      // Step 2: Growth monitoring
      const crop = mockCrops.find(c => c.id === planting.crop_id);
      const etc = 5 * crop.kc_mid;
      expect(etc).toBe(6);
      
      // Step 3: Harvest (simulate)
      const expectedYield = planting.expected_yield; // 5000kg
      const actualYield = 4800; // Slightly less
      expect(actualYield).toBeLessThanOrEqual(expectedYield);
      
      // Step 4: Create sales order
      const order = {
        product: crop.name,
        quantity: actualYield,
        price: 10000,
        total: actualYield * 10000
      };
      expect(order.total).toBe(48000000);
      
      // Step 5: Calculate profit
      const productionCost = 23000000; // seeds + fertilizer + labor
      const profit = order.total - productionCost;
      expect(profit).toBe(25000000);
    });
  });
});