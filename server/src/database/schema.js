const { getDb } = require('./db');

function initDatabase() {
  const db = getDb();

  // 用户与权限
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      role_id TEXT REFERENCES roles(id),
      department_id TEXT,
      status TEXT DEFAULT 'active',
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT REFERENCES departments(id),
      manager_id TEXT REFERENCES users(id),
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 员工档案
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      employee_no TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT,
      birth_date TEXT,
      id_card TEXT,
      phone TEXT,
      email TEXT,
      department_id TEXT REFERENCES departments(id),
      position TEXT,
      hire_date TEXT,
      contract_type TEXT,
      contract_end TEXT,
      salary REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      address TEXT,
      emergency_contact TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 招聘
    CREATE TABLE IF NOT EXISTS job_postings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department_id TEXT REFERENCES departments(id),
      headcount INTEGER DEFAULT 1,
      salary_min REAL,
      salary_max REAL,
      requirements TEXT,
      description TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      resume TEXT,
      job_id TEXT REFERENCES job_postings(id),
      stage TEXT DEFAULT 'applied',
      score INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 客户管理
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'enterprise',
      industry TEXT,
      contact_person TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      credit_level TEXT DEFAULT 'A',
      tags TEXT DEFAULT '[]',
      source TEXT,
      owner_id TEXT REFERENCES users(id),
      status TEXT DEFAULT 'active',
      annual_value REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales_leads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      customer_name TEXT,
      contact TEXT,
      amount REAL DEFAULT 0,
      stage TEXT DEFAULT 'lead',
      probability INTEGER DEFAULT 20,
      expected_close TEXT,
      owner_id TEXT REFERENCES users(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      type TEXT DEFAULT 'support',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      description TEXT,
      assignee_id TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 供应链
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      address TEXT,
      category TEXT,
      credit_rating TEXT DEFAULT 'B',
      payment_terms TEXT DEFAULT 'net30',
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT DEFAULT '件',
      cost_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      stock_qty REAL DEFAULT 0,
      min_stock REAL DEFAULT 10,
      max_stock REAL DEFAULT 1000,
      supplier_id TEXT REFERENCES suppliers(id),
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      order_no TEXT UNIQUE NOT NULL,
      supplier_id TEXT REFERENCES suppliers(id),
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      order_date TEXT DEFAULT (date('now')),
      expected_date TEXT,
      created_by TEXT REFERENCES users(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES purchase_orders(id),
      product_id TEXT REFERENCES products(id),
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      product_id TEXT REFERENCES products(id),
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      before_qty REAL,
      after_qty REAL,
      reference_id TEXT,
      reference_type TEXT,
      operator_id TEXT REFERENCES users(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 财务
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id TEXT REFERENCES accounts(id),
      balance REAL DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      voucher_no TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'general',
      description TEXT,
      total_debit REAL DEFAULT 0,
      total_credit REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS voucher_items (
      id TEXT PRIMARY KEY,
      voucher_id TEXT REFERENCES vouchers(id),
      account_id TEXT REFERENCES accounts(id),
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      customer_id TEXT REFERENCES customers(id),
      supplier_id TEXT REFERENCES suppliers(id),
      amount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL DEFAULT 0,
      due_date TEXT,
      status TEXT DEFAULT 'unpaid',
      paid_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 项目管理
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      customer_id TEXT REFERENCES customers(id),
      manager_id TEXT REFERENCES users(id),
      budget REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'planning',
      priority TEXT DEFAULT 'medium',
      progress INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      title TEXT NOT NULL,
      description TEXT,
      assignee_id TEXT REFERENCES users(id),
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      start_date TEXT,
      due_date TEXT,
      completed_at TEXT,
      progress INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 系统日志
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      target_id TEXT,
      detail TEXT,
      ip TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 通知
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 绩效考核
    CREATE TABLE IF NOT EXISTS performance_reviews (
      id TEXT PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id),
      reviewer_id TEXT REFERENCES users(id),
      period TEXT NOT NULL,
      score REAL,
      grade TEXT,
      work_quality REAL,
      work_efficiency REAL,
      team_cooperation REAL,
      innovation REAL,
      attendance REAL,
      comments TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 培训
    CREATE TABLE IF NOT EXISTS trainings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT,
      trainer TEXT,
      start_date TEXT,
      end_date TEXT,
      location TEXT,
      max_participants INTEGER,
      actual_participants INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      status TEXT DEFAULT 'planned',
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 数据库迁移：为已有表补缺失的列
  const tableInfo = (table) => {
    try { return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name); } catch { return []; }
  };
  const addColIfMissing = (table, col) => {
    // 白名单验证表名和列名，防止SQL注入
    const validTables = ['suppliers', 'job_postings', 'invoices', 'customers', 'products', 
                         'users', 'employees', 'departments', 'roles', 'projects', 'tasks',
                         'purchase_orders', 'purchase_order_items', 'inventory_transactions',
                         'accounts', 'vouchers', 'voucher_items', 'sales_leads', 'service_requests',
                         'candidates', 'job_postings', 'audit_logs', 'notifications', 
                         'performance_reviews', 'trainings'];
    const validCols = ['updated_at', 'created_at', 'deleted_at', 'status', 'version'];
    
    if (!validTables.includes(table)) {
      console.error(`  迁移失败: 无效的表名 ${table}`);
      return;
    }
    if (!validCols.includes(col) && !/^[a-z_][a-z0-9_]*$/i.test(col)) {
      console.error(`  迁移失败: 无效的列名 ${col}`);
      return;
    }
    
    if (!tableInfo(table).includes(col)) {
      db.prepare(`ALTER TABLE "${table}" ADD COLUMN "${col}" TEXT DEFAULT ''`).run();
      console.log(`  迁移: ${table} 添加 ${col} 列`);
    }
  };
  addColIfMissing('suppliers', 'updated_at');
  addColIfMissing('job_postings', 'updated_at');
  addColIfMissing('invoices', 'updated_at');

  console.log('数据库初始化完成');
}

module.exports = { initDatabase };
