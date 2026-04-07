const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { parsePagination, paginate } = require('../../middleware/pagination');

const router = express.Router();
router.use(authenticate);

// 供应商列表
router.get('/suppliers', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { search = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (name LIKE ? OR contact_person LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM suppliers ${where}`).get(...params).cnt;
  const suppliers = db.prepare(`SELECT * FROM suppliers ${where} ORDER BY credit_rating, name LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json(paginate(suppliers, total, page, limit));
});

router.post('/suppliers', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO suppliers (id, name, contact_person, contact_phone, contact_email, address, category, credit_rating, payment_terms, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, d.name, d.contact_person, d.contact_phone, d.contact_email, d.address, d.category, d.credit_rating || 'B', d.payment_terms || 'net30', d.notes, d.status || 'active');
    res.json({ id, message: '供应商创建成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 更新供应商
router.put('/suppliers/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  try {
    db.prepare(`UPDATE suppliers SET name=?, contact_person=?, contact_phone=?, contact_email=?, address=?, category=?, credit_rating=?, payment_terms=?, notes=?, status=?, updated_at=datetime('now') WHERE id=?`
    ).run(d.name, d.contact_person, d.contact_phone, d.contact_email, d.address, d.category, d.credit_rating, d.payment_terms, d.notes, d.status, req.params.id);
    res.json({ message: '更新成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 删除供应商
router.delete('/suppliers/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (e) { res.status(400).json({ error: '删除失败，该供应商可能有关联数据' }); }
});

// 产品列表
router.get('/products', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { search = '', category = '', low_stock = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (p.name LIKE ? OR p.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { where += ' AND p.category = ?'; params.push(category); }
  if (low_stock === '1') { where += ' AND p.stock_qty <= p.min_stock'; }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM products p ${where}`).get(...params).cnt;
  const products = db.prepare(`
    SELECT p.*, s.name as supplier_name FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ${where} ORDER BY p.code LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json(paginate(products, total, page, limit));
});

router.post('/products', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO products (id, code, name, category, unit, cost_price, sale_price, stock_qty, min_stock, max_stock, supplier_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, d.code, d.name, d.category, d.unit || '件', d.cost_price || 0, d.sale_price || 0, d.stock_qty || 0, d.min_stock || 10, d.max_stock || 1000, d.supplier_id, d.description);
    res.json({ id, message: '产品创建成功' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/products/:id', (req, res) => {
  const db = getDb();
  const d = req.body;
  db.prepare(`UPDATE products SET name=?, category=?, unit=?, cost_price=?, sale_price=?, min_stock=?, max_stock=?, status=?, updated_at=datetime('now') WHERE id=?`
  ).run(d.name, d.category, d.unit, d.cost_price, d.sale_price, d.min_stock, d.max_stock, d.status, req.params.id);
  res.json({ message: '更新成功' });
});

// 采购订单
router.get('/purchase-orders', (req, res) => {
  const db = getDb();
  const { page, limit, offset } = parsePagination(req.query);
  const { status = '' } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (status) { where += ' AND po.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM purchase_orders po ${where}`).get(...params).cnt;
  const orders = db.prepare(`
    SELECT po.*, s.name as supplier_name, u.full_name as creator_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
    ${where} ORDER BY po.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  const result = orders.map(o => {
    const items = db.prepare(`
      SELECT poi.*, p.name as product_name, p.unit FROM purchase_order_items poi
      JOIN products p ON poi.product_id = p.id WHERE poi.order_id = ?
    `).all(o.id);
    return { ...o, items };
  });
  res.json(paginate(result, total, page, limit));
});

router.post('/purchase-orders', (req, res) => {
  const db = getDb();
  const d = req.body;
  const id = uuidv4();
  const orderNo = 'PO' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(Date.now()).slice(-3);
  const totalAmount = (d.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const insertOrder = db.transaction(() => {
    db.prepare(`INSERT INTO purchase_orders (id, order_no, supplier_id, total_amount, status, order_date, expected_date, created_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, orderNo, d.supplier_id, totalAmount, 'draft', d.order_date || new Date().toISOString().slice(0, 10), d.expected_date, req.user.id, d.notes);
    for (const item of (d.items || [])) {
      db.prepare(`INSERT INTO purchase_order_items (id, order_id, product_id, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price);
    }
  });
  insertOrder();
  res.json({ id, order_no: orderNo, message: '采购订单创建成功' });
});

// 更新采购订单状态
router.put('/purchase-orders/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(status, req.params.id);
  
  // 如果已收货，更新库存
  if (status === 'received') {
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    const items = db.prepare('SELECT * FROM purchase_order_items WHERE order_id = ?').all(req.params.id);
    for (const item of items) {
      const prod = db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(item.product_id);
      if (prod) {
        const newQty = prod.stock_qty + item.quantity;
        db.prepare('UPDATE products SET stock_qty = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newQty, item.product_id);
        db.prepare(`INSERT INTO inventory_transactions (id, product_id, type, quantity, before_qty, after_qty, reference_id, reference_type, operator_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), item.product_id, 'in', item.quantity, prod.stock_qty, newQty, req.params.id, 'purchase_order', req.user.id);
      }
    }
  }
  res.json({ message: '状态更新成功' });
});

// 库存统计
router.get('/inventory/stats', (req, res) => {
  const db = getDb();
  const totalProducts = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE status=\'active\'').get().cnt;
  const lowStock = db.prepare('SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= min_stock AND status=\'active\'').get().cnt;
  const totalValue = db.prepare('SELECT SUM(stock_qty * cost_price) as val FROM products WHERE status=\'active\'').get().val || 0;
  const categoryStats = db.prepare('SELECT category, COUNT(*) as count, SUM(stock_qty) as total_qty FROM products WHERE status=\'active\' GROUP BY category').all();
  const recentTx = db.prepare(`
    SELECT it.*, p.name as product_name, u.full_name as operator_name
    FROM inventory_transactions it JOIN products p ON it.product_id = p.id
    LEFT JOIN users u ON it.operator_id = u.id ORDER BY it.created_at DESC LIMIT 20
  `).all();
  res.json({ totalProducts, lowStock, totalValue: Math.round(totalValue), categoryStats, recentTx });
});

module.exports = router;
