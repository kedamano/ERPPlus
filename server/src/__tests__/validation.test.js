/**
 * 参数验证中间件单元测试
 */
const { validationResult } = require('express-validator');
const {
  paginationValidation,
  userValidation,
  customerValidation,
  loginValidation,
} = require('../middleware/validation');

// 模拟 express 请求和响应
const mockRequest = (body = {}, query = {}, params = {}) => ({
  body,
  query,
  params,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('参数验证中间件', () => {
  beforeEach(() => {
    mockNext.mockClear();
  });

  describe('paginationValidation', () => {
    it('应该接受有效的分页参数', async () => {
      const req = mockRequest({}, { page: '1', limit: '20' });
      const res = mockResponse();

      for (const validation of paginationValidation) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it('应该拒绝负数页码', async () => {
      const req = mockRequest({}, { page: '-1', limit: '20' });
      const res = mockResponse();

      for (const validation of paginationValidation) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('应该拒绝超过最大限制的 limit', async () => {
      const req = mockRequest({}, { page: '1', limit: '200' });
      const res = mockResponse();

      for (const validation of paginationValidation) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });
  });

  describe('userValidation.create', () => {
    it('应该接受有效的用户数据', async () => {
      const req = mockRequest({
        username: 'testuser',
        password: 'Password123',
        email: 'test@example.com',
        real_name: '测试用户',
      });

      for (const validation of userValidation.create) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it('应该拒绝无效的邮箱格式', async () => {
      const req = mockRequest({
        username: 'testuser',
        password: 'Password123',
        email: 'invalid-email',
      });

      for (const validation of userValidation.create) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()[0].path).toBe('email');
    });

    it('应该拒绝过短的用户名', async () => {
      const req = mockRequest({
        username: 'ab',
        password: 'Password123',
      });

      for (const validation of userValidation.create) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()[0].path).toBe('username');
    });

    it('应该拒绝过短的密码', async () => {
      const req = mockRequest({
        username: 'testuser',
        password: '12345',
      });

      for (const validation of userValidation.create) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()[0].path).toBe('password');
    });
  });

  describe('customerValidation.create', () => {
    it('应该接受有效的客户数据', async () => {
      const req = mockRequest({
        name: '测试客户',
        email: 'customer@example.com',
        phone: '13800138000',
        credit_level: 'A',
      });

      for (const validation of customerValidation.create) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it('应该拒绝无效的信用等级', async () => {
      const req = mockRequest({
        name: '测试客户',
        credit_level: 'Z',
      });

      for (const validation of customerValidation.create) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });
  });

  describe('loginValidation', () => {
    it('应该接受有效的登录数据', async () => {
      const req = mockRequest({
        username: 'admin',
        password: 'password123',
      });

      for (const validation of loginValidation) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(true);
    });

    it('应该拒绝缺少用户名的请求', async () => {
      const req = mockRequest({
        password: 'password123',
      });

      for (const validation of loginValidation) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });

    it('应该拒绝缺少密码的请求', async () => {
      const req = mockRequest({
        username: 'admin',
      });

      for (const validation of loginValidation) {
        await validation.run(req);
      }

      const errors = validationResult(req);
      expect(errors.isEmpty()).toBe(false);
    });
  });
});
