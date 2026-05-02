import crypto from 'crypto';

let lastAuditHash = 'GENESIS';

const AUDIT_CHAIN_KEY = process.env.AUDIT_CHAIN_KEY || process.env.HMAC_SECRET || process.env.JWT_SECRET;

interface AuditEntry {
  timestamp: string;
  action: string;
  user_id: string;
  details: any;
}

async function getLastAuditHash(): Promise<string> {
  if (lastAuditHash) return lastAuditHash;
  const db = require('../config/database');
  const row = await db.getOne('SELECT hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1');
  lastAuditHash = row ? row.hash : 'GENESIS';
  return lastAuditHash;
}

export function computeAuditHash(prevHash: string, data: AuditEntry): string {
  const payload = `${prevHash}.${data.timestamp}.${data.action}.${data.user_id}.${JSON.stringify(data.details)}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function logTamperProofAudit(action: string, userId: string, details: any, ip: string): Promise<{ timestamp: string; hash: string; prevHash: string }> {
  const prevHash = await getLastAuditHash();
  const timestamp = new Date().toISOString();
  const entry: AuditEntry = { timestamp, action, user_id: userId, details };
  const hash = computeAuditHash(prevHash, entry);

  const db = require('../config/database');
  await db.runQuery(
    `INSERT INTO audit_logs (id, action, user_id, details, ip, timestamp, prev_hash, hash) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), action, userId, JSON.stringify(details), ip, timestamp, prevHash, hash]
  );

  lastAuditHash = hash;
  return { timestamp, hash, prevHash };
}

export async function verifyAuditChain(): Promise<{ valid: boolean; totalEntries: number }> {
  const db = require('../config/database');
  const rows = await db.getAll('SELECT id, timestamp, action, user_id, details, prev_hash, hash FROM audit_logs ORDER BY timestamp');
  let isValid = true;
  let expectedPrev = 'GENESIS';

  for (const row of rows) {
    const computed = computeAuditHash(expectedPrev, {
      timestamp: row.timestamp,
      action: row.action,
      user_id: row.user_id,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
    });

    if (computed !== row.hash) {
      isValid = false;
      break;
    }
    expectedPrev = row.hash;
  }

  return { valid: isValid, totalEntries: rows.length };
}

export function getAuditHashMiddleware(req: any, res: any, next: any): void {
  req.auditLog = async (action: string, details: any) => {
    const userId = req.user ? req.user.id : 'system';
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return logTamperProofAudit(action, userId, details, ip);
  };
  next();
}

export default {
  computeAuditHash,
  logTamperProofAudit,
  verifyAuditChain,
  getAuditHashMiddleware
};