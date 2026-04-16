const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const { JWT_SECRET } = require('../../middleware/auth');
const { loginValidation } = require('../../middleware/validation');

function createAuthRouter() {
  const express = require('express');
  const router = express.Router();
  const { authenticate } = require('../../middleware/auth');

  // 登录
  router.post('/login', loginValidation, (req, res) => {
    try {
      const { username, password } = req.body;

      const db = getDb();
      const user = db.prepare(`
        SELECT u.*, r.name as role_name, r.permissions, d.name as dept_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.username = ? AND u.status = 'active'
      `).get(username);

      if (!user) return res.status(401).json({ error: '用户名或密码错误' });

      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

      // 更新最后登录时间
      db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role_name, permissions: user.permissions },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password_hash, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // 获取当前用户信息
  router.get('/me', authenticate, (req, res) => {
    const db = getDb();
    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.last_login,
             r.name as role_name, r.permissions, d.name as dept_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).get(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  });

  // 修改密码
  router.post('/change-password', authenticate, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
      return res.status(400).json({ error: '原密码不正确' });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
    res.json({ message: '密码修改成功' });
  });

  return router;
}

module.exports = { createAuthRouter };
