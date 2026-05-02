/**
 * Incident Service - Security incident management
 * Converted to TypeScript - Phase 1
 * ISO 27001 A.16 compliance
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'detected' | 'contained' | 'eradicated' | 'recovered' | 'closed';

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  category: string;
  source: string;
  status: IncidentStatus;
  evidence: string;
  affectedSystems: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentData {
  title: string;
  description: string;
  severity?: IncidentSeverity;
  category?: string;
  source?: string;
  affectedSystems?: string[];
  initialEvidence?: {
    ip?: string;
    timestamp?: string;
    logs?: string[];
    screenshots?: string[];
    reportedBy?: string;
  };
}

export interface UpdateIncidentData {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  category?: string;
  status?: IncidentStatus;
  assignedTo?: string;
}

export const INCIDENT_SEVERITY: Record<string, IncidentSeverity> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

export const INCIDENT_STATUS: Record<string, IncidentStatus> = {
  DETECTED: 'detected',
  CONTAINED: 'contained',
  ERADICATED: 'eradicated',
  RECOVERED: 'recovered',
  CLOSED: 'closed'
};

export async function createIncident(data: CreateIncidentData): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const evidence = {
    ip: data.initialEvidence?.ip,
    timestamp: data.initialEvidence?.timestamp,
    logs: data.initialEvidence?.logs,
    screenshots: data.initialEvidence?.screenshots
  };

  db.run(`
    INSERT INTO incidents (
      id, title, description, severity, category, source, status,
      evidence, affected_systems, reported_by, reported_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.title,
    data.description,
    data.severity || 'medium',
    data.category || 'security',
    data.source || 'system',
    INCIDENT_STATUS.DETECTED,
    JSON.stringify(evidence),
    JSON.stringify(data.affectedSystems || []),
    data.initialEvidence?.reportedBy || 'system',
    now,
    now,
    now
  ]);

  logger.warn(`[Incident] Created: ${id} - ${data.title} (${data.severity || 'medium'})`);
  return id;
}

export function getIncident(incidentId: string): Incident | null {
  return db.get('SELECT * FROM incidents WHERE id = ?', [incidentId]) as Incident | null;
}

export function getIncidentsByFarm(farmId: string): Incident[] {
  return db.all('SELECT * FROM incidents ORDER BY reported_at DESC', []) as Incident[];
}

export function updateIncident(incidentId: string, data: UpdateIncidentData): boolean {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title) { updates.push('title = ?'); values.push(data.title); }
    if (data.description) { updates.push('description = ?'); values.push(data.description); }
    if (data.severity) { updates.push('severity = ?'); values.push(data.severity); }
    if (data.category) { updates.push('category = ?'); values.push(data.category); }
    if (data.status) { 
      updates.push('status = ?'); 
      values.push(data.status);
      if (data.status === 'recovered' || data.status === 'closed') {
        updates.push('resolved_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (data.assignedTo) { updates.push('assigned_to = ?'); values.push(data.assignedTo); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(incidentId);

    db.run(`UPDATE incidents SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error: any) {
    logger.error('[Incident] Update error:', error.message);
    return false;
  }
}

export function containIncident(incidentId: string): boolean {
  return updateIncident(incidentId, { status: 'contained' });
}

export function eradicateIncident(incidentId: string): boolean {
  return updateIncident(incidentId, { status: 'eradicated' });
}

export function recoverIncident(incidentId: string): boolean {
  return updateIncident(incidentId, { status: 'recovered' });
}

export function closeIncident(incidentId: string): boolean {
  return updateIncident(incidentId, { status: 'closed' });
}

export function getActiveIncidents(): Incident[] {
  return db.all(`
    SELECT * FROM incidents 
    WHERE status NOT IN ('closed')
    ORDER BY 
      CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      reported_at DESC
  `, []) as Incident[];
}

export function getIncidentStats(): {
  total: number;
  critical: number;
  active: number;
  closed: number;
} {
  const incidents = getActiveIncidents();
  const allIncidents = db.all('SELECT * FROM incidents', []) as Incident[];
  
  return {
    total: allIncidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    active: incidents.length,
    closed: allIncidents.filter(i => i.status === 'closed').length
  };
}

export default {
  createIncident,
  getIncident,
  getIncidentsByFarm,
  updateIncident,
  containIncident,
  eradicateIncident,
  recoverIncident,
  closeIncident,
  getActiveIncidents,
  getIncidentStats
};