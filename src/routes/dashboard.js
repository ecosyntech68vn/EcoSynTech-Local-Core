const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getAll, getOne } = require('../config/database');
const financeService = require('../services/financeService');
const inventoryService = require('../services/inventoryService');
const equipmentService = require('../services/equipmentService');
const laborService = require('../services/laborService');
const cropService = require('../services/cropService');
const { getDashboardOverview, getSensorDataByZone, getAlertsQuick, getDevicesStatus, invalidateCache } = require('../services/performanceService');
const si = require('systeminformation');
const os = require('os');

const CACHE_TTL = 30000;
const cache = new Map();

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearDashboardCache() {
  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.startsWith('dashboard:')) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

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
    const cacheKey = `dashboard:finance-summary:${farm_id}:${period}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
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
    setCached(cacheKey, res._data);
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

router.get('/inventory-overview', auth, async (req, res) => {
  try {
    const { farm_id, category, startDate, endDate } = req.query;
    const stats = inventoryService.getInventoryStats(farm_id, startDate, endDate);
    const lowStock = inventoryService.getLowStockItems(farm_id);
    const expiring = inventoryService.getExpiringItems(30, farm_id);
    const items = inventoryService.getItems(farm_id, category, 'active').slice(0, 10);
    const transactions = inventoryService.getTransactions(null, farm_id, startDate, endDate).slice(0, 10);
    
    res.json({
      ok: true,
      data: {
        stats: stats || { totalItems: 0, totalValue: 0, categories: {} },
        lowStock: lowStock || [],
        expiringItems: expiring || [],
        recentItems: items || [],
        recentTransactions: transactions || []
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/inventory-alerts', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const lowStock = inventoryService.getLowStockItems(farm_id);
    const expiring = inventoryService.getExpiringItems(30, farm_id);
    const alerts = inventoryService.getActiveAlerts(farm_id, true);
    
    const alertSummary = {
      lowStock: lowStock?.length || 0,
      expiringSoon: expiring?.length || 0,
      unresolved: alerts?.length || 0,
      items: lowStock?.map(item => ({
        id: item.id,
        name: item.item_name,
        current: item.current_stock,
        min: item.min_stock_alert,
        category: item.category
      })) || []
    };
    
    res.json({ ok: true, data: alertSummary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/inventory-kpis', auth, async (req, res) => {
  try {
    const { farm_id, period = 'month' } = req.query;
    const stats = inventoryService.getInventoryStats(farm_id);
    const usageByCrop = inventoryService.getUsageByCrop(farm_id);
    const usageByPeriod = inventoryService.getUsageByPeriod(farm_id, null, null);
    
    const totalValue = stats?.totalValue || 0;
    const totalItems = stats?.totalItems || 0;
    const categoryCount = stats?.categories ? Object.keys(stats.categories).length : 0;
    
    const byCategory = stats?.categories || {};
    const categoryLabels = Object.keys(byCategory).map(cat => ({
      name: cat,
      count: byCategory[cat].count || 0,
      value: byCategory[cat].value || 0
    }));
    
    res.json({
      ok: true,
      data: {
        overview: {
          totalItems,
          totalValue,
          categories: categoryCount
        },
        byCategory: categoryLabels,
        usageByCrop: usageByCrop || [],
        recentUsage: usageByPeriod?.slice(0, 10) || []
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/equipment-overview', auth, async (req, res) => {
  try {
    const { farm_id, status, startDate, endDate } = req.query;
    const equipment = equipmentService.getEquipment(farm_id, null, status);
    const stats = equipmentService.getEquipmentStats(farm_id, startDate, endDate);
    const maintenanceSchedules = equipmentService.getMaintenanceSchedules(farm_id, null, 'pending');
    const assignments = equipmentService.getAssignments(farm_id, null, startDate, endDate);
    
    const total = equipment?.length || 0;
    const online = equipment?.filter(e => e.status === 'online').length || 0;
    const offline = equipment?.filter(e => e.status === 'offline').length || 0;
    const maintenance = equipment?.filter(e => e.status === 'maintenance').length || 0;
    
    res.json({
      ok: true,
      data: {
        stats: {
          total,
          online,
          offline,
          maintenance,
          usageRate: total > 0 ? Math.round((online / total) * 100) : 0
        },
        equipment: equipment?.slice(0, 10) || [],
        upcomingMaintenance: maintenanceSchedules?.slice(0, 5) || [],
        activeAssignments: assignments?.slice(0, 5) || []
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/equipment-alerts', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const offline = equipmentService.getEquipment(farm_id, null, 'offline');
    const maintenanceDue = equipmentService.getMaintenanceSchedules(farm_id, null, 'pending');
    const overdueMaintenance = maintenanceDue?.filter(m => {
      return m.next_maintenance_date && new Date(m.next_maintenance_date) < new Date();
    }) || [];
    
    const alerts = {
      offline: offline?.length || 0,
      maintenanceDue: maintenanceDue?.length || 0,
      overdue: overdueMaintenance?.length || 0,
      equipment: offline?.map(e => ({
        id: e.id,
        name: e.equipment_name,
        status: e.status,
        lastUpdate: e.updated_at
      })) || []
    };
    
    res.json({ ok: true, data: alerts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/equipment-kpis', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const stats = equipmentService.getEquipmentStats(farm_id);
    const equipment = equipmentService.getEquipment(farm_id, null, null);
    const categories = equipmentService.getCategories(farm_id);
    
    const byStatus = {
      online: equipment?.filter(e => e.status === 'online').length || 0,
      offline: equipment?.filter(e => e.status === 'offline').length || 0,
      maintenance: equipment?.filter(e => e.status === 'maintenance').length || 0,
      retired: equipment?.filter(e => e.status === 'retired').length || 0
    };
    
    const byCategory = {};
    equipment?.forEach(e => {
      const cat = e.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    
    const maintenanceCosts = equipmentService.getCostByEquipment(farm_id, null, null, null);
    const totalCost = maintenanceCosts?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0;
    
    res.json({
      ok: true,
      data: {
        overview: {
          total: equipment?.length || 0,
          byStatus,
          categories: categories?.length || 0,
          totalMaintenanceCost: totalCost
        },
        byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })),
        maintenanceCosts: maintenanceCosts?.slice(0, 5) || []
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/labor-overview', auth, async (req, res) => {
  try {
    const { farm_id, status, startDate, endDate } = req.query;
    const workers = laborService.getWorkers(farm_id, null, status);
    const tasks = laborService.getTasks(farm_id, null, startDate, endDate, null);
    const stats = laborService.getLaborStats(farm_id, startDate, endDate);
    
    const total = workers?.length || 0;
    const active = workers?.filter(w => w.status === 'active').length || 0;
    const onLeave = workers?.filter(w => w.status === 'on_leave').length || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    
    res.json({
      ok: true,
      data: {
        stats: {
          total,
          active,
          onLeave,
          pendingTasks,
          completedTasks,
          completionRate: (pendingTasks + completedTasks) > 0 
            ? Math.round((completedTasks / (pendingTasks + completedTasks)) * 100) 
            : 0
        },
        workers: workers?.slice(0, 10) || [],
        recentTasks: tasks?.slice(0, 10) || []
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/labor-alerts', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const workers = laborService.getWorkers(farm_id, null, 'active');
    const tasks = laborService.getTasks(farm_id, 'pending', null, null, null);
    const stats = laborService.getLaborStats(farm_id);
    
    const alerts = {
      onLeave: workers?.filter(w => w.status === 'on_leave').length || 0,
      pendingTasks: tasks?.length || 0,
      workersCount: workers?.length || 0,
      tasksOverview: {
        pending: tasks?.filter(t => t.status === 'pending').length || 0,
        inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        completed: tasks?.filter(t => t.status === 'completed').length || 0
      }
    };
    
    res.json({ ok: true, data: alerts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/labor-kpis', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const stats = laborService.getLaborStats(farm_id);
    const workers = laborService.getWorkers(farm_id, null, null);
    const tasks = laborService.getTasks(farm_id, null, null, null, null);
    const laborCost = laborService.getLaborCostByCrop(farm_id, null, null);
    
    const byPosition = {};
    workers?.forEach(w => {
      const pos = w.position || 'other';
      byPosition[pos] = (byPosition[pos] || 0) + 1;
    });
    
    const totalCost = laborCost?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0;
    
    const taskStats = {
      pending: tasks?.filter(t => t.status === 'pending').length || 0,
      inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
      completed: tasks?.filter(t => t.status === 'completed').length || 0,
      total: tasks?.length || 0
    };
    
    res.json({
      ok: true,
      data: {
        overview: {
          totalWorkers: workers?.length || 0,
          activeWorkers: workers?.filter(w => w.status === 'active').length || 0,
          totalTasks: taskStats.total,
          completedTasks: taskStats.completed,
          completionRate: taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0
        },
        byPosition: Object.entries(byPosition).map(([name, count]) => ({ name, count })),
        laborCostByCrop: laborCost?.slice(0, 5) || [],
        totalLaborCost: totalCost
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/crops-overview', auth, async (req, res) => {
  try {
    const { farm_id, status, startDate, endDate } = req.query;
    const plantings = cropService.getAllPlantings(farm_id, status, startDate, endDate);
    const stats = cropService.getCropStats(farm_id, startDate, endDate);
    
    const total = plantings?.length || 0;
    const active = plantings?.filter(p => p.status === 'active' || p.status === 'growing').length || 0;
    const harvested = plantings?.filter(p => p.status === 'harvested').length || 0;
    const dormant = plantings?.filter(p => p.status === 'dormant').length || 0;
    
    res.json({
      ok: true,
      data: {
        stats: {
          total,
          active,
          harvested,
          dormant,
          growthRate: total > 0 ? Math.round((active / total) * 100) : 0
        },
        plantings: plantings?.slice(0, 10) || [],
        cropStats: stats || {}
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/crops-alerts', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const plantings = cropService.getAllPlantings(farm_id, 'active');
    
    const now = new Date();
    const alerts = {
      total: plantings?.length || 0,
      active: plantings?.filter(p => p.status === 'active' || p.status === 'growing').length || 0,
      needsWater: 0,
      needsHarvest: 0,
      recentlyPlanted: plantings?.filter(p => {
        const planted = new Date(p.planting_date);
        const daysDiff = (now - planted) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      }).length || 0
    };
    
    res.json({ ok: true, data: alerts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/crops-kpis', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const stats = cropService.getCropStats(farm_id);
    const plantings = cropService.getAllPlantings(farm_id, null);
    
    const byStatus = {
      active: plantings?.filter(p => p.status === 'active' || p.status === 'growing').length || 0,
      harvested: plantings?.filter(p => p.status === 'harvested').length || 0,
      dormant: plantings?.filter(p => p.status === 'dormant').length || 0,
      failed: plantings?.filter(p => p.status === 'failed').length || 0
    };
    
    const byCrop = {};
    plantings?.forEach(p => {
      const crop = p.crop_name || p.name || 'unknown';
      byCrop[crop] = (byCrop[crop] || 0) + 1;
    });
    
    const totalArea = plantings?.reduce((sum, p) => sum + (p.area || 0), 0) || 0;
    
    res.json({
      ok: true,
      data: {
        overview: {
          totalPlantings: plantings?.length || 0,
          activePlantings: byStatus.active,
          harvestedPlantings: byStatus.harvested,
          totalArea,
          byStatus
        },
        byCrop: Object.entries(byCrop).map(([name, count]) => ({ name, count })),
        cropStats: stats || {}
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/weather-forecast', auth, async (req, res) => {
  try {
    const lat = req.query.lat || process.env.FARM_LAT || '10.7769';
    const lon = req.query.lon || process.env.FARM_LON || '106.7009';
    
    const axios = require('axios');
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max&forecast_days=5&timezone=auto`
    );
    const data = response.data;
    const daily = data.daily;
    
    const forecast = daily.time.map((date, idx) => ({
      date,
      tempMax: daily.temperature_2m_max[idx],
      tempMin: daily.temperature_2m_min[idx],
      precipitation: daily.precipitation_sum[idx],
      precipProbability: daily.precipitation_probability_max[idx],
      weatherCode: daily.weather_code[idx],
      windMax: daily.wind_speed_10m_max[idx]
    }));
    
    res.json({
      ok: true,
      data: {
        forecast,
        location: { lat, lon },
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/weather-alerts', auth, async (req, res) => {
  try {
    const lat = req.query.lat || process.env.FARM_LAT || '10.7769';
    const lon = req.query.lon || process.env.FARM_LON || '106.7009';
    
    const axios = require('axios');
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability,temperature_2m,weather_code&forecast_days=2&timezone=auto`
    );
    const data = response.data;
    const hourly = data.hourly;
    
    const alerts = [];
    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.precipitation_probability[i] > 70) {
        alerts.push({
          type: 'rain',
          time: hourly.time[i],
          probability: hourly.precipitation_probability[i],
          message: `Khả năng mưa ${hourly.precipitation_probability[i]}% lúc ${new Date(hourly.time[i]).getHours()}h`
        });
      }
      if (hourly.temperature_2m[i] > 40) {
        alerts.push({
          type: 'heat',
          time: hourly.time[i],
          temperature: hourly.temperature_2m[i],
          message: `Nhiệt độ cao ${hourly.temperature_2m[i]}°C - Cần tưới nước`
        });
      }
    }
    
    res.json({
      ok: true,
      data: {
        hasAlerts: alerts.length > 0,
        alerts: alerts.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/weather-kpis', auth, async (req, res) => {
  try {
    const lat = req.query.lat || process.env.FARM_LAT || '10.7769';
    const lon = req.query.lon || process.env.FARM_LON || '106.7009';
    
    const axios = require('axios');
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m&forecast_days=5&timezone=auto`
    );
    const data = response.data;
    const hourly = data.hourly;
    
    const temps = hourly.temperature_2m.filter(t => t !== null);
    const humidities = hourly.relative_humidity_2m.filter(h => h !== null);
    const precips = hourly.precipitation.filter(p => p !== null);
    
    const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0;
    const avgHumidity = humidities.length > 0 ? Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length) : 0;
    const totalPrecip = precips.reduce((a, b) => a + b, 0).toFixed(1);
    const rainyDays = hourly.time.filter((t, i) => hourly.precipitation[i] > 0).length;
    
    res.json({
      ok: true,
      data: {
        overview: {
          avgTemperature: parseFloat(avgTemp),
          avgHumidity,
          totalPrecipitation: parseFloat(totalPrecip),
          rainyDays,
          forecastDays: 5
        },
        hourly: hourly.time.slice(0, 24).map((t, i) => ({
          time: t,
          temp: hourly.temperature_2m[i],
          humidity: hourly.relative_humidity_2m[i],
          precip: hourly.precipitation[i]
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/automation-overview', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const rules = getAll('SELECT * FROM rules ORDER BY created_at DESC');
    const devices = getAll('SELECT id, name, status FROM devices WHERE farm_id = ? OR farm_id IS NULL', [farm_id]);
    const schedules = getAll('SELECT * FROM schedules WHERE farm_id = ? OR farm_id IS NULL ORDER BY next_run', [farm_id]);
    
    const totalRules = rules?.length || 0;
    const activeRules = rules?.filter(r => r.enabled === 1).length || 0;
    const totalDevices = devices?.length || 0;
    const onlineDevices = devices?.filter(d => d.status === 'online').length || 0;
    const totalSchedules = schedules?.length || 0;
    
    res.json({
      ok: true,
      data: {
        stats: {
          totalRules,
          activeRules,
          totalDevices,
          onlineDevices,
          totalSchedules,
          onlineRate: totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0
        },
        recentRules: rules?.slice(0, 10) || [],
        recentSchedules: schedules?.slice(0, 10) || []
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/automation-kpis', auth, async (req, res) => {
  try {
    const { farm_id } = req.query;
    const rules = getAll('SELECT * FROM rules');
    const schedules = getAll('SELECT * FROM schedules');
    
    const byType = {};
    rules?.forEach(r => {
      const type = r.type || 'static';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    const byStatus = {
      active: rules?.filter(r => r.enabled === 1).length || 0,
      inactive: rules?.filter(r => r.enabled === 0).length || 0
    };
    
    const scheduleStats = {
      active: schedules?.filter(s => s.enabled === 1).length || 0,
      paused: schedules?.filter(s => s.enabled === 0).length || 0,
      total: schedules?.length || 0
    };
    
    res.json({
      ok: true,
      data: {
        overview: {
          totalRules: rules?.length || 0,
          activeRules: byStatus.active,
          totalSchedules: scheduleStats.total,
          activeSchedules: scheduleStats.active
        },
        byType: Object.entries(byType).map(([name, count]) => ({ name, count })),
        byStatus,
        scheduleStats
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
    clearDashboardCache();
    res.json({ ok: true, message: 'Cache invalidated' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/sales-overview', auth, async (req, res) => {
  try {
    const { farm_id, startDate, endDate } = req.query;
    let query = 'SELECT * FROM orders WHERE status = "completed"';
    const params = [];
    
    if (farm_id) {
      query += ' AND farm_id = ?';
      params.push(farm_id);
    }
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const orders = getAll(query, params);
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    res.json({
      ok: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          completedOrders: totalOrders
        },
        recentOrders: orders.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/payment-overview', auth, async (req, res) => {
  try {
    const { farm_id, status } = req.query;
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params = [];
    
    if (farm_id) {
      query += ' AND farm_id = ?';
      params.push(farm_id);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const payments = getAll(query, params);
    
    const totalReceived = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalFailed = payments.filter(p => p.status === 'failed').reduce((sum, p) => sum + (p.amount || 0), 0);
    
    res.json({
      ok: true,
      data: {
        stats: {
          totalTransactions: payments.length,
          totalReceived,
          totalPending,
          totalFailed
        },
        recentPayments: payments.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
module.exports.clearCache = clearDashboardCache;