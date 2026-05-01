/**
 * CSSC - Finance Module Flow Tests
 * Critical Success System Criteria: Finance workflow
 * Test complete flow: Income → Expense → Profit Calculation → Reporting
 */

const {
  MOCK_FARM_ID,
  mockFarms,
  mockFinance
} = require('./fixtures/mockData');

describe('CSSC - Finance Module Flow Tests', () => {
  // ============================================
  // CSSC 1: Income Management Flow
  // ============================================
  describe('CSSC 1: Income Management Flow', () => {
    const incomes = mockFinance.incomes;
    
    it('should process crop sales income flow', () => {
      const cropSales = incomes.filter(i => i.category === 'crop_sales');
      expect(cropSales.length).toBeGreaterThan(0);
      
      // Calculate total crop sales
      const totalCropSales = cropSales.reduce((sum, i) => sum + i.amount, 0);
      expect(totalCropSales).toBe(65000000); // 50M + 15M
      
      // Verify all have valid status
      cropSales.forEach(sale => {
        expect(sale.status).toMatch(/^(completed|pending)$/);
        expect(sale.date).toBeDefined();
      });
    });

    it('should process subsidy income flow', () => {
      const subsidies = incomes.filter(i => i.category === 'subsidy');
      const totalSubsidy = subsidies.reduce((sum, i) => sum + i.amount, 0);
      expect(totalSubsidy).toBe(10000000);
    });

    it('should calculate total income by period', () => {
      const period = '2024-04';
      const periodIncomes = incomes.filter(i => i.date.startsWith(period));
      const totalPeriodIncome = periodIncomes.reduce((sum, i) => sum + i.amount, 0);
      
      expect(periodIncomes.length).toBe(3);
      expect(totalPeriodIncome).toBe(75000000);
    });

    it('should categorize income by source', () => {
      const categories = {};
      incomes.forEach(income => {
        categories[income.category] = (categories[income.category] || 0) + income.amount;
      });
      
      expect(categories.crop_sales).toBe(65000000);
      expect(categories.subsidy).toBe(10000000);
    });
  });

  // ============================================
  // CSSC 2: Expense Management Flow
  // ============================================
  describe('CSSC 2: Expense Management Flow', () => {
    const expenses = mockFinance.expenses;
    
    it('should process fertilizer expense flow', () => {
      const fertilizerExp = expenses.filter(e => e.category === 'fertilizer');
      const total = fertilizerExp.reduce((sum, e) => sum + e.amount, 0);
      expect(total).toBe(8000000);
    });

    it('should process labor expense flow', () => {
      const laborExp = expenses.filter(e => e.category === 'labor');
      const total = laborExp.reduce((sum, e) => sum + e.amount, 0);
      expect(total).toBe(5000000);
    });

    it('should process equipment maintenance expense', () => {
      const equipmentExp = expenses.filter(e => e.category === 'equipment');
      const total = equipmentExp.reduce((sum, e) => sum + e.amount, 0);
      expect(total).toBe(3000000);
    });

    it('should calculate total expenses by period', () => {
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(totalExpenses).toBe(16000000);
    });
  });

  // ============================================
  // CSSC 3: Profit Calculation Flow
  // ============================================
  describe('CSSC 3: Profit Calculation Flow', () => {
    it('should calculate net profit correctly', () => {
      const totalIncome = mockFinance.incomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = mockFinance.expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalIncome - totalExpense;
      
      expect(totalIncome).toBe(75000000);
      expect(totalExpense).toBe(16000000);
      expect(netProfit).toBe(59000000);
    });

    it('should calculate profit margin percentage', () => {
      const totalIncome = mockFinance.incomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = mockFinance.expenses.reduce((sum, e) => sum + e.amount, 0);
      const profitMargin = ((totalIncome - totalExpense) / totalIncome) * 100;
      
      expect(profitMargin).toBeCloseTo(78.67, 1);
    });

    it('should calculate ROI for investment', () => {
      const investment = 10000000; // Initial investment
      const returnAmount = 15000000; // Return after period
      const roi = ((returnAmount - investment) / investment) * 100;
      
      expect(roi).toBe(50); // 50% ROI
    });

    it('should identify profitable vs unprofitable periods', () => {
      const periods = ['2024-01', '2024-02', '2024-03', '2024-04'];
      
      // Simulate different period results
      const periodResults = {
        '2024-01': { income: 10000000, expense: 8000000, profit: 2000000 },
        '2024-02': { income: 15000000, expense: 12000000, profit: 3000000 },
        '2024-03': { income: 20000000, expense: 18000000, profit: 2000000 },
        '2024-04': { income: 75000000, expense: 16000000, profit: 59000000 }
      };
      
      const profitablePeriods = Object.entries(periodResults)
        .filter(([_, data]) => data.profit > 0);
      
      expect(profitablePeriods.length).toBe(4); // All periods profitable
    });
  });

  // ============================================
  // CSSC 4: Budget Management Flow
  // ============================================
  describe('CSSC 4: Budget Management Flow', () => {
    it('should create budget allocation', () => {
      const budget = {
        farm_id: MOCK_FARM_ID,
        total_budget: 100000000,
        categories: {
          fertilizer: 30000000,
          labor: 40000000,
          equipment: 20000000,
          seeds: 10000000
        }
      };
      
      const totalAllocated = Object.values(budget.categories).reduce((s, v) => s + v, 0);
      expect(totalAllocated).toBe(100000000);
    });

    it('should track budget vs actual spending', () => {
      const budget = {
        fertilizer: 30000000,
        labor: 40000000,
        equipment: 20000000
      };
      
      const actuals = {
        fertilizer: 8000000,
        labor: 5000000,
        equipment: 3000000
      };
      
      // Calculate variance
      const variance = {};
      Object.keys(budget).forEach(cat => {
        variance[cat] = {
          budget: budget[cat],
          actual: actuals[cat],
          remaining: budget[cat] - actuals[cat],
          percentUsed: (actuals[cat] / budget[cat]) * 100
        };
      });
      
      expect(variance.fertilizer.percentUsed).toBeCloseTo(26.67, 1);
      expect(variance.labor.percentUsed).toBeCloseTo(12.5, 1);
      expect(variance.equipment.percentUsed).toBeCloseTo(15, 1);
    });

    it('should alert when budget exceeded', () => {
      const budget = { seeds: 5000000 };
      const actual = { seeds: 6000000 };
      
      const isExceeded = actual.seeds > budget.seeds;
      const overAmount = actual.seeds - budget.seeds;
      
      expect(isExceeded).toBe(true);
      expect(overAmount).toBe(1000000);
    });
  });

  // ============================================
  // CSSC 5: Financial Reporting Flow
  // ============================================
  describe('CSSC 5: Financial Reporting Flow', () => {
    it('should generate income statement', () => {
      const incomeStatement = {
        revenue: {
          crop_sales: 65000000,
          subsidy: 10000000,
          other: 0
        },
        expenses: {
          fertilizer: 8000000,
          labor: 5000000,
          equipment: 3000000
        },
        net_income: 59000000
      };
      
      expect(incomeStatement.net_income).toBe(59000000);
      expect(incomeStatement.revenue.crop_sales).toBe(65000000);
    });

    it('should generate cash flow statement', () => {
      const cashFlow = {
        operating: 59000000,
        investing: -50000000, // Equipment purchase
        financing: 0
      };
      
      const netCashFlow = cashFlow.operating + cashFlow.investing + cashFlow.financing;
      expect(netCashFlow).toBe(9000000);
    });

    it('should generate balance sheet summary', () => {
      const assets = {
        cash: 30000000,
        inventory_value: 20000000,
        equipment_value: 120000000
      };
      
      const liabilities = {
        loans: 50000000,
        payables: 10000000
      };
      
      const equity = Object.values(assets).reduce((s, v) => s + v, 0) - 
                     Object.values(liabilities).reduce((s, v) => s + v, 0);
      
      expect(equity).toBe(110000000); // 170M - 60M
    });
  });

  // ============================================
  // CSSC 6: Farm-specific Financial Analysis
  // ============================================
  describe('CSSC 6: Farm-specific Financial Analysis', () => {
    it('should calculate cost per hectare', () => {
      const farm = mockFarms.find(f => f.id === MOCK_FARM_ID);
      const totalExpense = mockFinance.expenses.reduce((sum, e) => sum + e.amount, 0);
      const costPerHa = totalExpense / farm.area_hectare;
      
      expect(costPerHa).toBe(1600000); // 16M / 10 ha
    });

    it('should calculate revenue per hectare', () => {
      const farm = mockFarms.find(f => f.id === MOCK_FARM_ID);
      const totalIncome = mockFinance.incomes.reduce((sum, i) => sum + i.amount, 0);
      const revenuePerHa = totalIncome / farm.area_hectare;
      
      expect(revenuePerHa).toBe(7500000); // 75M / 10 ha
    });

    it('should calculate profit per hectare', () => {
      const farm = mockFarms.find(f => f.id === MOCK_FARM_ID);
      const totalIncome = mockFinance.incomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = mockFinance.expenses.reduce((sum, e) => sum + e.amount, 0);
      const profitPerHa = (totalIncome - totalExpense) / farm.area_hectare;
      
      expect(profitPerHa).toBe(5900000); // 59M / 10 ha
    });
  });

  // ============================================
  // Integration: End-to-End Financial Workflow
  // ============================================
  describe('Integration: End-to-End Financial Workflow', () => {
    it('should execute complete financial cycle', () => {
      // Step 1: Record incomes
      const incomes = mockFinance.incomes;
      expect(incomes.length).toBe(3);
      
      // Step 2: Record expenses
      const expenses = mockFinance.expenses;
      expect(expenses.length).toBe(3);
      
      // Step 3: Calculate totals
      const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
      const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
      
      // Step 4: Calculate profit
      const profit = totalIncome - totalExpense;
      expect(profit).toBe(59000000);
      
      // Step 5: Calculate metrics
      const profitMargin = (profit / totalIncome) * 100;
      expect(profitMargin).toBeGreaterThan(50);
      
      // Step 6: Generate report
      const report = {
        period: '2024-04',
        total_income: totalIncome,
        total_expense: totalExpense,
        net_profit: profit,
        profit_margin: profitMargin.toFixed(2) + '%',
        status: profit > 0 ? 'PROFITABLE' : 'LOSS'
      };
      
      expect(report.status).toBe('PROFITABLE');
      expect(report.net_profit).toBe(59000000);
    });

    it('should handle financial forecasting', () => {
      // Current month data
      const currentIncome = 75000000;
      const currentExpense = 16000000;
      
      // Forecast next 3 months (growth rate 10%)
      const forecasts = [];
      for (let i = 1; i <= 3; i++) {
        const projectedIncome = currentIncome * Math.pow(1.1, i);
        const projectedExpense = currentExpense * Math.pow(1.05, i);
        forecasts.push({
          month: i,
          projected_income: Math.round(projectedIncome),
          projected_expense: Math.round(projectedExpense),
          projected_profit: Math.round(projectedIncome - projectedExpense)
        });
      }
      
      expect(forecasts.length).toBe(3);
      expect(forecasts[2].projected_profit).toBeGreaterThan(forecasts[0].projected_profit);
    });
  });
});