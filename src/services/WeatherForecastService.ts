'use strict';

import MarkovNowcastV2 from './MarkovNowcastV2';
import GreenhouseMicroclimate from './GreenhouseMicroclimate';

interface SensorData {
  pressure?: number;
  lux?: number;
  humidity?: number;
  hour?: number;
  externalRainProb?: number;
  outsideTemp?: number;
  outsideHum?: number;
  roofOpen?: number;
  fanSpeed?: number;
}

interface ForecastResult {
  outdoor: unknown;
  indoor: unknown;
  timestamp: string;
}

class WeatherForecastService {
  markov: MarkovNowcastV2;
  greenhouse: GreenhouseMicroclimate;
  lastProcessed: ForecastResult | null;

  constructor() {
    this.markov = new MarkovNowcastV2();
    this.greenhouse = new GreenhouseMicroclimate();
    this.lastProcessed = null;
  }

  process(sensorData: SensorData): ForecastResult {
    const outdoorForecast = this.markov.update(
      sensorData.pressure,
      sensorData.lux,
      sensorData.humidity,
      sensorData.hour,
      sensorData.externalRainProb
    );

    const indoorForecast = this.greenhouse.update(
      sensorData.outsideTemp,
      sensorData.outsideHum,
      sensorData.roofOpen,
      sensorData.fanSpeed
    );

    this.lastProcessed = {
      outdoor: outdoorForecast,
      indoor: indoorForecast,
      timestamp: new Date().toISOString()
    };

    return this.lastProcessed;
  }

  feedback(pressure: number, humidity: number, actualRain: boolean) {
    this.markov.onlineUpdate(pressure, humidity, actualRain);
  }

  getOutdoorForecast() {
    return this.markov.getForecast();
  }

  getGreenhouseForecast() {
    return this.greenhouse.getStats();
  }

  predictGreenhouse(outsideTemp: number, outsideHum: number, roofOpen: number, fanSpeed: number) {
    return this.greenhouse.predictNextHour(outsideTemp, outsideHum, roofOpen, fanSpeed);
  }

  getStatus() {
    return {
      markov: this.markov.getStatus(),
      greenhouse: this.greenhouse.getStats(),
      lastProcessed: this.lastProcessed?.timestamp
    };
  }

  reset() {
    this.markov.reset();
    this.greenhouse.reset();
  }
}

export default new WeatherForecastService();