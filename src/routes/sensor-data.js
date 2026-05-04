const express = require('express');
const router = express.Router();
const { getAll, getOne } = require('../config/database');

router.get('/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const deviceId = req.query.deviceId;
    
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
    
    let rows;
    if (deviceId) {
      const condition = `WHERE sd.device_id = "${deviceId}"`;
      query += ` ${condition}`;
      rows = getAll(`${query} ORDER BY sd.timestamp DESC LIMIT ${limit}`);
    } else {
      rows = getAll(`${query} ORDER BY sd.timestamp DESC LIMIT ${limit}`);
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
  } catch (err) {
    console.error('[Sensor-Data] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const rows = getAll(`
      SELECT id, sensor_type as type, value, unit, timestamp
      FROM sensor_data 
      WHERE device_id = "${deviceId}"
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;