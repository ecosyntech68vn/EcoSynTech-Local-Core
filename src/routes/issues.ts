import { Router, Request, Response } from 'express';
import { auth as authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createIssue,
  acknowledgeIssue,
  diagnoseIssue,
  applyFix,
  verifyFix,
  closeIssue,
  getIssues,
  getIssueById,
  getIssueStats,
  getDiagnosticData,
  ISSUE_SEVERITY,
  ISSUE_STATUS,
  ISSUE_CATEGORY
} from '../services/issueService';

import router = Router();

interface AuthRequest extends Request {
  user?: {
    email: string;
    role: string;
  };
}

interface IssueBody {
  title?: string;
  description?: string;
  severity?: string;
  category?: string;
}

interface DiagnoseBody {
  rootCause: string;
}

interface FixBody {
  fixDescription: string;
}

interface CloseBody {
  wontFix?: boolean;
}

router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const issue = await createIssue({
    ...req.body as IssueBody,
    reportedBy: req.user?.email
  });
  res.json({ success: true, issue });
}));

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, severity, category, limit = '50' } = req.query;
  const issues = await getIssues({ status, severity, category, limit: parseInt(limit as string, 10) });
  res.json({ success: true, issues });
}));

router.get('/stats', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await getIssueStats();
  res.json({ success: true, stats });
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const issue = await getIssueById(req.params.id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }
  res.json({ success: true, issue });
}));

router.get('/:id/diagnostic', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Admin or Manager role required' });
    return;
  }
  
  const diagnostic = await getDiagnosticData(req.params.id);
  if (!diagnostic) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }
  res.json({ success: true, diagnostic });
}));

router.patch('/:id/acknowledge', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Admin or Manager role required' });
    return;
  }
  
  const result = await acknowledgeIssue(req.params.id, req.user?.email);
  res.json(result);
}));

router.patch('/:id/diagnose', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Admin or Manager role required' });
    return;
  }
  
  const { rootCause } = req.body as DiagnoseBody;
  if (!rootCause) {
    res.status(400).json({ error: 'rootCause required' });
    return;
  }
  
  const result = await diagnoseIssue(req.params.id, rootCause);
  res.json(result);
}));

router.patch('/:id/fix', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Admin or Manager role required' });
    return;
  }
  
  const { fixDescription } = req.body as FixBody;
  if (!fixDescription) {
    res.status(400).json({ error: 'fixDescription required' });
    return;
  }
  
  const result = await applyFix(req.params.id, fixDescription);
  res.json(result);
}));

router.patch('/:id/verify', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await verifyFix(req.params.id);
  res.json(result);
}));

router.patch('/:id/close', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { wontFix = false } = req.body as CloseBody;
  const result = await closeIssue(req.params.id, wontFix);
  res.json(result);
}));

router.get('/severity/list', (req: Request, res: Response) => {
  res.json({ success: true, severity: ISSUE_SEVERITY });
});

router.get('/status/list', (req: Request, res: Response) => {
  res.json({ success: true, status: ISSUE_STATUS });
});

router.get('/category/list', (req: Request, res: Response) => {
  res.json({ success: true, category: ISSUE_CATEGORY });
});

export default router;