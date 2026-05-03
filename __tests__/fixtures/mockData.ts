/**
 * Mock Data - Fixtures cho testing
 * Cung cấp dữ liệu mẫu cho tất cả các module
 */

import MOCK_FARM_ID = 'farm_001';
import MOCK_USER_ID = 'user_001';

import mockFarms = [
  {
    id: 'farm_001',
    name: 'Nông trại Vàng',
    name_vi: 'Nông trại Vàng',
    location: 'Đồng bằng sông Cửu Long',
    area_hectare: 10,
    status: 'active',
    farm_type: 'vegetable'
  },
  {
    id: 'farm_002',
    name: 'Trang trại Xanh',
    name_vi: 'Trang trại Xanh',
    location: 'Miền Trung',
    area_hectare: 5,
    status: 'active',
    farm_type: 'fruit'
  }
];

import mockCrops = [
  { id: 'crop_001', name: 'Lúa', name_vi: 'Lúa', category: 'grain', kc_initial: 0.9, kc_mid: 1.2, kc_end: 0.9 },
  { id: 'crop_002', name: 'Bắp', name_vi: 'Bắp', category: 'grain', kc_initial: 0.9, kc_mid: 1.15, kc_end: 0.7 },
  { id: 'crop_003', name: 'Rau muống', name_vi: 'Rau muống', category: 'vegetable', kc_initial: 0.9, kc_mid: 1.1, kc_end: 0.8 },
  { id: 'crop_004', name: 'Cà chua', name_vi: 'Cà chua', category: 'vegetable', kc_initial: 0.9, kc_mid: 1.1, kc_end: 0.8 },
  { id: 'crop_005', name: 'Xoài', name_vi: 'Xoài', category: 'fruit', kc_initial: 0.9, kc_mid: 1.05, kc_end: 0.85 }
];

import mockPlantings = [
  {
    id: 'plant_001',
    farm_id: MOCK_FARM_ID,
    crop_id: 'crop_001',
    area_planted: 5,
    planting_date: '2024-01-15',
    expected_harvest_date: '2024-05-15',
    status: 'growing',
    current_stage: 'vegetative',
    expected_yield: 5000,
    unit: 'kg'
  },
  {
    id: 'plant_002',
    farm_id: MOCK_FARM_ID,
    crop_id: 'crop_003',
    area_planted: 2,
    planting_date: '2024-02-01',
    expected_harvest_date: '2024-03-15',
    status: 'growing',
    current_stage: 'vegetative',
    expected_yield: 1000,
    unit: 'kg'
  },
  {
    id: 'plant_003',
    farm_id: MOCK_FARM_ID,
    crop_id: 'crop_004',
    area_planted: 1,
    planting_date: '2024-01-20',
    expected_harvest_date: '2024-04-20',
    status: 'harvested',
    current_stage: 'harvested',
    expected_yield: 500,
    unit: 'kg'
  }
];

import mockInventory = [
  {
    id: 'inv_001',
    farm_id: MOCK_FARM_ID,
    item_code: 'SEED-R001',
    item_name: 'Hạt giống lúa',
    item_name_vi: 'Hạt giống lúa',
    category: 'seeds',
    unit: 'kg',
    current_stock: 500,
    min_stock_alert: 100,
    cost_per_unit: 25000,
    supplier: 'Công ty Giống cây trồng ABC',
    expiry_days: 180,
    status: 'active'
  },
  {
    id: 'inv_002',
    farm_id: MOCK_FARM_ID,
    item_code: 'FERT-N001',
    item_name: 'Phân đạm urê',
    item_name_vi: 'Phân đạm urê',
    category: 'fertilizer',
    unit: 'kg',
    current_stock: 200,
    min_stock_alert: 50,
    cost_per_unit: 12000,
    supplier: 'Công ty Phân bón XYZ',
    expiry_days: 365,
    status: 'active'
  },
  {
    id: 'inv_003',
    farm_id: MOCK_FARM_ID,
    item_code: 'PEST-001',
    item_name: 'Thuốc trừ sâu',
    item_name_vi: 'Thuốc trừ sâu',
    category: 'pesticide',
    unit: 'lit',
    current_stock: 20,
    min_stock_alert: 10,
    cost_per_unit: 150000,
    supplier: 'Công ty BVTV DEF',
    expiry_days: 730,
    status: 'active'
  },
  {
    id: 'inv_004',
    farm_id: MOCK_FARM_ID,
    item_code: 'SEED-V002',
    item_name: 'Hạt rau muống',
    item_name_vi: 'Hạt rau muống',
    category: 'seeds',
    unit: 'kg',
    current_stock: 30,
    min_stock_alert: 20,
    cost_per_unit: 80000,
    supplier: 'Công ty Giống cây trồng GHI',
    expiry_days: 90,
    status: 'active'
  }
];

