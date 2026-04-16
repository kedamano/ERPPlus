/**
 * 健康检查和基础功能测试
 */
const request = require('supertest');

process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';

const app = require('../index');

describe('基础功能', () => {
  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('time');
    });
  });

  describe('404 处理', () => {
    it('应该返回404对于不存在的路由', async () => {
      const res = await request(app)
        .get('/api/nonexistent-route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('CORS', () => {
    it('应该包含 CORS 头', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('安全头', () => {
    it('应该包含安全响应头', async () => {
      const res = await request(app)
        .get('/health');

      // Helmet 添加的安全头
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('JSON 解析', () => {
    it('应该正确解析 JSON 请求体', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"username": "test"}');

      // 即使验证失败，也应该能解析 JSON
      expect(res.status).not.toBe(400);
    });

    it('应该拒绝过大的请求体', async () => {
      const largeBody = { data: 'x'.repeat(11 * 1024 * 1024) }; // 11MB

      const res = await request(app)
        .post('/api/auth/login')
        .send(largeBody);

      expect(res.status).toBe(413); // Payload Too Large
    });
  });
});
