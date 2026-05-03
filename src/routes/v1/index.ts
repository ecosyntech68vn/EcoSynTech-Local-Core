/**
 * API Version 1 Routes
 * 
 * EcoSynTech V5.1 API Versioning
 * All v1 endpoints under /api/v1/*
 */

import express, { Router, Request, Response } from 'express';

const router = Router();

const dashboard = require('../dashboard');
const finance = require('../finance');
const inventory = require('../inventory');
const equipment = require('../equipment');
const labor = require('../labor');
const crops = require('../crops');
const sensors = require('../sensors');
const devices = require('../devices');

router.use('/dashboard', dashboard);
router.use('/finance', finance);
router.use('/inventory', inventory);
router.use('/equipment', equipment);
router.use('/labor', labor);
router.use('/crops', crops);
router.use('/sensors', sensors);
router.use('/devices', devices);

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    ok: true, 
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

router.get('/info', (req: Request, res: Response) => {
  res.json({
    version: 'v1',
    endpoints: ['dashboard', 'finance', 'inventory', 'equipment', 'labor', 'crops', 'sensors', 'devices'],
    timestamp: new Date().toISOString()
  });
});

export = router;