const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { paginationValidation, userValidation } = require('../../middleware/validation');

const router = express.Router();
router.use(authenticate);

// 获取用户列表
router.get('/', paginationValidation, (req, res) => {
  const db = getDb();
  const { page = 1, limit = 20, search = '', status = '' } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { where += ' AND u.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM users u ${where}`).get(...params).cnt;
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.full_name, u.phone, u.status, u.last_login, u.created_at,
           r.name as role_name, d.name as dept_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.department_id = d.id
    ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ data: users, total, page: Number(page), limit: Number(limit) });
});

// 创建用户
router.post('/', userValidation.create, (req, res) => {
  const db = getDb();
  const { username, email, full_name, phone, password = 'Admin@123', role_id, department_id } = req.body;
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare(`
      INSERT INTO users (id, username, email, full_name, phone, password_hash, role_id, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, username, email, full_name, phone, hash, role_id, department_id);
    res.json({ id, message: '用户创建成功' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// 更新用户
router.put('/:id', userValidation.update, (req, res) => {
  const db = getDb();
  const { full_name, phone, email, role_id, department_id, status } = req.body;
  db.prepare(`
    UPDATE users SET full_name=?, phone=?, email=?, role_id=?, department_id=?, status=?, updated_at=datetime('now')
    WHERE id=?
  `).run(full_name, phone, email, role_id, department_id, status, req.params.id);
  res.json({ message: '更新成功' });
});

// 获取角色列表
router.get('/roles/list', (req, res) => {
  const db = getDb();
  const roles = db.prepare('SELECT * FROM roles ORDER BY created_at').all();
  res.json(roles);
});

// 获取部门列表
router.get('/departments/list', (req, res) => {
  const db = getDb();
  const depts = db.prepare(`
    SELECT d.*, u.full_name as manager_name,
           (SELECT COUNT(*) FROM users WHERE department_id = d.id AND status='active') as member_count
    FROM departments d
    LEFT JOIN users u ON d.manager_id = u.id
  `).all();
  res.json(depts);
});

module.exports = router;
