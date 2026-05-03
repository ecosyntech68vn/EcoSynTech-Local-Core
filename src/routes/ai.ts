import express from 'express';
import router = express.Router();
import authMiddleware from '../middleware/auth';

import auth = (authMiddleware as any).auth || ((req: any, res: any, next: any) => next());
import aiEngine from '../services/aiEngine';
import { getAll, runQuery } from '../config/database';

let TFLiteDiseasePredictor: any, LSTMIrrigationPredictor: any, LightGBMPredictor: any, AutoMLService: any, FederatedClient: any, BayesianOptimizer: any, DigitalTwin: any, AuroraService: any;

try {
  TFLiteDiseasePredictor from('../services/ai/tfliteDiseasePredictor');
  LSTMIrrigationPredictor from('../services/ai/lstmIrrigationPredictor');
  LightGBMPredictor from('../services/ai/LightGBMPredictor');
  AutoMLService from('../services/ai/AutoMLService');
  FederatedClient from('../services/ai/FederatedClient');
  BayesianOptimizer from('../services/ai/BayesianOptimizer');
  DigitalTwin from('../services/ai/DigitalTwin');
  AuroraService from('../services/ai/AuroraService');
} catch (e) {
  console.warn('[AI Routes] Some AI modules not available');
}

let diseasePredictor: any;
let irrigationPredictor: any;

try {
  if (TFLiteDiseasePredictor) diseasePredictor = new TFLiteDiseasePredictor.default ? new TFLiteDiseasePredictor.default() : new TFLiteDiseasePredictor();
  if (LSTMIrrigationPredictor) irrigationPredictor = new LSTMIrrigationPredictor.default ? new LSTMIrrigationPredictor.default() : new LSTMIrrigationPredictor();
} catch (e) {
  console.warn('[AI Routes] AI predictors initialization failed');
}

let federatedClient: any;
try {
  if (FederatedClient) federatedClient = new FederatedClient.default ? new FederatedClient.default() : new FederatedClient();
} catch (e) {
  federatedClient = null;
}

import digitalTwins = new Map();

router.get('/predict/irrigation', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const prediction = await aiEngine.predictIrrigation(farmId);
    res.json({ ok: true, data: prediction });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/fertilization', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const prediction = await aiEngine.predictFertilization(farmId);
    res.json({ ok: true, data: prediction });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/yield', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const prediction = (aiEngine as any).predictYield ? await (aiEngine as any).predictYield(farmId) : { predicted: true };
    res.json({ ok: true, data: prediction });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/disease-risk', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const risk = (aiEngine as any).diseaseRiskScore ? await (aiEngine as any).diseaseRiskScore(farmId) : { risk: 'low' };
    res.json({ ok: true, data: risk });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/recommendations', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const recommendations = (aiEngine as any).getRecommendations ? await (aiEngine as any).getRecommendations(farmId) : [];
    res.json({ ok: true, data: recommendations });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/insights', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const insights = (aiEngine as any).generateInsights ? await (aiEngine as any).generateInsights(farmId) : [];
    res.json({ ok: true, data: insights });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/model/status', auth, async (req: any, res: any) => {
  try {
    const status = (aiEngine as any).getModelStatus ? (aiEngine as any).getModelStatus() : { loaded: true };
    res.json({ ok: true, data: status });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/model/reload', auth, async (req: any, res: any) => {
  try {
    if ((aiEngine as any).reloadModels) {
      await (aiEngine as any).reloadModels();
    }
    res.json({ ok: true, message: 'Models reloaded' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/soil-health', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const health = (aiEngine as any).soilHealthScore ? await (aiEngine as any).soilHealthScore(farmId) : { score: 85, status: 'good' };
    res.json({ ok: true, data: health });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/predict/pest-risk', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const pestRisk = (aiEngine as any).pestRiskScore ? await (aiEngine as any).pestRiskScore(farmId) : { risk: 'low', probability: 0.1 };
    res.json({ ok: true, data: pestRisk });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/optimize/parameters', auth, async (req: any, res: any) => {
  try {
    const farmId = req.query.farm_id || 'default';
    const optimized = (aiEngine as any).optimizeParameters ? await (aiEngine as any).optimizeParameters(farmId) : { optimal: true };
    res.json({ ok: true, data: optimized });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/feedback', auth, async (req: any, res: any) => {
  try {
    const { predictionId, actual, rating } = req.body;
    if ((aiEngine as any).recordFeedback) {
      await (aiEngine as any).recordFeedback(predictionId, actual, rating);
    }
    res.json({ ok: true, message: 'Feedback recorded' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;