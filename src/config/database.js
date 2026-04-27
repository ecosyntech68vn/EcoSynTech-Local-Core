const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const config = require('./index');
const logger = require('./logger');

let db = null;
let SQL = null;

async function initDatabase() {
  const dbDir = path.dirname(config.database.path);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(config.database.path)) {
    const fileBuffer = fs.readFileSync(config.database.path);
    db = new SQL.Database(fileBuffer);
    logger.info('Loaded existing database');
  } else {
    db = new SQL.Database();
    logger.info('Created new database');
  }

  try {
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA synchronous=NORMAL');
    db.run('PRAGMA cache_size=-64000');
    db.run('PRAGMA busy_timeout=5000');
    db.run('PRAGMA temp_store=MEMORY');
    logger.info('SQLite PRAGMAs optimized');
  } catch (err) {
    logger.warn('Some PRAGMAs may not be supported:', err.message);
  }

  createTables();
  seedInitialData();
  saveDatabase();
  
  logger.info('Database initialized successfully');
  return db;
}

let pendingSave = false;
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 2000;
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 10;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getTransactionLogPath() {
  return path.join(__dirname, '../../data/transactions.log');
}

function logTransaction(sql, params) {
  try {
    const logPath = getTransactionLogPath();
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${sql} | ${JSON.stringify(params)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    logger.warn('Transaction log failed:', e.message);
  }
}

function saveDatabase() {
  if (!db) return;
  if (pendingSave) return;
  
  pendingSave = true;
  clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(config.database.path, buffer);
      pendingSave = false;
    } catch (err) {
      logger.error('Failed to save database:', err);
      pendingSave = false;
    }
  }, SAVE_DEBOUNCE_MS);
}

function saveDatabaseSync() {
  if (!db || pendingSave) return;
  clearTimeout(saveTimeout);
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.database.path, buffer);
  } catch (err) {
    logger.error('Failed to save database:', err);
  }
}

