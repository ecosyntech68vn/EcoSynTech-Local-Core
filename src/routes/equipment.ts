import express, { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validateMiddleware } from '../middleware/validation';
import * as equipmentService from '../services/equipmentService';

import router: Router = express.Router();

export const EQUIPMENT_TYPES = [
  'machinery', 'vehicle', 'irrigation', 'sensor', 'storage', 'processing', 'other'
];

export const EQUIPMENT_STATUS = [
  'active', 'maintenance', 'repair', 'retired', 'sold'
];

export const MAINTENANCE_TYPES = [
  'preventive', 'corrective', 'inspection', 'emergency', 'overhaul'
];

router.get('/types', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ ok: true, data: EQUIPMENT_TYPES });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/status', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ ok: true, data: EQUIPMENT_STATUS });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/maintenance-types', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ ok: true, data: MAINTENANCE_TYPES });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/categories', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id, type } = req.query;
    const categories = equipmentService.getCategories(farm_id as string, type as string);
    res.json({ ok: true, data: categories });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/categories', auth, validateMiddleware('equipment.categoryCreate'), async (req: Request, res: Response): Promise<void> => {
  try {
    const category = equipmentService.createCategory(req.body);
    res.status(201).json({ ok: true, data: category });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { farm_id, category_id, status } = req.query;
    const equipment = equipmentService.getEquipment(farm_id as string, category_id as string, status as string);
    res.json({ ok: true, data: equipment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const equipment = equipmentService.getEquipmentById(req.params.id);
    if (!equipment) {
      res.status(404).json({ ok: false, error: 'Equipment not found' });
      return;
    }
    res.json({ ok: true, data: equipment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const equipment = equipmentService.createEquipment(req.body);
    res.status(201).json({ ok: true, data: equipment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.put('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const equipment = equipmentService.updateEquipment(req.params.id, req.body);
    res.json({ ok: true, data: equipment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.delete('/:id', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    equipmentService.deleteEquipment(req.params.id);
    res.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.get('/:id/maintenance', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const records = equipmentService.getMaintenanceRecords(req.params.id);
    res.json({ ok: true, data: records });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

router.post('/:id/maintenance', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const record = equipmentService.createMaintenanceRecord(req.params.id, req.body);
    res.status(201).json({ ok: true, data: record });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: errorMessage });
  }
});

export default router;