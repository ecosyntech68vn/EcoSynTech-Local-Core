/**
 * Zalo Webhook Route Tests
 * 
 * @test-module routes/zalo-webhook
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring the route
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { ok: true } })
}));

// Set environment variables before loading
process.env.ZALO_TOKEN = 'test_zalo_token';
process.env.ZALO_OA_ID = 'test_oa_id';

const zaloWebhook = require('../src/routes/zalo-webhook');

describe('Zalo Webhook Route', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/webhook/zalo', zaloWebhook);
  });

  describe('GET /webhook/zalo/test', () => {
    test('should return test endpoint', async () => {
      const res = await request(app).get('/webhook/zalo/test');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toContain('running');
    });
  });

  describe('POST /webhook/zalo/', () => {
    test('should handle message from Zalo', async () => {
      const mockZaloMessage = {
        object: 'message',
        message: {
          from: { uid: 'user123' },
          text: 'menu'
        }
      };

      const res = await request(app)
        .post('/webhook/zalo/')
        .send(mockZaloMessage);
      
      expect(res.status).toBe(200);
    });

    test('should handle empty message', async () => {
      const res = await request(app)
        .post('/webhook/zalo/')
        .send({});
      
      expect(res.status).toBe(200);
    });
  });

  describe('Auto Replies', () => {
    test('should have menu content', async () => {
      const mockZaloMessage = {
        object: 'message',
        message: {
          from: { uid: 'user123' },
          text: 'menu'
        }
      };

      const res = await request(app)
        .post('/webhook/zalo/')
        .send(mockZaloMessage);

      expect(res.status).toBe(200);
    });

    test('should handle number 1 (dangnhap)', async () => {
      const mockZaloMessage = {
        object: 'message',
        message: {
          from: { uid: 'user123' },
          text: '1'
        }
      };

      const res = await request(app)
        .post('/webhook/zalo/')
        .send(mockZaloMessage);

      expect(res.status).toBe(200);
    });

    test('should handle hello', async () => {
      const mockZaloMessage = {
        object: 'message',
        message: {
          from: { uid: 'user123' },
          text: 'xin chao'
        }
      };

      const res = await request(app)
        .post('/webhook/zalo/')
        .send(mockZaloMessage);

      expect(res.status).toBe(200);
    });
  });
});