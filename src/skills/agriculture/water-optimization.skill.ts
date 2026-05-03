export interface OptimalRange {
  min: number;
  max: number;
}

export interface WaterOptimizationResult {
  ok: boolean;
  recommendation: string;
  soilMoisture: number;
  optimalRange: OptimalRange;
  plantType: string;
  waterAmount: number;
  duration: number;
  efficiency: number;
  actions: string[];
  timestamp: string;
}

const waterOptimizationSkill = {
  id: 'water-optimization',
  name: 'Water Optimization',
  triggers: ['event:sensor-update', 'cron:*/15m', 'event:watchdog.tick'],
  riskLevel: 'low',
  canAutoFix: true,

  run: function(ctx: { stateStore: { get: (key: string) => unknown; set: (key: string, value: unknown) => void } }): WaterOptimizationResult {
    const stateStore = ctx.stateStore;
    const sensors = (stateStore.get('sensors') as Record<string, number>) || {};
    
    const soilMoisture = sensors.soil || 50;
    const humidity = sensors.humidity || 60;
    const temp = sensors.temperature || 25;
    const plantType = (stateStore.get('plantType') as string) || 'general';
    
    const optimalRanges: Record<string, OptimalRange> = {
      'general': { min: 40, max: 70 },
      'rice': { min: 70, max: 90 },
      'vegetable': { min: 50, max: 70 },
      'fruit': { min: 40, max: 60 },
      'coffee': { min: 60, max: 80 }
    };
    
    const range = optimalRanges[plantType] || optimalRanges.general;
    const deficit = range.min - soilMoisture;
    const excess = soilMoisture - range.max;
    
    let waterAmount = 0;
    let duration = 0;
    let recommendation = '';
    
    if (excess > 10) {
      waterAmount = 0;
      duration = 0;
      recommendation = 'Soil too wet - skip irrigation';
    } else if (deficit > 20) {
      waterAmount = deficit * 0.8;
      duration = Math.ceil(deficit / 10);
      recommendation = 'Critical - water immediately';
    } else if (deficit > 10) {
      waterAmount = deficit * 0.6;
      duration = Math.ceil(deficit / 15);
      recommendation = 'Normal irrigation';
    } else if (deficit > 5) {
      waterAmount = deficit * 0.4;
      duration = 1;
      recommendation = 'Light watering only';
    } else {
      waterAmount = 0;
      duration = 0;
      recommendation = 'Soil moisture optimal';
    }
    
    let efficiency = (soilMoisture >= range.min && soilMoisture <= range.max) ? 100 : (soilMoisture < range.min ? (100 - deficit) : (100 - excess * 2));
    efficiency = Math.max(0, Math.min(100, efficiency));

    const actions: string[] = [];
    if (waterAmount > 0) {
      actions.push('irrigate');
    }
    if (excess > 10) {
      actions.push('drain');
    }
    
    return {
      ok: efficiency > 50,
      recommendation,
      soilMoisture,
      optimalRange: range,
      plantType,
      waterAmount,
      duration,
      efficiency,
      actions,
      timestamp: new Date().toISOString()
    };
  }
};

export default waterOptimizationSkill;