import mockWorkers = [
  {
    id: 'worker_001',
    farm_id: MOCK_FARM_ID,
    worker_code: 'EMP001',
    worker_name: 'Nguyễn Văn A',
    position: 'nông dân',
    phone: '0912345678',
    email: 'vana@farm.com',
    hire_date: '2023-01-15',
    status: 'active',
    salary: 5000000,
    skill_level: 'intermediate'
  },
  {
    id: 'worker_002',
    farm_id: MOCK_FARM_ID,
    worker_code: 'EMP002',
    worker_name: 'Trần Thị B',
    position: 'giám sát',
    phone: '0912345679',
    email: 'thib@farm.com',
    hire_date: '2022-06-01',
    status: 'active',
    salary: 8000000,
    skill_level: 'advanced'
  },
  {
    id: 'worker_003',
    farm_id: MOCK_FARM_ID,
    worker_code: 'EMP003',
    worker_name: 'Lê Văn C',
    position: 'nông dân',
    phone: '0912345680',
    email: 'vanc@farm.com',
    hire_date: '2023-08-20',
    status: 'active',
    salary: 4500000,
    skill_level: 'beginner'
  }
];

import mockEquipment = [
  {
    id: 'eq_001',
    farm_id: MOCK_FARM_ID,
    equipment_code: 'EQP-001',
    equipment_name: 'Máy kéo Kubota',
    equipment_name_vi: 'Máy kéo Kubota',
    category_id: 'cat_tractor',
    brand: 'Kubota',
    model: 'M7-172',
    purchase_date: '2022-01-15',
    purchase_price: 150000000,
    current_value: 120000000,
    status: 'active',
    condition: 'good',
    location: 'Kho máy 1'
  },
  {
    id: 'eq_002',
    farm_id: MOCK_FARM_ID,
    equipment_code: 'EQP-002',
    equipment_name: 'Máy bơm nước',
    equipment_name_vi: 'Máy bơm nước',
    category_id: 'cat_pump',
    brand: 'Honda',
    model: 'WB20XT',
    purchase_date: '2023-03-10',
    purchase_price: 15000000,
    current_value: 12000000,
    status: 'active',
    condition: 'excellent',
    location: 'Hồ nước'
  },
  {
    id: 'eq_003',
    farm_id: MOCK_FARM_ID,
    equipment_code: 'EQP-003',
    equipment_name: 'Máy phun thuốc',
    equipment_name_vi: 'Máy phun thuốc',
    category_id: 'cat_sprayer',
    brand: 'Kawasaki',
    model: 'F-400',
    purchase_date: '2023-06-20',
    purchase_price: 8000000,
    current_value: 6500000,
    status: 'maintenance',
    condition: 'fair',
    location: 'Kho máy 2'
  }
];

