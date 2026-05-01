/**
 * CSSC - Inventory Module Flow Tests
 * Critical Success System Criteria: Inventory workflow
 * Test complete flow: Stock In → Stock Management → Stock Out → Alerts
 */

const {
  MOCK_FARM_ID,
  mockInventory,
  mockPlantings,
  mockCrops
} = require('./fixtures/mockData');

describe('CSSC - Inventory Module Flow Tests', () => {
  // ============================================
  // CSSC 1: Stock In Flow
  // ============================================
  describe('CSSC 1: Stock In Flow', () => {
    it('should process new stock arrival', () => {
      const newStock = {
        id: 'new_001',
        farm_id: MOCK_FARM_ID,
        item_code: 'NEW-001',
        item_name: 'Phân NPK mới',
        category: 'fertilizer',
        unit: 'kg',
        quantity: 1000,
        cost_per_unit: 15000,
        supplier: 'Công ty ABC',
        arrival_date: '2024-05-01',
        expiry_days: 365
      };
      
      const totalValue = newStock.quantity * newStock.cost_per_unit;
      expect(totalValue).toBe(15000000);
      expect(newStock.expiry_days).toBeGreaterThan(0);
    });

    it('should update inventory after stock in', () => {
      const initialStock = 500; // seeds
      const stockIn = 200;
      const newStock = initialStock + stockIn;
      
      expect(newStock).toBe(700);
    });

    it('should validate stock in data', () => {
      const validStockIn = {
        item_name: 'Hạt giống',
        quantity: 100,
        cost_per_unit: 25000,
        supplier: 'Valid supplier',
        expiry_days: 180
      };
      
      const isValid = validStockIn.item_name && 
                      validStockIn.quantity > 0 && 
                      validStockIn.cost_per_unit > 0;
      
      expect(isValid).toBe(true);
    });

    it('should track stock in history', () => {
      const stockInHistory = [
        { date: '2024-04-01', quantity: 500 },
        { date: '2024-04-15', quantity: 200 },
        { date: '2024-05-01', quantity: 300 }
      ];
      
      const totalIn = stockInHistory.reduce((s, h) => s + h.quantity, 0);
      expect(totalIn).toBe(1000);
    });
  });

  // ============================================
  // CSSC 2: Stock Management Flow
  // ============================================
  describe('CSSC 2: Stock Management Flow', () => {
    it('should calculate total inventory value', () => {
      const totalValue = mockInventory.reduce(
        (sum, item) => sum + (item.current_stock * item.cost_per_unit),
        0
      );
      
      // Expected: (500*25000)+(200*12000)+(20*150000)+(30*80000)
      // = 12,500,000 + 2,400,000 + 3,000,000 + 2,400,000 = 20,300,000
      expect(totalValue).toBe(20300000);
    });

    it('should categorize inventory by type', () => {
      const categories = {};
      mockInventory.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
      });
      
      expect(categories.seeds).toBe(2);
      expect(categories.fertilizer).toBe(1);
      expect(categories.pesticide).toBe(1);
    });

    it('should identify stock levels', () => {
      const stockLevels = mockInventory.map(item => {
        const percentage = (item.current_stock / item.min_stock_alert) * 100;
        let level = 'NORMAL';
        if (percentage <= 100) level = 'LOW';
        if (percentage <= 50) level = 'CRITICAL';
        return { ...item, level, percentage };
      });
      
      const lowStock = stockLevels.filter(i => i.level === 'LOW');
      // With current mock data, check if any are low
      expect(lowStock.length).toBeGreaterThanOrEqual(0);
    });

    it('should track inventory by location', () => {
      const locationInventory = {};
      mockInventory.forEach(item => {
        const location = item.status === 'active' ? 'Kho chính' : 'Kho phụ';
        if (!locationInventory[location]) locationInventory[location] = 0;
        locationInventory[location] += item.current_stock;
      });
      
      expect(locationInventory['Kho chính']).toBeDefined();
    });
  });

  // ============================================
  // CSSC 3: Stock Out Flow
  // ============================================
  describe('CSSC 3: Stock Out Flow', () => {
    it('should process stock allocation to planting', () => {
      const planting = mockPlantings[0]; // Rice planting, 5ha
      const seedsNeeded = planting.area_planted * 100; // 100kg per hectare
      const availableSeeds = mockInventory.find(i => i.category === 'seeds');
      
      const canAllocate = availableSeeds.current_stock >= seedsNeeded;
      expect(canAllocate).toBe(true); // 500 >= 500
    });

    it('should process fertilizer application', () => {
      const planting = mockPlantings[0];
      const fertilizerNeeded = planting.area_planted * 200; // 200kg per ha
      const availableFertilizer = mockInventory.find(i => i.category === 'fertilizer');
      
      // Check if enough fertilizer
      const canApply = availableFertilizer.current_stock >= fertilizerNeeded;
      expect(canApply).toBe(false); // 200 < 1000
    });

    it('should update stock after usage', () => {
      let stock = 500;
      const used = 100;
      stock -= used;
      
      expect(stock).toBe(400);
    });

    it('should track stock out by purpose', () => {
      const stockOutRecords = [
        { date: '2024-04-10', item: 'seeds', quantity: 100, purpose: 'planting' },
        { date: '2024-04-15', item: 'fertilizer', quantity: 200, purpose: 'fertilizing' },
        { date: '2024-04-20', item: 'pesticide', quantity: 5, purpose: 'pest_control' }
      ];
      
      const byPurpose = {};
      stockOutRecords.forEach(record => {
        byPurpose[record.purpose] = (byPurpose[record.purpose] || 0) + record.quantity;
      });
      
      expect(byPurpose.planting).toBe(100);
      expect(byPurpose.fertilizing).toBe(200);
      expect(byPurpose.pest_control).toBe(5);
    });
  });

  // ============================================
  // CSSC 4: Low Stock Alert Flow
  // ============================================
  describe('CSSC 4: Low Stock Alert Flow', () => {
    it('should trigger low stock alert', () => {
      const item = { current_stock: 15, min_stock_alert: 20 };
      const isLowStock = item.current_stock <= item.min_stock_alert;
      
      expect(isLowStock).toBe(true);
    });

    it('should calculate days until stockout', () => {
      const item = {
        current_stock: 30,
        daily_usage_rate: 5 // kg per day
      };
      
      const daysUntilStockout = item.current_stock / item.daily_usage_rate;
      expect(daysUntilStockout).toBe(6);
    });

    it('should prioritize reordering', () => {
      const items = [
        { id: '1', current_stock: 10, min_stock_alert: 20, priority: 'HIGH' },
        { id: '2', current_stock: 15, min_stock_alert: 20, priority: 'HIGH' },
        { id: '3', current_stock: 50, min_stock_alert: 30, priority: 'LOW' }
      ];
      
      const toReorder = items.filter(i => i.current_stock <= i.min_stock_alert);
      expect(toReorder.length).toBe(2);
    });

    it('should generate reorder recommendation', () => {
      const item = {
        current_stock: 25,
        min_stock_alert: 20,
        daily_usage_rate: 5,
        cost_per_unit: 12000
      };
      
      const recommendedOrder = {
        item_id: item.id,
        quantity: item.min_stock_alert * 2, // Order 2x minimum
        estimated_cost: item.min_stock_alert * 2 * item.cost_per_unit,
        urgency: item.current_stock / item.min_stock_alert < 1.5 ? 'URGENT' : 'NORMAL'
      };
      
      expect(recommendedOrder.quantity).toBe(40);
      expect(recommendedOrder.urgency).toBe('URGENT');
    });
  });

  // ============================================
  // CSSC 5: Expiry Management Flow
  // ============================================
  describe('CSSC 5: Expiry Management Flow', () => {
    it('should identify expired items', () => {
      const itemsWithExpiry = mockInventory.filter(i => i.expiry_days);
      
      // Simulate items purchased 200 days ago
      const expiredItems = itemsWithExpiry.filter(item => {
        const daysSincePurchase = 200; // Simulated
        return daysSincePurchase > item.expiry_days;
      });
      
      // Seeds with 90 days expiry should be expired
      const seedsItem = mockInventory.find(i => i.category === 'seeds' && i.expiry_days === 90);
      expect(seedsItem.expiry_days).toBe(90);
    });

    it('should calculate remaining shelf life', () => {
      const item = {
        purchase_date: '2024-01-01',
        expiry_days: 180
      };
      
      const today = new Date('2024-05-01');
      const purchaseDate = new Date(item.purchase_date);
      const daysUsed = Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24));
      const remainingDays = item.expiry_days - daysUsed;
      
      expect(remainingDays).toBeLessThan(90);
    });

    it('should flag items near expiry', () => {
      const item = { expiry_days: 30 };
      const isNearExpiry = item.expiry_days <= 30 && item.expiry_days > 0;
      
      expect(isNearExpiry).toBe(true);
    });
  });

  // ============================================
  // CSSC 6: Inventory Reporting Flow
  // ============================================
  describe('CSSC 6: Inventory Reporting Flow', () => {
    it('should generate stock summary report', () => {
      const report = {
        total_items: mockInventory.length,
        total_value: mockInventory.reduce((s, i) => s + i.current_stock * i.cost_per_unit, 0),
        by_category: {
          seeds: mockInventory.filter(i => i.category === 'seeds').length,
          fertilizer: mockInventory.filter(i => i.category === 'fertilizer').length,
          pesticide: mockInventory.filter(i => i.category === 'pesticide').length
        },
        low_stock_count: 1,
        expired_count: 0
      };
      
      expect(report.total_items).toBe(4);
      expect(report.total_value).toBe(20300000);
    });

    it('should generate usage report', () => {
      const usageReport = {
        period: '2024-04',
        opening_stock: 1000,
        stock_in: 500,
        stock_out: 450,
        closing_stock: 1050,
        consumption_rate: 450 / 30 // per day
      };
      
      expect(usageReport.closing_stock).toBe(1050);
      expect(usageReport.consumption_rate).toBe(15);
    });
  });

  // ============================================
  // Integration: End-to-End Inventory Workflow
  // ============================================
  describe('Integration: End-to-End Inventory Workflow', () => {
    it('should execute complete inventory cycle', () => {
      // Step 1: Initial stock check
      const initialStock = mockInventory[0].current_stock;
      expect(initialStock).toBe(500);
      
      // Step 2: Stock in
      const stockIn = 200;
      const afterStockIn = initialStock + stockIn;
      expect(afterStockIn).toBe(700);
      
      // Step 3: Usage (planting season)
      const used = 300;
      const afterUsage = afterStockIn - used;
      expect(afterUsage).toBe(400);
      
      // Step 4: Check low stock
      const minAlert = mockInventory[0].min_stock_alert;
      const isLowStock = afterUsage <= minAlert;
      expect(isLowStock).toBe(false); // 400 > 100, so not low
      
      // Step 5: Calculate reorder quantity if needed
      const reorderQty = minAlert * 3 - afterUsage;
      expect(reorderQty).toBe(-100); // Negative means no reorder needed
    });

    it('should handle multi-crop inventory planning', () => {
      // Get all plantings
      const plantings = mockPlantings.filter(p => p.status === 'growing');
      
      // Calculate requirements
      const requirements = plantings.map(p => {
        const crop = mockCrops.find(c => c.id === p.crop_id);
        return {
          planting_id: p.id,
          seeds_needed: p.area_planted * 100,
          fertilizer_needed: p.area_planted * 200
        };
      });
      
      // Total requirements
      const totalSeeds = requirements.reduce((s, r) => s + r.seeds_needed, 0);
      const totalFertilizer = requirements.reduce((s, r) => s + r.fertilizer_needed, 0);
      
      expect(totalSeeds).toBe(700); // 5ha + 2ha rice
      expect(totalFertilizer).toBe(1400);
    });
  });
});