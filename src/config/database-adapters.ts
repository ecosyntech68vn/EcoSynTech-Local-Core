import logger from './logger';

export const DRIVER_TYPE = process.env.DB_TYPE || 'sqlite';

let db: any = null;
let SQL: any = null;
let pool: any = null;

export async function initDatabase(): Promise<any> {
  if (DRIVER_TYPE === 'postgresql') {
    return initPostgresDatabase();
  }
  
  return initSqliteDatabase();
}

async function initSqliteDatabase(): Promise<any> {
  const initSqlJs from('sql.js');
  const fs from('fs');
  const path from('path');
  
  const dbPath = process.env.DB_PATH || './data/ecosyntech.db';
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    logger.info('[SQLite] Loaded existing database');
  } else {
    db = new SQL.Database();
    logger.info('[SQLite] Created new database');
  }
  
  createTables();
  seedInitialData();
  saveDatabase();
  
  logger.info('[SQLite] Database initialized successfully');
  return db;
}

function createTables(): void {
  if (!db) return;
  
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA synchronous=NORMAL');
  db.run('PRAGMA cache_size=-64000');
  db.run('PRAGMA busy_timeout=5000');
  db.run('PRAGMA temp_store=MEMORY');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    tenant_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    area REAL,
    owner_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    farm_id TEXT,
    status TEXT DEFAULT 'offline',
    last_seen TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sensors (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    type TEXT NOT NULL,
    value REAL,
    unit TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    prev_hash TEXT,
    hash TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    cooldown_minutes INTEGER DEFAULT 30,
    hysteresis REAL DEFAULT 0,
    time_window TEXT,
    priority TEXT DEFAULT 'normal',
    target_device TEXT,
    trigger_count INTEGER DEFAULT 0,
    last_triggered TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER DEFAULT 60,
    zones TEXT DEFAULT '[]',
    enabled INTEGER DEFAULT 1,
    days TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    trigger TEXT,
    status TEXT DEFAULT 'success',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    device_id TEXT,
    zone_id TEXT,
    acknowledged INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    farm_id TEXT,
    area REAL,
    crop_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_devices_farm ON devices(farm_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sensors_device ON sensors(device_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash)');
  db.run('CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled)');
}

function seedInitialData(): void {
  if (!db) return;
  const bcrypt from('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.run('INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
    ['usr_admin', 'admin@ecosyntech.com', hashedPassword, 'Administrator', 'admin']);
  
  logger.info('[SQLite] Seeded initial data');
}

export function saveDatabase(): void {
  if (!db) return;
  const fs from('fs');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(process.env.DB_PATH || './data/ecosyntech.db', buffer);
}

export function runQuery(sql: string, params: any[] = []): any {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return runPostgresQuery(sql, params);
  }
  if (!db) return { changes: 0 };
  try {
    db.run(sql, params);
    return { changes: db.getRowsModified() };
  } catch (err) {
    logger.error('[SQLite] Query error:', err);
    throw err;
  }
}

export function getOne(sql: string, params: any[] = []): any {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return getOnePostgres(sql, params);
  }
  if (!db) return null;
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (err) {
    logger.error('[SQLite] GetOne error:', err);
    return null;
  }
}

export async function getAll(sql: string, params: any[] = []): Promise<any[]> {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return getAllPostgres(sql, params);
  }
  if (!db) return [];
  try {
    const results: any[] = [];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    logger.error('[SQLite] GetAll error:', err);
    return [];
  }
}

export function closeDatabase(): void {
  if (DRIVER_TYPE === 'postgresql' && pool) {
    return pool.end();
  }
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

async function initPostgresDatabase(): Promise<any> {
  const { Pool } from('pg');
  
  pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'ecosyntech',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD,
    max: 20
  });
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      tenant_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      area REAL,
      owner_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      farm_id TEXT,
      status TEXT DEFAULT 'offline',
      last_seen TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      type TEXT NOT NULL,
      value REAL,
      unit TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      prev_hash TEXT,
      hash TEXT
    )
  `);
  
  await pool.query('CREATE INDEX IF NOT EXISTS idx_devices_farm ON devices(farm_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_sensors_device ON sensors(device_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash)');
  
  logger.info('[PostgreSQL] Database initialized');
  return pool;
}

async function runPostgresQuery(sql: string, params: any[] = []): Promise<any> {
  if (!pool) throw new Error('PostgreSQL not initialized');
  const result = await pool.query(sql, params);
  return result;
}

async function getOnePostgres(sql: string, params: any[] = []): Promise<any> {
  const result = await runPostgresQuery(sql, params);
  return result.rows[0] || null;
}

async function getAllPostgres(sql: string, params: any[] = []): Promise<any[]> {
  const result = await runPostgresQuery(sql, params);
  return result.rows;
}

export function getDb(): any {
  return db;
}

export const getDriverType = () => DRIVER_TYPE;
export const isPostgreSQL = () => DRIVER_TYPE === 'postgresql';
export const isSqlite = () => DRIVER_TYPE === 'sqlite';

export default {
  getDriverType,
  isPostgreSQL,
  isSqlite,
  initDatabase,
  saveDatabase,
  runQuery,
  getOne,
  getAll,
  getDb,
  closeDatabase
};