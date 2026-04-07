const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { parsePagination, paginate } = require('../../middleware/pagination');

const router = express.Router();
router.use(authenticate);

// 员工列表
router.get('/employees', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { search = '', department_id = '', status = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (e.full_name LIKE ? OR e.employee_no LIKE ? OR e.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (department_id) { where += ' AND e.department_id = ?'; params.push(department_id); }
  if (status) { where += ' AND e.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM employees e ${where}`).get(...params).cnt;
  const employees = db.prepare(`
    SELECT e.*, d.name as dept_name FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    ${where} ORDER BY e.employee_no LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(employees, total, page, limit));
});

// 新增员工
router.post('/employees', (req, res) => {
  const db = getDb();
  const data = req.body;
  const id = uuidv4();
  const empNo = 'EMP' + String(Date.now()).slice(-6);
  try {
    db.prepare(`
      INSERT INTO employees (id, employee_no, full_name, gender, birth_date, id_card, phone, email, department_id, position, hire_date, contract_type, contract_end, salary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.employee_no || empNo, data.full_name, data.gender, data.birth_date, data.id_card, data.phone, data.email, data.department_id, data.position, data.hire_date, data.contract_type || '正式', data.contract_end, data.salary || 0, 'active');
    res.json({ id, employee_no: data.employee_no || empNo, message: '员工创建成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 更新员工
router.put('/employees/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  db.prepare(`
    UPDATE employees SET full_name=?, gender=?, phone=?, email=?, department_id=?, position=?, salary=?, status=?, updated_at=datetime('now')
    WHERE id=?
  `).run(d.full_name, d.gender, d.phone, d.email, d.department_id, d.position, d.salary, d.status, req.params.id);
  res.json({ message: '更新成功' });
});

// 招聘职位列表
router.get('/jobs', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { status = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND j.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM job_postings j ${where}`).get(...params).cnt;
  const jobs = db.prepare(`
    SELECT j.*, d.name as dept_name,
           (SELECT COUNT(*) FROM candidates WHERE job_id = j.id) as applicant_count
    FROM job_postings j LEFT JOIN departments d ON j.department_id = d.id
    ${where} ORDER BY j.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(jobs, total, page, limit));
});

// 新增招聘职位
router.post('/jobs', (req, res) => {
  const db = getDb();
  const { title, department_id, headcount, salary_min, salary_max, requirements, description } = req.body;
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO job_postings (id, title, department_id, headcount, salary_min, salary_max, requirements, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, title, department_id, headcount || 1, salary_min, salary_max, requirements, description);
    res.json({ id, message: '职位发布成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 更新招聘职位
router.put('/jobs/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  try {
    db.prepare(`UPDATE job_postings SET title=?, department_id=?, headcount=?, salary_min=?, salary_max=?, requirements=?, description=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).run(d.title, d.department_id, d.headcount, d.salary_min, d.salary_max, d.requirements, d.description, d.status, req.params.id);
    res.json({ message: '更新成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 删除招聘职位
router.delete('/jobs/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM job_postings WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// 应聘者列表
router.get('/candidates', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const total = db.prepare('SELECT COUNT(*) as cnt FROM candidates c').get().cnt;
  const candidates = db.prepare(`
    SELECT c.*, j.title as job_title FROM candidates c
    LEFT JOIN job_postings j ON c.job_id = j.id
    ORDER BY c.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json(paginate(candidates, total, page, limit));
});

// 绩效考核列表
router.get('/performance', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const total = db.prepare('SELECT COUNT(*) as cnt FROM performance_reviews pr').get().cnt;
  const reviews = db.prepare(`
    SELECT pr.*, e.full_name as emp_name, e.employee_no, d.name as dept_name, u.full_name as reviewer_name
    FROM performance_reviews pr
    JOIN employees e ON pr.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN users u ON pr.reviewer_id = u.id
    ORDER BY pr.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json(paginate(reviews, total, page, limit));
});

// 培训列表
router.get('/trainings', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { status = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM trainings ${where}`).get(...params).cnt;
  const trainings = db.prepare(`SELECT * FROM trainings ${where} ORDER BY start_date DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json(paginate(trainings, total, page, limit));
});

// 新增培训
router.post('/trainings', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO trainings (id, title, type, trainer, start_date, end_date, location, max_participants, cost, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, d.title, d.type, d.trainer, d.start_date, d.end_date, d.location, d.max_participants || 30, d.cost || 0, 'planned', d.description);
  res.json({ id, message: '培训计划创建成功' });
});

// HR统计
router.get('/stats', (req, res) => {
  const db = getDb();
  const totalEmployees = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE status='active'").get().cnt;
  const newHires = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE hire_date >= date('now', '-30 days') AND status='active'").get().cnt;
  const openJobs = db.prepare("SELECT COUNT(*) as cnt FROM job_postings WHERE status='open'").get().cnt;
  const totalCandidates = db.prepare("SELECT COUNT(*) as cnt FROM candidates").get().cnt;
  const deptStats = db.prepare(`
    SELECT d.name, COUNT(e.id) as count
    FROM departments d LEFT JOIN employees e ON d.id = e.department_id AND e.status='active'
    GROUP BY d.id ORDER BY count DESC
  `).all();
  const avgSalary = db.prepare("SELECT AVG(salary) as avg FROM employees WHERE status='active'").get().avg || 0;
  res.json({ totalEmployees, newHires, openJobs, totalCandidates, deptStats, avgSalary: Math.round(avgSalary) });
});

module.exports = router;
