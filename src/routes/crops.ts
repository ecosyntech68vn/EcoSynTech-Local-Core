import express, { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../middleware/auth';
import { getAll, getOne, db } from '../config/database';
import logger from '../config/logger';
import * as farmActivityService from '../services/farmActivityService';
import * as farmModuleService from '../services/farmModuleService';

const router: Router = express.Router();

router.get('/crops', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM crop_catalog';
    const params: unknown[] = [];
    if (category) { sql += ' WHERE category = ?'; params.push(category); }
    sql += ' ORDER BY category, name';
    const crops = getAll(sql, params);
    res.json({ ok: true, data: crops });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/crops/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const crop = getOne('SELECT * FROM crop_catalog WHERE id = ?', [req.params.id]);
    if (!crop) {
      res.status(404).json({ ok: false, error: 'Crop not found' });
      return;
    }
    res.json({ ok: true, data: crop });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/crops/category/list', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = getAll('SELECT DISTINCT category FROM crop_catalog ORDER BY category') as Array<{ category: string }>;
    res.json({ ok: true, data: categories.map(c => c.category) });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/aquaculture', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM aquaculture';
    const params: unknown[] = [];
    if (category) { sql += ' WHERE category = ?'; params.push(category); }
    sql += ' ORDER BY category, name';
    const aqua = getAll(sql, params);
    res.json({ ok: true, data: aqua });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/aquaculture/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const aqua = getOne('SELECT * FROM aquaculture WHERE id = ?', [req.params.id]);
    if (!aqua) {
      res.status(404).json({ ok: false, error: 'Species not found' });
      return;
    }
    res.json({ ok: true, data: aqua });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/plantings', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id, crop_id, area, area_unit, planting_date, expected_harvest_date } = req.body;
    const id = uuidv4();
    
    db.run(`
      INSERT INTO crop_plantings (id, farm_id, crop_id, area, area_unit, planting_date, expected_harvest_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
    `, [id, farm_id, crop_id, area || 1, area_unit || 'hectare', planting_date, expected_harvest_date, 'growing']);
    
    res.status(201).json({ ok: true, data: { id } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/plantings', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id, status } = req.query;
    let sql = 'SELECT * FROM crop_plantings WHERE 1=1';
    const params: unknown[] = [];
    
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    
    sql += ' ORDER BY planting_date DESC';
    const plantings = getAll(sql, params);
    res.json({ ok: true, data: plantings });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/greenhouse', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id } = req.query;
    let sql = 'SELECT * FROM greenhouse_zones WHERE status = "active"';
    const params: unknown[] = [];
    
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    
    const zones = getAll(sql, params);
    res.json({ ok: true, data: zones });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/hydroponic', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id } = req.query;
    let sql = 'SELECT * FROM hydroponic_systems WHERE status = "active"';
    const params: unknown[] = [];
    
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    
    const systems = getAll(sql, params);
    res.json({ ok: true, data: systems });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;