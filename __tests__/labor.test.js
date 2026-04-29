const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

describe('Labor Module API', () => {
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
        // Ignore shutdown errors in tests
      }
    }
  });

  test('GET /api/labor/positions returns positions data', async () => {
    const res = await request(app)
      .get('/api/labor/positions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/labor/skill-levels returns skill levels', async () => {
    const res = await request(app)
      .get('/api/labor/skill-levels')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/labor/task-types returns task types', async () => {
    const res = await request(app)
      .get('/api/labor/task-types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/labor/workers missing worker_name returns 400', async () => {
    const res = await request(app)
      .post('/api/labor/workers')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('POST /api/labor/workers with valid data creates worker', async () => {
    const payload = {
      worker_name: 'Test Worker',
      phone: '0912345678',
      position: 'worker',
      skill_level: 'junior'
    };
    const res = await request(app)
      .post('/api/labor/workers')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.worker_name).toBe(payload.worker_name);
  });

  test('GET /api/labor/workers returns array', async () => {
    const res = await request(app)
      .get('/api/labor/workers')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/labor/shifts with valid data creates shift', async () => {
    const payload = {
      shift_name: 'Morning Shift',
      start_time: '06:00',
      end_time: '14:00'
    };
    const res = await request(app)
      .post('/api/labor/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/labor/shifts returns array', async () => {
    const res = await request(app)
      .get('/api/labor/shifts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});