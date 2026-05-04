import express, { Router, Request, Response } from 'express';
import { getAll, getOne } from '../config/database';

const router: Router = express.Router();

export interface SensorDataRow {
  id: number;
  device_id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  device_name?: string;
  label?: string;
}

router.get('/latest', (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const deviceId = req.query.deviceId as string;
    
    let query = `
      SELECT 
        sd.id,
        sd.device_id,
        sd.sensor_type as type,
        sd.value,
        sd.unit,
        sd.timestamp,
        d.name as device_name,
        d.label
      FROM sensor_data sd
      LEFT JOIN devices d ON sd.device_id = d.device_id
    `;
    
    let rows: SensorDataRow[];
    if (deviceId) {
      const condition = `WHERE sd.device_id = "${deviceId}"`;
      query += ` ${condition}`;
      rows = getAll(`${query} ORDER BY sd.timestamp DESC LIMIT ${limit}`) as SensorDataRow[];
    } else {
      rows = getAll(`${query} ORDER BY sd.timestamp DESC LIMIT ${limit}`) as SensorDataRow[];
    }
    
    const sensors = rows.map(r => ({
      id: r.id,
      deviceId: r.device_id,
      type: r.type,
      value: r.value,
      unit: r.unit,
      timestamp: r.timestamp,
      name: r.device_name || r.label || r.type,
      label: r.label
    }));
    
    res.json(sensors);
  } catch (err: any) {
    console.error('[Sensor-Data] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/device/:deviceId', (req: Request, res: Response): void => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const rows = getAll(`
      SELECT id, sensor_type as type, value, unit, timestamp
      FROM sensor_data 
      WHERE device_id = "${deviceId}"
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `);
    
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req: Request, res: Response): void => {
  try {
    const rows = getAll(`
      SELECT 
        sensor_type as type,
        COUNT(*) as count,
        AVG(value) as avg,
        MIN(value) as min,
        MAX(value) as max,
        MAX(timestamp) as last_update
      FROM sensor_data
      WHERE timestamp > datetime('now', '-24 hours')
      GROUP BY sensor_type
    `);
    
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;