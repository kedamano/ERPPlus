const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'erp-jwt-secret-2026-very-long-key';

function authenticate(req, res, next) {
  let auth = req.headers.authorization;
  let token;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    } catch {}
  }
  next();
}

module.exports = { authenticate, optionalAuth, JWT_SECRET };
