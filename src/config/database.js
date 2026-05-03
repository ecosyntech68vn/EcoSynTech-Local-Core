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
const SAVE_DEBOUNCE_MS = 500;
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MAX_BACKUPS = 10;
const dbFileDescriptor = null;

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
      
      const dir = path.dirname(config.database.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(config.database.path, buffer);
      
      try {
        const fd = fs.openSync(config.database.path, 'r+');
        fs.fdatasyncSync(fd);
        fs.closeSync(fd);
      } catch (syncErr) {
        logger.debug('fdatasync skipped:', syncErr.message);
      }
      
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
    
    const dir = path.dirname(config.database.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(config.database.path, buffer);
    
    try {
      const fd = fs.openSync(config.database.path, 'r+');
      fs.fdatasyncSync(fd);
      fs.closeSync(fd);
    } catch (syncErr) {
      logger.debug('fdatasync skipped:', syncErr.message);
    }
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
      phone TEXT,
      provider TEXT DEFAULT 'email',
      provider_id TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create OTP codes table
  db.run(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create refresh tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      revoked INTEGER DEFAULT 0,
      rotated_at TEXT,
      rotation_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    CREATE TABLE IF NOT EXISTS device_action_log (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      triggered_by TEXT,
      rule_id TEXT,
      result TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_device_action_log_device ON device_action_log(device_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_device_action_log_created ON device_action_log(created_at)');

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
      source_type TEXT,
      source_planting_id TEXT,
      source_aquaculture_id TEXT,
      current_stage TEXT,
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
    CREATE TABLE IF NOT EXISTS farm_activities (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      traceability_batch_id TEXT,
      activity_type TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      description TEXT,
      inputs TEXT DEFAULT '[]',
      dosage TEXT,
      unit TEXT,
      cost REAL,
      performed_by TEXT,
      notes TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (traceability_batch_id) REFERENCES traceability_batches(id)
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
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      rotated_at TEXT,
      rotation_count INTEGER DEFAULT 0,
      revoked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)');
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)');

  db.run(`
    CREATE TABLE IF NOT EXISTS data_quality_log (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      sensor_type TEXT NOT NULL,
      raw_value REAL,
      issue_type TEXT NOT NULL,
      issue_detail TEXT,
      processed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_data_quality_device ON data_quality_log(device_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_data_quality_sensor ON data_quality_log(sensor_type)');

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
      source_traceability_id TEXT,
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
    CREATE TABLE IF NOT EXISTS crop_yields (
      id TEXT PRIMARY KEY,
      crop_id TEXT NOT NULL,
      harvest_date TEXT,
      quantity REAL,
      quality TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crop_id) REFERENCES crop_plantings(id)
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

  db.run(`
    CREATE TABLE IF NOT EXISTS aquaculture_spawning (
      id TEXT PRIMARY KEY,
      species_id TEXT NOT NULL,
      pond_id TEXT,
      farm_id TEXT,
      quantity INTEGER,
      source_pool TEXT,
      spawning_date TEXT,
      expected_harvest_date TEXT,
      status TEXT DEFAULT 'nursing',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS greenhouse_zones (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      zone_name TEXT NOT NULL,
      area REAL,
      area_unit TEXT DEFAULT 'm2',
      crop_type TEXT,
      start_date TEXT,
      expected_harvest TEXT,
      status TEXT DEFAULT 'active',
      temperature_target REAL,
      humidity_target REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hydroponic_systems (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      system_name TEXT NOT NULL,
      system_type TEXT,
      capacity INTEGER,
      crop_type TEXT,
      nutrient_ph REAL,
      nutrient_ec REAL,
      start_date TEXT,
      expected_harvest TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS livestock_batches (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      animal_type TEXT NOT NULL,
      quantity INTEGER,
      batch_name TEXT,
      breed TEXT,
      start_date TEXT,
      expected_out_date TEXT,
      status TEXT DEFAULT 'growing',
      weight_start REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS aeroponic_systems (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      system_name TEXT NOT NULL,
      capacity INTEGER,
      crop_type TEXT,
      mist_frequency INTEGER,
      nutrient_concentration REAL,
      start_date TEXT,
      expected_harvest TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      item_code TEXT UNIQUE,
      item_name TEXT NOT NULL,
      item_name_vi TEXT,
      category TEXT NOT NULL,
      unit TEXT DEFAULT 'kg',
      min_stock_alert REAL DEFAULT 10,
      current_stock REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      supplier TEXT,
      supplier_contact TEXT,
      expiry_days INTEGER,
      storage_conditions TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      item_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      unit_cost REAL,
      total_cost REAL,
      transaction_date TEXT,
      reference_number TEXT,
      source_type TEXT,
      source_id TEXT,
      performed_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      item_id TEXT NOT NULL,
      batch_code TEXT UNIQUE,
      import_date TEXT,
      expiry_date TEXT,
      quantity_initial REAL,
      quantity_remaining REAL,
      unit_cost REAL,
      supplier_batch TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_suppliers (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      supplier_code TEXT UNIQUE,
      supplier_name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_code TEXT,
      payment_terms TEXT,
      rating REAL DEFAULT 3,
      total_orders INTEGER DEFAULT 0,
      total_value REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      order_number TEXT UNIQUE,
      supplier_id TEXT,
      order_date TEXT,
      expected_delivery_date TEXT,
      actual_delivery_date TEXT,
      status TEXT DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      items_json TEXT DEFAULT '[]',
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES inventory_suppliers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      item_id TEXT,
      item_name TEXT NOT NULL,
      quantity_ordered REAL,
      quantity_received REAL DEFAULT 0,
      unit TEXT,
      unit_price REAL,
      total_price REAL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_audits (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      audit_code TEXT UNIQUE,
      audit_date TEXT,
      audit_type TEXT DEFAULT 'full',
      status TEXT DEFAULT 'in_progress',
      total_items INTEGER DEFAULT 0,
      matched_items INTEGER DEFAULT 0,
      discrepancies INTEGER DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_audit_items (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL,
      item_id TEXT,
      system_quantity REAL,
      physical_quantity REAL,
      difference REAL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (audit_id) REFERENCES inventory_audits(id),
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_alerts (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      item_id TEXT,
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      threshold_value REAL,
      current_value REAL,
      is_resolved INTEGER DEFAULT 0,
      resolved_at TEXT,
      resolved_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_usage_history (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      item_id TEXT NOT NULL,
      period_type TEXT NOT NULL,
      period_value TEXT NOT NULL,
      quantity_used REAL,
      unit_cost REAL,
      total_value REAL,
      source_type TEXT,
      source_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_workers (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      worker_code TEXT UNIQUE,
      worker_name TEXT NOT NULL,
      worker_name_vi TEXT,
      identity_number TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      birth_date TEXT,
      gender TEXT,
      position TEXT,
      skill_level TEXT DEFAULT 'junior',
      hourly_rate REAL DEFAULT 0,
      monthly_salary REAL DEFAULT 0,
      work_type TEXT DEFAULT 'daily',
      status TEXT DEFAULT 'active',
      hire_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_shifts (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      shift_name TEXT NOT NULL,
      shift_code TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_duration INTEGER DEFAULT 60,
      workday_mask TEXT DEFAULT '1111111',
      is_night_shift INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_attendance (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      worker_id TEXT NOT NULL,
      shift_id TEXT,
      work_date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      break_start TEXT,
      break_end TEXT,
      total_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'present',
      location_in TEXT,
      location_out TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES labor_workers(id),
      FOREIGN KEY (shift_id) REFERENCES labor_shifts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_tasks (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      task_code TEXT UNIQUE,
      task_name TEXT NOT NULL,
      task_type TEXT,
      description TEXT,
      area_id TEXT,
      crop_id TEXT,
      estimated_hours REAL,
      required_workers INTEGER DEFAULT 1,
      priority TEXT DEFAULT 'normal',
      scheduled_date TEXT,
      start_time TEXT,
      end_time TEXT,
      status TEXT DEFAULT 'pending',
      assigned_workers TEXT DEFAULT '[]',
      completed_by TEXT,
      completed_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_task_assignments (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      task_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      assigned_date TEXT,
      hours_worked REAL DEFAULT 0,
      productivity_score REAL,
      quality_score REAL,
      notes TEXT,
      status TEXT DEFAULT 'assigned',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES labor_tasks(id),
      FOREIGN KEY (worker_id) REFERENCES labor_workers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_schedules (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      schedule_name TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      work_days TEXT DEFAULT '1111111',
      shifts_json TEXT DEFAULT '[]',
      assigned_workers TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_payroll (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      payroll_code TEXT UNIQUE,
      worker_id TEXT NOT NULL,
      period_type TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      basic_salary REAL DEFAULT 0,
      total_hours REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      overtime_rate REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      bonuses REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      total_work_days INTEGER DEFAULT 0,
      absent_days INTEGER DEFAULT 0,
      late_days INTEGER DEFAULT 0,
      net_salary REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      payment_date TEXT,
      payment_method TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES labor_workers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_performance (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      worker_id TEXT NOT NULL,
      evaluation_period TEXT NOT NULL,
      evaluation_date TEXT,
      attendance_score REAL DEFAULT 0,
      productivity_score REAL DEFAULT 0,
      quality_score REAL DEFAULT 0,
      teamwork_score REAL DEFAULT 0,
      safety_score REAL DEFAULT 0,
      total_score REAL DEFAULT 0,
      rating TEXT,
      strengths TEXT,
      improvements TEXT,
      evaluator TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worker_id) REFERENCES labor_workers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labor_cost_tracking (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      cost_type TEXT NOT NULL,
      period TEXT NOT NULL,
      category TEXT,
      crop_id TEXT,
      total_hours REAL DEFAULT 0,
      total_workers INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      hourly_average REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========== EQUIPMENT MANAGEMENT TABLES ==========
  // 5S: Sort, Set in Order, Shine, Standardize, Sustain
  // PDCA: Plan, Do, Check, Act

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_categories (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      category_code TEXT NOT NULL,
      category_name TEXT NOT NULL,
      category_name_vi TEXT,
      category_type TEXT NOT NULL,
      parent_category_id TEXT,
      description TEXT,
      icon TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_inventory (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_code TEXT UNIQUE NOT NULL,
      equipment_name TEXT NOT NULL,
      equipment_name_vi TEXT,
      category_id TEXT,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      purchase_date TEXT,
      purchase_price REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      location TEXT,
      status TEXT DEFAULT 'active',
      condition TEXT DEFAULT 'good',
      year_of_manufacture TEXT,
      warranty_expiry TEXT,
      fuel_type TEXT,
      capacity TEXT,
      power_rating TEXT,
      image_url TEXT,
      qr_code TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_id TEXT NOT NULL,
      schedule_code TEXT UNIQUE,
      maintenance_type TEXT NOT NULL,
      description TEXT,
      frequency_days INTEGER DEFAULT 30,
      last_maintenance_date TEXT,
      next_maintenance_date TEXT,
      estimated_hours REAL DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      assigned_technician_id TEXT,
      status TEXT DEFAULT 'active',
      auto_trigger BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_maintenance_records (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_id TEXT NOT NULL,
      schedule_id TEXT,
      maintenance_type TEXT NOT NULL,
      maintenance_date TEXT NOT NULL,
      technician_id TEXT,
      description TEXT,
      work_performed TEXT,
      parts_replaced TEXT,
      labor_hours REAL DEFAULT 0,
      labor_cost REAL DEFAULT 0,
      parts_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      next_maintenance_date TEXT,
      status TEXT DEFAULT 'completed',
      attachments TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_usage_logs (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_id TEXT NOT NULL,
      worker_id TEXT,
      task_id TEXT,
      crop_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_hours REAL DEFAULT 0,
      operation_type TEXT,
      location_area TEXT,
      fuel_consumed REAL DEFAULT 0,
      distance_km REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_assignments (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_id TEXT NOT NULL,
      worker_id TEXT,
      crop_id TEXT,
      area_id TEXT,
      assigned_date TEXT NOT NULL,
      return_date TEXT,
      purpose TEXT,
      status TEXT DEFAULT 'assigned',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_depreciation (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_id TEXT NOT NULL,
      depreciation_method TEXT DEFAULT 'straight_line',
      useful_life_years INTEGER DEFAULT 5,
      salvage_value REAL DEFAULT 0,
      annual_depreciation REAL DEFAULT 0,
      accumulated_depreciation REAL DEFAULT 0,
      current_book_value REAL DEFAULT 0,
      calculation_date TEXT,
      next_calculation_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_cost_tracking (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_id TEXT NOT NULL,
      cost_type TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      fuel_cost REAL DEFAULT 0,
      maintenance_cost REAL DEFAULT 0,
      labor_cost REAL DEFAULT 0,
      parts_cost REAL DEFAULT 0,
      depreciation_cost REAL DEFAULT 0,
      insurance_cost REAL DEFAULT 0,
      other_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_suppliers (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      supplier_code TEXT UNIQUE,
      supplier_name TEXT NOT NULL,
      supplier_name_vi TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      website TEXT,
      tax_id TEXT,
      payment_terms TEXT,
      rating REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_warranty (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      equipment_id TEXT NOT NULL,
      warranty_provider TEXT,
      warranty_type TEXT,
      start_date TEXT,
      end_date TEXT,
      coverage_details TEXT,
      claim_process TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      terms TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS equipment_requisitions (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      requisition_code TEXT UNIQUE,
      equipment_category_id TEXT,
      requested_equipment_name TEXT,
      purpose TEXT,
      requested_quantity INTEGER DEFAULT 1,
      estimated_budget REAL DEFAULT 0,
      requester_id TEXT,
      request_date TEXT,
      approval_status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_date TEXT,
      supplier_id TEXT,
      purchase_order_id TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========== PAYMENTS TABLE ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      order_id TEXT,
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'VND',
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      transaction_id TEXT,
      description TEXT,
      customer_name TEXT,
      customer_email TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========== AUTOMATION TABLES ==========
  // Automation rules for IoT devices
  db.run(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      name TEXT NOT NULL,
      name_vi TEXT,
      description TEXT,
      type TEXT DEFAULT 'static',
      trigger_type TEXT,
      trigger_condition TEXT,
      action TEXT,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 0,
      last_triggered TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // IoT devices
  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      device_code TEXT UNIQUE,
      name TEXT NOT NULL,
      name_vi TEXT,
      device_type TEXT,
      location TEXT,
      status TEXT DEFAULT 'offline',
      last_seen TEXT,
      ip_address TEXT,
      mac_address TEXT,
      firmware_version TEXT,
      battery_level REAL,
      signal_strength INTEGER,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Automation schedules
  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      schedule_code TEXT UNIQUE,
      name TEXT NOT NULL,
      name_vi TEXT,
      schedule_type TEXT,
      device_id TEXT,
      action TEXT,
      cron_expression TEXT,
      interval_minutes INTEGER,
      next_run TEXT,
      last_run TEXT,
      enabled INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ========== FINANCIAL MANAGEMENT TABLES ==========
  // 5S: Sort, Set in Order, Shine, Standardize, Sustain
  // PDCA: Plan, Do, Check, Act

  // Income/Revenue transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_income (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      income_code TEXT UNIQUE,
      income_type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'VND',
      transaction_date TEXT NOT NULL,
      crop_id TEXT,
      season_id TEXT,
      description TEXT,
      customer_id TEXT,
      payment_method TEXT,
      reference_number TEXT,
      status TEXT DEFAULT 'received',
      attachments TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Expense transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_expenses (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      expense_code TEXT UNIQUE,
      expense_type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'VND',
      transaction_date TEXT NOT NULL,
      crop_id TEXT,
      season_id TEXT,
      equipment_id TEXT,
      worker_id TEXT,
      supplier_id TEXT,
      description TEXT,
      payment_method TEXT,
      reference_number TEXT,
      tax_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'paid',
      attachments TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Profit/Loss tracking by crop/season
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_profit_loss (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      period_type TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      crop_id TEXT,
      season_id TEXT,
      area_id TEXT,
      total_income REAL DEFAULT 0,
      total_expenses REAL DEFAULT 0,
      gross_profit REAL DEFAULT 0,
      net_profit REAL DEFAULT 0,
      profit_margin REAL DEFAULT 0,
      yield_per_hectare REAL DEFAULT 0,
      cost_per_kg REAL DEFAULT 0,
      revenue_per_hectare REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cash flow forecasting
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_cashflow_forecast (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      forecast_type TEXT NOT NULL,
      forecast_date TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      expected_income REAL DEFAULT 0,
      expected_expense REAL DEFAULT 0,
      expected_balance REAL DEFAULT 0,
      actual_income REAL DEFAULT 0,
      actual_expense REAL DEFAULT 0,
      actual_balance REAL DEFAULT 0,
      variance REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Budget planning
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_budgets (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      budget_code TEXT UNIQUE,
      budget_name TEXT NOT NULL,
      budget_type TEXT NOT NULL,
      total_amount REAL NOT NULL,
      allocated_amount REAL DEFAULT 0,
      spent_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      crop_id TEXT,
      season_id TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Budget line items
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_budget_items (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      budget_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      planned_amount REAL NOT NULL,
      actual_amount REAL DEFAULT 0,
      variance REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bank accounts and wallets
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_accounts (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      account_code TEXT UNIQUE,
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      bank_name TEXT,
      account_number TEXT,
      current_balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'VND',
      is_primary BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Loans and debts
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_loans (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      loan_code TEXT UNIQUE,
      loan_type TEXT NOT NULL,
      lender TEXT NOT NULL,
      principal_amount REAL NOT NULL,
      interest_rate REAL DEFAULT 0,
      term_months INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      monthly_payment REAL DEFAULT 0,
      collateral TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Loan payments
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_loan_payments (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      loan_id TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      payment_amount REAL NOT NULL,
      principal_paid REAL DEFAULT 0,
      interest_paid REAL DEFAULT 0,
      remaining_balance REAL DEFAULT 0,
      reference_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assets tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_assets (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      asset_code TEXT UNIQUE,
      asset_name TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      purchase_date TEXT,
      purchase_price REAL DEFAULT 0,
      current_value REAL DEFAULT 0,
      depreciation_rate REAL DEFAULT 0,
      useful_life_years INTEGER,
      location TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tax tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_taxes (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      tax_type TEXT NOT NULL,
      period TEXT NOT NULL,
      tax_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      due_date TEXT,
      payment_date TEXT,
      status TEXT DEFAULT 'pending',
      tax_code TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Financial reports
  db.run(`
    CREATE TABLE IF NOT EXISTS finance_reports (
      id TEXT PRIMARY KEY,
      farm_id TEXT,
      report_type TEXT NOT NULL,
      report_name TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      report_data TEXT,
      generated_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.info('Financial management tables created');
  logger.info('Equipment management tables created');
  logger.info('Database tables created');
}

function seedCropData() {
  // Skipped - to be re-enabled later
}

function seedAquacultureData() {
  // Skipped - to be re-enabled later
}

function seedInitialData() {
  if (!db) return;
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  try {
    db.run('INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      ['usr_admin', 'admin@ecosyntech.com', hashedPassword, 'Administrator', 'admin']);
  } catch(e) {}
  
  try { seedInventoryData(); } catch(e) { logger.warn('[Seed] Inventory: ' + e.message); }
  try { seedEquipmentData(); } catch(e) { logger.warn('[Seed] Equipment: ' + e.message); }
  try { seedLaborData(); } catch(e) { logger.warn('[Seed] Labor: ' + e.message); }
  try { seedCropsData(); } catch(e) { logger.warn('[Seed] Crops: ' + e.message); }
  try { seedOrdersData(); } catch(e) { logger.warn('[Seed] Orders: ' + e.message); }
  try { seedPaymentsData(); } catch(e) { logger.warn('[Seed] Payments: ' + e.message); }
  try { seedAutomationData(); } catch(e) { logger.warn('[Seed] Automation: ' + e.message); }
  
  logger.info('[DB] Seed data initialized for all modules');
}

function seedInventoryData() {
  const items = [
    { id: 'inv_001', item_name: 'Hạt giống lúa IR42', category: 'seed', current_stock: 500, unit: 'kg', farm_id: 'farm_001' },
    { id: 'inv_002', item_name: 'Phân NPK 16-16-8', category: 'fertilizer', current_stock: 200, unit: 'kg', farm_id: 'farm_001' },
    { id: 'inv_003', item_name: 'Thuốc trừ sâu Striker', category: 'pesticide', current_stock: 50, unit: 'lit', farm_id: 'farm_001' },
    { id: 'inv_004', item_name: 'Dầu DO', category: 'fuel', current_stock: 1000, unit: 'lit', farm_id: 'farm_001' },
    { id: 'inv_005', item_name: 'Máy bơm nước', category: 'tool', current_stock: 5, unit: 'chiếc', farm_id: 'farm_001' },
  ];
  
  for (const item of items) {
    db.run('INSERT OR IGNORE INTO inventory_items (id, item_name, category, current_stock, unit, farm_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [item.id, item.item_name, item.category, item.current_stock, item.unit, item.farm_id, 'active']);
  }
}

function seedEquipmentData() {
  const equipment = [
    { id: 'eq_001', equipment_name: 'Máy kéo Kubota', equipment_type: 'tractor', status: 'active', farm_id: 'farm_001' },
    { id: 'eq_002', equipment_name: 'Máy bơm nước 5HP', equipment_type: 'pump', status: 'active', farm_id: 'farm_001' },
    { id: 'eq_003', equipment_name: 'Cảm biến độ ẩm đất', equipment_type: 'sensor', status: 'active', farm_id: 'farm_001' },
    { id: 'eq_004', equipment_name: 'Hệ thống tưới phun', equipment_type: 'irrigation', status: 'active', farm_id: 'farm_001' },
    { id: 'eq_005', equipment_name: 'Máy thu hoạch', equipment_type: 'harvester', status: 'maintenance', farm_id: 'farm_001' },
  ];
  
  for (const eq of equipment) {
    try {
      db.run('INSERT OR IGNORE INTO equipment_inventory (id, equipment_name, equipment_type, status, farm_id, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
        [eq.id, eq.equipment_name, eq.equipment_type, eq.status, eq.farm_id]);
    } catch(e) { logger.warn('[Seed] Equipment: ' + e.message); }
  }
}

function seedLaborData() {
  const workers = [
    { id: 'wrk_001', worker_name: 'Nguyễn Văn A', position: 'manager', farm_id: 'farm_001' },
    { id: 'wrk_002', worker_name: 'Trần Thị B', position: 'worker', farm_id: 'farm_001' },
    { id: 'wrk_003', worker_name: 'Lê Văn C', position: 'technician', farm_id: 'farm_001' },
    { id: 'wrk_004', worker_name: 'Phạm Thị D', position: 'worker', farm_id: 'farm_001' },
  ];
  
  for (const w of workers) {
    try {
      db.run('INSERT OR IGNORE INTO workers (id, worker_name, position, status, farm_id, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
        [w.id, w.worker_name, w.position, 'active', w.farm_id]);
    } catch(e) {}
  }
}

function seedCropsData() {
  const crops = [
    { id: 'crop_001', crop_name: 'Lúa IR42', variety: 'IR42', area_hectares: 10, status: 'growing', farm_id: 'farm_001' },
    { id: 'crop_002', crop_name: 'Lúa ST24', variety: 'ST24', area_hectares: 5, status: 'seedling', farm_id: 'farm_001' },
    { id: 'crop_003', crop_name: 'Rau muống', variety: 'Local', area_hectares: 2, status: 'harvesting', farm_id: 'farm_001' },
    { id: 'crop_004', crop_name: 'Cà chua', variety: 'Cherry', area_hectares: 1, status: 'growing', farm_id: 'farm_001' },
  ];
  
  for (const c of crops) {
    try {
      db.run('INSERT OR IGNORE INTO crops (id, crop_name, variety, area_hectares, status, farm_id, planted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
        [c.id, c.crop_name, c.variety, c.area_hectares, c.status, c.farm_id]);
    } catch(e) {}
  }
}

function seedOrdersData() {
  const orders = [
    { id: 'ord_001', customer_name: 'Công ty ABC', total_amount: 50000000, status: 'completed', farm_id: 'farm_001' },
    { id: 'ord_002', customer_name: 'Siêu thị XYZ', total_amount: 30000000, status: 'completed', farm_id: 'farm_001' },
    { id: 'ord_003', customer_name: 'Nhà hàng 5 sao', total_amount: 15000000, status: 'pending', farm_id: 'farm_001' },
  ];
  
  for (const o of orders) {
    try {
      db.run('INSERT OR IGNORE INTO orders (id, customer_name, total_amount, status, farm_id, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
        [o.id, o.customer_name, o.total_amount, o.status, o.farm_id]);
    } catch(e) {}
  }
}

function seedPaymentsData() {
  const payments = [
    { id: 'pay_001', amount: 50000000, status: 'completed', farm_id: 'farm_001' },
    { id: 'pay_002', amount: 30000000, status: 'completed', farm_id: 'farm_001' },
    { id: 'pay_003', amount: 15000000, status: 'pending', farm_id: 'farm_001' },
    { id: 'pay_004', amount: 2000000, status: 'failed', farm_id: 'farm_001' },
  ];
  
  for (const p of payments) {
    try {
      db.run('INSERT OR IGNORE INTO payments (id, amount, status, farm_id, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [p.id, p.amount, p.status, p.farm_id]);
    } catch(e) {}
  }
}

function seedAutomationData() {
  const rules = [
    { id: 'rule_001', name: 'Tưới nước tự động', name_vi: 'Tưới nước tự động', description: 'Tưới nước khi độ ẩm thấp', type: 'sensor', trigger_condition: 'soil_moisture < 30', action: 'start_pump', enabled: 1, farm_id: 'farm_001' },
    { id: 'rule_002', name: 'Báo động nhiệt độ cao', name_vi: 'Cảnh báo nhiệt độ', description: 'Gửi cảnh báo khi nhiệt độ cao', type: 'sensor', trigger_condition: 'temperature > 35', action: 'send_alert', enabled: 1, farm_id: 'farm_001' },
    { id: 'rule_003', name: 'Tắt máy khi không dùng', name_vi: 'Tắt máy tiết kiệm', description: 'Tắt máy sau 2 giờ không sử dụng', type: 'timer', trigger_condition: 'idle > 2hours', action: 'stop_engine', enabled: 0, farm_id: 'farm_001' },
  ];
  
  for (const r of rules) {
    try {
      db.run('INSERT OR IGNORE INTO rules (id, name, name_vi, description, type, trigger_condition, action, enabled, farm_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
        [r.id, r.name, r.name_vi, r.description, r.type, r.trigger_condition, r.action, r.enabled, r.farm_id]);
    } catch(e) {}
  }

  const devices = [
    { id: 'dev_001', device_code: 'IOT-001', name: 'Cảm biến độ ẩm đất 1', name_vi: 'Cảm biến độ ẩm đất 1', device_type: 'sensor', location: 'Vườn A1', status: 'online', farm_id: 'farm_001' },
    { id: 'dev_002', device_code: 'IOT-002', name: 'Cảm biến nhiệt độ 1', name_vi: 'Cảm biến nhiệt độ 1', device_type: 'sensor', location: 'Vườn A1', status: 'online', farm_id: 'farm_001' },
    { id: 'dev_003', device_code: 'IOT-003', name: 'Bơm nước tự động', name_vi: 'Bơm nước tự động', device_type: 'actuator', location: 'Hồ nước', status: 'online', farm_id: 'farm_001' },
    { id: 'dev_004', device_code: 'IOT-004', name: 'Camera giám sát', name_vi: 'Camera giám sát', device_type: 'camera', status: 'offline', farm_id: 'farm_001' },
  ];

  for (const d of devices) {
    try {
      db.run('INSERT OR IGNORE INTO devices (id, device_code, name, name_vi, device_type, location, status, farm_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
        [d.id, d.device_code, d.name, d.name_vi, d.device_type, d.location, d.status, d.farm_id]);
    } catch(e) {}
  }

  const schedules = [
    { id: 'sch_001', schedule_code: 'SCH-001', name: 'Tưới nước buổi sáng', name_vi: 'Tưới nước buổi sáng', schedule_type: 'daily', device_id: 'dev_003', action: 'start_pump', cron_expression: '0 6 * * *', next_run: '2025-05-01 06:00:00', enabled: 1, farm_id: 'farm_001' },
    { id: 'sch_002', schedule_code: 'SCH-002', name: 'Tưới nước buổi chiều', name_vi: 'Tưới nước buổi chiều', schedule_type: 'daily', device_id: 'dev_003', action: 'start_pump', cron_expression: '0 17 * * *', next_run: '2025-04-30 17:00:00', enabled: 1, farm_id: 'farm_001' },
  ];

  for (const s of schedules) {
    try {
      db.run('INSERT OR IGNORE INTO schedules (id, schedule_code, name, name_vi, schedule_type, device_id, action, cron_expression, next_run, enabled, farm_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
        [s.id, s.schedule_code, s.name, s.name_vi, s.schedule_type, s.device_id, s.action, s.cron_expression, s.next_run, s.enabled, s.farm_id]);
    } catch(e) {}
  }
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

function verifyPersistence() {
  try {
    const dbPath = config.database.path;
    if (!fs.existsSync(dbPath)) {
      logger.warn('[DB] Verify: File does not exist');
      return { valid: false, error: 'Database file not found' };
    }
    
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      logger.warn('[DB] Verify: File size is 0');
      return { valid: false, error: 'Database file is empty' };
    }
    
    const fileBuffer = fs.readFileSync(dbPath);
    const testDb = new SQL.Database(fileBuffer);
    const result = testDb.exec('SELECT name FROM sqlite_master WHERE type="table"');
    testDb.close();
    
    logger.info(`[DB] Verify: OK - ${stats.size} bytes, ${result.length} tables`);
    return { valid: true, size: stats.size, tables: result.length };
  } catch (err) {
    logger.error('[DB] Verify: Failed', err.message);
    return { valid: false, error: err.message };
  }
}

function getHealthCheck() {
  try {
    const dbPath = config.database.path;
    if (!fs.existsSync(dbPath)) {
      return { status: 'DOWN', reason: 'Database file not found' };
    }
    
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      return { status: 'DOWN', reason: 'Database file is empty' };
    }
    
    const tables = db.exec('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
    const rowCount = db.exec('SELECT COUNT(*) as count FROM users');
    
    return {
      status: 'UP',
      size: stats.size,
      tables: tables[0]?.values[0]?.[0] || 0,
      lastModified: stats.mtime
    };
  } catch (err) {
    return { status: 'DOWN', reason: err.message };
  }
}

process.on('SIGTERM', () => {
  logger.info('[DB] SIGTERM received - force saving database');
  saveDatabaseSync();
});

process.on('SIGINT', () => {
  logger.info('[DB] SIGINT received - force saving database');
  saveDatabaseSync();
});

function logDeviceAction(deviceId, actionType, triggeredBy, ruleId, result) {
  const id = require('uuid').v4();
  try {
    runQuery(
      `INSERT INTO device_action_log (id, device_id, action_type, triggered_by, rule_id, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, deviceId, actionType, triggeredBy, ruleId, JSON.stringify(result || {})]
    );
    return { success: true, id };
  } catch (err) {
    logger.error('[DB] Failed to log device action:', err.message);
    return { success: false, error: err.message };
  }
}

function getLastDeviceAction(deviceId, actionType) {
  try {
    const result = getOne(
      `SELECT * FROM device_action_log 
       WHERE device_id = ? AND action_type = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [deviceId, actionType]
    );
    return result;
  } catch (err) {
    logger.debug('[DB] getLastDeviceAction:', err.message);
    return null;
  }
}

function checkDeviceCooldown(deviceId, actionType, minIntervalMinutes = 5) {
  const lastAction = getLastDeviceAction(deviceId, actionType);
  if (!lastAction) {
    return { allowed: true, reason: 'No previous action' };
  }
  
  const lastTime = new Date(lastAction.created_at);
  const now = new Date();
  const diffMs = now - lastTime;
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes < minIntervalMinutes) {
    return { 
      allowed: false, 
      reason: `Device ${actionType} blocked - ${Math.round(minIntervalMinutes - diffMinutes)} min remaining`,
      lastAction: lastAction.created_at
    };
  }
  
  return { allowed: true, reason: 'Cooldown passed' };
}

function saveRefreshToken(userId, token, ip, userAgent, expiresInDays = 7) {
  const id = require('uuid').v4();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  
  runQuery(
    `INSERT INTO refresh_tokens (id, user_id, token, ip, user_agent, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, userId, token, ip || '', userAgent || '', expiresAt]
  );
  
  cleanupOldRefreshTokens(userId);
}

function verifyRefreshToken(userId, token) {
  const result = getOne(
    `SELECT * FROM refresh_tokens 
     WHERE user_id = ? AND token = ? AND revoked = 0 AND expires_at > datetime('now')
     LIMIT 1`,
    [userId, token]
  );
  return result !== null;
}

function rotateRefreshToken(userId, oldToken, newToken, ip, userAgent) {
  const current = getOne(
    'SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ? AND revoked = 0',
    [userId, oldToken]
  );
  
  if (!current || current.rotation_count >= 5) {
    return null;
  }
  
  runQuery(
    'UPDATE refresh_tokens SET rotated_at = datetime(\'now\'), rotation_count = rotation_count + 1 WHERE id = ?',
    [current.id]
  );
  
  const id = require('uuid').v4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  runQuery(
    `INSERT INTO refresh_tokens (id, user_id, token, ip, user_agent, expires_at, rotation_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    [id, userId, newToken, ip || '', userAgent || '', expiresAt]
  );
  
  return newToken;
}

function revokeRefreshToken(userId, token) {
  runQuery(
    'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND token = ?',
    [userId, token]
  );
}

function revokeAllUserRefreshTokens(userId) {
  runQuery('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId]);
}

function cleanupOldRefreshTokens(userId) {
  runQuery(
    'DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < datetime(\'now\')',
    [userId]
  );
  
  const count = getOne(
    'SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ? AND revoked = 0',
    [userId]
  );
  
  if (count?.count > 10) {
    const oldTokens = getAll(
      'SELECT id FROM refresh_tokens WHERE user_id = ? AND revoked = 0 ORDER BY created_at ASC LIMIT ?',
      [userId, count.count - 10]
    );
    for (const t of oldTokens) {
      runQuery('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [t.id]);
    }
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getOne,
  getAll,
  saveDatabase,
  saveDatabaseSync,
  createIndexes,
  optimizeDatabase,
  verifyPersistence,
  getHealthCheck,
  logDeviceAction,
  getLastDeviceAction,
  checkDeviceCooldown,
  saveRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens
};
