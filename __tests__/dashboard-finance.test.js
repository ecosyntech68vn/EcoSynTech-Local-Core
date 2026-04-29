const request = require('supertest');
const app = require('../src/server');

describe('Dashboard Finance API', () => {
  let token;
  
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    token = res.body.data?.token;
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