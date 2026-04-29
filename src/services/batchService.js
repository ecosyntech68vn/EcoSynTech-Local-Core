/**
 * Batch Service - Tích hợp truy xuất nguồn gốc với cây trồng và thủy sản
 * V5.1.0 - Kết nối dữ liệu gieo trồng/nuôi nấng với traceability và supply chain
 * 
 * Features:
 * - Tự động tạo traceability batch khi khởi động vụ mới
 * - Đồng bộ dữ liệu timeline từ crop/aquaculture sang traceability
 * - Liên kết với supply chain khi thu hoạch
 * - Tạo QR code với dữ liệu đầy đủ từ chu kỳ nuôi trồng
 */

const { v4: uuidv4 } = require('uuid');
const { getOne, getAll, db, runQuery } = require('../config/database');
const logger = require('../config/logger');

const PRODUCT_TYPES = {
  vegetable: { label: 'Rau củ', icon: '🥬' },
  fruit: { label: 'Trái cây', icon: '🍎' },
  herb: { label: 'Thảo dược', icon: '🌿' },
  grain: { label: 'Ngũ cốc', icon: '🌾' },
  aquaculture: { label: 'Thủy sản', icon: '🐟' },
  livestock: { label: 'Chăn nuôi', icon: '🐄' }
};

const STAGE_TYPES = {
  preparation: { label: 'Chuẩn bị', order: 1 },
  seeding: { label: 'Gieo hạt/Con giống', order: 2 },
  nursing: { label: 'Nuôi ươm/Cây con', order: 3 },
  growing: { label: 'Sinh trưởng', order: 4 },
  flowering: { label: 'Ra hoa/Phát triển', order: 5 },
  fruiting: { label: 'Kết quả/Nuôi trưởng', order: 6 },
  harvesting: { label: 'Thu hoạch', order: 7 },
  processing: { label: 'Chế biến', order: 8 },
  packaging: { label: 'Đóng gói', order: 9 },
  storage: { label: 'Lưu trữ', order: 10 },
  transport: { label: 'Vận chuyển', order: 11 }
};

function createBatchFromPlanting(plantingId) {
  const planting = getOne(`
    SELECT cp.*, c.name as crop_name, c.name_vi, c.category, c.kc_initial, c.kc_mid, c.kc_end
    FROM crop_plantings cp 
    LEFT JOIN crops c ON cp.crop_id = c.id
    WHERE cp.id = ?
  `, [plantingId]);

  if (!planting) {
    throw new Error('Không tìm thấy lô trồng');
  }

  const existingBatch = getOne(
    'SELECT id FROM traceability_batches WHERE source_planting_id = ?',
    [plantingId]
  );

  if (existingBatch) {
    return { existing: true, batch_id: existingBatch.id };
  }

  const batchCode = generateBatchCode(planting.crop_name || 'CROP');
  const batchId = uuidv4();
  const now = new Date().toISOString();

  const productType = mapCategoryToProductType(planting.category);

  db.run(`
    INSERT INTO traceability_batches (
      id, batch_code, product_name, product_type, quantity, unit,
      farm_name, zone, seed_variety, planting_date, expected_harvest,
      status, metadata, source_type, source_planting_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    batchId, batchCode, planting.crop_name_vi || planting.crop_name || 'Cây trồng',
    productType, planting.area || 0, planting.area_unit || 'm2',
    process.env.FARM_NAME || 'EcoSynTech Farm', planting.zone || '',
    planting.crop_name || '', planting.planting_date, planting.expected_harvest_date,
    'active', JSON.stringify({
      crop_id: planting.crop_id,
      category: planting.category,
      kc_initial: planting.kc_initial,
      kc_mid: planting.kc_mid,
      kc_end: planting.kc_end
    }), 'crop', plantingId, now, now
  ]);

  createInitialStages(batchId, 'crop', planting);

  logger.info(`Tạo traceability batch từ lô trồng: ${batchCode}, planting: ${plantingId}`);

  return { batch_id: batchId, batch_code: batchCode };
}

function createBatchFromAquaculture(aquacultureId) {
  const aquaculture = getOne(`
    SELECT a.*, ao.name as species_name, ao.name_vi, ao.category, ao.growth_days
    FROM aquaculture_spawning a
    LEFT JOIN aquaculture ao ON a.species_id = ao.id
    WHERE a.id = ?
  `, [aquacultureId]);

  if (!aquaculture) {
    const aquaDirect = getOne(`
      SELECT * FROM aquaculture WHERE id = ?
    `, [aquacultureId]);
    
    if (!aquaDirect) {
      throw new Error('Không tìm thấy thông tin thủy sản');
    }

    const batchCode = generateBatchCode(aquaDirect.name_vi || 'AQUA');
    const batchId = uuidv4();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO traceability_batches (
        id, batch_code, product_name, product_type, quantity, unit,
        farm_name, zone, seed_variety, planting_date, expected_harvest,
        status, metadata, source_type, source_aquaculture_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batchId, batchCode, aquaDirect.name_vi || aquaDirect.name,
      'aquaculture', 0, 'con',
      process.env.FARM_NAME || 'EcoSynTech Farm', '', aquaDirect.name,
      now.split('T')[0], null,
      'active', JSON.stringify({
        species_id: aquaDirect.id,
        category: aquaDirect.category,
        growth_days: aquaDirect.growth_days
      }), 'aquaculture', aquacultureId, now, now
    ]);

    return { batch_id: batchId, batch_code: batchCode };
  }

  const existingBatch = getOne(
    'SELECT id FROM traceability_batches WHERE source_aquaculture_id = ?',
    [aquacultureId]
  );

  if (existingBatch) {
    return { existing: true, batch_id: existingBatch.id };
  }

  const batchCode = generateBatchCode(aquaculture.species_name || 'AQUA');
  const batchId = uuidv4();
  const now = new Date().toISOString();

  const expectedHarvest = new Date(aquaculture.spawning_date);
  expectedHarvest.setDate(expectedHarvest.getDate() + (aquaculture.growth_days || 90));

  db.run(`
    INSERT INTO traceability_batches (
      id, batch_code, product_name, product_type, quantity, unit,
      farm_name, zone, seed_variety, planting_date, expected_harvest,
      status, metadata, source_type, source_aquaculture_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    batchId, batchCode, aquaculture.name_vi || aquaculture.species_name,
    'aquaculture', aquaculture.quantity || 0, 'con',
    process.env.FARM_NAME || 'EcoSynTech Farm', aquaculture.pond_id || '',
    aquaculture.species_name || '', aquaculture.spawning_date, expectedHarvest.toISOString().split('T')[0],
    'active', JSON.stringify({
      species_id: aquaculture.species_id,
      category: aquaculture.category,
      growth_days: aquaculture.growth_days,
      source_pool: aquaculture.source_pool
    }), 'aquaculture', aquacultureId, now, now
  ]);

  createInitialStages(batchId, 'aquaculture', aquaculture);

  logger.info(`Tạo traceability batch từ thủy sản: ${batchCode}, aquaculture: ${aquacultureId}`);

  return { batch_id: batchId, batch_code: batchCode };
}

