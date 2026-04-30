const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

describe('Dashboard API - Fixed Endpoints', () => {
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

  describe('Equipment APIs', () => {
    test('GET /api/dashboard/equipment-overview returns equipment data', async () => {
      const res = await request(app)
        .get('/api/dashboard/equipment-overview?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data).toHaveProperty('equipment');
    });

    test('GET /api/dashboard/equipment-kpis returns KPIs', async () => {
      const res = await request(app)
        .get('/api/dashboard/equipment-kpis?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty('overview');
    });

    test('GET /api/dashboard/equipment-alerts returns alerts', async () => {
      const res = await request(app)
        .get('/api/dashboard/equipment-alerts?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Automation APIs', () => {
    test('GET /api/dashboard/automation-overview returns automation data', async () => {
      const res = await request(app)
        .get('/api/dashboard/automation-overview?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty('stats');
    });

    test('GET /api/dashboard/automation-kpis returns KPIs', async () => {
      const res = await request(app)
        .get('/api/dashboard/automation-kpis?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Payment APIs', () => {
    test('GET /api/dashboard/payment-overview returns payment data', async () => {
      const res = await request(app)
        .get('/api/dashboard/payment-overview?farm_id=farm_001')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('GET /api/dashboard/payment-overview with status filter', async () => {
      const res = await request(app)
        .get('/api/dashboard/payment-overview?farm_id=farm_001&status=completed')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Audit Logs API', () => {
    test('GET /api/dashboard/audit-logs returns logs', async () => {
      const res = await request(app)
        .get('/api/dashboard/audit-logs?limit=10')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty('logs');
    });
  });
});