/**
 * 用户管理模块单元测试
 */
const request = require('supertest');

process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';

const app = require('../index');
const { getDb } = require('../database/db');

describe('用户管理模块', () => {
  let db;
  let authToken;
  let testUserId;

  beforeAll(async () => {
    db = getDb();
    
    // 登录获取 token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });
    authToken = loginRes.body.token;
  });

  describe('GET /api/users', () => {
    it('应该返回用户列表', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('应该支持分页', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 5);
    });

    it('应该拒绝未认证的请求', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users', () => {
    it('应该成功创建新用户', async () => {
      const newUser = {
        username: `testuser_${Date.now()}`,
        password: 'TestPassword123',
        email: `test_${Date.now()}@example.com`,
        real_name: '测试用户',
        role: '普通员工',
      };

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      testUserId = res.body.id;
    });

    it('应该拒绝重复的用户名', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'admin', // 已存在的用户名
          password: 'Password123',
          email: 'duplicate@example.com',
        });

      expect(res.status).toBe(409);
    });

    it('应该验证必填字段', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'newuser',
          // 缺少 password
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/:id', () => {
    it('应该返回指定用户信息', async () => {
      // 先获取一个存在的用户ID
      const listRes = await request(app)
        .get('/api/users?limit=1')
        .set('Authorization', `Bearer ${authToken}`);
      
      const userId = listRes.body.data[0]?.id;
      if (!userId) return;

      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', userId);
    });

    it('应该返回404对于不存在的用户', async () => {
      const res = await request(app)
        .get('/api/users/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('应该验证UUID格式', async () => {
      const res = await request(app)
        .get('/api/users/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('应该成功更新用户信息', async () => {
      if (!testUserId) return;

      const res = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          real_name: '更新后的名字',
          email: 'updated@example.com',
        });

      expect(res.status).toBe(200);
    });

    it('应该拒绝更新不存在的用户', async () => {
      const res = await request(app)
        .put('/api/users/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ real_name: '测试' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('应该成功删除用户', async () => {
      if (!testUserId) return;

      const res = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('应该拒绝删除超级管理员', async () => {
      // 获取 admin 用户ID
      const listRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);
      
      const adminUser = listRes.body.data.find(u => u.username === 'admin');
      if (!adminUser) return;

      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });
  });
});
