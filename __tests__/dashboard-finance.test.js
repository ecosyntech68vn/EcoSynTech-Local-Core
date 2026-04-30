const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

jest.setTimeout(60000);

describe('Dashboard Finance API', () => {
  let app;
  let serverInstance;
  let token;
  
  beforeAll(async () => {
    const EcoSynTechServer = require('../src/server/index');
    serverInstance = new EcoSynTechServer();
    await serverInstance.initialize();
    app = serverInstance.getApp();
    token = jwt.sign({ id: 'test-admin', email: 'admin@local', role: 'admin' }, config.jwt.secret, { expiresIn: '1h' });
  }, 60000);
  
  afterAll(async () => {
    if (serverInstance) {
      try {
        if (serverInstance.server) serverInstance.server.close();
        const { closeDatabase } = require('../src/config/database');
        closeDatabase();
      } catch (e) {}
    }
  });

  test('GET /api/dashboard/finance-summary returns data', async () => {
    const res = await request(app)
      .get('/api/dashboard/finance-summary?period=month')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
  });

  test('GET /api/dashboard/finance-kpis returns KPIs', async () => {
    const res = await request(app)
      .get('/api/dashboard/finance-kpis?period=month')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveProperty('thisMonth');
    expect(res.body.data).toHaveProperty('budget');
  });

  test('GET /api/dashboard/finance-summary with different periods', async () => {
    const periods = ['today', 'week', 'month', 'year'];
    for (const period of periods) {
      const res = await request(app)
        .get(`/api/dashboard/finance-summary?period=${period}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
  });
});