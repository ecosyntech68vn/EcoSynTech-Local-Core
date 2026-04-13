const { getOne, getAll, runQuery } = require('../config/database');
const logger = require('../config/logger');

const ADVISORY_RULES = {
  temperature: [
    { threshold: 35, level: 'critical', message: 'Nhiệt độ quá cao! Cần bật quạt ngay', action: 'fan_on' },
    { threshold: 30, level: 'warning', message: 'Nhiệt độ cao, cần theo dõi', action: 'alert' },
    { threshold: 15, level: 'warning', message: 'Nhiệt độ thấp, cần kiểm tra', action: 'alert' },
    { threshold: 10, level: 'critical', message: 'Nhiệt độ quá thấp! Nguy hiểm cho cây trồng', action: 'heater_on' }
  ],
  humidity: [
    { threshold: 90, level: 'warning', message: 'Độ ẩm cao, nguy cơ nấm bệnh', action: 'ventilate' },
    { threshold: 70, level: 'warning', message: 'Độ ẩm cao, cần thông gió', action: 'ventilate' },
    { threshold: 40, level: 'warning', message: 'Độ ẩm thấp, cần tưới nước', action: 'irrigate' },
    { threshold: 25, level: 'critical', message: 'Độ ẩm quá thấp! Khẩn cấp tưới nước', action: 'irrigate_emergency' }
  ],
  soil_moisture: [
    { threshold: 30, level: 'warning', message: 'Độ ẩm đất thấp, cần tưới', action: 'irrigate' },
    { threshold: 20, level: 'critical', message: 'Đất quá khô! Tưới ngay', action: 'irrigate_emergency' },
    { threshold: 80, level: 'warning', message: 'Độ ẩm đất cao, giảm tưới', action: 'stop_irrigation' }
  ],
  co2: [
    { threshold: 1000, level: 'critical', message: 'CO2 quá cao! Thông gió ngay', action: 'ventilate_emergency' },
    { threshold: 800, level: 'warning', message: 'CO2 cao, cần thông gió', action: 'ventilate' }
  ],
  light: [
    { threshold: 60, level: 'warning', message: 'Cường độ sáng cao, che bóng', action: 'shade_on' },
    { threshold: 10, level: 'warning', message: 'Ánh sáng thấp, bật đèn grow', action: 'light_on' }
  ],
  ph: [
    { threshold: 8.0, level: 'critical', message: 'pH đất kiềm quá cao', action: 'adjust_ph_down' },
    { threshold: 5.5, level: 'critical', message: 'pH đất axit quá thấp', action: 'adjust_ph_up' }
  ],
  ec: [
    { threshold: 3.5, level: 'critical', message: 'EC quá cao! Rửa ngay', action: 'flush_water' },
    { threshold: 1.0, level: 'warning', message: 'EC thấp, cần bón phân', action: 'fertilize' }
  ]
};

class AdvisoryEngine {
  static analyzeLatestReadings(readings) {
    const alerts = [];
    const recommendations = [];

    readings.forEach(reading => {
      const rules = ADVISORY_RULES[reading.type];
      if (!rules) return;

      const value = parseFloat(reading.value);
      
      for (const rule of rules) {
        let triggered = false;
        
        if (rule.threshold > 0 && value >= rule.threshold) {
          triggered = true;
        } else if (rule.threshold < 0 && reading.type === 'temperature' && value <= Math.abs(rule.threshold)) {
          triggered = true;
        }

        if (triggered && rule.level === 'critical') {
          alerts.push({
            code: `${reading.type.toUpperCase()}_${rule.level.toUpperCase()}`,
            type: reading.type,
            value: value,
            level: rule.level,
            message: rule.message,
            action: rule.action,
            zone: reading.zone,
            timestamp: new Date().toISOString()
          });
          break;
        }
      }

      if (reading.type === 'temperature' && value > 28) {
        recommendations.push({ type: 'temperature', message: 'Nhiệt độ cao - khuyến nghị bật quạt', priority: 'medium' });
      }
      if (reading.type === 'humidity' && value < 50) {
        recommendations.push({ type: 'humidity', message: 'Độ ẩm thấp - khuyến nghị tưới nước', priority: 'medium' });
      }
      if (reading.type === 'soil_moisture' && value < 40) {
        recommendations.push({ type: 'soil', message: 'Đất khô - khuyến nghị tưới', priority: 'high' });
      }
    });

    return { alerts, recommendations };
  }

