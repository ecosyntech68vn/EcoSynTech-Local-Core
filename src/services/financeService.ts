/**
 * Finance Service - Quản lý tài chính nông nghiệp
 * V5.1.0 - Smart Financial Management with AI Predictions
 * 
 * 5S Framework: Sort, Set in Order, Shine, Standardize, Sustain
 * PDCA: Plan, Do, Check, Act
 * 
 * Features:
 * - Income and expense tracking
 * - Profit/Loss analysis by crop and season
 * - Cash flow forecasting
 * - Budget planning and tracking
 * - Loan management
 * - Asset tracking
 * - Tax management
 * - AI-powered financial predictions
 * - Integration with labor, equipment, and crop modules
 */

import { v4 as uuidv4 } from 'uuid';
const { getOne, getAll, getDatabase } = require('../config/database');
import logger from '../config/logger';

const db = getDatabase();

// Income Types
const INCOME_TYPES = {
  crop_sale: { label: 'Bán nông sản', icon: '🌾', category: 'revenue' },
  product_sale: { label: 'Bán sản phẩm', icon: '📦', category: 'revenue' },
  service_income: { label: 'Thu dịch vụ', icon: '🔧', category: 'revenue' },
  subsidy: { label: 'Hỗ trợ', icon: '💵', category: 'revenue' },
  other_income: { label: 'Thu khác', icon: '💰', category: 'revenue' }
};

// Expense Types
const EXPENSE_TYPES = {
  seeds: { label: 'Hạt giống', icon: '🌱', category: 'production' },
  fertilizers: { label: 'Phân bón', icon: '🧪', category: 'production' },
  pesticides: { label: 'Thuốc bảo vệ', icon: '💊', category: 'production' },
  labor_wage: { label: 'Tiền lương', icon: '👷', category: 'labor' },
  equipment: { label: 'Máy móc', icon: '🚜', category: 'equipment' },
  fuel: { label: 'Nhiên liệu', icon: '⛽', category: 'equipment' },
  maintenance: { label: 'Bảo trì', icon: '🔧', category: 'equipment' },
  utilities: { label: 'Điện nước', icon: '⚡', category: 'operations' },
  transport: { label: 'Vận chuyển', icon: '🚛', category: 'operations' },
  marketing: { label: 'Marketing', icon: '📢', category: 'operations' },
  packaging: { label: 'Đóng gói', icon: '📦', category: 'operations' },
  rent: { label: 'Thuê đất', icon: '🏞️', category: 'operations' },
  insurance: { label: 'Bảo hiểm', icon: '🛡️', category: 'operations' },
  tax: { label: 'Thuế', icon: '📋', category: 'tax' },
  other_expense: { label: 'Chi khác', icon: '💸', category: 'other' }
};

// Budget Types
const BUDGET_TYPES = {
  annual: { label: 'Ngân sách năm', icon: '📅' },
  seasonal: { label: 'Ngân sách mùa vụ', icon: '🌦️' },
  project: { label: 'Ngân sách dự án', icon: '📁' }
};

// ========== INCOME FUNCTIONS ==========

