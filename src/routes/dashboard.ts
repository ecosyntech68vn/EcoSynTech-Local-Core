import express, { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getAll, getOne } from '../config/database';
import * as financeService from '../services/financeService';
import * as inventoryService from '../services/inventoryService';
import * as equipmentService from '../services/equipmentService';
import * as laborService from '../services/laborService';
import * as cropService from '../services/cropService';
import { getDashboardOverview, getSensorDataByZone, getAlertsQuick, getDevicesStatus, invalidateCache } from '../services/performanceService';
import * as redisCache from '../services/redisCache';
import * as si from 'systeminformation';
import * as os from 'os';

import router: Router = express.Router();

import CACHE_TTL = 30;

redisCache.initRedis().catch(() => {});

function getCached(key: string): Promise<unknown> {
  return redisCache.get('dashboard:' + key) as Promise<unknown>;
}

function setCached(key: string, data: unknown, ttl: number = CACHE_TTL): Promise<boolean> {
  return redisCache.set('dashboard:' + key, data, ttl) as Promise<boolean>;
}

function clearDashboardCache(): Promise<number> {
  return redisCache.invalidateByPrefix('dashboard:') as Promise<number>;
}

interface DbCountResult {
  total?: number;
  online?: number;
  active?: number;
  total_area?: number;
  pending?: number;
}

router.get('/overview', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN status = "online" THEN 1 ELSE 0 END) as online FROM devices') as DbCountResult | null;
    const farms = getOne('SELECT COUNT(*) as total FROM farms WHERE active = 1') as DbCountResult | null;
    const crops = getOne('SELECT COUNT(*) as total, SUM(area) as total_area FROM crops WHERE status = "active"') as DbCountResult | null;
    const sensors = getAll('SELECT type, value, unit FROM sensors') as Array<{ type: string; value: number; unit: string }>;
    const alerts = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM alerts') as DbCountResult | null;
    const rules = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active FROM rules') as DbCountResult | null;
    
    const sensorData: Record<string, { value: number; unit: string }> = {};
    sensors.forEach(s => { sensorData[s.type] = { value: s.value, unit: s.unit }; });
    
    const [cpu, mem, disk] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize()
    ]);
    const mainDisk = disk.find(d => d.mount === '/' || d.mount === 'C:') || disk[0];
    
    res.json({
      ok: true,
      data: {
        system: {
          uptime: os.uptime(),
          cpu: cpu.currentLoad.toFixed(1),
          memory: ((mem.used / mem.total) * 100).toFixed(1),
          disk: mainDisk?.use ?? 0
        },
        farms: farms?.total || 0,
        devices: {
          total: devices?.total || 0,
          online: devices?.online || 0
        },
        crops: {
          total: crops?.total || 0,
          area: crops?.total_area || 0
        },
        alerts: {
          total: alerts?.total || 0,
          pending: alerts?.pending || 0
        },
        rules: {
          total: rules?.total || 0,
          active: rules?.active || 0
        },
        sensors: sensorData
      }
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/sensors', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const cached = await getCached('sensors');
    if (cached) {
      res.json(cached);
      return;
    }

    const sensors = getAll('SELECT type, value, unit, timestamp FROM sensors ORDER BY type');
    await setCached('sensors', { ok: true, sensors }, 30);
    res.json({ ok: true, sensors });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/alerts', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const alerts = getAll(`SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?`, [limit]);
    res.json({ ok: true, alerts });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/devices', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = getAll('SELECT id, name, type, status, last_seen FROM devices ORDER BY last_seen DESC');
    res.json({ ok: true, devices });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/finance/summary', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const income = getOne('SELECT SUM(amount) as total FROM finance_income') as { total: number } | null;
    const expenses = getOne('SELECT SUM(amount) as total FROM finance_expenses') as { total: number } | null;
    
    res.json({
      ok: true,
      income: income?.total || 0,
      expenses: expenses?.total || 0,
      balance: (income?.total || 0) - (expenses?.total || 0)
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/inventory/summary', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const items = getOne('SELECT COUNT(*) as total, SUM(current_stock * cost_per_unit) as value FROM inventory_items');
    res.json({ ok: true, total: items?.total || 0, value: items?.value || 0 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/refresh', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    await clearDashboardCache();
    res.json({ ok: true, message: 'Dashboard cache cleared' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;