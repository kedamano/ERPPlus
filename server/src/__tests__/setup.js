/**
 * Jest 测试环境配置
 */
const path = require('path');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';
process.env.LOG_LEVEL = 'error'; // 测试时只输出错误日志

// 使用测试数据库
process.env.DB_PATH = path.join(__dirname, '../../data/test.db');

// 全局测试超时
jest.setTimeout(30000);

// 测试完成后清理
afterAll(async () => {
  // 清理测试数据库
  const fs = require('fs');
  try {
    if (fs.existsSync(process.env.DB_PATH)) {
      fs.unlinkSync(process.env.DB_PATH);
    }
  } catch (err) {
    // 忽略清理错误
  }
});