function createIncome(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const incomeCode = data.income_code || 'INC-' + Date.now().toString(36).toUpperCase();

  const values = [
    id, data.farm_id || null, incomeCode, data.income_type,
    data.category || 'revenue', data.amount, data.currency || 'VND',
    data.transaction_date || now.split('T')[0], data.crop_id || null,
    data.season_id || null, data.description || '', data.customer_id || null,
    data.payment_method || '', data.reference_number || '', data.status || 'received',
    data.attachments || '', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_income (
      id, farm_id, income_code, income_type, category, amount, currency,
      transaction_date, crop_id, season_id, description, customer_id,
      payment_method, reference_number, status, attachments, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  logger.info('Ghi nhận thu: ' + incomeCode + ' - ' + data.amount);
  return getOne('SELECT * FROM finance_income WHERE id = ?', [id]);
}

function getIncome(farmId, startDate, endDate, type, status) {
  let query = 'SELECT fi.*, c.name as crop_name FROM finance_income fi LEFT JOIN crops c ON fi.crop_id = c.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND fi.farm_id = ?'; params.push(farmId); }
  if (startDate) { query += ' AND fi.transaction_date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND fi.transaction_date <= ?'; params.push(endDate); }
  if (type) { query += ' AND fi.income_type = ?'; params.push(type); }
  if (status) { query += ' AND fi.status = ?'; params.push(status); }
  query += ' ORDER BY fi.transaction_date DESC';
  return getAll(query, params);
}

function getIncomeSummary(farmId, startDate, endDate) {
  const income = getAll(
    'SELECT SUM(amount) as total FROM finance_income WHERE farm_id = ? AND transaction_date >= ? AND transaction_date <= ? AND status = ?',
    [farmId, startDate, endDate, 'received']
  );
  return (income[0] && income[0].total) || 0;
}

// ========== EXPENSE FUNCTIONS ==========

function createExpense(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const expenseCode = data.expense_code || 'EXP-' + Date.now().toString(36).toUpperCase();

  const values = [
    id, data.farm_id || null, expenseCode, data.expense_type,
    data.category || 'production', data.amount, data.currency || 'VND',
    data.transaction_date || now.split('T')[0], data.crop_id || null,
    data.season_id || null, data.equipment_id || null, data.worker_id || null,
    data.supplier_id || null, data.description || '', data.payment_method || '',
    data.reference_number || '', data.tax_amount || 0, data.status || 'paid',
    data.attachments || '', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_expenses (
      id, farm_id, expense_code, expense_type, category, amount, currency,
      transaction_date, crop_id, season_id, equipment_id, worker_id, supplier_id,
      description, payment_method, reference_number, tax_amount, status,
      attachments, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  logger.info('Ghi nhận chi: ' + expenseCode + ' - ' + data.amount);
  return getOne('SELECT * FROM finance_expenses WHERE id = ?', [id]);
}

function getExpenses(farmId, startDate, endDate, type, category) {
  let query = 'SELECT fe.*, c.name as crop_name, ei.equipment_name, lw.worker_name FROM finance_expenses fe LEFT JOIN crops c ON fe.crop_id = c.id LEFT JOIN equipment_inventory ei ON fe.equipment_id = ei.id LEFT JOIN labor_workers lw ON fe.worker_id = lw.id WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND fe.farm_id = ?'; params.push(farmId); }
  if (startDate) { query += ' AND fe.transaction_date >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND fe.transaction_date <= ?'; params.push(endDate); }
  if (type) { query += ' AND fe.expense_type = ?'; params.push(type); }
  if (category) { query += ' AND fe.category = ?'; params.push(category); }
  query += ' ORDER BY fe.transaction_date DESC';
  return getAll(query, params);
}

function getExpenseSummary(farmId, startDate, endDate) {
  const expenses = getAll(
    'SELECT SUM(amount) as total, SUM(tax_amount) as tax_total FROM finance_expenses WHERE farm_id = ? AND transaction_date >= ? AND transaction_date <= ? AND status = ?',
    [farmId, startDate, endDate, 'paid']
  );
  return {
    total: (expenses[0] && expenses[0].total) || 0,
    tax_total: (expenses[0] && expenses[0].tax_total) || 0
  };
}

// ========== PROFIT/LOSS FUNCTIONS ==========

function calculateProfitLoss(farmId, cropId, seasonId, startDate, endDate) {
  const totalIncome = getIncomeSummary(farmId, startDate, endDate);
  const expenseSummary = getExpenseSummary(farmId, startDate, endDate);
  const totalExpenses = expenseSummary.total;
  const grossProfit = totalIncome - totalExpenses;
  const netProfit = grossProfit - expenseSummary.tax_total;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  return {
    period_start: startDate,
    period_end: endDate,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    gross_profit: grossProfit,
    net_profit: netProfit,
    profit_margin: Math.round(profit_margin * 100) / 100
  };
}

function getProfitLossByCrop(farmId, startDate, endDate) {
  const sDate = startDate || '2000-01-01';
  const eDate = endDate || '2100-12-31';
  const query = `
    SELECT c.id, c.name as crop_name,
      COALESCE((SELECT SUM(amount) FROM finance_income WHERE crop_id = c.id AND transaction_date >= ? AND transaction_date <= ?), 0) as income,
      COALESCE((SELECT SUM(amount) FROM finance_expenses WHERE crop_id = c.id AND transaction_date >= ? AND transaction_date <= ?), 0) as expenses
    FROM crops c
  `;
  const crops = getAll(query, [sDate, eDate, sDate, eDate]);
  
  return crops.map(crop => ({
    crop_id: crop.id,
    crop_name: crop.crop_name,
    income: crop.income,
    expenses: crop.expenses,
    profit: crop.income - crop.expenses,
    margin: crop.income > 0 ? Math.round(((crop.income - crop.expenses) / crop.income) * 100 * 100) / 100 : 0
  }));
}

// ========== CASH FLOW FUNCTIONS ==========

function createCashFlowForecast(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const expectedBalance = (data.expected_income || 0) - (data.expected_expense || 0);

  const values = [
    id, data.farm_id || null, data.forecast_type || 'monthly',
    data.forecast_date || now.split('T')[0], data.period_start,
    data.period_end, data.expected_income || 0, data.expected_expense || 0,
    expectedBalance, 0, 0, 0, data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_cashflow_forecast (
      id, farm_id, forecast_type, forecast_date, period_start, period_end,
      expected_income, expected_expense, expected_balance, actual_income,
      actual_expense, actual_balance, variance, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  return getOne('SELECT * FROM finance_cashflow_forecast WHERE id = ?', [id]);
}

function getCashFlowForecast(farmId, startDate, endDate) {
  return getAll(
    'SELECT * FROM finance_cashflow_forecast WHERE farm_id = ? AND period_start >= ? AND period_end <= ? ORDER BY period_start',
    [farmId, startDate, endDate]
  );
}

// ========== BUDGET FUNCTIONS ==========

function createBudget(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const budgetCode = data.budget_code || 'BUD-' + Date.now().toString(36).toUpperCase();

  const values = [
    id, data.farm_id || null, budgetCode, data.budget_name,
    data.budget_type || 'seasonal', data.total_amount, 0, 0,
    data.total_amount, data.period_start, data.period_end,
    data.crop_id || null, data.season_id || null, 'active', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_budgets (
      id, farm_id, budget_code, budget_name, budget_type, total_amount,
      allocated_amount, spent_amount, remaining_amount, period_start, period_end,
      crop_id, season_id, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  logger.info('Tạo ngân sách: ' + budgetCode + ' - ' + data.total_amount);
  return getOne('SELECT * FROM finance_budgets WHERE id = ?', [id]);
}

function getBudgets(farmId, status, cropId) {
  let query = 'SELECT * FROM finance_budgets WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (cropId) { query += ' AND crop_id = ?'; params.push(cropId); }
  query += ' ORDER BY period_start DESC';
  return getAll(query, params);
}

function updateBudgetProgress(budgetId) {
  const budget = getOne('SELECT * FROM finance_budgets WHERE id = ?', [budgetId]);
  if (!budget) return null;

  const spent = getAll(
    'SELECT SUM(amount) as total FROM finance_expenses WHERE crop_id = ? AND transaction_date >= ? AND transaction_date <= ?',
    [budget.crop_id, budget.period_start, budget.period_end]
  );
  const spentAmount = (spent[0] && spent[0].total) || 0;
  const remaining = budget.total_amount - spentAmount;

  db.run(
    'UPDATE finance_budgets SET spent_amount = ?, remaining_amount = ?, updated_at = ? WHERE id = ?',
    [spentAmount, remaining, new Date().toISOString(), budgetId]
  );

  return getOne('SELECT * FROM finance_budgets WHERE id = ?', [id]);
}

// ========== ACCOUNT FUNCTIONS ==========

function createAccount(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const accountCode = data.account_code || 'ACC-' + Date.now().toString(36).toUpperCase();

  const values = [
    id, data.farm_id || null, accountCode, data.account_name,
    data.account_type, data.bank_name || '', data.account_number || '',
    data.current_balance || 0, data.currency || 'VND', data.is_primary ? 1 : 0,
    'active', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_accounts (
      id, farm_id, account_code, account_name, account_type, bank_name,
      account_number, current_balance, currency, is_primary, status, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  return getOne('SELECT * FROM finance_accounts WHERE id = ?', [id]);
}

function getAccounts(farmId) {
  return getAll('SELECT * FROM finance_accounts WHERE farm_id = ? AND status = ? ORDER BY is_primary DESC, account_name', [farmId, 'active']);
}

// ========== LOAN FUNCTIONS ==========

function createLoan(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const loanCode = data.loan_code || 'LOAN-' + Date.now().toString(36).toUpperCase();
  const monthlyPayment = calculateMonthlyPayment(data.principal_amount, data.interest_rate, data.term_months);

  const values = [
    id, data.farm_id || null, loanCode, data.loan_type,
    data.lender, data.principal_amount, data.interest_rate || 0,
    data.term_months || 12, data.start_date, data.end_date || null,
    0, data.principal_amount, monthlyPayment, data.collateral || '',
    'active', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_loans (
      id, farm_id, loan_code, loan_type, lender, principal_amount,
      interest_rate, term_months, start_date, end_date, paid_amount,
      remaining_amount, monthly_payment, collateral, status, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  return getOne('SELECT * FROM finance_loans WHERE id = ?', [id]);
}

function calculateMonthlyPayment(principal, annualRate, months) {
  if (!principal || !months) return 0;
  const monthlyRate = (annualRate || 0) / 12 / 100;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

function getLoans(farmId, status) {
  let query = 'SELECT * FROM finance_loans WHERE 1=1';
  const params = [];
  if (farmId) { query += ' AND farm_id = ?'; params.push(farmId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY start_date DESC';
  return getAll(query, params);
}

function recordLoanPayment(data) {
  const loan = getOne('SELECT * FROM finance_loans WHERE id = ?', [data.loan_id]);
  if (!loan) return null;

  const id = uuidv4();
  const now = new Date().toISOString();
  const interestPaid = (loan.principal_amount * loan.interest_rate / 100) / 12;
  const principalPaid = data.payment_amount - interestPaid;
  const newRemaining = loan.remaining_amount - principalPaid;

  const values = [
    id, data.farm_id || null, data.loan_id, data.payment_date || now.split('T')[0],
    data.payment_amount, principalPaid, interestPaid, newRemaining,
    data.reference_number || '', data.notes || '', now
  ];

  db.run(
    `INSERT INTO finance_loan_payments (
      id, farm_id, loan_id, payment_date, payment_amount, principal_paid,
      interest_paid, remaining_balance, reference_number, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  db.run(
    'UPDATE finance_loans SET paid_amount = paid_amount + ?, remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?',
    [data.payment_amount, newRemaining, newRemaining <= 0 ? 'paid_off' : 'active', now, data.loan_id]
  );

  return getOne('SELECT * FROM finance_loan_payments WHERE id = ?', [id]);
}

// ========== ASSET FUNCTIONS ==========

function createAsset(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const assetCode = data.asset_code || 'AST-' + Date.now().toString(36).toUpperCase();

  const values = [
    id, data.farm_id || null, assetCode, data.asset_name,
    data.asset_type, data.purchase_date || null, data.purchase_price || 0,
    data.purchase_price || 0, data.depreciation_rate || 0,
    data.useful_life_years || 5, data.location || '', 'active',
    data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_assets (
      id, farm_id, asset_code, asset_name, asset_type, purchase_date,
      purchase_price, current_value, depreciation_rate, useful_life_years,
      location, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  return getOne('SELECT * FROM finance_assets WHERE id = ?', [id]);
}

function getAssets(farmId, type) {
  let query = 'SELECT * FROM finance_assets WHERE farm_id = ?';
  const params = [farmId];
  if (type) { query += ' AND asset_type = ?'; params.push(type); }
  query += ' ORDER BY asset_name';
  return getAll(query, params);
}

function updateAssetDepreciation(assetId) {
  const asset = getOne('SELECT * FROM finance_assets WHERE id = ?', [assetId]);
  if (!asset) return null;

  const now = new Date();
  const purchaseDate = asset.purchase_date ? new Date(asset.purchase_date) : now;
  const yearsElapsed = (now - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
  const annualDepreciation = (asset.purchase_price * asset.depreciation_rate) / 100;
  const accumulatedDep = annualDepreciation * yearsElapsed;
  const currentValue = Math.max(asset.purchase_price - accumulatedDep, asset.purchase_price * 0.1);

  db.run(
    'UPDATE finance_assets SET current_value = ?, updated_at = ? WHERE id = ?',
    [Math.round(currentValue * 100) / 100, now.toISOString(), assetId]
  );

  return getOne('SELECT * FROM finance_assets WHERE id = ?', [assetId]);
}

// ========== TAX FUNCTIONS ==========

function createTaxRecord(data) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const values = [
    id, data.farm_id || null, data.tax_type, data.period,
    data.tax_amount || 0, data.paid_amount || 0, data.due_date || null,
    data.payment_date || null, data.status || 'pending',
    data.tax_code || '', data.notes || '', now, now
  ];

  db.run(
    `INSERT INTO finance_taxes (
      id, farm_id, tax_type, period, tax_amount, paid_amount,
      due_date, payment_date, status, tax_code, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values
  );

  return getOne('SELECT * FROM finance_taxes WHERE id = ?', [id]);
}

function getTaxes(farmId, status) {
  let query = 'SELECT * FROM finance_taxes WHERE farm_id = ?';
  const params = [farmId];
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY due_date';
  return getAll(query, params);
}

// ========== AI FINANCIAL PREDICTION ==========

function predictCashFlow(farmId, daysAhead = 30) {
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get historical data (last 3 months)
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const historicalIncome = getIncomeSummary(farmId, threeMonthsAgo, startDate);
  const historicalExpense = getExpenseSummary(farmId, threeMonthsAgo, startDate);

  // Calculate averages per day
  const daysHistorical = 90;
  const avgDailyIncome = historicalIncome / daysHistorical;
  const avgDailyExpense = historicalExpense.total / daysHistorical;

  // Predict for next period
  const expectedIncome = avgDailyIncome * daysAhead;
  const expectedExpense = avgDailyExpense * daysAhead;
  const expectedBalance = expectedIncome - expectedExpense;

  // Calculate confidence based on data quality
  const confidence = historicalIncome > 0 && historicalExpense.total > 0 ? 'high' : 'medium';

  return {
    farm_id: farmId,
    prediction_period: { start: startDate, end: endDate },
    predicted_income: Math.round(expectedIncome),
    predicted_expense: Math.round(expectedExpense),
    predicted_balance: Math.round(expectedBalance),
    confidence: confidence,
    historical_data: {
      total_income_90d: Math.round(historicalIncome),
      total_expense_90d: Math.round(historicalExpense.total),
      avg_daily_income: Math.round(avgDailyIncome),
      avg_daily_expense: Math.round(avgDailyExpense)
    }
  };
}

function predictProfitability(farmId, cropId) {
  // Get all seasons for this crop
  const seasons = getAll('SELECT id, season_name, start_date, end_date FROM crop_seasons WHERE crop_id = ?', [cropId]);
  
  const predictions = seasons.map(season => {
    const income = getIncomeSummary(farmId, season.start_date, season.end_date);
    const expense = getExpenseSummary(farmId, season.start_date, season.end_date);
    const profit = income - expense.total;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    return {
      season_id: season.id,
      season_name: season.season_name,
      income: income,
      expenses: expense.total,
      profit: profit,
      margin: Math.round(margin * 100) / 100
    };
  });

  // Calculate average and predict next season
  const avgMargin = predictions.length > 0 
    ? predictions.reduce((sum, p) => sum + p.margin, 0) / predictions.length 
    : 0;

  return {
    crop_id: cropId,
    season_history: predictions,
    predicted_margin: Math.round(avgMargin * 100) / 100,
    recommendation: avgMargin > 20 ? 'highly_profitable' : avgMargin > 10 ? 'profitable' : 'low_margin'
  };
}

// ========== STATISTICS FUNCTIONS ==========

function getFinancialSummary(farmId, startDate, endDate) {
  if (!farmId) {
    return {
      period: { start: startDate, end: endDate },
      total_income: 0,
      total_expenses: 0,
      net_profit: 0,
      profit_margin: 0,
      tax_paid: 0,
      expenses_by_category: [],
      income_by_type: []
    };
  }
  const income = getIncomeSummary(farmId, startDate, endDate);
  const expense = getExpenseSummary(farmId, startDate, endDate);
  const profit = income - expense.total;

  // Get expense breakdown by category
  const expenseByCategory = getAll(
    `SELECT category, SUM(amount) as total FROM finance_expenses 
     WHERE farm_id = ? AND transaction_date >= ? AND transaction_date <= ? 
     GROUP BY category`,
    [farmId, startDate, endDate]
  );

  // Get income breakdown by type
  const incomeByType = getAll(
    `SELECT income_type, SUM(amount) as total FROM finance_income 
     WHERE farm_id = ? AND transaction_date >= ? AND transaction_date <= ? 
     GROUP BY income_type`,
    [farmId, startDate, endDate]
  );

  return {
    period: { start: startDate, end: endDate },
    total_income: income,
    total_expenses: expense.total,
    net_profit: profit,
    profit_margin: income > 0 ? Math.round((profit / income) * 100 * 100) / 100 : 0,
    tax_paid: expense.tax_total,
    expenses_by_category: expenseByCategory,
    income_by_type: incomeByType
  };
}

// ========== EXPORT ALL FUNCTIONS ==========

module.exports = {
export default module.exports;
export default module.exports;
  INCOME_TYPES,
  EXPENSE_TYPES,
  BUDGET_TYPES,

  // Income
  createIncome,
  getIncome,
  getIncomeSummary,

  // Expenses
  createExpense,
  getExpenses,
  getExpenseSummary,

  // Profit/Loss
  calculateProfitLoss,
  getProfitLossByCrop,

  // Cash Flow
  createCashFlowForecast,
  getCashFlowForecast,

  // Budget
  createBudget,
  getBudgets,
  updateBudgetProgress,

  // Accounts
  createAccount,
  getAccounts,

  // Loans
  createLoan,
  getLoans,
  recordLoanPayment,

  // Assets
  createAsset,
  getAssets,
  updateAssetDepreciation,

  // Taxes
  createTaxRecord,
  getTaxes,

  // AI Predictions
  predictCashFlow,
  predictProfitability,

  // Statistics
  getFinancialSummary
};