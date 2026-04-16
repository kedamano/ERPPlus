/**
 * 认证模块单元测试
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

// 在加载应用前设置环境变量
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';

const app = require('../index');
const { getDb } = require('../database/db');

describe('认证模块', () => {
  let db;

  beforeAll(() => {
    db = getDb();
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录并返回 token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Admin@123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', 'admin');
      expect(res.body.user).toHaveProperty('role');
      
      // 验证 token 有效性
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('username', 'admin');
    });

    it('应该拒绝错误的密码', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('应该拒绝不存在的用户', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('应该验证必填字段', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', '请求参数验证失败');
    });

    it('应该拒绝空用户名', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'password' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', '请求参数验证失败');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Admin@123' });
      authToken = loginRes.body.token;
    });

    it('应该返回当前用户信息', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'admin');
      expect(res.body).toHaveProperty('role');
    });

    it('应该拒绝无 token 的请求', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('应该拒绝无效的 token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Admin@123' });
      authToken = loginRes.body.token;
    });

    it('应该成功登出', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('应该拒绝未认证的登出请求', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });
});
