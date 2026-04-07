const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { parsePagination, paginate } = require('../../middleware/pagination');

const router = express.Router();
router.use(authenticate);

// 客户列表
router.get('/customers', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { search = '', type = '', credit_level = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (c.name LIKE ? OR c.contact_person LIKE ? OR c.contact_phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (type) { where += ' AND c.type = ?'; params.push(type); }
  if (credit_level) { where += ' AND c.credit_level = ?'; params.push(credit_level); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM customers c ${where}`).get(...params).cnt;
  const customers = db.prepare(`
    SELECT c.*, u.full_name as owner_name FROM customers c
    LEFT JOIN users u ON c.owner_id = u.id
    ${where} ORDER BY c.annual_value DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(customers, total, page, limit));
});

// 新增客户
router.post('/customers', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO customers (id, name, type, industry, contact_person, contact_phone, contact_email, address, city, province, credit_level, owner_id, annual_value, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, d.name, d.type || 'enterprise', d.industry, d.contact_person, d.contact_phone, d.contact_email, d.address, d.city, d.province, d.credit_level || 'B', req.user.id, d.annual_value || 0, d.notes);
    res.json({ id, message: '客户创建成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 更新客户
router.put('/customers/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  db.prepare(`UPDATE customers SET name=?, type=?, industry=?, contact_person=?, contact_phone=?, contact_email=?, city=?, province=?, credit_level=?, status=?, annual_value=?, updated_at=datetime('now') WHERE id=?`
  ).run(d.name, d.type, d.industry, d.contact_person, d.contact_phone, d.contact_email, d.city, d.province, d.credit_level, d.status, d.annual_value, req.params.id);
  res.json({ message: '更新成功' });
});

// 销售线索
router.get('/leads', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { stage = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (stage) { where += ' AND s.stage = ?'; params.push(stage); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM sales_leads s ${where}`).get(...params).cnt;
  const leads = db.prepare(`
    SELECT s.*, c.name as customer_full_name, u.full_name as owner_name
    FROM sales_leads s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.owner_id = u.id
    ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(leads, total, page, limit));
});

// 新增销售线索
router.post('/leads', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO sales_leads (id, title, customer_id, customer_name, amount, stage, probability, expected_close, owner_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, d.title, d.customer_id, d.customer_name, d.amount || 0, d.stage || 'lead', d.probability || 20, d.expected_close, req.user.id, d.notes);
  res.json({ id, message: '销售线索创建成功' });
});

// 更新线索阶段
router.put('/leads/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  db.prepare(`UPDATE sales_leads SET title=?, amount=?, stage=?, probability=?, expected_close=?, notes=?, updated_at=datetime('now') WHERE id=?`
  ).run(d.title, d.amount, d.stage, d.probability, d.expected_close, d.notes, req.params.id);
  res.json({ message: '更新成功' });
});

// 服务请求列表
router.get('/service', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { status = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND s.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM service_requests s ${where}`).get(...params).cnt;
  const requests = db.prepare(`
    SELECT s.*, c.name as customer_name, u.full_name as assignee_name
    FROM service_requests s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.assignee_id = u.id
    ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(requests, total, page, limit));
});

// 获取单个服务请求详情
router.get('/service/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT s.*, c.name as customer_name, c.contact_person, c.contact_phone,
           u.full_name as assignee_name
    FROM service_requests s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN users u ON s.assignee_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: '工单不存在' });
  res.json(row);
});

// 新增服务请求
router.post('/service', (req, res) => {
  const db = getDb();
  const d = req.body;
  if (!d.title) return res.status(400).json({ error: '工单标题不能为空' });
  const id = uuidv4();
  db.prepare(`INSERT INTO service_requests (id, title, customer_id, type, priority, description, assignee_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, d.title, d.customer_id || null, d.type || 'support', d.priority || 'medium', d.description || '', d.assignee_id || null, req.user.id);
  res.json({ id, message: '服务请求创建成功' });
});

// 更新服务请求
router.put('/service/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  const existing = db.prepare('SELECT id, status FROM service_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '工单不存在' });
  db.prepare(`UPDATE service_requests SET title=?, customer_id=?, type=?, priority=?, status=?, description=?, assignee_id=?, updated_at=datetime('now')
    WHERE id=?`).run(d.title, d.customer_id, d.type, d.priority, d.status, d.description, d.assignee_id, req.params.id);
  // 如果状态改为已解决，记录解决时间
  if (d.status === 'resolved' && existing.status !== 'resolved') {
    db.prepare(`UPDATE service_requests SET resolved_at=datetime('now') WHERE id=?`).run(req.params.id);
  }
  res.json({ message: '更新成功' });
});

// 删除服务请求
router.delete('/service/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM service_requests WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

// 更新工单状态（快捷操作）
router.patch('/service/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ error: '无效的状态值' });
  }
  const existing = db.prepare('SELECT status FROM service_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '工单不存在' });
  db.prepare('UPDATE service_requests SET status=?, updated_at=datetime(\'now\') WHERE id=?').run(status, req.params.id);
  if (status === 'resolved' && existing.status !== 'resolved') {
    db.prepare('UPDATE service_requests SET resolved_at=datetime(\'now\') WHERE id=?').run(req.params.id);
  }
  res.json({ message: '状态更新成功' });
});

// CRM统计
router.get('/stats', (req, res) => {
  const db = getDb();
  const totalCustomers = db.prepare("SELECT COUNT(*) as cnt FROM customers WHERE status='active'").get().cnt;
  const totalLeadValue = db.prepare("SELECT SUM(amount) as total FROM sales_leads WHERE stage NOT IN ('lost')").get().total || 0;
  const wonDeals = db.prepare("SELECT COUNT(*) as cnt, SUM(amount) as total FROM sales_leads WHERE stage='won'").get();
  const openService = db.prepare("SELECT COUNT(*) as cnt FROM service_requests WHERE status='open'").get().cnt;
  const stageStats = db.prepare(`SELECT stage, COUNT(*) as count, SUM(amount) as amount FROM sales_leads GROUP BY stage`).all();
  const topCustomers = db.prepare(`SELECT name, annual_value, credit_level FROM customers ORDER BY annual_value DESC LIMIT 5`).all();
  const monthlyLeads = db.prepare(`
    SELECT strftime('%m', created_at) as month, COUNT(*) as count, SUM(amount) as amount
    FROM sales_leads WHERE created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();
  res.json({ totalCustomers, totalLeadValue, wonDeals, openService, stageStats, topCustomers, monthlyLeads });
});

module.exports = router;
