const Joi = require('joi');

const schemas = {
  deviceId: Joi.object({
    id: Joi.string().required()
  }),

  deviceConfig: Joi.object({
    name: Joi.string().min(1).max(100),
    type: Joi.string().valid('sensor', 'valve', 'pump', 'fan', 'light', 'gateway'),
    zone: Joi.string().valid('zone1', 'zone2', 'zone3', 'zone4', 'zone5', 'all'),
    config: Joi.object(),
    enabled: Joi.boolean(),
    thresholdLow: Joi.number(),
    thresholdCritical: Joi.number(),
    reportInterval: Joi.number().min(30).max(3600)
  }),

  command: Joi.object({
    command: Joi.string().required().valid('start', 'stop', 'configure', 'restart', 'calibrate', 'refresh'),
    params: Joi.object()
  }),

  rule: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500),
    enabled: Joi.boolean().default(true),
    condition: Joi.object({
      sensor: Joi.string().valid('soil', 'temperature', 'humidity', 'light', 'ph', 'water', 'co2', 'ec', 'time').required(),
      operator: Joi.string().valid('<', '>', '<=', '>=', '==').required(),
      value: Joi.alternatives().try(Joi.number(), Joi.string()).required()
    }).required(),
    action: Joi.object({
      type: Joi.string().valid('valve_open', 'valve_close', 'pump_start', 'pump_stop', 'fan_on', 'fan_off', 'light_on', 'light_off', 'alert').required(),
      target: Joi.string().required(),
      delayMinutes: Joi.number().min(0).max(60).default(0)
    }).required(),
    cooldownMinutes: Joi.number().min(1).max(1440).default(30)
  }),

  schedule: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    duration: Joi.number().min(5).max(240).default(60),
    zones: Joi.array().items(Joi.string().valid('zone1', 'zone2', 'zone3', 'zone4', 'zone5', 'all')).min(1).default(['all']),
    enabled: Joi.boolean().default(true),
    days: Joi.array().items(Joi.string().valid('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')).min(1).default(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  }),

  webhook: Joi.object({
    sensor: Joi.string(),
    value: Joi.number(),
    severity: Joi.string().valid('info', 'warning', 'danger'),
    deviceId: Joi.string(),
    status: Joi.string().valid('online', 'offline')
  }),

  sensorUpdate: Joi.object({
    type: Joi.string().valid('soil', 'temperature', 'humidity', 'light', 'ph', 'water', 'co2', 'ec').required(),
    value: Joi.number().required()
  }),

  auth: {
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    }),
    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      name: Joi.string().min(1).max(100).required()
    })
  },

  labor: {
    workerCreate: Joi.object({
      worker_name: Joi.string().min(1).max(100).required(),
      worker_name_vi: Joi.string().max(100),
      identity_number: Joi.string().max(50),
      phone: Joi.string().max(20),
      email: Joi.string().email().max(100),
      address: Joi.string().max(500),
      birth_date: Joi.date().iso(),
      gender: Joi.string().valid('male', 'female', 'other'),
      position: Joi.string().valid('manager', 'supervisor', 'worker', 'technician', 'driver', 'guard'),
      skill_level: Joi.string().valid('junior', 'mid', 'senior', 'expert'),
      hourly_rate: Joi.number().min(0),
      monthly_salary: Joi.number().min(0),
      work_type: Joi.string().valid('daily', 'contract', 'permanent'),
      hire_date: Joi.date().iso(),
      notes: Joi.string().max(1000),
      farm_id: Joi.string()
    }),
    workerUpdate: Joi.object({
      worker_name: Joi.string().min(1).max(100),
      worker_name_vi: Joi.string().max(100),
      identity_number: Joi.string().max(50),
      phone: Joi.string().max(20),
      email: Joi.string().email().max(100),
      address: Joi.string().max(500),
      birth_date: Joi.date().iso(),
      gender: Joi.string().valid('male', 'female', 'other'),
      position: Joi.string().valid('manager', 'supervisor', 'worker', 'technician', 'driver', 'guard'),
      skill_level: Joi.string().valid('junior', 'mid', 'senior', 'expert'),
      hourly_rate: Joi.number().min(0),
      monthly_salary: Joi.number().min(0),
      work_type: Joi.string().valid('daily', 'contract', 'permanent'),
      status: Joi.string().valid('active', 'inactive', 'suspended'),
      hire_date: Joi.date().iso(),
      notes: Joi.string().max(1000)
    }),
    shiftCreate: Joi.object({
      shift_name: Joi.string().min(1).max(100).required(),
      shift_code: Joi.string().max(50),
      start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      break_duration: Joi.number().min(0).max(180),
      workday_mask: Joi.string().pattern(/^[0-1]{7}$/),
      is_night_shift: Joi.boolean(),
      notes: Joi.string().max(500),
      farm_id: Joi.string()
    }),
    attendanceCheckIn: Joi.object({
      worker_id: Joi.string().required(),
      shift_id: Joi.string(),
      location_in: Joi.string().max(200),
      notes: Joi.string().max(500)
    }),
    attendanceCheckOut: Joi.object({
      worker_id: Joi.string().required(),
      break_start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      break_end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      location_out: Joi.string().max(200),
      notes: Joi.string().max(500)
    }),
    taskCreate: Joi.object({
      task_name: Joi.string().min(1).max(200).required(),
      task_code: Joi.string().max(50),
      task_type: Joi.string().valid('planting', 'fertilizing', 'spraying', 'harvesting', 'pruning', 'irrigation', 'feeding', 'cleaning', 'repair', 'monitoring'),
      description: Joi.string().max(1000),
      area_id: Joi.string(),
      crop_id: Joi.string(),
      estimated_hours: Joi.number().min(0).max(1000),
      required_workers: Joi.number().min(1).max(100),
      priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
      scheduled_date: Joi.date().iso(),
      start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      assigned_workers: Joi.array().items(Joi.string()),
      notes: Joi.string().max(1000),
      farm_id: Joi.string()
    }),
    taskAssign: Joi.object({
      worker_ids: Joi.array().items(Joi.string()).min(1).required()
    }),
    taskComplete: Joi.object({
      worker_id: Joi.string(),
      hours_worked: Joi.number().min(0).max(24),
      productivity_score: Joi.number().min(0).max(100),
      notes: Joi.string().max(500)
    }),
    payrollCreate: Joi.object({
      worker_id: Joi.string().required(),
      period_type: Joi.string().valid('daily', 'weekly', 'monthly'),
      period_start: Joi.date().iso().required(),
      period_end: Joi.date().iso().required(),
      bonuses: Joi.number().min(0),
      deductions: Joi.number().min(0),
      notes: Joi.string().max(500)
    }),
    performanceCreate: Joi.object({
      worker_id: Joi.string().required(),
      evaluation_date: Joi.date().iso().required(),
      task_id: Joi.string(),
      score: Joi.number().min(0).max(100).required(),
      comments: Joi.string().max(1000),
      evaluator: Joi.string().max(100)
    }),

    // Equipment Management Schemas
    equipment: {
      categoryCreate: Joi.object({
        category_name: Joi.string().min(1).max(100).required(),
        category_name_vi: Joi.string().max(100),
        category_code: Joi.string().max(50),
        category_type: Joi.string().valid('vehicle', 'machine', 'power', 'tools', 'iot').required(),
        parent_category_id: Joi.string(),
        description: Joi.string().max(500),
        icon: Joi.string().max(50),
        farm_id: Joi.string()
      }),
      create: Joi.object({
        equipment_name: Joi.string().min(1).max(200).required(),
        equipment_name_vi: Joi.string().max(200),
        equipment_code: Joi.string().max(50),
        category_id: Joi.string(),
        brand: Joi.string().max(100),
        model: Joi.string().max(100),
        serial_number: Joi.string().max(100),
        purchase_date: Joi.date().iso(),
        purchase_price: Joi.number().min(0),
        useful_life_years: Joi.number().min(1).max(20),
        salvage_value: Joi.number().min(0),
        location: Joi.string().max(200),
        year_of_manufacture: Joi.string().max(4),
        warranty_expiry: Joi.date().iso(),
        fuel_type: Joi.string().max(50),
        capacity: Joi.string().max(100),
        power_rating: Joi.string().max(100),
        image_url: Joi.string().uri(),
        notes: Joi.string().max(1000),
        farm_id: Joi.string()
      }),
      update: Joi.object({
        equipment_name: Joi.string().min(1).max(200),
        equipment_name_vi: Joi.string().max(200),
        category_id: Joi.string(),
        brand: Joi.string().max(100),
        model: Joi.string().max(100),
        serial_number: Joi.string().max(100),
        location: Joi.string().max(200),
        status: Joi.string().valid('active', 'under_maintenance', 'broken', 'retired', 'available', 'in_use'),
        condition: Joi.string().valid('good', 'fair', 'poor', 'critical'),
        fuel_type: Joi.string().max(50),
        capacity: Joi.string().max(100),
        power_rating: Joi.string().max(100),
        current_value: Joi.number().min(0),
        notes: Joi.string().max(1000)
      }),
      maintenanceSchedule: Joi.object({
        equipment_id: Joi.string().required(),
        maintenance_type: Joi.string().valid('preventive', 'corrective', 'predictive', 'inspection', 'oil_change', 'calibration').required(),
        description: Joi.string().max(500),
        frequency_days: Joi.number().min(1).max(365),
        last_maintenance_date: Joi.date().iso(),
        next_maintenance_date: Joi.date().iso(),
        estimated_hours: Joi.number().min(0),
        estimated_cost: Joi.number().min(0),
        priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
        assigned_technician_id: Joi.string(),
        auto_trigger: Joi.boolean(),
        notes: Joi.string().max(500),
        farm_id: Joi.string()
      }),
      maintenanceRecord: Joi.object({
        equipment_id: Joi.string().required(),
        schedule_id: Joi.string(),
        maintenance_type: Joi.string().valid('preventive', 'corrective', 'predictive', 'inspection', 'oil_change', 'calibration').required(),
        maintenance_date: Joi.date().iso(),
        technician_id: Joi.string(),
        description: Joi.string().max(500),
        work_performed: Joi.string().max(1000),
        parts_replaced: Joi.string().max(500),
        labor_hours: Joi.number().min(0).max(24),
        labor_cost: Joi.number().min(0),
        parts_cost: Joi.number().min(0),
        next_maintenance_date: Joi.date().iso(),
        condition: Joi.string().valid('good', 'fair', 'poor'),
        attachments: Joi.string().max(500),
        notes: Joi.string().max(500),
        farm_id: Joi.string()
      }),
      usageLog: Joi.object({
        equipment_id: Joi.string().required(),
        worker_id: Joi.string(),
        task_id: Joi.string(),
        crop_id: Joi.string(),
        start_time: Joi.date().iso().required(),
        end_time: Joi.date().iso(),
        operation_type: Joi.string().max(100),
        location_area: Joi.string().max(200),
        fuel_consumed: Joi.number().min(0),
        distance_km: Joi.number().min(0),
        notes: Joi.string().max(500),
        farm_id: Joi.string()
      }),
      assignment: Joi.object({
        equipment_id: Joi.string().required(),
        worker_id: Joi.string(),
        crop_id: Joi.string(),
        area_id: Joi.string(),
        assigned_date: Joi.date().iso(),
        purpose: Joi.string().max(500),
        notes: Joi.string().max(500),
        farm_id: Joi.string()
      }),
      costTracking: Joi.object({
        equipment_id: Joi.string().required(),
        cost_type: Joi.string().valid('operation', 'maintenance', 'fuel', 'depreciation', 'insurance', 'other').required(),
        period_start: Joi.date().iso().required(),
        period_end: Joi.date().iso().required(),
        fuel_cost: Joi.number().min(0),
        maintenance_cost: Joi.number().min(0),
        labor_cost: Joi.number().min(0),
        parts_cost: Joi.number().min(0),
        depreciation_cost: Joi.number().min(0),
        insurance_cost: Joi.number().min(0),
        other_cost: Joi.number().min(0),
        notes: Joi.string().max(500),
        farm_id: Joi.string()
      })
    }
  },

  // ========== AUTH SCHEMAS ==========
  auth: {
    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      name: Joi.string().min(1).max(100).required()
    }),
    login: Joi.object({
      email: Joi.string().required(),
      password: Joi.string().required()
    })
  }
};

