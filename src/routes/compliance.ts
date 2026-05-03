import { Router, Request, Response } from 'express';
import { auth, requireAdmin } from '../middleware/auth';
import * as complianceService from '../services/complianceService';
import { getAll, runQuery } from '../config/database';

const router = Router();

router.get('/summary', auth, async (req: Request, res: Response) => {
  try {
    const summary = complianceService.getControlsSummary();
    const score = complianceService.getComplianceScore();
    
    res.json({
      ok: true,
      data: {
        controls: summary,
        score
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/controls', auth, async (req: Request, res: Response) => {
  try {
    const { controlId } = req.query;
    
    if (controlId) {
      const control = complianceService.getControlStatus(controlId as string);
      return res.json({ ok: true, data: control });
    }
    
    const summary = complianceService.getControlsSummary();
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/audit', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const audit = await complianceService.runAudit();
    res.json({
      ok: true,
      data: audit
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/audit/history', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const history = complianceService.getAuditHistory(20);
    res.json({ ok: true, data: history });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/report', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = complianceService.generateReport();
    res.json({
      ok: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/technical', auth, async (req: Request, res: Response) => {
  try {
    const checks = complianceService.runTechnicalControls();
    res.json({
      ok: true,
      data: checks
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/score', auth, async (req: Request, res: Response) => {
  try {
    const score = complianceService.getComplianceScore();
    res.json({
      ok: true,
      data: score
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/evidence', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { controlId, evidence, notes } = req.body;
    
    runQuery(
      `INSERT INTO compliance_evidence (control_id, evidence, notes, submitted_by, submitted_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [controlId, JSON.stringify(evidence), notes, (req as any).user?.id || (req as any).user?.sub]
    );
    
    res.json({
      ok: true,
      message: 'Evidence submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/evidence/:controlId', auth, async (req: Request, res: Response) => {
  try {
    const { controlId } = req.params;
    const evidence = getAll(
      'SELECT * FROM compliance_evidence WHERE control_id = ? ORDER BY submitted_at DESC',
      [controlId]
    );
    
    res.json({
      ok: true,
      data: evidence
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/evidence', auth, async (req: Request, res: Response) => {
  try {
    const evidence = complianceService.getAllEvidence();
    res.json({
      ok: true,
      data: evidence
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/policies', auth, async (req: Request, res: Response) => {
  try {
    const policies = complianceService.getPolicies();
    res.json({
      ok: true,
      data: policies,
      count: Object.keys(policies).length
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/roles', auth, async (req: Request, res: Response) => {
  try {
    const roles = complianceService.getISMSRoles();
    res.json({
      ok: true,
      data: roles
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/suppliers', auth, async (req: Request, res: Response) => {
  try {
    const suppliers = complianceService.getSuppliers();
    res.json({
      ok: true,
      data: suppliers,
      count: Object.keys(suppliers).length
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/bcdr', auth, async (req: Request, res: Response) => {
  try {
    const bcdr = complianceService.getBCDRStatus();
    res.json({
      ok: true,
      data: bcdr
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

export default router;