function createInitialStages(batchId, sourceType, data) {
  const stages = sourceType === 'crop' 
    ? [
      { name: 'Chuẩn bị đất', type: 'preparation', desc: 'Làm đất, bón phân lót trước gieo trồng' },
      { name: 'Gieo hạt', type: 'seeding', desc: 'Gieo hạt giống theo mật độ phù hợp' },
      { name: 'Chăm sóc cây con', type: 'nursing', desc: 'Tưới nước, bón phân thúc giai đoạn cây con' },
      { name: 'Sinh trưởng', type: 'growing', desc: 'Chăm sóc theo quy trình kỹ thuật' },
      { name: 'Ra hoa - Kết quả', type: 'flowering', desc: 'Chăm sóc giai đoạn ra hoa đậu quả' }
    ]
    : [
      { name: 'Chuẩn bị ao', type: 'preparation', desc: 'Cải tạo ao, xử lý nước trước thả giống' },
      { name: 'Thả giống', type: 'seeding', desc: 'Thả con giống vào ao với mật độ phù hợp' },
      { name: 'Nuôi ươm', type: 'nursing', desc: 'Cho ăn, theo dõi tăng trưởng giai đoạn ươm' },
      { name: 'Nuôi trưởng', type: 'growing', desc: 'Chăm sóc, cho ăn theo quy trình' },
      { name: 'Nuôi thành thục', type: 'fruiting', desc: 'Theo dõi đến khi đạt kích thước thu hoạch' }
    ];

  stages.forEach((stage, index) => {
    const stageId = uuidv4();
    db.run(`
      INSERT INTO traceability_stages (
        id, batch_id, stage_name, stage_type, stage_order, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [stageId, batchId, stage.name, stage.type, index + 1, stage.desc, new Date().toISOString()]);
  });
}

function generateBatchCode(prefix) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix.substring(0, 3).toUpperCase()}-${timestamp}-${random}`;
}

function mapCategoryToProductType(category) {
  const mapping = {
    'rau_xanh': 'vegetable',
    'rau_an_qa': 'vegetable',
    'trai_cay': 'fruit',
    'cay_ăn_qua': 'fruit',
    'thao_duoc': 'herb',
    'cay_thuoc': 'herb',
    'lua': 'grain',
    'ngo': 'grain',
    'dong_kinh': 'grain',
    'thuy_san': 'aquaculture',
    'ca': 'aquaculture',
    'tom': 'aquaculture',
    'cut': 'aquaculture'
  };
  return mapping[category] || 'other';
}

function syncPlantingToTraceability(plantingId) {
  const batch = getOne(
    'SELECT * FROM traceability_batches WHERE source_planting_id = ?',
    [plantingId]
  );

  if (!batch) {
    return createBatchFromPlanting(plantingId);
  }

  const planting = getOne(`
    SELECT cp.*, c.name as crop_name, c.name_vi, c.category
    FROM crop_plantings cp 
    LEFT JOIN crops c ON cp.crop_id = c.id
    WHERE cp.id = ?
  `, [plantingId]);

  if (!planting) return null;

  const currentStage = planting.current_stage || 'gieo_hat';
  const stageInfo = getStageInfo(currentStage);

  const existingStage = getOne(
    'SELECT id FROM traceability_stages WHERE batch_id = ? AND stage_type = ?',
    [batch.id, stageInfo.type]
  );

  if (!existingStage) {
    const maxOrder = getOne(
      'SELECT MAX(stage_order) as max_order FROM traceability_stages WHERE batch_id = ?',
      [batch.id]
    );

    const stageId = uuidv4();
    db.run(`
      INSERT INTO traceability_stages (
        id, batch_id, stage_name, stage_type, stage_order, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [stageId, batch.id, stageInfo.name, stageInfo.type, (maxOrder?.max_order || 0) + 1, stageInfo.desc, new Date().toISOString()]);

    logger.info(`Thêm stage mới cho batch ${batch.batch_code}: ${stageInfo.name}`);
  }

  db.run(`
    UPDATE traceability_batches SET 
      current_stage = ?, 
      updated_at = ? 
    WHERE id = ?
  `, [stageInfo.name, new Date().toISOString(), batch.id]);

  return { batch_id: batch.id, batch_code: batch.batch_code };
}

function getStageInfo(stageCode) {
  const stages = {
    gieo_hat: { name: 'Gieo hạt', type: 'seeding', desc: 'Giai đoạn gieo hạt giống' },
    cay_con: { name: 'Cây con', type: 'nursing', desc: 'Giai đoạn cây con phát triển' },
    sinh_truong: { name: 'Sinh trưởng', type: 'growing', desc: 'Giai đoạn cây sinh trưởng mạnh' },
    ra_hoa: { name: 'Ra hoa', type: 'flowering', desc: 'Giai đoạn ra hoa đậu quả' },
    thu_hoach: { name: 'Thu hoạch', type: 'harvesting', desc: 'Giai đoạn thu hoạch sản phẩm' }
  };
  return stages[stageCode] || { name: 'Sinh trưởng', type: 'growing', desc: 'Giai đoạn sinh trưởng' };
}

function recordHarvest(plantingId, quantity, quality, yieldData) {
  const batch = getOne(
    'SELECT * FROM traceability_batches WHERE source_planting_id = ?',
    [plantingId]
  );

  if (!batch) {
    return { error: 'Không tìm thấy batch truy xuất nguồn gốc' };
  }

  const now = new Date().toISOString();

  db.run(`
    UPDATE traceability_batches SET 
      status = 'harvested',
      harvest_date = ?,
      harvest_quantity = ?,
      harvest_notes = ?,
      metadata = JSON_SET(COALESCE(metadata, '{}'), '$.harvest_quality', ?),
      updated_at = ?
    WHERE id = ?
  `, [now.split('T')[0], quantity, quality || '', quality || '', now, batch.id]);

  const harvestStageId = uuidv4();
  db.run(`
    INSERT INTO traceability_stages (
      id, batch_id, stage_name, stage_type, stage_order, description, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [harvestStageId, batch.id, 'Thu hoạch', 'harvesting', 99, 'Sản phẩm thu hoạch', `Số lượng: ${quantity}, Chất lượng: ${quality}`, now]);

  return { 
    batch_id: batch.id, 
    batch_code: batch.batch_code,
    harvest_date: now 
  };
}

function linkToSupplyChain(batchId, supplyChainData) {
  const batch = getOne('SELECT * FROM traceability_batches WHERE id = ?', [batchId]);
  if (!batch) return { error: 'Không tìm thấy batch' };

  const scId = 'sc-' + Date.now();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO supply_chain (
      id, batch_code, product_name, quantity, unit, 
      source_farm_id, source_traceability_id, destination, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    scId, batch.batch_code, batch.product_name, batch.harvest_quantity || 0,
    batch.unit || 'kg', batch.farm_name || '', batchId, 
    supplyChainData.destination || '', 'pending', now, now
  ]);

  db.run(`
    UPDATE traceability_batches SET 
      status = 'exported',
      export_date = ?,
      buyer_name = ?,
      buyer_contact = ?,
      export_price = ?,
      updated_at = ?
    WHERE id = ?
  `, [now.split('T')[0], supplyChainData.buyer_name || '', supplyChainData.buyer_contact || '', 
    supplyChainData.price || 0, now, batchId]);

  logger.info(`Liên kết batch ${batch.batch_code} với supply chain: ${scId}`);

  return { supply_chain_id: scId, batch_code: batch.batch_code };
}

function getCompleteTraceabilityData(batchCode) {
  const batch = getOne('SELECT * FROM traceability_batches WHERE batch_code = ?', [batchCode]);
  if (!batch) return null;

  const stages = getAll(
    'SELECT * FROM traceability_stages WHERE batch_id = ? ORDER BY stage_order ASC',
    [batch.id]
  );

  let sourceData = null;
  if (batch.source_type === 'crop' && batch.source_planting_id) {
    sourceData = getOne(`
      SELECT cp.*, c.name as crop_name, c.name_vi, c.category, c.kc_mid,
             c.optimal_temp_min, c.optimal_temp_max, c.min_soil_moisture, c.max_soil_moisture
      FROM crop_plantings cp 
      LEFT JOIN crops c ON cp.crop_id = c.id
      WHERE cp.id = ?
    `, [batch.source_planting_id]);
  } else if (batch.source_type === 'aquaculture' && batch.source_aquaculture_id) {
    sourceData = getOne(`
      SELECT a.*, ao.name as species_name, ao.name_vi, ao.category, 
             ao.optimal_temp_min, ao.optimal_temp_max, ao.optimal_ph_min, ao.optimal_ph_max
      FROM aquaculture_spawning a
      LEFT JOIN aquaculture ao ON a.species_id = ao.id
      WHERE a.id = ?
    `, [batch.source_aquaculture_id]);
  }

  const supplyChain = getOne(
    'SELECT * FROM supply_chain WHERE source_traceability_id = ?',
    [batch.id]
  );

  const metadata = JSON.parse(batch.metadata || '{}');

  return {
    batch_code: batch.batch_code,
    product_name: batch.product_name,
    product_type: batch.product_type,
    status: batch.status,
    farm: {
      name: batch.farm_name,
      address: batch.farm_address,
      zone: batch.zone
    },
    timeline: {
      planting_date: batch.planting_date,
      expected_harvest: batch.expected_harvest,
      harvest_date: batch.harvest_date,
      export_date: batch.export_date
    },
    stages: stages.map(s => ({
      name: s.stage_name,
      type: s.stage_type,
      order: s.stage_order,
      description: s.description,
      date: s.created_at
    })),
    source_data: sourceData ? {
      type: batch.source_type,
      id: batch.source_type === 'crop' ? batch.source_planting_id : batch.source_aquaculture_id,
      category: sourceData.category,
      ...(batch.source_type === 'crop' ? {
        crop_name: sourceData.name_vi || sourceData.crop_name,
        area: sourceData.area,
        optimal_temp: `${sourceData.optimal_temp_min}-${sourceData.optimal_temp_max}`,
        soil_moisture: `${sourceData.min_soil_moisture}-${sourceData.max_soil_moisture}%`
      } : {
        species_name: sourceData.name_vi || sourceData.species_name,
        quantity: sourceData.quantity,
        optimal_temp: `${sourceData.optimal_temp_min}-${sourceData.optimal_temp_max}`,
        optimal_ph: `${sourceData.optimal_ph_min}-${sourceData.optimal_ph_max}`
      })
    } : null,
    supply_chain: supplyChain ? {
      id: supplyChain.id,
      status: supplyChain.status,
      destination: supplyChain.destination,
      shipped_date: supplyChain.shipped_date,
      delivered_date: supplyChain.delivered_date
    } : null,
    metadata
  };
}

function getBatchesWithSource(farmId = null, sourceType = null) {
  let query = `
    SELECT tb.*, 
           cp.crop_name as source_crop_name,
           ao.name_vi as source_aqua_name
    FROM traceability_batches tb
    LEFT JOIN crop_plantings cp ON tb.source_planting_id = cp.id
    LEFT JOIN aquaculture_spawning ao ON tb.source_aquaculture_id = ao.id
    WHERE 1=1
  `;
  const params = [];

  if (farmId) {
    query += ' AND (cp.farm_id = ? OR ao.farm_id = ?)';
    params.push(farmId, farmId);
  }

  if (sourceType) {
    query += ' AND tb.source_type = ?';
    params.push(sourceType);
  }

  query += ' ORDER BY tb.created_at DESC';

  return getAll(query, params);
}

module.exports = {
  createBatchFromPlanting,
  createBatchFromAquaculture,
  syncPlantingToTraceability,
  recordHarvest,
  linkToSupplyChain,
  getCompleteTraceabilityData,
  getBatchesWithSource,
  generateBatchCode,
  PRODUCT_TYPES,
  STAGE_TYPES
};