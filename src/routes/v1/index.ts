/**
 * API Version 1 Routes
 * 
 * EcoSynTech V5.1 API Versioning
 * All v1 endpoints under /api/v1/*
 * 
 * Backward Compatible: Original /api/* routes still work
 * New clients should use /api/v1/*
 */

import express from('express');
import router = express.Router();

import dashboard from('../dashboard');
import finance from('../finance');
import inventory from('../inventory');
import equipment from('../equipment');
import labor from('../labor');
import crops from('../crops');
import sensors from('../sensors');
import devices from('../devices');

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