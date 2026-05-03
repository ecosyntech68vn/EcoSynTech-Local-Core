import { Router, Request, Response, NextFunction } from 'express';
import { getAll, getOne, runQuery } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { auth as authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

import router = Router();

import ROLES: Record<string, string[]> = {
  admin: ['all'],
  manager: ['read', 'write', 'devices', 'sensors', 'rules', 'schedules'],
  operator: ['read', 'devices', 'sensors'],
  viewer: ['read']
};

import PERMISSIONS: Record<string, string[]> = {
  'all': ['*'],
  'read': ['GET'],
  'write': ['POST', 'PUT', 'DELETE'],
  'devices': ['devices', 'device-mgmt', 'firmware'],
  'sensors': ['sensors', 'analytics'],
  'rules': ['rules'],
  'schedules': ['schedules'],
  'alerts': ['alerts'],
  'traceability': ['traceability'],
  'admin': ['security', 'users', 'settings']
};

interface AuthRequest extends Request {
  user?: {
    role: string;
    tenant_id?: string;
    sub?: string;
    id?: string;
  };
}

function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    admin: 'Full access to all features and settings',
    manager: 'Manage devices, sensors, rules and schedules',
    operator: 'Monitor and control devices',
    viewer: 'View-only access to dashboard and data'
  };
  return descriptions[role] || '';
}

function hasPermission(user: AuthRequest['user'], requiredPermission: string): boolean {
  if (!user) return false;
  
  const userRole = user.role || 'viewer';
  const rolePermissions = ROLES[userRole] || [];
  
  if (rolePermissions.includes('all')) return true;
  if (rolePermissions.includes(requiredPermission)) return true;
  
  return false;
}

function hasAnyPermission(user: AuthRequest['user'], permissions: string[]): boolean {
  if (!user) return false;
  
  const userRole = user.role || 'viewer';
  const rolePermissions = ROLES[userRole] || [];
  
  if (rolePermissions.includes('all')) return true;
  
  return permissions.some(p => rolePermissions.includes(p));
}

router.get('/roles', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  const roles = Object.entries(ROLES).map(([name, perms]) => ({
    name,
    permissions: perms,
    description: getRoleDescription(name)
  }));
  
  res.json({ success: true, roles });
}));

router.get('/users', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  const tenantId = req.user?.tenant_id || null;
  const query = tenantId 
    ? 'SELECT id, email, name, role, tenant_id, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC'
    : 'SELECT id, email, name, role, tenant_id, created_at FROM users ORDER BY created_at DESC';
  
  const users = tenantId ? getAll(query, [tenantId]) : getAll(query);
  
  res.json({ success: true, users: users.map((u: any) => ({ ...u, password: undefined })) });
}));

interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  role?: string;
  tenant_id?: string;
}

router.post('/users', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  const { email, password, name, role, tenant_id } = req.body as CreateUserBody;
  
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password and name are required' });
    return;
  }
  
  const existing = getOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    res.status(400).json({ error: 'Email already exists' });
    return;
  }
  
  const bcrypt from('bcryptjs');
  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  
  runQuery(
    'INSERT INTO users (id, email, password, name, role, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, email, hashedPassword, name, role || 'viewer', tenant_id || req.user?.tenant_id, new Date().toISOString()]
  );
  
  res.json({ success: true, id, message: 'User created successfully' });
}));

interface UpdateUserBody {
  email?: string;
  name?: string;
  role?: string;
  tenant_id?: number;
  active?: boolean;
}

router.put('/users/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { email, name, role, tenant_id, active } = req.body as UpdateUserBody;
  
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  const user = getOne('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  const updates: string[] = [];
  const params: (string | number)[] = [];
  
  if (email) { updates.push('email = ?'); params.push(email); }
  if (name) { updates.push('name = ?'); params.push(name); }
  if (role) { updates.push('role = ?'); params.push(role); }
  if (tenant_id !== undefined) { updates.push('tenant_id = ?'); params.push(tenant_id); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  
  if (updates.length > 0) {
    params.push(new Date().toISOString(), id);
    runQuery(`UPDATE users SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, params);
  }
  
  res.json({ success: true, message: 'User updated successfully' });
}));

router.delete('/users/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  if (id === req.user?.sub) {
    res.status(400).json({ error: 'Cannot delete yourself' });
    return;
  }
  
  runQuery('DELETE FROM users WHERE id = ?', [id]);
  
  res.json({ success: true, message: 'User deleted successfully' });
}));

router.get('/permissions/check', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { permission, resource } = req.query;
  
  const hasAccess = hasPermission(req.user, permission as string) || hasAnyPermission(req.user, [resource as string]);
  
  res.json({ 
    success: true, 
    hasAccess,
    role: req.user?.role,
    permissions: ROLES[req.user?.role || 'viewer'] || []
  });
}));

router.get('/tenants', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  const tenants = getAll('SELECT * FROM tenants ORDER BY created_at DESC');
  
  res.json({ success: true, tenants });
}));

interface CreateTenantBody {
  name: string;
  domain?: string;
  settings?: Record<string, unknown>;
}

router.post('/tenants', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  const { name, domain, settings } = req.body as CreateTenantBody;
  
  if (!name) {
    res.status(400).json({ error: 'Tenant name is required' });
    return;
  }
  
  const id = uuidv4();
  runQuery(
    'INSERT INTO tenants (id, name, domain, settings, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, domain || null, JSON.stringify(settings || {}), new Date().toISOString()]
  );
  
  res.json({ success: true, id, message: 'Tenant created successfully' });
}));

interface UpdateTenantBody {
  name?: string;
  domain?: string | null;
  settings?: Record<string, unknown>;
  active?: boolean;
}

router.put('/tenants/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!hasPermission(req.user, 'admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  const { id } = req.params;
  const { name, domain, settings, active } = req.body as UpdateTenantBody;
  
  const updates: string[] = [];
  const params: (string | number | null)[] = [];
  
  if (name) { updates.push('name = ?'); params.push(name); }
  if (domain !== undefined) { updates.push('domain = ?'); params.push(domain); }
  if (settings) { updates.push('settings = ?'); params.push(JSON.stringify(settings)); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  
  if (updates.length > 0) {
    params.push(new Date().toISOString(), id);
    runQuery(`UPDATE tenants SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`, params);
  }
  
  res.json({ success: true, message: 'Tenant updated successfully' });
}));

function checkPermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!hasPermission(req.user, permission) && !hasAnyPermission(req.user, [permission])) {
      res.status(403).json({ error: `Permission denied. Required: ${permission}` });
      return;
    }
    next();
  };
}

export default router;
export { hasPermission, hasAnyPermission, checkPermission, ROLES };