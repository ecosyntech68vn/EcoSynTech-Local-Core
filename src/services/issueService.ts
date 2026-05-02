/**
 * Issue Service - Bug/Issue tracking system
 * Converted to TypeScript - Phase 1
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import logger from '../config/logger';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueStatus = 'new' | 'acknowledged' | 'in_progress' | 'diagnosed' | 'fixed' | 'verified' | 'closed' | 'wont_fix';
export type IssueCategory = 'hardware' | 'software' | 'network' | 'sensor' | 'configuration' | 'performance' | 'security' | 'other';

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  category: IssueCategory;
  status: IssueStatus;
  affectedFarm?: string;
  affectedDevice?: string;
  affectedSensor?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  reportedBy?: string;
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueData {
  title: string;
  description: string;
  severity?: IssueSeverity;
  category?: IssueCategory;
  affectedFarm?: string;
  affectedDevice?: string;
  affectedSensor?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  reportedBy?: string;
}

export interface UpdateIssueData {
  title?: string;
  description?: string;
  severity?: IssueSeverity;
  category?: IssueCategory;
  status?: IssueStatus;
  assignedTo?: string;
  resolution?: string;
}

export const ISSUE_SEVERITY: Record<string, IssueSeverity> = {
  CRITICAL: 'critical',
  HIGH: 'high', 
  MEDIUM: 'medium',
  LOW: 'low'
};

export const ISSUE_STATUS: Record<string, IssueStatus> = {
  NEW: 'new',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  DIAGNOSED: 'diagnosed',
  FIXED: 'fixed',
  VERIFIED: 'verified',
  CLOSED: 'closed',
  WONT_FIX: 'wont_fix'
};

export const ISSUE_CATEGORY: Record<string, IssueCategory> = {
  HARDWARE: 'hardware',
  SOFTWARE: 'software',
  NETWORK: 'network',
  SENSOR: 'sensor',
  CONFIGURATION: 'configuration',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  OTHER: 'other'
};

export async function createIssue(data: CreateIssueData): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const issue: Issue = {
    id,
    title: data.title,
    description: data.description,
    severity: data.severity || 'medium',
    category: data.category || 'other',
    status: 'new',
    affectedFarm: data.affectedFarm,
    affectedDevice: data.affectedDevice,
    affectedSensor: data.affectedSensor,
    stepsToReproduce: data.stepsToReproduce,
    expectedBehavior: data.expectedBehavior,
    actualBehavior: data.actualBehavior,
    reportedBy: data.reportedBy,
    createdAt: now,
    updatedAt: now
  };

  db.run(`
    INSERT INTO issues (
      id, title, description, severity, category, status,
      affected_farm, affected_device, affected_sensor,
      steps_to_reproduce, expected_behavior, actual_behavior,
      reported_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    issue.id, issue.title, issue.description, issue.severity, issue.category, issue.status,
    issue.affectedFarm || null, issue.affectedDevice || null, issue.affectedSensor || null,
    issue.stepsToReproduce || null, issue.expectedBehavior || null, issue.actualBehavior || null,
    issue.reportedBy || null, issue.createdAt, issue.updatedAt
  ]);

  logger.info(`[Issue] Created: ${id} - ${data.title}`);
  return id;
}

export function getIssue(issueId: string): Issue | null {
  return db.get('SELECT * FROM issues WHERE id = ?', [issueId]) as Issue | null;
}

export function getIssuesByFarm(farmId: string, status?: IssueStatus): Issue[] {
  if (status) {
    return db.all('SELECT * FROM issues WHERE affected_farm = ? AND status = ? ORDER BY created_at DESC', [farmId, status]) as Issue[];
  }
  return db.all('SELECT * FROM issues WHERE affected_farm = ? ORDER BY created_at DESC', [farmId]) as Issue[];
}

export function updateIssue(issueId: string, data: UpdateIssueData): boolean {
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
      if (data.status === 'fixed' || data.status === 'closed') {
        updates.push('resolved_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (data.assignedTo) { updates.push('assigned_to = ?'); values.push(data.assignedTo); }
    if (data.resolution) { updates.push('resolution = ?'); values.push(data.resolution); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(issueId);

    db.run(`UPDATE issues SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error: any) {
    logger.error('[Issue] Update error:', error.message);
    return false;
  }
}

export function resolveIssue(issueId: string, resolution: string): boolean {
  try {
    db.run('UPDATE issues SET status = ?, resolution = ?, resolved_at = ?, updated_at = ? WHERE id = ?',
      ['fixed', resolution, new Date().toISOString(), new Date().toISOString(), issueId]);
    return true;
  } catch (error: any) {
    logger.error('[Issue] Resolve error:', error.message);
    return false;
  }
}

export function closeIssue(issueId: string): boolean {
  return updateIssue(issueId, { status: 'closed' });
}

export function assignIssue(issueId: string, assignedTo: string): boolean {
  return updateIssue(issueId, { 
    assignedTo,
    status: 'acknowledged'
  });
}

export function getIssueStats(farmId: string): {
  total: number;
  critical: number;
  open: number;
  fixed: number;
  closed: number;
} {
  const issues = getIssuesByFarm(farmId);
  
  return {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    open: issues.filter(i => ['new', 'acknowledged', 'in_progress'].includes(i.status)).length,
    fixed: issues.filter(i => i.status === 'fixed').length,
    closed: issues.filter(i => i.status === 'closed').length
  };
}

export function getCriticalIssues(farmId: string): Issue[] {
  return db.all(`
    SELECT * FROM issues 
    WHERE affected_farm = ? AND severity = 'critical' 
    AND status NOT IN ('fixed', 'closed')
    ORDER BY created_at DESC
  `, [farmId]) as Issue[];
}

export default {
  createIssue,
  getIssue,
  getIssuesByFarm,
  updateIssue,
  resolveIssue,
  closeIssue,
  assignIssue,
  getIssueStats,
  getCriticalIssues
};