import express, { Router, Request, Response } from 'express';
import { getAll, getOne } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import pkg from '../../package.json';

const router: Router = express.Router();

const COMPANY_INFO = {
  name: 'CÔNG TY TNHH CÔNG NGHỆ ECOSYNTECH GLOBAL',
  founder: 'Tạ Quang Thuận',
  position: 'CEO and FOUNDER',
  phone: '0989516698',
  email: 'kd.ecosyntech@gmail.com',
  website: 'https://ecosyntech.com'
};

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { farm_id, date_from, date_to } = req.query;
  
  const deviceFilter = farm_id ? `WHERE farm_id = "${farm_id}"` : '';
  const deviceQuery = deviceFilter 
    ? `SELECT COUNT(*) as count, SUM(CASE WHEN status = "online" THEN 1 ELSE 0 END) as online FROM iot_devices ${deviceFilter}`
    : 'SELECT COUNT(*) as count, SUM(CASE WHEN status = "online" THEN 1 ELSE 0 END) as online FROM iot_devices';
  
  const devices = getOne(deviceQuery);
  const rules = getOne('SELECT COUNT(*) as count, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active FROM automation_rules');
  const schedules = getOne('SELECT COUNT(*) as count, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active FROM automation_schedules');
  const alerts = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as unacknowledged FROM alerts');
  const history = getOne('SELECT COUNT(*) as total FROM history');
  
  const sensors = getAll('SELECT type, value FROM sensors') as Array<{ type: string; value: number }>;
  const sensorStats: Record<string, number> = {};
  sensors.forEach(s => {
    sensorStats[s.type] = s.value;
  });
  
  res.json({
    system: {
      name: 'EcoSynTech Farm OS',
      version: pkg.version || '5.1.0',
      company: COMPANY_INFO,
      uptime: process.uptime()
    },
    devices: {
      total: devices?.count || 0,
      online: devices?.online || 0,
      offline: (devices?.count || 0) - (devices?.online || 0)
    },
    rules: {
      total: rules?.count || 0,
      active: rules?.active || 0
    },
    schedules: {
      total: schedules?.count || 0,
      active: schedules?.active || 0
    },
    alerts: {
      total: alerts?.total || 0,
      unacknowledged: alerts?.unacknowledged || 0
    },
    sensors: sensorStats,
    history: {
      total: history?.total || 0
    }
  });
}));

export default router;