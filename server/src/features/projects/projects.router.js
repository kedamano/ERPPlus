const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { parsePagination, paginate } = require('../../middleware/pagination');

const router = express.Router();
router.use(authenticate);

// 项目列表
router.get('/', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { status = '', search = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND p.status = ?'; params.push(status); }
  if (search) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM projects p ${where}`).get(...params).cnt;
  const projects = db.prepare(`
    SELECT p.*, c.name as customer_name, u.full_name as manager_name,
           (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
           (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
    FROM projects p
    LEFT JOIN customers c ON p.customer_id = c.id
    LEFT JOIN users u ON p.manager_id = u.id
    ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(projects, total, page, limit));
});

// 新增项目
router.post('/', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  const code = 'PRJ' + new Date().getFullYear() + String(Date.now()).slice(-3);
  db.prepare(`INSERT INTO projects (id, name, code, customer_id, manager_id, budget, start_date, end_date, status, priority, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, d.name, d.code || code, d.customer_id, d.manager_id || req.user.id, d.budget || 0, d.start_date, d.end_date, 'planning', d.priority || 'medium', d.description);
  res.json({ id, code: d.code || code, message: '项目创建成功' });
});

// 更新项目
router.put('/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  db.prepare(`UPDATE projects SET name=?, status=?, priority=?, progress=?, budget=?, actual_cost=?, start_date=?, end_date=?, updated_at=datetime('now') WHERE id=?`
  ).run(d.name, d.status, d.priority, d.progress, d.budget, d.actual_cost, d.start_date, d.end_date, req.params.id);
  res.json({ message: '更新成功' });
});

// 项目任务
router.get('/:id/tasks', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { status = '' } = req.query;
  let where = 'WHERE t.project_id = ?';
  const params = [req.params.id];
  if (status) { where += ' AND t.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM tasks t ${where}`).get(...params).cnt;
  const tasks = db.prepare(`
    SELECT t.*, u.full_name as assignee_name FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(tasks, total, page, limit));
});

// 新增任务
router.post('/:id/tasks', (req, res) => {
  const db = getDb();
  const d = req.body;
  const taskId = uuidv4();
  db.prepare(`INSERT INTO tasks (id, project_id, title, description, assignee_id, priority, status, start_date, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(taskId, req.params.id, d.title, d.description, d.assignee_id, d.priority || 'medium', 'todo', d.start_date, d.due_date);
  res.json({ id: taskId, message: '任务创建成功' });
});

// 更新任务状态
router.put('/tasks/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  const completedAt = d.status === 'done' ? 'datetime(\'now\')' : 'NULL';
  db.prepare(`UPDATE tasks SET title=?, status=?, progress=?, priority=?, assignee_id=?, due_date=?, completed_at=(CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END) WHERE id=?`
  ).run(d.title, d.status, d.progress || 0, d.priority, d.assignee_id, d.due_date, d.status, req.params.id);
  res.json({ message: '更新成功' });
});

// 删除任务
router.delete('/tasks/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// 删除项目
router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ message: '项目已删除' });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// 项目统计
router.get('/stats/overview', (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as cnt FROM projects').get().cnt;
  const inProgress = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'in_progress'").get().cnt;
  const planning = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'planning'").get().cnt;
  const completed = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'completed'").get().cnt;
  const totalBudget = db.prepare('SELECT SUM(budget) as total FROM projects').get().total || 0;
  const totalCost = db.prepare('SELECT SUM(actual_cost) as total FROM projects').get().total || 0;
  const taskStats = db.prepare(`SELECT status, COUNT(*) as count FROM tasks GROUP BY status`).all();
  const overdueProjects = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE end_date < date('now') AND status NOT IN ('completed', 'cancelled')").get().cnt;
  res.json({ total, inProgress, planning, completed, totalBudget, totalCost, taskStats, overdueProjects });
});

module.exports = router;
