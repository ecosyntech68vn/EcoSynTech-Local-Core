'use strict';

interface RainReading {
  rawValue: number;
  intensity: number;
  isRaining: boolean;
  timestamp: string;
}

interface RainHistoryEntry {
  intensity: number;
  isRaining: boolean;
  timestamp: string;
}

class RainSensor {
  pin: number;
  dryValue: number;
  wetValue: number;
  isRaining: boolean;
  rainIntensity: number;
  lastRainTime: number | null;
  rainHistory: RainHistoryEntry[];

  constructor(pin = 34, dryValue = 4095, wetValue = 0) {
    this.pin = pin;
    this.dryValue = dryValue;
    this.wetValue = wetValue;
    this.isRaining = false;
    this.rainIntensity = 0;
    this.lastRainTime = null;
    this.rainHistory = [];
  }

  read(): RainReading {
    try {
      const ADC = require('adc');
      const adc = new ADC(this.pin);
      const rawValue = adc.read();
      
      this.rainIntensity = 100 - ((rawValue - this.wetValue) / (this.dryValue - this.wetValue) * 100);
      this.rainIntensity = Math.max(0, Math.min(100, this.rainIntensity));
      
      this.isRaining = this.rainIntensity > 30;
      
      if (this.isRaining) {
        this.lastRainTime = Date.now();
      }
      
      this.rainHistory.push({
        intensity: this.rainIntensity,
        isRaining: this.isRaining,
        timestamp: new Date().toISOString()
      });
      
      if (this.rainHistory.length > 100) {
        this.rainHistory.shift();
      }
      
      return {
        rawValue,
        intensity: Math.round(this.rainIntensity),
        isRaining: this.isRaining,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      return this.getSimulatedReading();
    }
  }

  getSimulatedReading(): RainReading {
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    const isRainySeason = [5, 6, 7, 8, 9, 10, 11].includes(new Date().getMonth() + 1);
    
    let intensity = 0;
    if (isDaytime && isRainySeason && Math.random() > 0.7) {
      intensity = Math.random() * 80 + 20;
    } else if (!isDaytime && Math.random() > 0.85) {
      intensity = Math.random() * 50;
    }
    
    this.rainIntensity = intensity;
    this.isRaining = intensity > 30;
    
    if (this.isRaining) {
      this.lastRainTime = Date.now();
    }
    
    return {
      rawValue: Math.round(this.wetValue + (this.dryValue - this.wetValue) * (1 - intensity / 100)),
      intensity: Math.round(intensity),
      isRaining: this.isRaining,
      timestamp: new Date().toISOString()
    };
  }

  getHistory(limit = 24): RainHistoryEntry[] {
    return this.rainHistory.slice(-limit);
  }

  getStatistics() {
    if (this.rainHistory.length === 0) {
      return { avgIntensity: 0, maxIntensity: 0, rainyDays: 0 };
    }

    const intensities = this.rainHistory.map(h => h.intensity);
    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const maxIntensity = Math.max(...intensities);
    const rainyDays = this.rainHistory.filter(h => h.isRaining).length;

    return {
      avgIntensity: Math.round(avgIntensity),
      maxIntensity,
      rainyDays,
      lastRainTime: this.lastRainTime ? new Date(this.lastRainTime).toISOString() : null
    };
  }

  calibrate(dryValue: number, wetValue: number) {
    this.dryValue = dryValue;
    this.wetValue = wetValue;
  }

  reset() {
    this.rainHistory = [];
    this.lastRainTime = null;
    this.isRaining = false;
    this.rainIntensity = 0;
  }
}

export default RainSensor;