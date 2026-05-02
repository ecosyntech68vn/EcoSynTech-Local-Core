import express, { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getAll, getOne, runQuery } from '../config/database';
import * as inventoryService from '../services/inventoryService';

const router: Router = express.Router();

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  quantity: number;
  min_quantity: number;
  cost_per_unit: number;
  supplier: string | null;
  farm_id: string | null;
  expiry_date: string | null;
  status: string;
  created_at: string;
}

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, farm_id, low_stock } = req.query;
    let sql = 'SELECT * FROM inventory WHERE status = "active"';
    const params: unknown[] = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (low_stock === 'true') { sql += ' AND quantity <= min_quantity'; }
    sql += ' ORDER BY name';
    
    const items = getAll(sql, params) as InventoryItem[];
    res.json({ ok: true, data: items });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/categories', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = getAll('SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL') as Array<{ category: string }>;
    res.json({ ok: true, data: categories.map(c => c.category) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const item = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]) as InventoryItem | null;
    if (!item) {
      res.status(404).json({ ok: false, error: 'Item not found' });
      return;
    }
    
    const logs = getAll(
      'SELECT * FROM inventory_log WHERE inventory_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );
    res.json({ ok: true, data: { item, logs } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, unit, quantity, min_quantity, cost_per_unit, supplier, farm_id, expiry_date } = req.body;
    const id = 'inv-' + Date.now();
    runQuery(
      `INSERT INTO inventory (id, name, category, unit, quantity, min_quantity, cost_per_unit, supplier, farm_id, expiry_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [id, name, category, unit, quantity || 0, min_quantity || 0, cost_per_unit || 0, supplier, farm_id, expiry_date]
    );
    res.json({ ok: true, data: { id, name } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, unit, quantity, min_quantity, cost_per_unit, supplier, expiry_date, status } = req.body;
    const existing = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]) as InventoryItem | null;
    
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Item not found' });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
    if (quantity !== undefined) { updates.push('quantity = ?'); params.push(quantity); }
    if (min_quantity !== undefined) { updates.push('min_quantity = ?'); params.push(min_quantity); }
    if (cost_per_unit !== undefined) { updates.push('cost_per_unit = ?'); params.push(cost_per_unit); }
    if (supplier !== undefined) { updates.push('supplier = ?'); params.push(supplier); }
    if (expiry_date !== undefined) { updates.push('expiry_date = ?'); params.push(expiry_date); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    
    params.push(req.params.id);
    runQuery(`UPDATE inventory SET ${updates.join(', ')}, updated_at = datetime("now") WHERE id = ?`, params);
    
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    runQuery('UPDATE inventory SET status = "deleted", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/:id/adjust', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, quantity, notes } = req.body;
    const item = getOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]) as InventoryItem | null;
    
    if (!item) {
      res.status(404).json({ ok: false, error: 'Item not found' });
      return;
    }

    const newQuantity = type === 'in' 
      ? item.quantity + quantity 
      : Math.max(0, item.quantity - quantity);
    
    runQuery('UPDATE inventory SET quantity = ?, updated_at = datetime("now") WHERE id = ?', [newQuantity, req.params.id]);
    
    runQuery(
      'INSERT INTO inventory_log (id, inventory_id, type, quantity, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [require('uuid').v4(), req.params.id, type, quantity, notes, 'system']
    );
    
    res.json({ ok: true, data: { oldQuantity: item.quantity, newQuantity } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;