import mockFinance = {
  incomes: [
    { id: 'inc_001', farm_id: MOCK_FARM_ID, amount: 50000000, category: 'crop_sales', description: 'Bán lúa', date: '2024-04-15', status: 'completed' },
    { id: 'inc_002', farm_id: MOCK_FARM_ID, amount: 15000000, category: 'crop_sales', description: 'Bán rau muống', date: '2024-04-20', status: 'completed' },
    { id: 'inc_003', farm_id: MOCK_FARM_ID, amount: 10000000, category: 'subsidy', description: 'Hỗ trợ nông nghiệp', date: '2024-04-25', status: 'completed' }
  ],
  expenses: [
    { id: 'exp_001', farm_id: MOCK_FARM_ID, amount: 8000000, category: 'fertilizer', description: 'Mua phân đạm', date: '2024-04-01', status: 'completed' },
    { id: 'exp_002', farm_id: MOCK_FARM_ID, amount: 5000000, category: 'labor', description: 'Trả lương công nhân', date: '2024-04-05', status: 'completed' },
    { id: 'exp_003', farm_id: MOCK_FARM_ID, amount: 3000000, category: 'equipment', description: 'Sửa máy bơm', date: '2024-04-10', status: 'completed' }
  ]
};

import mockDevices = [
  { id: 'dev_001', farm_id: MOCK_FARM_ID, device_code: 'IOT-001', name: 'Cảm biến nhiệt độ 1', device_type: 'sensor', status: 'online', last_seen: new Date().toISOString() },
  { id: 'dev_002', farm_id: MOCK_FARM_ID, device_code: 'IOT-002', name: 'Cảm biến độ ẩm đất', device_type: 'sensor', status: 'online', last_seen: new Date().toISOString() },
  { id: 'dev_003', farm_id: MOCK_FARM_ID, device_code: 'IOT-003', name: 'Bơm nước tự động', device_type: 'actuator', status: 'online', last_seen: new Date().toISOString() },
  { id: 'dev_004', farm_id: MOCK_FARM_ID, device_code: 'IOT-004', name: 'Camera giám sát', device_type: 'camera', status: 'offline', last_seen: new Date(Date.now() - 600000).toISOString() }
];

import mockWeather = {
  current: {
    temperature: 28,
    humidity: 75,
    wind_speed: 3,
    rainfall: 0,
    description: 'Trời nắng nhẹ'
  },
  forecast: [
    { date: '2024-05-01', temperature: 29, humidity: 70, rainfall: 0, description: 'Nắng' },
    { date: '2024-05-02', temperature: 30, humidity: 65, rainfall: 0, description: 'Nắng nóng' },
    { date: '2024-05-03', temperature: 27, humidity: 80, rainfall: 10, description: 'Mưa rào' }
  ]
};

import mockSales = {
  orders: [
    { id: 'order_001', farm_id: MOCK_FARM_ID, customer_name: 'Công ty ABC', total_amount: 25000000, status: 'completed', order_date: '2024-04-10' },
    { id: 'order_002', farm_id: MOCK_FARM_ID, customer_name: 'Cửa hàng XYZ', total_amount: 15000000, status: 'pending', order_date: '2024-04-25' },
    { id: 'order_003', farm_id: MOCK_FARM_ID, customer_name: 'Siêu thị DEF', total_amount: 30000000, status: 'completed', order_date: '2024-04-15' }
  ],
  customers: [
    { id: 'cust_001', name: 'Công ty ABC', email: 'abc@company.com', phone: '0911111111', address: 'TP.HCM' },
    { id: 'cust_002', name: 'Cửa hàng XYZ', email: 'xyz@shop.com', phone: '0912222222', address: 'Hà Nội' },
    { id: 'cust_003', name: 'Siêu thị DEF', email: 'def@supermarket.com', phone: '0913333333', address: 'Đà Nẵng' }
  ]
};

module.exports = {
export default module.exports;
  MOCK_FARM_ID,
  MOCK_USER_ID,
  mockFarms,
  mockCrops,
  mockPlantings,
  mockInventory,
  mockWorkers,
  mockEquipment,
  mockFinance,
  mockDevices,
  mockWeather,
  mockSales
};