  static generateReport(readings, batchId = null) {
    const analysis = this.analyzeLatestReadings(readings);
    const avgValues = {};
    
    readings.forEach(r => {
      if (!avgValues[r.type]) avgValues[r.type] = [];
      avgValues[r.type].push(parseFloat(r.value));
    });

    const summary = Object.entries(avgValues).map(([type, values]) => ({
      type,
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2)
    }));

    return {
      batch_id: batchId,
      timestamp: new Date().toISOString(),
      summary,
      alerts: analysis.alerts,
      recommendations: analysis.recommendations
    };
  }
}

class SmartControlEngine {
  static async evaluateRules(readings, deviceId = null) {
    const rules = getAll('SELECT * FROM rules WHERE enabled = 1');
    const actions = [];

    const sensorMap = {};
    readings.forEach(r => { sensorMap[r.type] = r; });

    for (const rule of rules) {
      try {
        const condition = JSON.parse(rule.condition);
        const sensor = sensorMap[condition.sensor];
        
        if (!sensor) continue;

        let triggered = false;
        const value = parseFloat(sensor.value);
        const threshold = parseFloat(condition.value);

        switch (condition.operator) {
          case '>': triggered = value > threshold; break;
          case '<': triggered = value < threshold; break;
          case '>=': triggered = value >= threshold; break;
          case '<=': triggered = value <= threshold; break;
          case '==': triggered = value === threshold; break;
        }

        if (triggered) {
          const action = JSON.parse(rule.action);
          actions.push({
            rule_id: rule.id,
            rule_name: rule.name,
            trigger: `${condition.sensor} ${condition.operator} ${threshold}`,
            action: action.type,
            target: action.target,
            device_id: deviceId
          });
        }
      } catch (err) {
        logger.error(`[SmartControl] Rule evaluation error: ${rule.id}`, err);
      }
    }

    return actions;
  }

  static getActiveRules() {
    return getAll('SELECT * FROM rules WHERE enabled = 1');
  }

  static createRule(name, condition, action, enabled = true) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    runQuery(
      'INSERT INTO rules (id, name, description, enabled, condition, action, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, '', enabled ? 1 : 0, JSON.stringify(condition), JSON.stringify(action), new Date().toISOString()]
    );
    return { id, name, enabled };
  }
}

async function sendTelegramNotification(botToken, chatId, message, parseMode = 'HTML') {
  if (!botToken || !chatId) return null;
  
  const TelegramBot = require('telegraf') || null;
  if (!TelegramBot) {
    logger.warn('[Telegram] telegraf not installed, skipping notification');
    return null;
  }
  
  try {
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(botToken);
    await bot.telegram.sendMessage(chatId, message, { parse_mode: parseMode });
    logger.info(`[Telegram] Notification sent to ${chatId}`);
    return true;
  } catch (err) {
    logger.error('[Telegram] Send error:', err.message);
    return false;
  }
}

async function processSensorData(data, deviceId) {
  const readings = data.sensor_data || [];
  const batchId = data.batch_id;
  
  readings.forEach(sensor => {
    runQuery(
      'INSERT INTO sensor_readings (id, sensor_type, value, timestamp) VALUES (?, ?, ?, ?)',
      [require('uuid').v4(), sensor.type, sensor.value, data.timestamp || new Date().toISOString()]
    );
    
    runQuery(
      'UPDATE sensors SET value = ?, timestamp = ? WHERE type = ?',
      [sensor.value, data.timestamp || new Date().toISOString(), sensor.type]
    );
  });

  const advisoryResult = AdvisoryEngine.analyzeLatestReadings(readings);
  
  advisoryResult.alerts.forEach(alert => {
    runQuery(
      'INSERT INTO alerts (id, type, severity, sensor, value, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [require('uuid').v4(), alert.type, alert.level, alert.type, alert.value, alert.message, new Date().toISOString()]
    );
  });

  const smartActions = await SmartControlEngine.evaluateRules(readings, deviceId);
  
  smartActions.forEach(action => {
    runQuery(
      'INSERT INTO history (id, action, trigger, status, timestamp) VALUES (?, ?, ?, ?, ?)',
      [require('uuid').v4(), `${action.action} (${action.target})`, action.trigger, 'success', new Date().toISOString()]
    );
  });

  return {
    success: true,
    processed: readings.length,
    alerts: advisoryResult.alerts.length,
    actions: smartActions.length
  };
}

module.exports = {
  AdvisoryEngine,
  SmartControlEngine,
  processSensorData,
  sendTelegramNotification,
  ADVISORY_RULES
};