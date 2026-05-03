import { Router, Request, Response } from 'express';
import { auth as authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  createIncident,
  updateIncidentStatus,
  getIncidents,
  getIncidentById,
  getIncidentStats,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS
} from '../services/incidentService';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    email: string;
    role: string;
  };
}

interface CreateIncidentBody {
  title?: string;
  description?: string;
  severity?: string;
  type?: string;
}

interface UpdateStatusBody {
  status: string;
  notes?: string;
  assignedTo?: string;
}

router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    res.status(403).json({ error: 'Admin or Manager role required' });
    return;
  }

  const incident = await createIncident({
    ...req.body as CreateIncidentBody,
    reportedBy: req.user?.email,
    initialEvidence: {
      ip: req.ip,
      timestamp: new Date().toISOString()
    }
  });

  res.json({ success: true, incident });
}));

router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const { severity, status, limit = '50' } = req.query;
  const incidents = await getIncidents({ severity, status, limit: parseInt(limit as string, 10) });

  res.json({ success: true, incidents });
}));

router.get('/stats', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const stats = await getIncidentStats();

  res.json({ success: true, stats });
}));

router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const incident = await getIncidentById(req.params.id);

  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }

  res.json({ success: true, incident });
}));

router.patch('/:id/status', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const { status, notes, assignedTo } = req.body as UpdateStatusBody;

  if (!status || !INCIDENT_STATUS[status.toUpperCase()]) {
    res.status(400).json({ error: 'Invalid status. Use: detected, contained, eradicated, recovered, closed' });
    return;
  }

  const result = await updateIncidentStatus(req.params.id, status, notes, assignedTo);

  res.json({ success: true, ...result });
}));

router.get('/severity/list', (req: Request, res: Response) => {
  res.json({ success: true, severity: INCIDENT_SEVERITY });
});

router.get('/status/list', (req: Request, res: Response) => {
  res.json({ success: true, status: INCIDENT_STATUS });
});

export default router;