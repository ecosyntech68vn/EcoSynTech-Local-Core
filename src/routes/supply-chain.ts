import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getAll, getOne, runQuery } from '../config/database';

const router = Router();

interface SupplyChain {
  id: string;
  batch_code: string;
  product_name: string;
  quantity: number;
  unit: string;
  source_farm_id: string;
  destination: string;
  status: string;
  created_at: string;
}

interface CreateSupplyChainBody {
  batch_code: string;
  product_name: string;
  quantity: number;
  unit: string;
  source_farm_id: string;
  destination: string;
}

interface UpdateSupplyChainBody {
  product_name?: string;
  quantity?: number;
  unit?: string;
  destination?: string;
  status?: string;
  notes?: string;
}

interface HarvestBody {
  temperature?: number;
  humidity?: number;
  quality_check?: string;
  notes?: string;
}

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const { status, farm_id } = req.query;
    let sql = 'SELECT * FROM supply_chain WHERE 1=1';
    const params: string[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status as string); }
    if (farm_id) { sql += ' AND source_farm_id = ?'; params.push(farm_id as string); }
    sql += ' ORDER BY created_at DESC';
    
    const batches = getAll(sql, params) as SupplyChain[];
    res.json({ ok: true, data: batches });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const batch = getOne('SELECT * FROM supply_chain WHERE id = ?', [req.params.id]) as SupplyChain | undefined;
    if (!batch) {
      res.status(404).json({ ok: false, error: 'Batch not found' });
      return;
    }
    res.json({ ok: true, data: batch });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { batch_code, product_name, quantity, unit, source_farm_id, destination } = req.body as CreateSupplyChainBody;
    const id = 'sc-' + Date.now();
    runQuery(
      `INSERT INTO supply_chain (id, batch_code, product_name, quantity, unit, source_farm_id, destination, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [id, batch_code, product_name, quantity, unit, source_farm_id, destination]
    );
    res.json({ ok: true, data: { id, batch_code } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { product_name, quantity, unit, destination, status, notes } = req.body as UpdateSupplyChainBody;
    const updates: string[] = [];
    const params: (string | number)[] = [];
    if (product_name) { updates.push('product_name = ?'); params.push(product_name); }
    if (quantity) { updates.push('quantity = ?'); params.push(quantity); }
    if (unit) { updates.push('unit = ?'); params.push(unit); }
    if (destination) { updates.push('destination = ?'); params.push(destination); }
    if (status) { 
      updates.push('status = ?'); params.push(status);
      if (status === 'shipped') updates.push('shipped_date = datetime("now")');
      if (status === 'delivered') updates.push('delivered_date = datetime("now")');
    }
    if (notes) { updates.push('notes = ?'); params.push(notes); }
    params.push(req.params.id);
    
    runQuery(`UPDATE supply_chain SET ${updates.join(', ')}, updated_at = datetime("now") WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/:id/harvest', auth, async (req: Request, res: Response) => {
  try {
    const { temperature, humidity, quality_check, notes } = req.body as HarvestBody;
    runQuery(
      `UPDATE supply_chain SET status = 'harvested', harvest_date = datetime("now"),
       temperature = ?, humidity = ?, quality_check = ?, notes = ?, updated_at = datetime("now")
       WHERE id = ?`,
      [temperature, humidity, quality_check, notes, req.params.id]
    );
    res.json({ ok: true, message: 'Harvest recorded' });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const total = getOne('SELECT COUNT(*) as count FROM supply_chain');
    const byStatus = getAll('SELECT status, COUNT(*) as count FROM supply_chain GROUP BY status');
    const byFarm = getAll('SELECT source_farm_id, COUNT(*) as count FROM supply_chain GROUP BY source_farm_id');
    res.json({ ok: true, data: { total: total?.count || 0, byStatus, byFarm } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

export default router;