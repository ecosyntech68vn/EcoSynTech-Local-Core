/**
 * ML Jobs - Cron jobs cho Machine Learning tasks
 * 
 * ISO Standards: ISO 8601, ISO 25010, ISO 27001
 * 
 * @version 1.0.0
 * @author EcoSynTech
 */

import * as cron from 'node-cron';
import logger from '../../config/logger';

import LightGBMPredictor from('../services/ai/LightGBMPredictor');
import AutoMLService from('../services/ai/AutoMLService');
import BayesianOptimizer from('../services/ai/BayesianOptimizer');
import DigitalTwin from('../services/ai/DigitalTwin');

export interface MLJob {
  stop: () => void;
}

export class MLJobs {
  jobs: Record<string, cron.ScheduledTask>;
  digitalTwin: unknown;
  bayesianOptimizer: unknown;

  constructor() {
    this.jobs = {};
    this.digitalTwin = null;
    this.bayesianOptimizer = null;
  }

  initialize(): void {
    logger.info('[MLJobs] Initializing ML cron jobs...');
    
    this.startYieldPredictionJob();
    this.startAutoMLJob();
    this.startDigitalTwinSyncJob();
    this.startModelHealthCheckJob();
    
    logger.info('[MLJobs] All ML jobs initialized');
  }

  startYieldPredictionJob(): void {
    this.jobs.yieldPrediction = cron.schedule('0 6 * * 1', async () => {
      logger.info('[MLJobs] Running weekly yield prediction...');
      
      try {
        const sampleFeatures = {
          temperature_avg: 28,
          rainfall_mm: 50,
          fertilizer_kg: 100,
          soil_ph: 6.5,
          sun_hours: 8,
          humidity_avg: 70,
          pest_presence: 0.1,
          disease_presence: 0.05
        };
        
        const prediction = await LightGBMPredictor.predict(sampleFeatures);
        
        logger.info(`[MLJobs] Yield prediction: ${prediction} tons/ha`);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[MLJobs] Yield prediction failed:', errorMessage);
      }
    });
  }

  startAutoMLJob(): void {
    this.jobs.autoML = cron.schedule('0 2 * * *', async () => {
      logger.info('[MLJobs] Running nightly AutoML job...');
      
      try {
        await AutoMLService.retrain();
        logger.info('[MLJobs] AutoML retraining completed');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[MLJobs] AutoML job failed:', errorMessage);
      }
    });
  }

  startDigitalTwinSyncJob(): void {
    this.jobs.digitalTwinSync = cron.schedule('*/30 * * * *', async () => {
      logger.info('[MLJobs] Syncing Digital Twin...');
      
      try {
        if (!this.digitalTwin) {
          this.digitalTwin = new DigitalTwin();
        }
        await (this.digitalTwin as { sync: () => Promise<void> }).sync();
        logger.info('[MLJobs] Digital Twin synced');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[MLJobs] Digital Twin sync failed:', errorMessage);
      }
    });
  }

  startModelHealthCheckJob(): void {
    this.jobs.modelHealthCheck = cron.schedule('0 */6 * * *', () => {
      logger.info('[MLJobs] Running model health check...');
      
      try {
        const health = AutoMLService.getModelHealth();
        logger.info('[MLJobs] Model health:', health);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[MLJobs] Health check failed:', errorMessage);
      }
    });
  }

  stopAll(): void {
    Object.values(this.jobs).forEach(job => job.stop());
    logger.info('[MLJobs] All jobs stopped');
  }
}

let mlJobsInstance: MLJobs | null = null;

export function getMLJobs(): MLJobs {
  if (!mlJobsInstance) {
    mlJobsInstance = new MLJobs();
  }
  return mlJobsInstance;
}

export default { MLJobs, getMLJobs };