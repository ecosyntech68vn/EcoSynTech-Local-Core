const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

describe('Equipment Module API', () => {
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

  test('GET /api/equipment/types returns equipment types', async () => {
    const res = await request(app)
      .get('/api/equipment/types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/equipment/status returns status options', async () => {
    const res = await request(app)
      .get('/api/equipment/status')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/equipment/maintenance-types returns maintenance types', async () => {
    const res = await request(app)
      .get('/api/equipment/maintenance-types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/equipment returns array', async () => {
    const res = await request(app)
      .get('/api/equipment')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/equipment/stats returns statistics', async () => {
    const res = await request(app)
      .get('/api/equipment/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/equipment/maintenance/schedules creates schedule', async () => {
    // First get an equipment id
    const equipmentList = await request(app)
      .get('/api/equipment')
      .set('Authorization', `Bearer ${token}`);
    
    if (equipmentList.body.data.length === 0) {
      // Skip if no equipment
      return;
    }

    const payload = {
      equipment_id: equipmentList.body.data[0].id,
      maintenance_type: 'preventive',
      description: 'Regular maintenance',
      frequency_days: 30,
      priority: 'normal'
    };
    const res = await request(app)
      .post('/api/equipment/maintenance/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/equipment/usage logs usage', async () => {
    const equipmentList = await request(app)
      .get('/api/equipment')
      .set('Authorization', `Bearer ${token}`);
    
    if (equipmentList.body.data.length === 0) {
      return;
    }

    const payload = {
      equipment_id: equipmentList.body.data[0].id,
      operation_type: 'plowing',
      start_time: new Date().toISOString(),
      location_area: 'Field A'
    };
    const res = await request(app)
      .post('/api/equipment/usage')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});