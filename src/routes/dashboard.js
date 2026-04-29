const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getAll, getOne } = require('../config/database');
const financeService = require('../services/financeService');
const { getDashboardOverview, getSensorDataByZone, getAlertsQuick, getDevicesStatus, invalidateCache } = require('../services/performanceService');
const si = require('systeminformation');
const os = require('os');

router.get('/overview', auth, async (req, res) => {
  try {
    const devices = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN status = "online" THEN 1 ELSE 0 END) as online FROM devices');
    const farms = getOne('SELECT COUNT(*) as total FROM farms WHERE active = 1');
    const crops = getOne('SELECT COUNT(*) as total, SUM(area) as total_area FROM crops WHERE status = "active"');
    const sensors = getAll('SELECT type, value, unit FROM sensors');
    const alerts = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as pending FROM alerts');
    const rules = getOne('SELECT COUNT(*) as total, SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active FROM rules');
    
    const sensorData = {};
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
        sensors: sensorData,
        alerts: {
          total: alerts?.total || 0,
          pending: alerts?.pending || 0
        },
        automation: {
          rules: rules?.total || 0,
          active: rules?.active || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = getAll('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 20');
    res.json({ ok: true, data: alerts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/activity', auth, async (req, res) => {
  try {
    const history = getAll('SELECT * FROM history ORDER BY timestamp DESC LIMIT 30');
    res.json({ ok: true, data: history });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/weather', auth, async (req, res) => {
  try {
    const lat = req.query.lat || process.env.FARM_LAT || '10.7769';
    const lon = req.query.lon || process.env.FARM_LON || '106.7009';
    
    const axios = require('axios');
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&forecast_days=5&timezone=auto`
    );
    const data = response.data;
    const hourly = data.hourly;
    const now = new Date();
    const currentIdx = hourly.time.findIndex(t => new Date(t) >= now);
    
    const current = {
      temp: hourly.temperature_2m[currentIdx]?.toFixed(1) || 0,
      humidity: hourly.relative_humidity_2m[currentIdx] || 0,
      precipitation: hourly.precipitation[currentIdx] || 0,
      precipProbability: hourly.precipitation_probability[currentIdx] || 0,
      wind: hourly.wind_speed_10m[currentIdx] || 0,
      weatherCode: hourly.weather_code[currentIdx] || 0
    };
    
    const forecast = [];
    for (let i = 0; i < Math.min(24, hourly.time.length); i += 3) {
      forecast.push({
        time: hourly.time[i],
        temp: hourly.temperature_2m[i]?.toFixed(1),
        humidity: hourly.relative_humidity_2m[i],
        precipProbability: hourly.precipitation_probability[i],
        precipitation: hourly.precipitation[i],
        wind: hourly.wind_speed_10m[i],
        weatherCode: hourly.weather_code[i]
      });
    }
    
    res.json({
      ok: true,
      data: {
        current,
        forecast,
        location: { lat, lon },
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/overview-optimized', auth, async (req, res) => {
  try {
    const { farmId } = req.query;
    const data = await getDashboardOverview(farmId);
    res.json({ ok: true, ...data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/sensors-zone', auth, async (req, res) => {
  try {
    const { zoneId } = req.query;
    const data = await getSensorDataByZone(zoneId);
    res.json({ ok: true, sensors: data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/alerts-quick', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const alerts = await getAlertsQuick(parseInt(limit));
    res.json({ ok: true, alerts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/devices-status', auth, async (req, res) => {
  try {
    const devices = await getDevicesStatus();
    res.json({ ok: true, devices });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/finance-summary', auth, async (req, res) => {
  try {
    const { farm_id, period = 'month' } = req.query;
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'today') {
      startDate = endDate = now.toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = weekAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = monthAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (period === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      startDate = yearAgo.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }
    
    const summary = financeService.getFinancialSummary(farm_id, startDate, endDate);
    const recentIncome = financeService.getIncome(farm_id, startDate, endDate).slice(0, 5);
    const recentExpenses = financeService.getExpenses(farm_id, startDate, endDate).slice(0, 5);
    const profitLossByCrop = financeService.getProfitLossByCrop(farm_id, startDate, endDate);
    
    res.json({
      ok: true,
      data: {
        summary,
        recentIncome,
        recentExpenses,
        profitLossByCrop,
        period: { start: startDate, end: endDate, type: period }
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/finance-kpis', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const thisMonthEnd = now.toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    
    const thisMonth = financeService.getFinancialSummary(farm_id, thisMonthStart, thisMonthEnd);
    const lastMonth = financeService.getFinancialSummary(farm_id, lastMonthStart, lastMonthEnd);
    
    const incomeGrowth = lastMonth.total_income > 0 
      ? ((thisMonth.total_income - lastMonth.total_income) / lastMonth.total_income * 100).toFixed(1)
      : 0;
    const expenseGrowth = lastMonth.total_expenses > 0
      ? ((thisMonth.total_expenses - lastMonth.total_expenses) / lastMonth.total_expenses * 100).toFixed(1)
      : 0;
    const profitGrowth = lastMonth.net_profit > 0
      ? ((thisMonth.net_profit - lastMonth.net_profit) / lastMonth.net_profit * 100).toFixed(1)
      : 0;
    
    const budgets = financeService.getBudgets(farm_id, 'active');
    const totalBudget = budgets.reduce((sum, b) => sum + (b.planned_amount || 0), 0);
    const usedBudget = budgets.reduce((sum, b) => sum + (b.used_amount || 0), 0);
    
    res.json({
      ok: true,
      data: {
        thisMonth: {
          income: thisMonth.total_income,
          expenses: thisMonth.total_expenses,
          profit: thisMonth.net_profit,
          margin: thisMonth.profit_margin
        },
        lastMonth: {
          income: lastMonth.total_income,
          expenses: lastMonth.total_expenses,
          profit: lastMonth.net_profit
        },
        growth: {
          income: parseFloat(incomeGrowth),
          expenses: parseFloat(expenseGrowth),
          profit: parseFloat(profitGrowth)
        },
        budget: {
          total: totalBudget,
          used: usedBudget,
          remaining: totalBudget - usedBudget,
          usagePercent: totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0
        },
        incomeTypes: financeService.INCOME_TYPES,
        expenseTypes: financeService.EXPENSE_TYPES
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/cache-invalidate', auth, async (req, res) => {
  try {
    const { farmId } = req.body;
    invalidateCache(farmId);
    res.json({ ok: true, message: 'Cache invalidated' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;