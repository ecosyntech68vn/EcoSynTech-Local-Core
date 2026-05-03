/**
 * @fileoverview Model Management API
 * @description REST API for AI model management, versioning, and monitoring
 * @module routes/aiModels
 * @requires middleware/auth
 * @requires config/database
 */

import express from('express');
import router = express.Router();
import { auth, requireAdmin } from('../middleware/auth');

/**
 * Initialize ai_models table if not exists
 */
function initAIModelsTable() {
  const { runQuery, getOne } from('../config/database');
  
  try {
    const tableExists = getOne('SELECT name FROM sqlite_master WHERE type=\'table\' AND name=\'ai_models\'');
    
    if (!tableExists) {
      runQuery(`
        CREATE TABLE IF NOT EXISTS ai_models (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          version TEXT NOT NULL,
          status TEXT DEFAULT 'inactive',
          accuracy REAL DEFAULT 0,
          inference_time_ms INTEGER DEFAULT 0,
          model_path TEXT,
          deployed_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      
      runQuery(`
        CREATE TABLE IF NOT EXISTS ai_model_metrics (
          id TEXT PRIMARY KEY,
          model_id TEXT NOT NULL,
          inference_time_ms INTEGER DEFAULT 0,
          confidence REAL DEFAULT 0,
          success INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (model_id) REFERENCES ai_models(id)
        )
      `);
      
      console.log('[AI Models] Tables initialized');
    }
  } catch (e) {
    console.error('[AI Models] Table init error:', e.message);
  }
}

initAIModelsTable();

/**
 * @typedef {Object} AIModel
 * @property {string} id - Model unique identifier
 * @property {string} name - Model name
 * @property {string} type - Model type (irrigation, pest, harvest, etc)
 * @property {string} version - Model version
 * @property {string} status - Status (deployed, inactive, training)
 * @property {number} accuracy - Model accuracy percentage
 * @property {number} inference_time_ms - Average inference time in milliseconds
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 * @property {string} deployed_at - Deployment timestamp
 */

/**
 * GET /api/ai-models - List all AI models
 */
router.get('/', auth, async (req, res) => {
  try {
    const { getAll } from('../config/database');
    const models = getAll('SELECT * FROM ai_models ORDER BY updated_at DESC');
    
    res.json({
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        version: m.version,
        status: m.status,
        accuracy: m.accuracy,
        inference_time_ms: m.inference_time_ms,
        updated_at: m.updated_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-models/:id - Get model details
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { getOne } from('../config/database');
    const model = getOne('SELECT * FROM ai_models WHERE id = ?', [req.params.id]);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    const metrics = getOne(
      'SELECT * FROM ai_model_metrics WHERE model_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.params.id]
    );
    
    res.json({ model, metrics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-models - Register new model
 */
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { name, type, version, accuracy, model_path } = req.body;
    
    if (!name || !type || !version) {
      return res.status(400).json({ error: 'name, type, version are required' });
    }
    
    const { runQuery, getOne } from('../config/database');
    const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    runQuery(
      `INSERT INTO ai_models (id, name, type, version, status, accuracy, model_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'inactive', ?, ?, datetime('now'), datetime('now'))`,
      [id, name, type, version, accuracy || 0, model_path || '']
    );
    
    const model = getOne('SELECT * FROM ai_models WHERE id = ?', [id]);
    
    res.status(201).json({ 
      message: 'Model registered successfully',
      model 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ai-models/:id/deploy - Deploy model
 */
router.put('/:id/deploy', auth, requireAdmin, async (req, res) => {
  try {
    const { runQuery, getOne } from('../config/database');
    const model = getOne('SELECT * FROM ai_models WHERE id = ?', [req.params.id]);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    runQuery(
      `UPDATE ai_models SET status = 'deployed', deployed_at = datetime('now'), updated_at = datetime('now') 
       WHERE id = ?`,
      [req.params.id]
    );
    
    res.json({ 
      message: 'Model deployed successfully',
      model_id: req.params.id,
      status: 'deployed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ai-models/:id/retire - Retire model
 */
router.put('/:id/retire', auth, requireAdmin, async (req, res) => {
  try {
    const { runQuery, getOne } from('../config/database');
    const model = getOne('SELECT * FROM ai_models WHERE id = ?', [req.params.id]);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    runQuery(
      `UPDATE ai_models SET status = 'inactive', updated_at = datetime('now') 
       WHERE id = ?`,
      [req.params.id]
    );
    
    res.json({ 
      message: 'Model retired successfully',
      model_id: req.params.id,
      status: 'inactive'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-models/:id/performance - Get model performance metrics
 */
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const { getAll } from('../config/database');
    
    const metrics = getAll(
      `SELECT * FROM ai_model_metrics 
       WHERE model_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [req.params.id, parseInt(req.query.limit) || 100]
    );
    
    const summary = {
      total_predictions: metrics.length,
      avg_inference_time: 0,
      avg_confidence: 0,
      success_rate: 0
    };
    
    if (metrics.length > 0) {
      summary.avg_inference_time = metrics.reduce((sum, m) => sum + (m.inference_time_ms || 0), 0) / metrics.length;
      summary.avg_confidence = metrics.reduce((sum, m) => sum + (m.confidence || 0), 0) / metrics.length;
      summary.success_rate = (metrics.filter(m => m.success).length / metrics.length) * 100;
    }
    
    res.json({ metrics, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-models/:id/metrics - Record model metrics
 */
router.post('/:id/metrics', auth, async (req, res) => {
  try {
    const { inference_time_ms, confidence, success } = req.body;
    const { runQuery } from('../config/database');
    
    const id = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    runQuery(
      `INSERT INTO ai_model_metrics (id, model_id, inference_time_ms, confidence, success, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, req.params.id, inference_time_ms || 0, confidence || 0, success ? 1 : 0]
    );
    
    res.status(201).json({ message: 'Metrics recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;