// Helper to support dotted schema paths like 'auth.login' or 'auth.register'
function getSchemaFromPath(pathName) {
  const parts = pathName.split('.');
  let current = schemas;
  for (const p of parts) {
    if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, p)) {
      current = current[p];
    } else {
      return null;
    }
  }
  return current;
}

function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { valid: false, errors };
  }
  return { valid: true, value };
}

function validateMiddleware(schemaName) {
  return (req, res, next) => {
    const schema = getSchemaFromPath(schemaName);
    if (!schema) {
      return res.status(500).json({ ok: false, error: 'Invalid validation schema' });
    }

    const result = validate(schema, req.method === 'GET' ? req.query : req.body);
    if (!result.valid) {
      return res.status(400).json({ ok: false, error: 'Validation failed', details: result.errors });
    }

    if (req.method === 'GET') {
      req.validatedQuery = result.value;
    } else {
      req.validatedBody = result.value;
    }
    next();
  };
}

// ========== FINANCE SCHEMAS ==========
schemas.finance = {
  income: Joi.object({
    income_type: Joi.string().valid('crop_sale', 'product_sale', 'service_income', 'subsidy', 'other_income'),
    category: Joi.string(),
    amount: Joi.number().min(0),
    currency: Joi.string().default('VND'),
    transaction_date: Joi.date().iso(),
    crop_id: Joi.string(),
    season_id: Joi.string(),
    description: Joi.string().max(500),
    customer_id: Joi.string(),
    payment_method: Joi.string().max(50),
    reference_number: Joi.string().max(100),
    status: Joi.string().valid('pending', 'received', 'cancelled'),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  expense: Joi.object({
    expense_type: Joi.string(),
    category: Joi.string(),
    amount: Joi.number().min(0),
    currency: Joi.string().default('VND'),
    transaction_date: Joi.date().iso(),
    crop_id: Joi.string(),
    season_id: Joi.string(),
    equipment_id: Joi.string(),
    worker_id: Joi.string(),
    supplier_id: Joi.string(),
    description: Joi.string().max(500),
    payment_method: Joi.string().max(50),
    reference_number: Joi.string().max(100),
    tax_amount: Joi.number().min(0),
    status: Joi.string().valid('pending', 'paid', 'cancelled'),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  budget: Joi.object({
    budget_name: Joi.string().min(1).max(200).required(),
    budget_type: Joi.string().valid('annual', 'seasonal', 'project').required(),
    total_amount: Joi.number().min(0).required(),
    period_start: Joi.date().iso().required(),
    period_end: Joi.date().iso().required(),
    crop_id: Joi.string(),
    season_id: Joi.string(),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  account: Joi.object({
    account_name: Joi.string().min(1).max(200).required(),
    account_type: Joi.string().valid('bank', 'cash', 'mobile_money', 'other').required(),
    bank_name: Joi.string().max(100),
    account_number: Joi.string().max(50),
    current_balance: Joi.number().min(0),
    currency: Joi.string().default('VND'),
    is_primary: Joi.boolean(),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  loan: Joi.object({
    loan_type: Joi.string().valid('bank', 'supplier', 'individual', 'government').required(),
    lender: Joi.string().min(1).max(200).required(),
    principal_amount: Joi.number().min(0).required(),
    interest_rate: Joi.number().min(0).max(100),
    term_months: Joi.number().min(1).max(360),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso(),
    collateral: Joi.string().max(500),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  loanPayment: Joi.object({
    payment_amount: Joi.number().min(0).required(),
    payment_date: Joi.date().iso(),
    reference_number: Joi.string().max(100),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  asset: Joi.object({
    asset_name: Joi.string().min(1).max(200).required(),
    asset_type: Joi.string().valid('equipment', 'land', 'building', 'vehicle', 'other').required(),
    purchase_date: Joi.date().iso(),
    purchase_price: Joi.number().min(0),
    depreciation_rate: Joi.number().min(0).max(100),
    useful_life_years: Joi.number().min(1).max(50),
    location: Joi.string().max(200),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  tax: Joi.object({
    tax_type: Joi.string().valid('income_tax', 'vat', 'land_tax', 'other').required(),
    period: Joi.string().required(),
    tax_amount: Joi.number().min(0),
    due_date: Joi.date().iso(),
    tax_code: Joi.string().max(50),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  }),
  cashflow: Joi.object({
    forecast_type: Joi.string().valid('daily', 'weekly', 'monthly').required(),
    forecast_date: Joi.date().iso(),
    period_start: Joi.date().iso().required(),
    period_end: Joi.date().iso().required(),
    expected_income: Joi.number().min(0),
    expected_expense: Joi.number().min(0),
    notes: Joi.string().max(500),
    farm_id: Joi.string()
  })
};

module.exports = {
  schemas,
  validate,
  validateMiddleware
};
