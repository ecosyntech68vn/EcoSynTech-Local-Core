import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getAll, getOne, runQuery } from '../config/database';

const router = Router();

interface Farm {
  id: string;
  name: string;
  location: string;
  area: number;
  area_unit: string;
  settings: string;
  created_at: string;
  updated_at?: string;
  active?: number;
}

interface Device {
  id: string;
  zone: string;
  status: string;
}

interface Sensor {
  id: string;
  type: string;
  value: string;
  zone?: string;
}

interface CreateFarmBody {
  name: string;
  location: string;
  area: number;
  area_unit?: string;
  settings?: Record<string, unknown>;
}

interface UpdateFarmBody {
  name?: string;
  location?: string;
  area?: number;
  area_unit?: string;
  settings?: Record<string, unknown>;
  active?: boolean;
}

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const farms = getAll('SELECT * FROM farms ORDER BY created_at DESC') as Farm[];
    res.json({ ok: true, data: farms });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const farm = getOne('SELECT * FROM farms WHERE id = ?', [req.params.id]) as Farm | undefined;
    if (!farm) {
      res.status(404).json({ ok: false, error: 'Farm not found' });
      return;
    }
    
    const devices = getAll('SELECT * FROM devices WHERE zone LIKE ?', [`%${req.params.id}%`]) as Device[];
    const sensors = getAll(`
      SELECT s.*, d.zone FROM sensors s 
      LEFT JOIN devices d ON d.id = s.id
      WHERE d.zone LIKE ?
    `, [`%${req.params.id}%`]) as Sensor[];
    
    res.json({ ok: true, data: { farm, devices, sensors } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { name, location, area, area_unit, settings } = req.body as CreateFarmBody;
    const id = 'farm-' + Date.now();
    runQuery(
      'INSERT INTO farms (id, name, location, area, area_unit, settings, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [id, name, location, area, area_unit || 'hectare', JSON.stringify(settings || {})]
    );
    res.json({ ok: true, data: { id, name } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { name, location, area, area_unit, settings, active } = req.body as UpdateFarmBody;
    const updates: string[] = [];
    const params: (string | number)[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (area) { updates.push('area = ?'); params.push(area); }
    if (area_unit) { updates.push('area_unit = ?'); params.push(area_unit); }
    if (settings) { updates.push('settings = ?'); params.push(JSON.stringify(settings)); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
    params.push(req.params.id);
    
    runQuery(`UPDATE farms SET ${updates.join(', ')}, updated_at = datetime("now") WHERE id = ?`, params);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    runQuery('UPDATE farms SET active = 0, updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/:id/stats', auth, async (req: Request, res: Response) => {
  try {
    const farm = getOne('SELECT * FROM farms WHERE id = ?', [req.params.id]) as Farm | undefined;
    if (!farm) {
      res.status(404).json({ ok: false, error: 'Farm not found' });
      return;
    }
    
    const devices = getAll('SELECT COUNT(*) as count, SUM(CASE WHEN status = \'online\' THEN 1 ELSE 0 END) as online FROM devices WHERE zone LIKE ?', [`%${req.params.id}%`]);
    const sensors = getAll('SELECT type, value FROM sensors') as Sensor[];
    const alerts = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM alerts');
    
    res.json({ ok: true, data: { farm, devices: devices[0], sensors, alerts } });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

export default router;