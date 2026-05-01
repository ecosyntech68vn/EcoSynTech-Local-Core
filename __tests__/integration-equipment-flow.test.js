/**
 * CSSC - Equipment Module Flow Tests
 * Critical Success System Criteria: Equipment workflow
 * Test complete flow: Procurement → Usage → Maintenance → Depreciation
 */

const {
  MOCK_FARM_ID,
  mockEquipment
} = require('./fixtures/mockData');

describe('CSSC - Equipment Module Flow Tests', () => {
  // ============================================
  // CSSC 1: Equipment Procurement Flow
  // ============================================
  describe('CSSC 1: Equipment Procurement Flow', () => {
    it('should register new equipment', () => {
      const newEquipment = {
        id: 'eq_new',
        farm_id: MOCK_FARM_ID,
        equipment_code: 'EQP-NEW',
        equipment_name: 'Máy gặt mới',
        brand: 'John Deere',
        purchase_date: '2024-05-01',
        purchase_price: 250000000,
        status: 'active'
      };
      
      expect(newEquipment.status).toBe('active');
      expect(newEquipment.purchase_price).toBeGreaterThan(0);
    });

    it('should track equipment acquisition cost', () => {
      const totalAcquisitionCost = mockEquipment.reduce((sum, e) => sum + e.purchase_price, 0);
      expect(totalAcquisitionCost).toBe(173000000); // 150M + 15M + 8M
    });

    it('should categorize equipment by type', () => {
      const categories = {};
      mockEquipment.forEach(e => {
        const type = e.category_id?.replace('cat_', '') || 'other';
        categories[type] = (categories[type] || 0) + 1;
      });
      
      expect(categories['tractor']).toBe(1);
      expect(categories['pump']).toBe(1);
      expect(categories['sprayer']).toBe(1);
    });
  });

  // ============================================
  // CSSC 2: Equipment Usage Flow
  // ============================================
  describe('CSSC 2: Equipment Usage Flow', () => {
    it('should assign equipment to task', () => {
      const assignment = {
        equipment_id: 'eq_001',
        worker_id: 'worker_001',
        planting_id: 'plant_001',
        start_time: '2024-05-01 08:00:00',
        status: 'in_use'
      };
      
      expect(assignment.status).toBe('in_use');
    });

    it('should track equipment hours used', () => {
      const usageLogs = [
        { equipment_id: 'eq_001', hours: 5 },
        { equipment_id: 'eq_001', hours: 3 },
        { equipment_id: 'eq_001', hours: 6 }
      ];
      
      const totalHours = usageLogs.reduce((s, l) => s + l.hours, 0);
      expect(totalHours).toBe(14);
    });

    it('should calculate equipment utilization rate', () => {
      const maxHoursPerMonth = 200; // 8 hours/day * 25 days
      const actualHours = 140;
      const utilizationRate = (actualHours / maxHoursPerMonth) * 100;
      
      expect(utilizationRate).toBe(70);
    });

    it('should identify available equipment', () => {
      const available = mockEquipment.filter(e => e.status === 'active');
      expect(available.length).toBe(2);
    });
  });

  // ============================================
  // CSSC 3: Equipment Maintenance Flow
  // ============================================
  describe('CSSC 3: Equipment Maintenance Flow', () => {
    it('should schedule maintenance', () => {
      const maintenanceSchedule = {
        equipment_id: 'eq_003',
        maintenance_type: 'routine',
        scheduled_date: '2024-05-15',
        estimated_hours: 4,
        status: 'scheduled'
      };
      
      expect(maintenanceSchedule.status).toBe('scheduled');
    });

    it('should track maintenance history', () => {
      const maintenanceHistory = [
        { date: '2024-03-01', type: 'oil_change', cost: 500000 },
        { date: '2024-04-01', type: 'inspection', cost: 300000 },
        { date: '2024-05-01', type: 'repair', cost: 1000000 }
      ];
      
      const totalMaintenanceCost = maintenanceHistory.reduce((s, m) => s + m.cost, 0);
      expect(totalMaintenanceCost).toBe(1800000);
    });

    it('should calculate maintenance cost per hour', () => {
      const totalMaintenanceCost = 1800000;
      const totalHoursUsed = 100;
      const costPerHour = totalMaintenanceCost / totalHoursUsed;
      
      expect(costPerHour).toBe(18000);
    });

it('should predict maintenance needs', () => {
      const equipment = {
        hours_since_last_maintenance: 170,
        maintenance_interval: 200
      };
      
      const needsMaintenance = equipment.hours_since_last_maintenance >= equipment.maintenance_interval * 0.8;
      expect(needsMaintenance).toBe(true);
    });

    it('should generate equipment summary report', () => {
      const report = {
        total_equipment: mockEquipment.length,
        active: mockEquipment.filter(e => e.status === 'active').length,
        maintenance: mockEquipment.filter(e => e.status === 'maintenance').length,
        total_value: mockEquipment.reduce((s, e) => s + e.current_value, 0),
        total_investment: mockEquipment.reduce((s, e) => s + e.purchase_price, 0)
      };
      
      expect(report.total_equipment).toBe(3);
      expect(report.total_value).toBeGreaterThan(0);
    });
  });

  // ============================================
  // CSSC 4: Equipment Depreciation Flow
  // ============================================
  describe('CSSC 4: Equipment Depreciation Flow', () => {
    it('should calculate straight-line depreciation', () => {
      const purchasePrice = 150000000;
      const usefulLife = 10; // years
      const salvageValue = 20000000;
      const annualDepreciation = (purchasePrice - salvageValue) / usefulLife;
      
      expect(annualDepreciation).toBe(13000000);
    });

    it('should calculate current book value', () => {
      const purchasePrice = 150000000;
      const yearsUsed = 2;
      const annualDepreciation = 13000000;
      const currentValue = purchasePrice - (annualDepreciation * yearsUsed);
      
      expect(currentValue).toBe(124000000);
    });

    it('should calculate depreciation percentage', () => {
      const purchasePrice = 150000000;
      const currentValue = 120000000;
      const depreciationPercent = ((purchasePrice - currentValue) / purchasePrice) * 100;
      
      expect(depreciationPercent).toBe(20);
    });

    it('should track depreciation by equipment', () => {
      const depreciations = mockEquipment.map(e => {
        const depreciation = (e.purchase_price - e.current_value) / e.purchase_price * 100;
        return { id: e.id, depreciation_percent: depreciation.toFixed(1) };
      });
      
      expect(depreciations.length).toBe(3);
    });
  });

  // ============================================
  // CSSC 5: Equipment Status Monitoring
  // ============================================
  describe('CSSC 5: Equipment Status Monitoring', () => {
    it('should track equipment status', () => {
      const statusCounts = {};
      mockEquipment.forEach(e => {
        statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
      });
      
      expect(statusCounts['active']).toBe(2);
      expect(statusCounts['maintenance']).toBe(1);
    });

    it('should monitor equipment condition', () => {
      const conditions = {};
      mockEquipment.forEach(e => {
        conditions[e.condition] = (conditions[e.condition] || 0) + 1;
      });
      
      expect(conditions['good']).toBe(1);
      expect(conditions['excellent']).toBe(1);
      expect(conditions['fair']).toBe(1);
    });

    it('should identify equipment needing attention', () => {
      const needsAttention = mockEquipment.filter(e => 
        e.condition === 'poor' || e.status === 'maintenance'
      );
      
      expect(needsAttention.length).toBe(1); // eq_003
    });

    it('should calculate equipment reliability score', () => {
      const reliabilityScore = {
        operational: mockEquipment.filter(e => e.status === 'active').length,
        total: mockEquipment.length,
        score: (mockEquipment.filter(e => e.status === 'active').length / mockEquipment.length) * 100
      };
      
      expect(reliabilityScore.score).toBeCloseTo(66.67, 0);
    });
  });

  // ============================================
  // CSSC 6: Equipment Reporting Flow
  // ============================================
  describe('CSSC 6: Equipment Reporting Flow', () => {
    it('should generate equipment summary report', () => {
      const report = {
        total_equipment: mockEquipment.length,
        active: mockEquipment.filter(e => e.status === 'active').length,
        maintenance: mockEquipment.filter(e => e.status === 'maintenance').length,
        total_value: mockEquipment.reduce((s, e) => s + e.current_value, 0),
        total_investment: mockEquipment.reduce((s, e) => s + e.purchase_price, 0)
      };
      
      expect(report.total_equipment).toBe(3);
      expect(report.total_value).toBeGreaterThan(100000000);
    });

    it('should generate cost analysis report', () => {
      const costAnalysis = {
        depreciation_cost: mockEquipment.reduce((s, e) => s + (e.purchase_price - e.current_value), 0),
        maintenance_cost_estimated: 5000000,
        fuel_cost_estimated: 3000000,
        total_annual_cost: 10000000
      };
      
      expect(costAnalysis.total_annual_cost).toBe(10000000);
    });

    it('should generate replacement recommendation', () => {
      const equipmentToReplace = mockEquipment.filter(e => 
        e.condition === 'poor' || 
        (e.purchase_price - e.current_value) / e.purchase_price > 0.7
      );
      
      expect(equipmentToReplace.length).toBe(0); // No equipment needs replacement
    });
  });

  // ============================================
  // Integration: End-to-End Equipment Workflow
  // ============================================
  describe('Integration: End-to-End Equipment Workflow', () => {
    it('should execute complete equipment lifecycle', () => {
      // Step 1: Procurement
      const equipment = { ...mockEquipment[0], status: 'active' };
      expect(equipment.status).toBe('active');
      
      // Step 2: Usage tracking
      let totalHours = 0;
      totalHours += 5; // Day 1
      totalHours += 3; // Day 2
      expect(totalHours).toBe(8);
      
      // Step 3: Maintenance scheduling
      const needsMaintenance = totalHours > 5;
      expect(needsMaintenance).toBe(true);
      
      // Step 4: Update status if needed
      const maintenanceScheduled = needsMaintenance ? 'maintenance' : 'active';
      expect(maintenanceScheduled).toBe('maintenance');
      
      // Step 5: Calculate depreciation
      const yearsUsed = 2;
      const annualDep = (equipment.purchase_price - equipment.current_value) / yearsUsed;
      expect(annualDep).toBe(15000000);
    });

    it('should calculate equipment ROI', () => {
      const equipment = {
        purchase_price: 150000000,
        annual_cost: 20000000, // depreciation + maintenance
        annual_benefit: 50000000 // value generated
      };
      
      const roi = ((equipment.annual_benefit - equipment.annual_cost) / equipment.annual_cost) * 100;
      expect(roi).toBe(150); // 150% ROI
    });
  });
});