function createPeriodicBackup() {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `ecosyntech_${timestamp}.db`);
  
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(backupPath, buffer);
    logger.info(`[DB] Periodic backup created: ${backupPath}`);
    
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length > MAX_BACKUPS) {
      backups.slice(MAX_BACKUPS).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        logger.info(`[DB] cleanup: deleted old backup ${f}`);
      });
    }
  } catch (err) {
    logger.error('[DB] Periodic backup failed:', err);
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    if (db) {
      saveDatabaseSync();
      logger.debug('[DB] Checkpoint written');
    }
  }, 60000);
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    if (db) {
      createPeriodicBackup();
    }
  }, 24 * 60 * 60 * 1000);
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      zone TEXT,
      status TEXT DEFAULT 'offline',
      config TEXT DEFAULT '{}',
      last_seen TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_secrets (
      device_id TEXT PRIMARY KEY,
      secret TEXT NOT NULL,
      provisioned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      type TEXT UNIQUE NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      min_value REAL,
      max_value REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rules (
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
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_rules_enabled ON rules(enabled)');

  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 60,
      zones TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      days TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      trigger TEXT,
      status TEXT DEFAULT 'success',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      sensor TEXT,
      value REAL,
      message TEXT,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  createIndexes();
  performVacuum();

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      device_id TEXT,
      user_id TEXT,
      name TEXT,
      permissions TEXT DEFAULT '[]',
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      command TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      delivered_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  createIndexes();
  performVacuum();

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_batches (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      product_type TEXT,
      quantity REAL,
      unit TEXT,
      farm_name TEXT,
      zone TEXT,
      seed_variety TEXT,
      planting_date TEXT,
      expected_harvest TEXT,
      harvest_date TEXT,
      harvest_quantity REAL,
      harvest_notes TEXT,
      status TEXT DEFAULT 'active',
      metadata TEXT DEFAULT '{}',
      farm_address TEXT,
      farm_certifications TEXT DEFAULT '[]',
      buyer_name TEXT,
      buyer_contact TEXT,
      export_date TEXT,
      export_price REAL,
      export_unit TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_stages (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_type TEXT NOT NULL,
      stage_order INTEGER DEFAULT 0,
      description TEXT,
      performed_by TEXT,
      location TEXT,
      inputs_used TEXT DEFAULT '[]',
      photos TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES traceability_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS traceability_readings (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      device_id TEXT,
      sensor_type TEXT,
      value REAL,
      unit TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES traceability_batches(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batches (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      farm_id TEXT,
      area_id TEXT,
      season_id TEXT,
      asset_id TEXT,
      product_name TEXT NOT NULL,
      product_type TEXT,
      batch_code TEXT UNIQUE,
      harvest_date TEXT,
      produced_quantity REAL,
      unit TEXT DEFAULT 'kg',
      quality_grade TEXT,
      status TEXT DEFAULT 'created',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batch_events (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT DEFAULT 'user',
      actor_id TEXT,
      related_log_id TEXT,
      related_quantity_id TEXT,
      related_inventory_id TEXT,
      location_json TEXT,
      note TEXT,
      event_time TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batch_inputs (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      input_type TEXT NOT NULL,
      input_name TEXT,
      supplier_name TEXT,
      quantity REAL,
      unit TEXT,
      used_at TEXT,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_batch_quality_checks (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      check_type TEXT NOT NULL,
      result TEXT,
      score REAL,
      details_json TEXT,
      checked_by TEXT,
      checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_packages (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      package_code TEXT UNIQUE,
      barcode TEXT UNIQUE,
      qr_code TEXT UNIQUE,
      net_weight REAL,
      unit TEXT DEFAULT 'kg',
      packaging_type TEXT,
      packed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'created',
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_shipments (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      shipment_code TEXT UNIQUE,
      customer_name TEXT,
      destination TEXT,
      transport_type TEXT,
      status TEXT DEFAULT 'preparing',
      shipped_at TEXT,
      delivered_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_shipment_items (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      package_id TEXT NOT NULL,
      quantity REAL,
      unit TEXT DEFAULT 'kg',
      FOREIGN KEY (shipment_id) REFERENCES tb_shipments(id),
      FOREIGN KEY (package_id) REFERENCES tb_packages(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_recall_incidents (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      incident_type TEXT,
      severity TEXT,
      description TEXT,
      status TEXT DEFAULT 'open',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY (batch_id) REFERENCES tb_batches(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tb_qr_codes (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      code_type TEXT DEFAULT 'qr',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rule_history (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      sensor_value REAL,
      triggered INTEGER DEFAULT 0,
      action_taken TEXT,
      executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rule_id) REFERENCES rules(id)
    )
  `);

  try {
    db.run('CREATE INDEX idx_rule_history_rule_id ON rule_history(rule_id)');
    db.run('CREATE INDEX idx_rule_history_executed_at ON rule_history(executed_at)');
  } catch (e) {
    logger.warn('[Database] Index creation skipped:', e.message);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id TEXT PRIMARY KEY,
      sensor_type TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_firmwares (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      description TEXT,
      device_type TEXT NOT NULL,
      file_url TEXT,
      checksum TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ota_updates (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      firmware_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_config_history (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      old_config TEXT,
      new_config TEXT,
      changed_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variety TEXT,
      planting_date TEXT,
      expected_harvest TEXT,
      harvest_date TEXT,
      harvest_quantity REAL,
      kc_stage TEXT DEFAULT '{}',
      area REAL,
      unit TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_stages (
      id TEXT PRIMARY KEY,
      crop_id TEXT NOT NULL,
      stage_name TEXT NOT NULL,
      stage_order INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crop_id) REFERENCES crops(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_yields (
      id TEXT PRIMARY KEY,
      crop_id TEXT NOT NULL,
      harvest_date TEXT,
      quantity REAL,
      quality TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crop_id) REFERENCES crops(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ip_whitelist (
      id TEXT PRIMARY KEY,
      ip TEXT UNIQUE NOT NULL,
      description TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      user_id TEXT,
      details TEXT DEFAULT '{}',
      ip TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      token TEXT,
      ip TEXT,
      user_agent TEXT,
      last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      settings TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      area REAL,
      area_unit TEXT DEFAULT 'hectare',
      owner_id TEXT,
      settings TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ota_history (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      current_version TEXT,
      target_version TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      phone TEXT,
      farm_id TEXT,
      daily_rate REAL,
      status TEXT DEFAULT 'active',
      hire_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS worker_attendance (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      hours_worked REAL,
      task TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS supply_chain (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      source_farm_id TEXT,
      destination TEXT,
      status TEXT DEFAULT 'pending',
      harvest_date TEXT,
      shipped_date TEXT,
      delivered_date TEXT,
      temperature REAL,
      humidity REAL,
      quality_check TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      quantity REAL DEFAULT 0,
      min_quantity REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      supplier TEXT,
      farm_id TEXT,
      expiry_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_log (
      id TEXT PRIMARY KEY,
      inventory_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS finance (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      farm_id TEXT,
      date TEXT NOT NULL,
      payment_method TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS finance_summary (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      income REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      workers_cost REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(farm_id, year, month)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      version TEXT DEFAULT '1.0',
      status TEXT DEFAULT 'active',
      framework TEXT DEFAULT 'rules',
      input_schema TEXT DEFAULT '{}',
      output_schema TEXT DEFAULT '{}',
      metrics TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      model_id TEXT,
      farm_id TEXT,
      asset_id TEXT,
      job_type TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      input_data TEXT DEFAULT '{}',
      output_data TEXT DEFAULT '{}',
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      model_id TEXT,
      asset_id TEXT,
      target_type TEXT NOT NULL,
      target_time TEXT,
      predicted_value TEXT,
      confidence REAL,
      explanation TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      prediction_id TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      suggested_action TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      device_id TEXT,
      asset_id TEXT,
      metric TEXT NOT NULL,
      expected_range TEXT,
      actual_value REAL,
      severity TEXT DEFAULT 'low',
      status TEXT DEFAULT 'open',
      detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
      acknowledged_by TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_feedback (
      id TEXT PRIMARY KEY,
      recommendation_id TEXT,
      prediction_id TEXT,
      user_id TEXT,
      feedback_type TEXT NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_vi TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      kc_initial REAL DEFAULT 0.4,
      kc_mid REAL DEFAULT 1.0,
      kc_end REAL DEFAULT 0.7,
      min_temp REAL,
      max_temp REAL,
      optimal_temp_min REAL,
      optimal_temp_max REAL,
      min_humidity REAL,
      max_humidity REAL,
      min_soil_moisture REAL,
      max_soil_moisture REAL,
      min_light_lux INTEGER,
      max_light_lux INTEGER,
      optimal_light_lux INTEGER,
      growth_days INTEGER,
      seed_depth REAL,
      row_spacing REAL,
      plant_spacing REAL,
      water_requirement REAL,
      fertilizer_type TEXT,
      fertilizer_n REAL,
      fertilizer_p REAL,
      fertilizer_k REAL,
      ph_optimal_min REAL,
      ph_optimal_max REAL,
      stages TEXT,
      disease_risk TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_plantings (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      crop_id TEXT NOT NULL,
      area REAL,
      area_unit TEXT DEFAULT 'hectare',
      planting_date TEXT,
      expected_harvest_date TEXT,
      actual_harvest_date TEXT,
      status TEXT DEFAULT 'growing',
      current_stage TEXT DEFAULT 'gieo_hat',
      yield_expected REAL,
      yield_actual REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS aquaculture (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_vi TEXT,
      category TEXT NOT NULL,
      optimal_temp_min REAL,
      optimal_temp_max REAL,
      optimal_ph_min REAL,
      optimal_ph_max REAL,
      optimal_do REAL,
      optimal_salinity REAL,
      growth_days INTEGER,
      density_max REAL,
      feed_conversion_ratio REAL,
      water_change_rate REAL,
      disease_risk TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.info('Database tables created');
}

function seedCropData() {
  // Skipped - to be re-enabled later
}

function seedAquacultureData() {
  // Skipped - to be re-enabled later
}

function seedInitialData() {
  // Seeding functions are skipped - re-enable when ready
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

const stmtCache = new Map();
const MAX_STMT_CACHE = 50;

function getPreparedStatement(sql) {
  const cached = stmtCache.get(sql);
  if (cached) {
    try {
      cached.stmt.step();
      cached.stmt.reset();
      cached.lastUsed = Date.now();
      cached.useCount++;
      return cached.stmt;
    } catch (e) {
      stmtCache.delete(sql);
    }
  }
  
  const stmt = db.prepare(sql);
  if (stmtCache.size >= MAX_STMT_CACHE) {
    let oldestKey = null;
    let oldestTime = Date.now();
    for (const [key, val] of stmtCache) {
      if (val.lastUsed < oldestTime) {
        oldestTime = val.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      try { stmtCache.get(oldestKey).stmt.free(); } catch (e) { /* istanbul ignore next */ }
      stmtCache.delete(oldestKey);
    }
  }
  
  stmtCache.set(sql, { stmt, lastUsed: Date.now(), useCount: 1 });
  return stmt;
}

function runQuery(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    if (params.length === 0) {
      db.run(sql);
    } else {
      const stmt = getPreparedStatement(sql);
      stmt.reset();
      stmt.bind(params);
      stmt.step();
      stmt.reset();
    }
    saveDatabase();
    return { changes: db.getRowsModified() };
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function getOne(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = getPreparedStatement(sql);
    stmt.reset();
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      return row;
    }
    return null;
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function getAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = getPreparedStatement(sql);
    stmt.reset();
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    return results;
  } catch (err) {
    logger.error('Query error:', err);
    throw err;
  }
}

function closeDatabase() {
  if (db) {
    saveDatabaseSync();
    db.close();
    db = null;
    for (const { stmt } of stmtCache.values()) {
      try { stmt.free(); } catch (e) { /* istanbul ignore next */ }
    }
    stmtCache.clear();
    logger.info('Database connection closed');
  }
}

function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status)',
    'CREATE INDEX IF NOT EXISTS idx_devices_zone ON devices(zone)',
    'CREATE INDEX IF NOT EXISTS idx_sensors_type ON sensors(type)',
    'CREATE INDEX IF NOT EXISTS idx_sensors_timestamp ON sensors(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)',
    'CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status)',
    'CREATE INDEX IF NOT EXISTS idx_commands_device ON commands(device_id)'
  ];

  indexes.forEach(sql => {
    try {
      db.run(sql);
    } catch (e) {
      logger.debug('Index creation:', e.message);
    }
  });
  logger.info('[DB] Indexes created/verified');
}

function performVacuum() {
  if (!db || !db.run) return;
  try {
    db.run('ANALYZE');
    logger.info('[DB] ANALYZE completed');
  } catch (e) {
    logger.debug('ANALYZE:', e.message);
  }
}

function optimizeDatabase() {
  try {
    db.run('PRAGMA optimize');
    saveDatabase();
    logger.info('[DB] Optimize completed');
  } catch (e) {
    logger.debug('Optimize:', e.message);
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    if (db) {
      optimizeDatabase();
    }
  }, 30 * 60 * 1000);
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getOne,
  getAll,
  saveDatabase,
  createIndexes,
  optimizeDatabase
};
