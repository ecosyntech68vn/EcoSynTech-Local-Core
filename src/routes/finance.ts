import express, { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getAll, getOne, runQuery } from '../config/database';

const router: Router = express.Router();

interface FinanceRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  farm_id: string | null;
  date: string;
  payment_method: string | null;
  reference_id: string | null;
  created_at: string;
}

async function updateMonthlySummary(farmId: string | null, dateStr: string): Promise<void> {
  const [year, month] = dateStr.split('-').map(Number);
  
  const income = getOne('SELECT SUM(amount) as total FROM finance WHERE type = ? AND farm_id = ? AND strftime("%Y", date) = ? AND strftime("%m", date) = ?',
    ['income', farmId, String(year), String(month).padStart(2, '0')]) as { total: number } | null;
  
  const expenses = getOne('SELECT SUM(amount) as total FROM finance WHERE type = ? AND farm_id = ? AND strftime("%Y", date) = ? AND strftime("%m", date) = ?',
    ['expense', farmId, String(year), String(month).padStart(2, '0')]) as { total: number } | null;

  runQuery(`INSERT OR REPLACE INTO finance_summary (farm_id, year, month, income, expenses, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime("now"))`,
    [farmId, year, month, income?.total || 0, expenses?.total || 0]);
}

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, category, farm_id, start_date, end_date } = req.query;
    let sql = 'SELECT * FROM finance WHERE 1=1';
    const params: unknown[] = [];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (start_date) { sql += ' AND date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND date <= ?'; params.push(end_date); }
    sql += ' ORDER BY date DESC';
    
    const transactions = getAll(sql, params) as FinanceRecord[];
    res.json({ ok: true, data: transactions });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/categories', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = getAll('SELECT DISTINCT category FROM finance') as Array<{ category: string }>;
    res.json({ ok: true, data: categories.map(c => c.category) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, category, amount, description, farm_id, date, payment_method, reference_id } = req.body;
    const id = 'fin-' + Date.now();
    runQuery(
      `INSERT INTO finance (id, type, category, amount, description, farm_id, date, payment_method, reference_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [id, type, category, amount, description, farm_id, date, payment_method, reference_id]
    );
    
    await updateMonthlySummary(farm_id, date);
    res.json({ ok: true, data: { id, type, amount } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, category, amount, description, date, payment_method } = req.body;
    const existing = getOne('SELECT * FROM finance WHERE id = ?', [req.params.id]) as FinanceRecord | null;
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Transaction not found' });
      return;
    }
    
    const updates: string[] = [];
    const params: unknown[] = [];
    if (type) { updates.push('type = ?'); params.push(type); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
    if (description) { updates.push('description = ?'); params.push(description); }
    if (date) { updates.push('date = ?'); params.push(date); }
    if (payment_method) { updates.push('payment_method = ?'); params.push(payment_method); }
    
    params.push(req.params.id);
    runQuery(`UPDATE finance SET ${updates.join(', ')} WHERE id = ?`, params);
    
    if (date) {
      await updateMonthlySummary(existing.farm_id, date);
    }
    
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = getOne('SELECT * FROM finance WHERE id = ?', [req.params.id]) as FinanceRecord | null;
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Transaction not found' });
      return;
    }
    
    runQuery('DELETE FROM finance WHERE id = ?', [req.params.id]);
    await updateMonthlySummary(existing.farm_id, existing.date);
    
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/summary/monthly', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id, year, month } = req.query;
    let sql = 'SELECT * FROM finance_summary WHERE 1=1';
    const params: unknown[] = [];
    
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (year) { sql += ' AND year = ?'; params.push(parseInt(year as string)); }
    if (month) { sql += ' AND month = ?'; params.push(parseInt(month as string)); }
    
    sql += ' ORDER BY year DESC, month DESC';
    
    const summaries = getAll(sql, params);
    res.json({ ok: true, data: summaries });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;