const express = require('express');
const { getDb } = require('../../database/db');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ===================== 综合概览 KPI =====================
router.get('/overview', (req, res) => {
  try {
    const db = getDb();
    // 人力资源 KPI
    const totalEmployees = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE status='active'").get().cnt;
    const newEmployeesMonth = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE status='active' AND hire_date >= date('now', '-30 days')").get().cnt;
    const avgSalary = db.prepare("SELECT AVG(salary) as val FROM employees WHERE status='active'").get().val || 0;
    const openJobs = db.prepare("SELECT COUNT(*) as cnt FROM job_postings WHERE status='open'").get().cnt;
    const totalCandidates = db.prepare("SELECT COUNT(*) as cnt FROM candidates").get().cnt;

    // CRM KPI
    const totalCustomers = db.prepare("SELECT COUNT(*) as cnt FROM customers WHERE status='active'").get().cnt;
    const wonDealAmount = db.prepare("SELECT SUM(amount) as total FROM sales_leads WHERE stage='won'").get().total || 0;
    const openLeads = db.prepare("SELECT COUNT(*) as cnt FROM sales_leads WHERE stage NOT IN ('won','lost')").get().cnt;
    const openTickets = db.prepare("SELECT COUNT(*) as cnt FROM service_requests WHERE status IN ('open','in_progress')").get().cnt;

    // 供应链 KPI
    const totalProducts = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE status='active'").get().cnt;
    const lowStock = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= min_stock AND status='active'").get().cnt;
    const inventoryValue = db.prepare("SELECT SUM(stock_qty * cost_price) as val FROM products WHERE status='active'").get().val || 0;
    const pendingOrders = db.prepare("SELECT COUNT(*) as cnt FROM purchase_orders WHERE status IN ('draft','pending','approved')").get().cnt;

    // 财务 KPI
    const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code='1002'").get()?.balance || 0;
    const receivables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='receivable' AND status!='paid'").get()?.amt || 0;
    const payables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='payable' AND status!='paid'").get()?.amt || 0;
    const monthRevenue = db.prepare("SELECT SUM(amount) as total FROM invoices WHERE type='receivable' AND created_at >= date('now', '-30 days')").get().total || 0;

    // 项目 KPI
    const activeProjects = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status='in_progress'").get().cnt;
    const overdueTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status != 'done' AND due_date < date('now')").get().cnt;
    const totalTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks").get().cnt;
    const doneTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status='done'").get().cnt;

    res.json({
      hr: { totalEmployees, newEmployeesMonth, avgSalary: Math.round(avgSalary), openJobs, totalCandidates },
      crm: { totalCustomers, wonDealAmount, openLeads, openTickets },
      inventory: { totalProducts, lowStock, inventoryValue: Math.round(inventoryValue), pendingOrders },
      finance: { bankBalance, receivables, payables, monthRevenue },
      projects: { activeProjects, overdueTasks, totalTasks, doneTasks, completionRate: totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0 },
    });
  } catch (e) {
    console.error('BI overview error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== 多维分析 =====================
router.get('/multi-dimension', (req, res) => {
  try {
    const db = getDb();
    const { dimension = 'all' } = req.query;

    // 按客户行业分布
    const byIndustry = db.prepare(`
      SELECT industry || '其他' as name, COUNT(*) as count, SUM(annual_value) as totalValue
      FROM customers WHERE status='active'
      GROUP BY CASE WHEN industry IS NULL OR industry='' THEN '其他' ELSE industry END
      ORDER BY count DESC LIMIT 10
    `).all();

    // 按客户地区分布
    const byRegion = db.prepare(`
      SELECT COALESCE(province, '未知') as name, COUNT(*) as count
      FROM customers WHERE status='active'
      GROUP BY province ORDER BY count DESC LIMIT 10
    `).all();

    // 按产品分类的库存和销量
    const byProductCategory = db.prepare(`
      SELECT category as name,
             COUNT(*) as count,
             SUM(stock_qty) as totalStock,
             SUM(stock_qty * cost_price) as totalCost,
             SUM(stock_qty * sale_price) as totalSaleValue
      FROM products WHERE status='active'
      GROUP BY category ORDER BY totalCost DESC LIMIT 10
    `).all();

    // 按供应商信用评级分布
    const bySupplierRating = db.prepare(`
      SELECT credit_rating as name, COUNT(*) as count
      FROM suppliers WHERE status='active'
      GROUP BY credit_rating
    `).all();

    // 按部门人数和薪资分布
    const byDepartment = db.prepare(`
      SELECT d.name, COUNT(e.id) as count,
             AVG(e.salary) as avgSalary,
             SUM(e.salary) as totalSalary
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status='active'
      GROUP BY d.id ORDER BY count DESC
    `).all();

    // 按项目状态分布
    const byProjectStatus = db.prepare(`
      SELECT status as name, COUNT(*) as count, SUM(budget) as totalBudget, SUM(actual_cost) as totalCost
      FROM projects GROUP BY status
    `).all();

    // 按任务优先级分布
    const byTaskPriority = db.prepare(`
      SELECT priority as name, COUNT(*) as count,
             SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
      FROM tasks GROUP BY priority
    `).all();

    // 采购订单按状态
    const byOrderStatus = db.prepare(`
      SELECT status as name, COUNT(*) as count, SUM(total_amount) as totalAmount
      FROM purchase_orders GROUP BY status
    `).all();

    // 发票按状态
    const byInvoiceStatus = db.prepare(`
      SELECT status as name, COUNT(*) as count, SUM(total) as totalAmount
      FROM invoices GROUP BY status
    `).all();

    // 按月份的销售趋势（近12个月）
    const salesTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             SUM(CASE WHEN stage='won' THEN amount ELSE 0 END) as wonAmount,
             COUNT(CASE WHEN stage='won' THEN 1 END) as wonCount,
             COUNT(*) as totalCount
      FROM sales_leads WHERE created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    res.json({
      byIndustry, byRegion, byProductCategory, bySupplierRating,
      byDepartment, byProjectStatus, byTaskPriority,
      byOrderStatus, byInvoiceStatus, salesTrend,
    });
  } catch (e) {
    console.error('BI multi-dimension error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== 趋势分析 =====================
router.get('/trend', (req, res) => {
  try {
    const db = getDb();
    const { period = '6m' } = req.query;
    const months = period === '12m' ? 12 : period === '3m' ? 3 : 6;

    // 财务收支趋势
    const financeTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             SUM(CASE WHEN type='receivable' THEN amount ELSE 0 END) as income,
             SUM(CASE WHEN type='payable' THEN amount ELSE 0 END) as expense
      FROM invoices WHERE created_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    // 应收应付趋势
    const arApTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             SUM(CASE WHEN type='receivable' THEN total ELSE 0 END) as arTotal,
             SUM(CASE WHEN type='receivable' THEN paid_amount ELSE 0 END) as arPaid,
             SUM(CASE WHEN type='payable' THEN total ELSE 0 END) as apTotal,
             SUM(CASE WHEN type='payable' THEN paid_amount ELSE 0 END) as apPaid
      FROM invoices WHERE created_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    // 新增客户趋势
    const customerTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM customers WHERE created_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    // 新增线索趋势
    const leadTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, SUM(amount) as amount
      FROM sales_leads WHERE created_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    // 入库出库趋势
    const inventoryTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             SUM(CASE WHEN type='in' THEN quantity ELSE 0 END) as inbound,
             SUM(CASE WHEN type='out' THEN quantity ELSE 0 END) as outbound
      FROM inventory_transactions WHERE created_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    // 任务完成趋势
    const taskTrend = db.prepare(`
      SELECT strftime('%Y-%m', completed_at) as month, COUNT(*) as count
      FROM tasks WHERE completed_at IS NOT NULL AND completed_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', completed_at) ORDER BY month
    `).all();

    // 工单趋势
    const ticketTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             COUNT(*) as total,
             SUM(CASE WHEN status='resolved' OR status='closed' THEN 1 ELSE 0 END) as resolved
      FROM service_requests WHERE created_at >= date('now', '-${months} months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    res.json({
      financeTrend, arApTrend, customerTrend, leadTrend,
      inventoryTrend, taskTrend, ticketTrend,
    });
  } catch (e) {
    console.error('BI trend error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== 预测分析 =====================
router.get('/forecast', (req, res) => {
  try {
    const db = getDb();

    // 简单线性回归预测下一期
    function linearForecast(data, key) {
      const vals = data.map(d => d[key] || 0);
      if (vals.length < 2) return null;
      const n = vals.length;
      const xs = vals.map((_, i) => i);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = vals.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((a, x, i) => a + x * vals[i], 0);
      const sumX2 = xs.reduce((a, x) => a + x * x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      return Math.round(slope * n + intercept);
    }

    // 获取最近6个月收入数据
    const incomeData = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
      FROM invoices WHERE type='receivable' AND created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    const expenseData = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
      FROM invoices WHERE type='payable' AND created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    const customerData = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as total
      FROM customers WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    const leadData = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
      FROM sales_leads WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at) ORDER BY month
    `).all();

    // 预测下月值
    const forecastIncome = linearForecast(incomeData, 'total');
    const forecastExpense = linearForecast(expenseData, 'total');
    const forecastCustomers = linearForecast(customerData, 'total');
    const forecastLeadValue = linearForecast(leadData, 'total');

    // 库存消耗预测（基于最近出库记录）
    const consumption = db.prepare(`
      SELECT p.id, p.name, p.category, p.stock_qty, p.min_stock, p.unit,
             SUM(CASE WHEN it.type='out' THEN it.quantity ELSE 0 END) as outQty,
             COUNT(CASE WHEN it.type='out' THEN 1 END) as outDays
      FROM products p
      LEFT JOIN inventory_transactions it ON p.id = it.product_id AND it.created_at >= date('now', '-30 days')
      WHERE p.status='active'
      GROUP BY p.id
      HAVING outQty > 0
      ORDER BY p.stock_qty ASC LIMIT 10
    `).all().map(item => ({
      ...item,
      dailyConsumption: Math.round(item.outQty / 30 * 10) / 10,
      daysRemaining: item.outQty > 0 ? Math.round(item.stock_qty / (item.outQty / 30)) : 999,
    }));

    // 销售赢单率预测
    const leadStages = db.prepare(`
      SELECT stage, COUNT(*) as count, SUM(amount) as amount FROM sales_leads GROUP BY stage
    `).all();
    const totalLeads = leadStages.reduce((s, l) => s + l.count, 0);
    const wonLeads = leadStages.find(l => l.stage === 'won')?.count || 0;
    const winRate = totalLeads > 0 ? Math.round(wonLeads / totalLeads * 100) : 0;
    const pipelineValue = leadStages.filter(l => !['won', 'lost'].includes(l.stage))
      .reduce((s, l) => s + (l.amount || 0), 0);

    // 逾期应收分析
    const overdueInvoices = db.prepare(`
      SELECT i.invoice_no, c.name as customer_name, i.total, i.paid_amount,
             (i.total - i.paid_amount) as remaining, i.due_date,
             JULIANDAY(date('now')) - JULIANDAY(i.due_date) as overdueDays
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.type='receivable' AND i.status != 'paid' AND i.due_date < date('now')
      ORDER BY overdueDays DESC LIMIT 10
    `).all();

    res.json({
      forecastIncome, forecastExpense, forecastCustomers, forecastLeadValue,
      consumption, winRate, pipelineValue,
      overdueInvoices,
      incomeHistory: incomeData,
      expenseHistory: expenseData,
    });
  } catch (e) {
    console.error('BI forecast error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== 自定义报表 =====================
router.get('/report/:type', (req, res) => {
  try {
    const db = getDb();
    const { type } = req.params;
    const { start_date, end_date, group_by } = req.query;

    const dateRange = start_date && end_date
      ? `AND created_at >= '${start_date}' AND created_at <= '${end_date} 23:59:59'`
      : "AND created_at >= date('now', '-30 days')";

    let data = {};

    switch (type) {
      case 'sales': {
        // 销售报表 - 使用独立日期条件，避免共享 dateRange 被污染
        const salesDateRange = start_date && end_date
          ? `AND created_at >= '${start_date}' AND created_at <= '${end_date} 23:59:59'`
          : "AND created_at >= date('now', '-30 days')";
        data.main = db.prepare(`
          SELECT
            CASE WHEN ? = 'customer' THEN COALESCE(customer_name, '未关联')
                 WHEN ? = 'stage' THEN stage
                 ELSE strftime('%Y-%m', created_at) END as groupKey,
            COUNT(*) as count, SUM(amount) as totalAmount, AVG(amount) as avgAmount
          FROM sales_leads WHERE 1=1 ${salesDateRange}
          GROUP BY groupKey ORDER BY totalAmount DESC LIMIT 50
        `).all(group_by, group_by);
        data.summary = db.prepare(`
          SELECT COUNT(*) as totalCount, SUM(amount) as totalAmount,
                 SUM(CASE WHEN stage='won' THEN amount ELSE 0 END) as wonAmount,
                 SUM(CASE WHEN stage='lost' THEN amount ELSE 0 END) as lostAmount
          FROM sales_leads WHERE 1=1 ${salesDateRange}
        `).all()[0];
        break;
      }

      case 'finance': {
        const groupCol = group_by === 'type' ? 'type' : "strftime('%Y-%m', created_at)";
        data.main = db.prepare(`
          SELECT
            CASE WHEN ? = 'type' THEN CASE WHEN type='receivable' THEN '应收' ELSE '应付' END
                 ELSE strftime('%Y-%m', created_at) END as groupKey,
            COUNT(*) as count, SUM(amount) as totalAmount, SUM(tax) as totalTax, SUM(total) as totalWithTax,
            SUM(paid_amount) as totalPaid
          FROM invoices WHERE 1=1 ${dateRange}
          GROUP BY groupKey ORDER BY totalAmount DESC LIMIT 50
        `).all(group_by);
        data.summary = db.prepare(`
          SELECT COUNT(*) as totalCount,
                 SUM(CASE WHEN type='receivable' THEN amount ELSE 0 END) as totalIncome,
                 SUM(CASE WHEN type='payable' THEN amount ELSE 0 END) as totalExpense,
                 SUM(tax) as totalTax,
                 SUM(paid_amount) as totalPaid,
                 SUM(total - paid_amount) as outstanding
          FROM invoices WHERE 1=1 ${dateRange}
        `).all()[0];
        break;
      }

      case 'inventory': {
        data.main = db.prepare(`
          SELECT p.code, p.name, p.category, p.unit, p.stock_qty, p.cost_price, p.sale_price,
                 p.min_stock, p.max_stock, s.name as supplier_name,
                 (p.stock_qty * p.cost_price) as totalCost,
                 CASE WHEN p.stock_qty <= 0 THEN '断货'
                      WHEN p.stock_qty <= p.min_stock THEN '低库存'
                      WHEN p.stock_qty >= p.max_stock THEN '超库存'
                      ELSE '正常' END as stockStatus
          FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.status='active' ORDER BY totalCost DESC LIMIT 100
        `).all();
        data.summary = db.prepare(`
          SELECT COUNT(*) as totalProducts,
                 SUM(stock_qty * cost_price) as totalCostValue,
                 SUM(stock_qty * sale_price) as totalSaleValue,
                 SUM(CASE WHEN stock_qty <= min_stock THEN 1 ELSE 0 END) as lowStockCount,
                 SUM(CASE WHEN stock_qty <= 0 THEN 1 ELSE 0 END) as outOfStockCount,
                 AVG(sale_price - cost_price) as avgMargin
          FROM products WHERE status='active'
        `).all()[0];
        data.transactions = db.prepare(`
          SELECT it.*, p.name as product_name, u.full_name as operator_name
          FROM inventory_transactions it
          JOIN products p ON it.product_id = p.id
          LEFT JOIN users u ON it.operator_id = u.id
          WHERE 1=1 AND it.created_at >= ${start_date && end_date ? `'${start_date}'` : "date('now', '-30 days')"}
            ${end_date ? `AND it.created_at <= '${end_date} 23:59:59'` : ''}
          ORDER BY it.created_at DESC LIMIT 100
        `).all();
        break;
      }

      case 'hr': {
        data.employees = db.prepare(`
          SELECT e.*, d.name as department_name
          FROM employees e LEFT JOIN departments d ON e.department_id = d.id
          WHERE e.status='active' ORDER BY e.hire_date DESC
        `).all();
        data.summary = db.prepare(`
          SELECT COUNT(*) as totalEmployees,
                 AVG(salary) as avgSalary, MAX(salary) as maxSalary, MIN(salary) as minSalary,
                 SUM(salary) as totalSalaryCost
          FROM employees WHERE status='active'
        `).all()[0];
        data.deptStats = db.prepare(`
          SELECT d.name as department, COUNT(e.id) as count,
                 AVG(e.salary) as avgSalary, SUM(e.salary) as totalSalary
          FROM departments d
          LEFT JOIN employees e ON d.id = e.department_id AND e.status='active'
          GROUP BY d.id ORDER BY count DESC
        `).all();
        data.hireTrend = db.prepare(`
          SELECT strftime('%Y-%m', hire_date) as month, COUNT(*) as count
          FROM employees WHERE status='active'
          GROUP BY strftime('%Y-%m', hire_date) ORDER BY month DESC LIMIT 12
        `).all();
        break;
      }

      case 'projects': {
        data.projects = db.prepare(`
          SELECT p.*, c.name as customer_name, u.full_name as manager_name,
                 (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as totalTasks,
                 (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status='done') as doneTasks
          FROM projects p
          LEFT JOIN customers c ON p.customer_id = c.id
          LEFT JOIN users u ON p.manager_id = u.id
          ORDER BY p.progress DESC
        `).all();
        data.summary = db.prepare(`
          SELECT COUNT(*) as totalProjects,
                 SUM(budget) as totalBudget, SUM(actual_cost) as totalCost,
                 AVG(progress) as avgProgress,
                 SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as activeCount,
                 SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completedCount
          FROM projects
        `).all()[0];
        break;
      }

      default:
        return res.status(400).json({ error: '不支持的报表类型: ' + type });
    }

    res.json(data);
  } catch (e) {
    console.error('BI report error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== 报表导出 =====================
router.get('/export/:type', (req, res) => {
  try {
    const db = getDb();
    const { type } = req.params;

    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'sales': {
        const rows = db.prepare(`
          SELECT sl.title as '线索标题', COALESCE(c.name, sl.customer_name) as '客户',
                 sl.amount as '金额', sl.stage as '阶段', sl.probability as '赢单率%',
                 sl.expected_close as '预计成交', u.full_name as '负责人', sl.created_at as '创建时间'
          FROM sales_leads sl
          LEFT JOIN customers c ON sl.customer_id = c.id
          LEFT JOIN users u ON sl.owner_id = u.id
          ORDER BY sl.created_at DESC
        `).all();
        if (!rows.length) return res.json({ message: '暂无数据' });
        const headers = Object.keys(rows[0]);
        csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        filename = `销售报表_${new Date().toISOString().slice(0,10)}.csv`;
        break;
      }

      case 'finance': {
        const rows = db.prepare(`
          SELECT i.invoice_no as '发票号',
                 CASE WHEN i.type='receivable' THEN '应收' ELSE '应付' END as '类型',
                 COALESCE(c.name, s.name, '') as '对方单位',
                 i.amount as '金额', i.tax as '税额', i.total as '含税合计',
                 i.paid_amount as '已付金额', i.due_date as '到期日',
                 CASE i.status WHEN 'paid' THEN '已付清' WHEN 'partial' THEN '部分付' ELSE '未付款' END as '状态',
                 i.created_at as '创建时间'
          FROM invoices i
          LEFT JOIN customers c ON i.customer_id = c.id
          LEFT JOIN suppliers s ON i.supplier_id = s.id
          ORDER BY i.created_at DESC
        `).all();
        if (!rows.length) return res.json({ message: '暂无数据' });
        const headers = Object.keys(rows[0]);
        csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        filename = `财务报表_${new Date().toISOString().slice(0,10)}.csv`;
        break;
      }

      case 'inventory': {
        const rows = db.prepare(`
          SELECT p.code as '产品编码', p.name as '产品名称', p.category as '分类', p.unit as '单位',
                 p.stock_qty as '当前库存', p.cost_price as '成本价', p.sale_price as '销售价',
                 (p.stock_qty * p.cost_price) as '库存总值',
                 p.min_stock as '最低库存', COALESCE(s.name, '') as '供应商'
          FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.status='active' ORDER BY p.code
        `).all();
        if (!rows.length) return res.json({ message: '暂无数据' });
        const headers = Object.keys(rows[0]);
        csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        filename = `库存报表_${new Date().toISOString().slice(0,10)}.csv`;
        break;
      }

      case 'employees': {
        const rows = db.prepare(`
          SELECT e.employee_no as '工号', e.full_name as '姓名', e.gender as '性别',
                 d.name as '部门', e.position as '职位',
                 e.hire_date as '入职日期', e.salary as '薪资', e.phone as '电话', e.email as '邮箱',
                 CASE e.status WHEN 'active' THEN '在职' WHEN 'inactive' THEN '离职' ELSE e.status END as '状态'
          FROM employees e LEFT JOIN departments d ON e.department_id = d.id
          ORDER BY e.employee_no
        `).all();
        if (!rows.length) return res.json({ message: '暂无数据' });
        const headers = Object.keys(rows[0]);
        csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        filename = `员工报表_${new Date().toISOString().slice(0,10)}.csv`;
        break;
      }

      case 'projects': {
        const rows = db.prepare(`
          SELECT p.name as '项目名称', p.code as '项目编号',
           COALESCE(c.name, '') as '客户', u.full_name as '项目经理',
           p.budget as '预算', p.actual_cost as '实际成本', p.progress as '进度%',
           p.start_date as '开始日期', p.end_date as '截止日期',
           CASE p.status WHEN 'planning' THEN '规划中' WHEN 'in_progress' THEN '进行中'
                WHEN 'completed' THEN '已完成' WHEN 'on_hold' THEN '暂停' ELSE p.status END as '状态'
          FROM projects p
          LEFT JOIN customers c ON p.customer_id = c.id
          LEFT JOIN users u ON p.manager_id = u.id
          ORDER BY p.created_at DESC
        `).all();
        if (!rows.length) return res.json({ message: '暂无数据' });
        const headers = Object.keys(rows[0]);
        csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        filename = `项目报表_${new Date().toISOString().slice(0,10)}.csv`;
        break;
      }

      default:
        return res.status(400).json({ error: '不支持的导出类型' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csvContent);
  } catch (e) {
    console.error('BI export error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
