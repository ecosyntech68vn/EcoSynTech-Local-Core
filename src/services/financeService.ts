/**
 * Finance Service - Quản lý tài chính nông nghiệp
 * V5.1.0 - Converted to TypeScript - Phase 1
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
import db from '../config/database';
import logger from '../config/logger';

export interface FinanceTypeConfig {
  label: string;
  icon: string;
  category: string;
}

export interface BudgetTypeConfig {
  label: string;
  icon: string;
}

export interface Transaction {
  id: string;
  farm_id?: string;
  transaction_type: string;
  category: string;
  amount: number;
  description?: string;
  transaction_date: string;
  payment_method?: string;
  reference?: string;
  crop_id?: string;
  equipment_id?: string;
  worker_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  farm_id?: string;
  budget_type: string;
  name: string;
  total_amount: number;
  spent_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  farm_id?: string;
  lender: string;
  amount: number;
  interest_rate: number;
  start_date: string;
  end_date?: string;
  monthly_payment?: number;
  status: string;
  notes?: string;
  created_at: string;
}

export interface CreateTransactionData {
  farm_id?: string;
  transaction_type: string;
  category: string;
  amount: number;
  description?: string;
  transaction_date?: string;
  payment_method?: string;
  reference?: string;
  crop_id?: string;
  equipment_id?: string;
  worker_id?: string;
}

export interface CreateBudgetData {
  farm_id?: string;
  budget_type: string;
  name: string;
  total_amount: number;
  start_date?: string;
  end_date?: string;
}

export interface CreateLoanData {
  farm_id?: string;
  lender: string;
  amount: number;
  interest_rate: number;
  start_date?: string;
  end_date?: string;
  monthly_payment?: number;
  notes?: string;
}

export const INCOME_TYPES: Record<string, FinanceTypeConfig> = {
  crop_sale: { label: 'Bán nông sản', icon: '🌾', category: 'revenue' },
  product_sale: { label: 'Bán sản phẩm', icon: '📦', category: 'revenue' },
  service_income: { label: 'Thu dịch vụ', icon: '🔧', category: 'revenue' },
  subsidy: { label: 'Hỗ trợ', icon: '💵', category: 'revenue' },
  other_income: { label: 'Thu khác', icon: '💰', category: 'revenue' }
};

export const EXPENSE_TYPES: Record<string, FinanceTypeConfig> = {
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

export const BUDGET_TYPES: Record<string, BudgetTypeConfig> = {
  annual: { label: 'Ngân sách năm', icon: '📅' },
  seasonal: { label: 'Ngân sách mùa vụ', icon: '🌦️' },
  project: { label: 'Ngân sách dự án', icon: '📁' }
};

export function createTransaction(data: CreateTransactionData): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO finance_transactions (
      id, farm_id, transaction_type, category, amount, description,
      transaction_date, payment_method, reference, crop_id, equipment_id,
      worker_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.farm_id || null,
    data.transaction_type,
    data.category,
    data.amount,
    data.description || null,
    data.transaction_date || now.split('T')[0],
    data.payment_method || null,
    data.reference || null,
    data.crop_id || null,
    data.equipment_id || null,
    data.worker_id || null,
    now,
    now
  ]);

  logger.info(`Tạo giao dịch: ${data.transaction_type} - ${data.amount}`);
  return id;
}

export function getTransaction(transactionId: string): Transaction | null {
  return db.get('SELECT * FROM finance_transactions WHERE id = ?', [transactionId]) as Transaction | null;
}

export function getTransactionsByFarm(farmId: string, startDate?: string, endDate?: string): Transaction[] {
  let query = 'SELECT * FROM finance_transactions WHERE farm_id = ?';
  const params: any[] = [farmId];

  if (startDate) {
    query += ' AND transaction_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND transaction_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY transaction_date DESC';
  return db.all(query, params) as Transaction[];
}

export function getFinanceSummary(farmId: string, period: string = 'month'): {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  byCategory: Record<string, number>;
} {
  const now = new Date();
  let startDate: string;

  switch (period) {
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0] || '';
      break;
    case 'season':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0] || '';
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] || '';
  }

  const transactions = getTransactionsByFarm(farmId, startDate);
  
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const t of transactions) {
    if (Object.keys(INCOME_TYPES).includes(t.transaction_type)) {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
    }
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  }

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    byCategory
  };
}

export function createBudget(data: CreateBudgetData): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO finance_budgets (
      id, farm_id, budget_type, name, total_amount, spent_amount,
      start_date, end_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.farm_id || null,
    data.budget_type,
    data.name,
    data.total_amount,
    0,
    data.start_date || now.split('T')[0],
    data.end_date || null,
    'active',
    now,
    now
  ]);

  logger.info(`Tạo ngân sách: ${data.name}`);
  return id;
}

export function getBudgetsByFarm(farmId: string): Budget[] {
  return db.all('SELECT * FROM finance_budgets WHERE farm_id = ? ORDER BY start_date DESC', [farmId]) as Budget[];
}

export function updateBudgetSpent(budgetId: string): boolean {
  try {
    const budget = db.get('SELECT * FROM finance_budgets WHERE id = ?', [budgetId]) as Budget | undefined;
    if (!budget) return false;

    const transactions = db.all(`
      SELECT SUM(amount) as total FROM finance_transactions
      WHERE farm_id = ? AND transaction_date >= ? AND transaction_date <= ?
    `, [budget.farm_id, budget.start_date, budget.end_date || new Date().toISOString()]) as Array<{ total: number }>;

    const spent = transactions[0]?.total || 0;
    db.run('UPDATE finance_budgets SET spent_amount = ?, updated_at = ? WHERE id = ?', 
      [spent, new Date().toISOString(), budgetId]);
    
    return true;
  } catch (error: any) {
    logger.error('Update budget error:', error.message);
    return false;
  }
}

export function createLoan(data: CreateLoanData): string {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO finance_loans (
      id, farm_id, lender, amount, interest_rate, start_date,
      end_date, monthly_payment, status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.farm_id || null,
    data.lender,
    data.amount,
    data.interest_rate,
    data.start_date || now.split('T')[0],
    data.end_date || null,
    data.monthly_payment || null,
    'active',
    data.notes || null,
    now
  ]);

  logger.info(`Tạo khoản vay: ${data.lender} - ${data.amount}`);
  return id;
}

export function getLoansByFarm(farmId: string): Loan[] {
  return db.all('SELECT * FROM finance_loans WHERE farm_id = ? ORDER BY start_date DESC', [farmId]) as Loan[];
}

export function getLoanStats(farmId: string): {
  totalDebt: number;
  monthlyPayment: number;
  activeLoans: number;
} {
  const loans = getLoansByFarm(farmId);
  const activeLoans = loans.filter(l => l.status === 'active');

  return {
    totalDebt: activeLoans.reduce((sum, l) => sum + l.amount, 0),
    monthlyPayment: activeLoans.reduce((sum, l) => sum + (l.monthly_payment || 0), 0),
    activeLoans: activeLoans.length
  };
}

export function getCashFlowForecast(farmId: string, months: number = 3): {
  projectedIncome: number;
  projectedExpense: number;
  projectedProfit: number;
  breakdown: { month: string; income: number; expense: number }[];
} {
  const summary = getFinanceSummary(farmId, 'season');
  const avgIncome = summary.totalIncome / 6;
  const avgExpense = summary.totalExpense / 6;

  const breakdown: { month: string; income: number; expense: number }[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
    breakdown.push({
      month: month.toISOString().slice(0, 7),
      income: avgIncome,
      expense: avgExpense
    });
  }

  return {
    projectedIncome: avgIncome * months,
    projectedExpense: avgExpense * months,
    projectedProfit: (avgIncome - avgExpense) * months,
    breakdown
  };
}

export default {
  createTransaction,
  getTransaction,
  getTransactionsByFarm,
  getFinanceSummary,
  createBudget,
  getBudgetsByFarm,
  updateBudgetSpent,
  createLoan,
  getLoansByFarm,
  getLoanStats,
  getCashFlowForecast
};