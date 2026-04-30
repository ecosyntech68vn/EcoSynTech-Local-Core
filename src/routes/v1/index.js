/**
 * API Version 1 Routes
 * 
 * EcoSynTech V5.1 API Versioning
 * All v1 endpoints under /api/v1/*
 * 
 * Backward Compatible: Original /api/* routes still work
 * New clients should use /api/v1/*
 */

const express = require('express');
const router = express.Router();

const dashboard = require('../dashboard');
const finance = require('../finance');
const inventory = require('../inventory');
const equipment = require('../equipment');
const labor = require('../labor');
const crops = require('../crops');
const sensors = require('../sensors');
const devices = require('../devices');

// Mount v1 routes
router.use('/dashboard', dashboard);
router.use('/finance', finance);
router.use('/inventory', inventory);
router.use('/equipment', equipment);
router.use('/labor', labor);
router.use('/crops', crops);
router.use('/sensors', sensors);
router.use('/devices', devices);

// Health check for v1
router.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Info endpoint
router.get('/info', (req, res) => {
  res.json({
    ok: true,
    version: 'v1',
    name: 'EcoSynTech API',
    description: 'Smart Agriculture IoT Platform',
    documentation: '/api/docs',
    endpoints: {
      dashboard: '/api/v1/dashboard',
      finance: '/api/v1/finance',
      inventory: '/api/v1/inventory',
      equipment: '/api/v1/equipment',
      labor: '/api/v1/labor',
      crops: '/api/v1/crops',
      sensors: '/api/v1/sensors',
      devices: '/api/v1/devices'
    }
  });
});

module.exports = router;