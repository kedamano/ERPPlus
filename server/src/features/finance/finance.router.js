const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { parsePagination, paginate } = require('../../middleware/pagination');

const router = express.Router();
router.use(authenticate);

// 科目列表
router.get('/accounts', (req, res) => {
  const db = getDb();
  const accounts = db.prepare('SELECT * FROM accounts ORDER BY code').all();
  res.json(accounts);
});

// 凭证列表
router.get('/vouchers', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { status = '', date_from = '', date_to = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND v.status = ?'; params.push(status); }
  if (date_from) { where += ' AND v.date >= ?'; params.push(date_from); }
  if (date_to) { where += ' AND v.date <= ?'; params.push(date_to); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM vouchers v ${where}`).get(...params).cnt;
  const vouchers = db.prepare(`
    SELECT v.*, u.full_name as creator_name FROM vouchers v
    LEFT JOIN users u ON v.created_by = u.id
    ${where} ORDER BY v.date DESC, v.voucher_no DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const result = vouchers.map(v => {
    const items = db.prepare(`
      SELECT vi.*, a.name as account_name, a.code as account_code FROM voucher_items vi
      JOIN accounts a ON vi.account_id = a.id WHERE vi.voucher_id = ?
    `).all(v.id);
    return { ...v, items };
  });
  res.json(paginate(result, total, page, limit));
});

// 新增凭证
router.post('/vouchers', (req, res) => {
  try {
    const db = getDb();
    const d = req.body;

    // 校验必填字段
    if (!d.date) return res.status(400).json({ error: '凭证日期不能为空' });
    if (!d.items || d.items.length === 0) return res.status(400).json({ error: '凭证至少需要一条明细' });
    for (const item of d.items) {
      if (!item.account_id) return res.status(400).json({ error: '每条明细必须选择会计科目' });
    }

    const id = uuidv4();
    const vno = 'V' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(Date.now()).slice(-4);
    const totalDebit = d.items.reduce((s, i) => s + (i.debit || 0), 0);
    const totalCredit = d.items.reduce((s, i) => s + (i.credit || 0), 0);

    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO vouchers (id, voucher_no, date, type, description, total_debit, total_credit, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, vno, d.date, d.type || 'general', d.description, totalDebit, totalCredit, 'draft', req.user?.id || null);
      for (const item of d.items) {
        db.prepare(`INSERT INTO voucher_items (id, voucher_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(uuidv4(), id, item.account_id, item.description, item.debit || 0, item.credit || 0);
      }
    });
    tx();
    res.json({ id, voucher_no: vno, message: '凭证创建成功' });
  } catch (e) {
    console.error('Create voucher error:', e);
    res.status(500).json({ error: '创建凭证失败: ' + e.message });
  }
});

// 发票列表
router.get('/invoices', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { type = '', status = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (type) { where += ' AND i.type = ?'; params.push(type); }
  if (status) { where += ' AND i.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM invoices i ${where}`).get(...params).cnt;
  const invoices = db.prepare(`
    SELECT i.*, c.name as customer_name, s.name as supplier_name FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(invoices, total, page, limit));
});

// 新增发票
router.post('/invoices', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  const invNo = (d.type === 'receivable' ? 'AR' : 'AP') + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(Date.now()).slice(-4);
  const total = (d.amount || 0) * (1 + (d.tax_rate || 0.13));
  try {
    db.prepare(`INSERT INTO invoices (id, invoice_no, type, customer_id, supplier_id, amount, tax, total, due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, invNo, d.type, d.customer_id, d.supplier_id, d.amount || 0, (d.amount || 0) * (d.tax_rate || 0.13), total, d.due_date, 'unpaid', d.notes);
    res.json({ id, invoice_no: invNo, message: '发票创建成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 发票付款
router.patch('/invoices/:id/pay', (req, res) => {
  const db = getDb();
  const { amount } = req.body;
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: '发票不存在' });
  const payAmt = amount || (inv.total - inv.paid_amount);
  const newPaid = inv.paid_amount + payAmt;
  const newStatus = newPaid >= inv.total ? 'paid' : 'partial';
  db.prepare('UPDATE invoices SET paid_amount=?, status=?, updated_at=datetime(\'now\') WHERE id=?').run(newPaid, newStatus, req.params.id);
  res.json({ message: newStatus === 'paid' ? '已全部付清' : '部分付款成功', paid_amount: newPaid, status: newStatus });
});

// 删除发票
router.delete('/invoices/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (e) { res.status(400).json({ error: '删除失败' }); }
});

// 财务统计
router.get('/stats', (req, res) => {
  const db = getDb();
  const cashBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1001'").get()?.balance || 0;
  const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1002'").get()?.balance || 0;
  const receivables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='receivable' AND status!='paid'").get()?.amt || 0;
  const payables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='payable' AND status!='paid'").get()?.amt || 0;
  const overdueReceivables = db.prepare("SELECT COUNT(*) as cnt FROM invoices WHERE type='receivable' AND due_date < date('now') AND status != 'paid'").get().cnt;
  const monthlyIncome = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
    FROM invoices WHERE type='receivable' AND created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();
  const monthlyExpense = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
    FROM invoices WHERE type='payable' AND created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();
  res.json({ cashBalance, bankBalance, receivables, payables, overdueReceivables, monthlyIncome, monthlyExpense,
    totalAssets: cashBalance + bankBalance + receivables,
    taxPayable: db.prepare("SELECT balance FROM accounts WHERE code='2221'").get()?.balance || 0 });
});

module.exports = router;
