'use strict';

const path = require('path');

// AI predictors (light and large) may be lazy-loaded on demand
let lightPredictor = null;
let largePredictor = null;
let logger = null;
try {
  logger = require('../../config/logger');
} catch (e) {
  // Fallback logger for test environments where logger module may not resolve
  logger = console;
}

async function initialize() {
  // Load lightweight model if enabled (default ON)
  const enableSmall = (process.env.AI_SMALL_MODEL ?? '1') !== '0' && (process.env.AI_SMALL_MODEL ?? '1') !== 'false';
  if (enableSmall) {
    try {
      const TFLiteDiseasePredictor = require('../services/ai/tfliteDiseasePredictor');
      const smallPath = path.join(__dirname, '../../models/plant_disease.tflite');
      const labelsPath = path.join(__dirname, '../../models/labels.txt');
      lightPredictor = new TFLiteDiseasePredictor();
      await lightPredictor.loadModel(smallPath, labelsPath);
      logger.info('[Bootstrap] Lightweight AI model loaded');
    } catch (e) {
      logger.warn('[Bootstrap] Failed to load lightweight AI model:', e?.message || e);
    }
  }

  // Load large model (ONNX) if enabled
  const enableLarge = (process.env.AI_LARGE_MODEL ?? '0') === '1' || (process.env.AI_LARGE_MODEL ?? '0') === 'true';
  if (enableLarge) {
    try {
      const LSTMIrrigationPredictor = require('../services/ai/lstmIrrigationPredictor');
      const onnxPath = path.join(__dirname, '../../models/irrigation_lstm.onnx');
      largePredictor = new LSTMIrrigationPredictor(onnxPath);
      await largePredictor.loadModel();
      logger.info('[Bootstrap] Large ONNX AI model loaded (if available)');
    } catch (e) {
      logger.warn('[Bootstrap] Failed to load large ONNX AI model:', e?.message || e);
    }
  }

  return {
    light: !!lightPredictor,
    large: !!largePredictor
  };
}

module.exports = {
  initialize,
  getLight: () => lightPredictor,
  getLarge: () => largePredictor
};
