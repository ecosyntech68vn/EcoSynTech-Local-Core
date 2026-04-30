/**
 * Unit Tests - Batch Service (Truy xuất nguồn gốc)
 * Test batch code generation cho traceability
 */

const path = require('path');

jest.mock('../src/config/database', () => ({
  getOne: jest.fn(),
  getAll: jest.fn(),
  runQuery: jest.fn(),
  db: { run: jest.fn() }
}));

const { getOne, getAll } = require('../src/config/database');
const batchService = require('../src/services/batchService');

describe('Batch Service - Batch Code Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateBatchCode', () => {
    it('should generate batch code with correct format', () => {
      const code = batchService.generateBatchCode('VEG');
      expect(code).toMatch(/^VEG-[A-Z0-9]{5,6}-[A-Z0-9]{4}$/);
    });

    it('should generate unique codes each time', () => {
      const code1 = batchService.generateBatchCode('FRU');
      const code2 = batchService.generateBatchCode('FRU');
      expect(code1).not.toBe(code2);
    });

    it('should handle short prefix', () => {
      const code = batchService.generateBatchCode('A');
      expect(code.startsWith('A-')).toBe(true);
    });

    it('should handle long prefix (truncate to 3 chars)', () => {
      const code = batchService.generateBatchCode('VEGETABLE');
      expect(code.startsWith('VEG-')).toBe(true);
    });

    it('should handle lowercase prefix', () => {
      const code = batchService.generateBatchCode('abc');
      expect(code.startsWith('ABC-')).toBe(true);
    });
  });

  describe('mapCategoryToProductType', () => {
    it('should map vegetable categories', () => {
      expect(batchService.mapCategoryToProductType('rau_xanh')).toBe('vegetable');
      expect(batchService.mapCategoryToProductType('rau_an_qa')).toBe('vegetable');
    });

    it('should map fruit categories', () => {
      expect(batchService.mapCategoryToProductType('trai_cay')).toBe('fruit');
      expect(batchService.mapCategoryToProductType('cay_ăn_qua')).toBe('fruit');
    });

    it('should map grain categories', () => {
      expect(batchService.mapCategoryToProductType('lua')).toBe('grain');
      expect(batchService.mapCategoryToProductType('ngo')).toBe('grain');
    });

    it('should map aquaculture categories', () => {
      expect(batchService.mapCategoryToProductType('thuy_san')).toBe('aquaculture');
      expect(batchService.mapCategoryToProductType('ca')).toBe('aquaculture');
    });

    it('should return default for unknown category', () => {
      expect(batchService.mapCategoryToProductType('unknown')).toBe('vegetable');
    });
  });

  describe('getProductTypeLabel', () => {
    it('should return correct label for vegetable', () => {
      expect(batchService.getProductTypeLabel('vegetable')).toBe('Rau củ');
    });

    it('should return correct label for fruit', () => {
      expect(batchService.getProductTypeLabel('fruit')).toBe('Trái cây');
    });

    it('should return default for unknown', () => {
      expect(batchService.getProductTypeLabel('unknown')).toBe('Sản phẩm');
    });
  });

  describe('getStageOrder', () => {
    it('should return correct order for seeding', () => {
      expect(batchService.getStageOrder('seeding')).toBe(2);
    });

    it('should return correct order for harvesting', () => {
      expect(batchService.getStageOrder('harvesting')).toBe(7);
    });

    it('should return default for unknown', () => {
      expect(batchService.getStageOrder('unknown')).toBe(5);
    });
  });

  describe('validateBatchData', () => {
    it('should accept valid batch data', () => {
      const validData = {
        batch_code: 'VEG-ABC123-XY12',
        product_type: 'vegetable',
        farm_id: 'farm_001',
        planting_date: '2024-01-15'
      };
      const result = batchService.validateBatchData(validData);
      expect(result.valid).toBe(true);
    });

    it('should reject missing batch_code', () => {
      const invalidData = {
        product_type: 'vegetable',
        farm_id: 'farm_001'
      };
      const result = batchService.validateBatchData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('batch_code là bắt buộc');
    });

    it('should reject invalid product_type', () => {
      const invalidData = {
        batch_code: 'VEG-ABC123-XY12',
        product_type: 'invalid_type',
        farm_id: 'farm_001'
      };
      const result = batchService.validateBatchData(invalidData);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Batch Service - Constants', () => {
  it('should have correct product types', () => {
    expect(batchService.PRODUCT_TYPES).toHaveProperty('vegetable');
    expect(batchService.PRODUCT_TYPES).toHaveProperty('fruit');
    expect(batchService.PRODUCT_TYPES).toHaveProperty('aquaculture');
  });

  it('should have correct stage types', () => {
    expect(batchService.STAGE_TYPES).toHaveProperty('seeding');
    expect(batchService.STAGE_TYPES).toHaveProperty('harvesting');
    expect(batchService.STAGE_TYPES.seeding.order).toBe(2);
  });
});