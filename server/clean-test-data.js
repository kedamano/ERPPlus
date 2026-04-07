const { getDb } = require('./src/database/db');
const db = getDb();

console.log('清理旧测试数据...');

// 临时关闭外键约束
db.pragma('foreign_keys = OFF');

// 按正确顺序清理（先子表后父表）
db.exec(`
  DELETE FROM inventory_transactions;
`);

// 删除新增的任务（非种子数据的任务）
db.exec(`
  DELETE FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'PRJ2026%');
  DELETE FROM tasks WHERE created_at < '2026-03-01';
`);

db.exec(`
  DELETE FROM service_requests WHERE created_at < '2026-03-01';
  DELETE FROM sales_leads WHERE created_at < '2026-03-01';
  DELETE FROM invoices;
  DELETE FROM projects WHERE code LIKE 'PRJ2026%';
  DELETE FROM performance_reviews;
  DELETE FROM job_postings;
  DELETE FROM employees WHERE employee_no LIKE 'EMP0%' AND CAST(SUBSTR(employee_no, 4) AS INTEGER) >= 10;
  DELETE FROM customers WHERE created_at >= '2026-04-05';
`);

// 恢复外键约束
db.pragma('foreign_keys = ON');

// 重置产品库存到初始值
db.exec(`
  UPDATE products SET stock_qty = CASE 
    WHEN code = 'PRD001' THEN 450
    WHEN code = 'PRD002' THEN 200
    WHEN code = 'PRD003' THEN 80
    WHEN code = 'PRD004' THEN 50
    WHEN code = 'PRD005' THEN 2000
    WHEN code = 'PRD006' THEN 180
    WHEN code = 'PRD007' THEN 60
    WHEN code = 'PRD008' THEN 120
    ELSE stock_qty
  END
`);

console.log('清理完成，各表剩余数据:');
const tables = ['employees','customers','sales_leads','service_requests','invoices','inventory_transactions','projects','tasks','performance_reviews','job_postings'];
for (const t of tables) {
  const cnt = db.prepare('SELECT COUNT(*) as cnt FROM ' + t).get().cnt;
  console.log(`  ${t}: ${cnt}`);
}
