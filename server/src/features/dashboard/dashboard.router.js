const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();

  // 核心KPI
  const totalRevenue = db.prepare("SELECT SUM(total) as total FROM invoices WHERE type='receivable'").get()?.total || 0;
  const totalCustomers = db.prepare("SELECT COUNT(*) as cnt FROM customers WHERE status='active'").get().cnt;
  const totalEmployees = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE status='active'").get().cnt;
  const activeProjects = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status='in_progress'").get().cnt;
  const totalOrders = db.prepare("SELECT COUNT(*) as cnt FROM purchase_orders").get().cnt;
  const pendingOrders = db.prepare("SELECT COUNT(*) as cnt FROM purchase_orders WHERE status='draft' OR status='pending'").get().cnt;
  const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code='1002'").get()?.balance || 0;
  const lowStockItems = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= min_stock AND status='active'").get().cnt;

  // 月度收入趋势（近6个月）
  const revenueTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           SUM(CASE WHEN type='receivable' THEN total ELSE 0 END) as income,
           SUM(CASE WHEN type='payable' THEN total ELSE 0 END) as expense
    FROM invoices WHERE created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();

  // 销售漏斗
  const salesFunnel = db.prepare(`
    SELECT stage, COUNT(*) as count, SUM(amount) as amount FROM sales_leads GROUP BY stage ORDER BY count DESC
  `).all();

  // 部门人员分布
  const deptDistribution = db.prepare(`
    SELECT d.name, COUNT(e.id) as count FROM departments d
    LEFT JOIN employees e ON d.id = e.department_id AND e.status='active'
    GROUP BY d.id ORDER BY count DESC
  `).all();

  // 项目进度
  const projectProgress = db.prepare(`
    SELECT p.name, p.progress, p.status, p.priority, p.end_date,
           (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_tasks,
           (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
    FROM projects p WHERE p.status IN ('in_progress', 'planning') ORDER BY p.priority DESC, p.progress DESC LIMIT 5
  `).all();

  // 库存预警
  const stockAlerts = db.prepare(`
    SELECT p.code, p.name, p.stock_qty, p.min_stock, p.unit, s.name as supplier_name
    FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.stock_qty <= p.min_stock AND p.status='active' ORDER BY (p.stock_qty - p.min_stock) LIMIT 8
  `).all();

  // 最新通知
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(req.user.id);

  // 近期任务
  const recentTasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.full_name as assignee_name FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.status != 'done' ORDER BY t.due_date ASC LIMIT 8
  `).all();

  // 客户分布（按地区）
  const customerByProvince = db.prepare(`
    SELECT province, COUNT(*) as count FROM customers WHERE status='active' GROUP BY province ORDER BY count DESC LIMIT 8
  `).all();

  res.json({
    kpis: { totalRevenue, totalCustomers, totalEmployees, activeProjects, totalOrders, pendingOrders, bankBalance, lowStockItems,
      receivables: db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='receivable' AND status!='paid'").get()?.amt || 0 },
    revenueTrend, salesFunnel, deptDistribution, projectProgress, stockAlerts, notifications, recentTasks, customerByProvince
  });
});

// 通知标记已读
router.put('/notifications/:id/read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'ok' });
});

// 全部标记已读
router.put('/notifications/read-all', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'ok' });
});

module.exports = router;
