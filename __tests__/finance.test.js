const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

describe('Finance Module API', () => {
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
      } catch (e) {
        // Ignore shutdown errors
      }
    }
  });

  test('GET /api/finance/v2/income-types returns income types', async () => {
    const res = await request(app)
      .get('/api/finance/v2/income-types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/finance/v2/expense-types returns expense types', async () => {
    const res = await request(app)
      .get('/api/finance/v2/expense-types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/finance/v2/income returns array', async () => {
    const res = await request(app)
      .get('/api/finance/v2/income')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/finance/v2/expenses returns array', async () => {
    const res = await request(app)
      .get('/api/finance/v2/expenses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/finance/v2/profit-loss returns data', async () => {
    const res = await request(app)
      .get('/api/finance/v2/profit-loss')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/finance/v2/summary returns data', async () => {
    const res = await request(app)
      .get('/api/finance/v2/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/finance/v2/budgets returns array', async () => {
    const res = await request(app)
      .get('/api/finance/v2/budgets')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});