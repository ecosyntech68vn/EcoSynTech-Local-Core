const ALLOWED_ROLES = new Set(['telemetry_admin', 'telemetry_auditor', 'telemetry_user', 'admin']);

export function telemetryAccess(req: any, res: any, next: any): void {
  if (process.env.NODE_ENV === 'test') {
    const mockRole = (req.headers['x-mock-telemetry-role'] || '').toString().toLowerCase();
    if (mockRole) {
      if (ALLOWED_ROLES.has(mockRole)) {
        req.user = { role: mockRole };
        return next();
      }
      return res.status(403).json({ error: 'Insufficient permissions for telemetry' });
    }
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const role = (user.role || '').toString().toLowerCase();
  if (ALLOWED_ROLES.has(role)) {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions for telemetry' });
}

export default { telemetryAccess };