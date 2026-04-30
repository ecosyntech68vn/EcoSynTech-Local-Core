const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

describe('Service Layer Tests - TypeScript Migration', () => {
  let app;
  let serverInstance;
  let token;

  beforeAll(async () => {
    const EcoSynTechServer = require('../src/server/index');
    serverInstance = new EcoSynTechServer();
    await serverInstance.initialize();
    app = serverInstance.getApp();
    token = jwt.sign({ id: 'test-admin', email: 'admin@local', role: 'admin' }, config.jwt.secret, { expiresIn: '1h' });
  }, 30000);

  afterAll(async () => {
    if (serverInstance) {
      try {
        if (serverInstance.server) {
          serverInstance.server.close();
        }
        const { closeDatabase } = require('../src/config/database');
        closeDatabase();
      } catch (e) {}
    }
  });

  describe('Inventory Service', () => {
    test('GET /api/inventory returns inventory items', async () => {
      const res = await request(app)
        .get('/api/inventory?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('GET /api/inventory/v2/stats returns stats', async () => {
      const res = await request(app)
        .get('/api/inventory/v2/stats?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('GET /api/inventory/categories returns categories', async () => {
      const res = await request(app)
        .get('/api/inventory/categories')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('GET /api/inventory/v2/low-stock returns low stock items', async () => {
      const res = await request(app)
        .get('/api/inventory/v2/low-stock')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Labor Service', () => {
    test('GET /api/labor/workers returns workers', async () => {
      const res = await request(app)
        .get('/api/labor/workers?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('GET /api/labor/positions returns positions', async () => {
      const res = await request(app)
        .get('/api/labor/positions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('GET /api/labor/shifts returns shifts', async () => {
      const res = await request(app)
        .get('/api/labor/shifts?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Crops Service', () => {
    test('GET /api/crops returns crops', async () => {
      const res = await request(app)
        .get('/api/crops?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Sales Service', () => {
    test('GET /api/sales returns sales data', async () => {
      const res = await request(app)
        .get('/api/sales?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});