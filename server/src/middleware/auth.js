const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

// JWT Secret 必须从环境变量读取，生产环境禁止回退到默认值
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set!');
  logger.error('Please set JWT_SECRET in your .env file before starting the server.');
  process.exit(1);
}

// 检查密钥强度（至少32字符）
if (JWT_SECRET.length < 32) {
  logger.error('FATAL: JWT_SECRET must be at least 32 characters long!');
  process.exit(1);
}

function authenticate(req, res, next) {
  let auth = req.headers.authorization;
  let token;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    logger.warn('Authentication failed: no token provided', { 
      ip: req.ip, 
      url: req.originalUrl 
    });
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    logger.warn('Authentication failed: invalid token', { 
      ip: req.ip, 
      url: req.originalUrl,
      error: e.message 
    });
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    } catch (err) {
      logger.debug('Optional auth failed', { error: err.message });
    }
  }
  next();
}

module.exports = { authenticate, optionalAuth, JWT_SECRET };
