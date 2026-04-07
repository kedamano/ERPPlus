const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

function seedDatabase() {
  const db = getDb();

  // 检查是否已有数据
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (existing.cnt > 0) {
    console.log('数据库已有数据，跳过种子数据');
    return;
  }

  console.log('开始插入种子数据...');

  // 角色 —— 权限采用 module.action 格式，module 对应前端路由，* 代表全部
  const roles = [
    { id: uuidv4(), name: '超级管理员', description: '系统最高权限，可访问所有模块', permissions: JSON.stringify(['*']) },
    { id: uuidv4(), name: '财务经理', description: '财务模块全权限 + 仪表盘', permissions: JSON.stringify(['dashboard', 'finance', 'inventory', 'ai', 'self']) },
    { id: uuidv4(), name: '人事经理', description: '人力资源模块全权限 + 仪表盘', permissions: JSON.stringify(['dashboard', 'hr', 'ai', 'self']) },
    { id: uuidv4(), name: '销售经理', description: '客户关系模块全权限 + 仪表盘', permissions: JSON.stringify(['dashboard', 'crm', 'projects', 'ai', 'self']) },
    { id: uuidv4(), name: '普通员工', description: '仅仪表盘和个人信息', permissions: JSON.stringify(['dashboard', 'ai', 'self']) },
  ];
  const insertRole = db.prepare('INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)');
  for (const r of roles) insertRole.run(r.id, r.name, r.description, r.permissions);

  // 部门
  const deptIds = { zb: uuidv4(), hr: uuidv4(), cw: uuidv4(), xs: uuidv4(), it: uuidv4(), sc: uuidv4() };
  const insertDept = db.prepare('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)');
  insertDept.run(deptIds.zb, '总经办', '公司总经理办公室');
  insertDept.run(deptIds.hr, '人力资源部', '负责招聘、培训、绩效管理');
  insertDept.run(deptIds.cw, '财务部', '负责财务核算、预算管理');
  insertDept.run(deptIds.xs, '销售部', '负责市场开拓和客户维护');
  insertDept.run(deptIds.it, '信息技术部', '负责IT系统维护和开发');
  insertDept.run(deptIds.sc, '生产部', '负责产品生产和质量管理');

  // 用户
  const hash = bcrypt.hashSync('Admin@123', 10);
  const userIds = {
    admin: uuidv4(), manager: uuidv4(), hr: uuidv4(), finance: uuidv4(), sales: uuidv4(), dev: uuidv4()
  };
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, phone, role_id, department_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(userIds.admin, 'admin', 'admin@erp.com', hash, '系统管理员', '13800000001', roles[0].id, deptIds.zb, 'active');
  insertUser.run(userIds.manager, 'zhangwei', 'zhangwei@erp.com', hash, '张伟', '13800000002', roles[0].id, deptIds.zb, 'active');
  insertUser.run(userIds.hr, 'lihua', 'lihua@erp.com', hash, '李华', '13800000003', roles[2].id, deptIds.hr, 'active');
  insertUser.run(userIds.finance, 'wangfang', 'wangfang@erp.com', hash, '王芳', '13800000004', roles[1].id, deptIds.cw, 'active');
  insertUser.run(userIds.sales, 'chenjun', 'chenjun@erp.com', hash, '陈军', '13800000005', roles[3].id, deptIds.xs, 'active');
  insertUser.run(userIds.dev, 'zhaoming', 'zhaoming@erp.com', hash, '赵明', '13800000006', roles[4].id, deptIds.it, 'active');

  // 员工档案
  const empIds = Array.from({ length: 8 }, () => uuidv4());
  const insertEmp = db.prepare(`
    INSERT INTO employees (id, employee_no, full_name, gender, phone, email, department_id, position, hire_date, contract_type, salary, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const empData = [
    [empIds[0], 'EMP001', '张伟', '男', '13800000002', 'zhangwei@erp.com', deptIds.zb, '总经理', '2020-01-01', '正式', 50000, 'active'],
    [empIds[1], 'EMP002', '李华', '女', '13800000003', 'lihua@erp.com', deptIds.hr, 'HR经理', '2020-03-01', '正式', 18000, 'active'],
    [empIds[2], 'EMP003', '王芳', '女', '13800000004', 'wangfang@erp.com', deptIds.cw, '财务经理', '2020-03-15', '正式', 20000, 'active'],
    [empIds[3], 'EMP004', '陈军', '男', '13800000005', 'chenjun@erp.com', deptIds.xs, '销售经理', '2020-05-01', '正式', 15000, 'active'],
    [empIds[4], 'EMP005', '赵明', '男', '13800000006', 'zhaoming@erp.com', deptIds.it, '技术总监', '2021-01-01', '正式', 30000, 'active'],
    [empIds[5], 'EMP006', '刘洋', '男', '13800000007', 'liuyang@erp.com', deptIds.xs, '销售代表', '2021-06-01', '正式', 8000, 'active'],
    [empIds[6], 'EMP007', '孙静', '女', '13800000008', 'sunjing@erp.com', deptIds.hr, 'HR专员', '2022-03-01', '正式', 8000, 'active'],
    [empIds[7], 'EMP008', '周强', '男', '13800000009', 'zhouqiang@erp.com', deptIds.sc, '生产主管', '2021-09-01', '正式', 12000, 'active'],
  ];
  for (const e of empData) insertEmp.run(...e);

  // 供应商
  const supIds = Array.from({ length: 5 }, () => uuidv4());
  const insertSup = db.prepare(`
    INSERT INTO suppliers (id, name, contact_person, contact_phone, contact_email, address, category, credit_rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSup.run(supIds[0], '深圳华强电子有限公司', '李强', '0755-12345678', 'liqiang@huaqiang.com', '深圳市福田区华强北路', '电子元器件', 'A');
  insertSup.run(supIds[1], '上海精密机械制造有限公司', '王建国', '021-87654321', 'wjg@shprecision.com', '上海市浦东新区张江高科', '机械设备', 'A');
  insertSup.run(supIds[2], '广州化工原料有限公司', '陈大明', '020-55556666', 'cdm@gzchemical.com', '广州市番禺区工业大道', '化工原料', 'B');
  insertSup.run(supIds[3], '北京软件科技有限公司', '刘冰', '010-66667777', 'liubing@bjsoft.com', '北京市海淀区中关村', '软件服务', 'A');
  insertSup.run(supIds[4], '苏州包装材料有限公司', '张丽', '0512-88889999', 'zhangli@szpkg.com', '苏州市工业园区', '包装材料', 'B');

  // 产品
  const prodIds = Array.from({ length: 8 }, () => uuidv4());
  const insertProd = db.prepare(`
    INSERT INTO products (id, code, name, category, unit, cost_price, sale_price, stock_qty, min_stock, supplier_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const prodData = [
    [prodIds[0], 'PRD001', '智能传感器模块A型', '电子产品', '个', 85, 180, 450, 50, supIds[0]],
    [prodIds[1], 'PRD002', '精密轴承组件', '机械零件', '套', 120, 280, 200, 30, supIds[1]],
    [prodIds[2], 'PRD003', '环保溶剂FL-500', '化工材料', '桶', 250, 420, 80, 20, supIds[2]],
    [prodIds[3], 'PRD004', '企业管理软件授权', '软件产品', '套', 5000, 15000, 50, 5, supIds[3]],
    [prodIds[4], 'PRD005', '定制包装盒（大）', '包装材料', '个', 3.5, 8, 2000, 500, supIds[4]],
    [prodIds[5], 'PRD006', '工业控制板XK-200', '电子产品', '块', 320, 680, 180, 40, supIds[0]],
    [prodIds[6], 'PRD007', '液压油缸组件', '机械零件', '套', 580, 1200, 60, 15, supIds[1]],
    [prodIds[7], 'PRD008', '防腐涂料HG-01', '化工材料', '桶', 180, 380, 120, 25, supIds[2]],
  ];
  for (const p of prodData) insertProd.run(...p);

  // 客户
  const custIds = Array.from({ length: 8 }, () => uuidv4());
  const insertCust = db.prepare(`
    INSERT INTO customers (id, name, type, industry, contact_person, contact_phone, contact_email, city, province, credit_level, owner_id, annual_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const custData = [
    [custIds[0], '中国建筑第三工程局', '大型企业', '建筑业', '马建华', '13901000001', 'majh@cscec3.com', '北京', '北京市', 'A', userIds.sales, 2800000],
    [custIds[1], '华润置地（北京）有限公司', '大型企业', '房地产', '周晓峰', '13901000002', 'zhouxf@chrl.com.cn', '北京', '北京市', 'A', userIds.sales, 1560000],
    [custIds[2], '格力电器股份有限公司', '大型企业', '制造业', '吴志远', '13901000003', 'wuzy@gree.com', '珠海', '广东省', 'A', userIds.sales, 4200000],
    [custIds[3], '深圳比亚迪电子有限公司', '大型企业', '汽车电子', '林海龙', '13901000004', 'linhl@byd.com', '深圳', '广东省', 'A', userIds.sales, 3500000],
    [custIds[4], '苏宁易购集团股份有限公司', '大型企业', '零售业', '郑建国', '13901000005', 'zhengjg@suning.com', '南京', '江苏省', 'B', userIds.sales, 890000],
    [custIds[5], '杭州新能源科技有限公司', '中型企业', '新能源', '徐明亮', '13901000006', 'xumingl@hzne.com', '杭州', '浙江省', 'B', userIds.sales, 650000],
    [custIds[6], '成都川仪自动化股份有限公司', '中型企业', '自动化', '罗大为', '13901000007', 'luodw@cqauto.com', '成都', '四川省', 'B', userIds.sales, 420000],
    [custIds[7], '武汉钢铁集团有限公司', '大型企业', '钢铁冶金', '黄志强', '13901000008', 'huangzq@wisco.com.cn', '武汉', '湖北省', 'A', userIds.sales, 5100000],
  ];
  for (const c of custData) insertCust.run(...c);

  // 销售线索
  const insertLead = db.prepare(`
    INSERT INTO sales_leads (id, title, customer_id, customer_name, amount, stage, probability, expected_close, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const leadData = [
    [uuidv4(), '格力空调智能控制系统采购', custIds[2], '格力电器股份有限公司', 580000, 'negotiation', 75, '2026-05-30', userIds.sales],
    [uuidv4(), '比亚迪车载控制板批量订单', custIds[3], '深圳比亚迪电子有限公司', 1200000, 'proposal', 60, '2026-06-15', userIds.sales],
    [uuidv4(), '中建三局工程物资采购', custIds[0], '中国建筑第三工程局', 320000, 'qualified', 40, '2026-07-01', userIds.sales],
    [uuidv4(), '苏宁年度软件服务续约', custIds[4], '苏宁易购集团股份有限公司', 180000, 'won', 100, '2026-04-30', userIds.sales],
    [uuidv4(), '新能源储能系统集成项目', custIds[5], '杭州新能源科技有限公司', 860000, 'lead', 20, '2026-08-30', userIds.sales],
    [uuidv4(), '武钢自动化升级改造', custIds[7], '武汉钢铁集团有限公司', 2300000, 'proposal', 55, '2026-09-15', userIds.sales],
  ];
  for (const l of leadData) insertLead.run(...l);

  // 采购订单
  const poIds = [uuidv4(), uuidv4(), uuidv4()];
  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (id, order_no, supplier_id, total_amount, status, order_date, expected_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPOItem = db.prepare(`
    INSERT INTO purchase_order_items (id, order_id, product_id, quantity, unit_price, amount)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertPO.run(poIds[0], 'PO20260401001', supIds[0], 47000, 'approved', '2026-04-01', '2026-04-15', userIds.finance);
  insertPOItem.run(uuidv4(), poIds[0], prodIds[0], 200, 85, 17000);
  insertPOItem.run(uuidv4(), poIds[0], prodIds[5], 60, 320, 19200);
  insertPO.run(poIds[1], 'PO20260402001', supIds[1], 59200, 'received', '2026-03-20', '2026-04-05', userIds.finance);
  insertPOItem.run(uuidv4(), poIds[1], prodIds[1], 120, 120, 14400);
  insertPOItem.run(uuidv4(), poIds[1], prodIds[6], 40, 580, 23200);
  insertPO.run(poIds[2], 'PO20260403001', supIds[2], 41400, 'draft', '2026-04-03', '2026-04-20', userIds.finance);
  insertPOItem.run(uuidv4(), poIds[2], prodIds[2], 60, 250, 15000);
  insertPOItem.run(uuidv4(), poIds[2], prodIds[7], 80, 180, 14400);

  // 财务科目
  const acctIds = {
    cash: uuidv4(), bank: uuidv4(), ar: uuidv4(), prepay: uuidv4(),
    ap: uuidv4(), tax: uuidv4(), income: uuidv4(), cost: uuidv4(), expense: uuidv4()
  };
  const insertAcct = db.prepare('INSERT INTO accounts (id, code, name, type, balance) VALUES (?, ?, ?, ?, ?)');
  insertAcct.run(acctIds.cash, '1001', '库存现金', 'asset', 85000);
  insertAcct.run(acctIds.bank, '1002', '银行存款', 'asset', 3280000);
  insertAcct.run(acctIds.ar, '1122', '应收账款', 'asset', 890000);
  insertAcct.run(acctIds.prepay, '1123', '预付账款', 'asset', 120000);
  insertAcct.run(acctIds.ap, '2202', '应付账款', 'liability', 560000);
  insertAcct.run(acctIds.tax, '2221', '应交税费', 'liability', 180000);
  insertAcct.run(acctIds.income, '6001', '主营业务收入', 'income', 0);
  insertAcct.run(acctIds.cost, '6401', '主营业务成本', 'expense', 0);
  insertAcct.run(acctIds.expense, '6601', '销售费用', 'expense', 0);

  // 项目
  const projIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  const insertProj = db.prepare(`
    INSERT INTO projects (id, name, code, customer_id, manager_id, budget, actual_cost, start_date, end_date, status, priority, progress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProj.run(projIds[0], '格力智能工厂自动化改造项目', 'PRJ2026001', custIds[2], userIds.admin, 2500000, 860000, '2026-02-01', '2026-09-30', 'in_progress', 'high', 35);
  insertProj.run(projIds[1], '比亚迪供应链系统集成', 'PRJ2026002', custIds[3], userIds.admin, 1800000, 420000, '2026-03-01', '2026-08-31', 'in_progress', 'high', 25);
  insertProj.run(projIds[2], '武钢MES系统升级', 'PRJ2026003', custIds[7], userIds.admin, 3600000, 0, '2026-05-01', '2026-12-31', 'planning', 'medium', 5);
  insertProj.run(projIds[3], '内部ERP系统实施', 'PRJ2026004', null, userIds.admin, 500000, 380000, '2025-10-01', '2026-06-30', 'in_progress', 'high', 78);

  // 项目任务
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, project_id, title, assignee_id, priority, status, due_date, progress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTask.run(uuidv4(), projIds[0], '需求调研与方案设计', userIds.dev, 'high', 'done', '2026-02-28', 100);
  insertTask.run(uuidv4(), projIds[0], '系统架构搭建', userIds.dev, 'high', 'done', '2026-03-15', 100);
  insertTask.run(uuidv4(), projIds[0], '自动化模块开发', userIds.dev, 'high', 'in_progress', '2026-06-30', 40);
  insertTask.run(uuidv4(), projIds[0], '联调测试', userIds.dev, 'medium', 'todo', '2026-08-15', 0);
  insertTask.run(uuidv4(), projIds[1], '接口设计与对接', userIds.dev, 'high', 'in_progress', '2026-05-31', 60);
  insertTask.run(uuidv4(), projIds[3], '数据库设计', userIds.dev, 'high', 'done', '2025-11-30', 100);
  insertTask.run(uuidv4(), projIds[3], '前端界面开发', userIds.dev, 'high', 'in_progress', '2026-04-30', 80);
  insertTask.run(uuidv4(), projIds[3], '用户培训', userIds.hr, 'medium', 'todo', '2026-06-15', 0);

  // 绩效考核
  const insertPerf = db.prepare(`
    INSERT INTO performance_reviews (id, employee_id, reviewer_id, period, score, grade, work_quality, work_efficiency, team_cooperation, innovation, attendance, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPerf.run(uuidv4(), empIds[0], userIds.hr, '2025年度', 92, 'A', 95, 90, 92, 88, 100, 'approved');
  insertPerf.run(uuidv4(), empIds[1], userIds.hr, '2025年度', 88, 'B+', 90, 85, 92, 82, 98, 'approved');
  insertPerf.run(uuidv4(), empIds[2], userIds.hr, '2025年度', 95, 'A+', 96, 94, 95, 90, 100, 'approved');
  insertPerf.run(uuidv4(), empIds[3], userIds.hr, '2025年度', 85, 'B+', 88, 86, 80, 78, 96, 'approved');

  // 通知
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, content, type)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertNotif.run(uuidv4(), userIds.admin, '系统初始化完成', 'ERP系统已成功完成初始化，所有模块已就绪', 'success');
  insertNotif.run(uuidv4(), userIds.admin, '采购订单待审批', '供应商深圳华强电子提交的采购申请需要您审批', 'warning');
  insertNotif.run(uuidv4(), userIds.admin, '季度报表已生成', '2026年Q1财务报表已自动生成，请查阅', 'info');
  insertNotif.run(uuidv4(), userIds.finance, '发票处理提醒', '有3张应付发票即将到期，请及时处理', 'warning');
  insertNotif.run(uuidv4(), userIds.sales, '新商机提醒', '客户比亚迪电子提交了新的合作意向，请跟进', 'info');

  // 服务请求（工单）
  const insertSR = db.prepare(`
    INSERT INTO service_requests (id, title, customer_id, type, priority, status, description, assignee_id, created_by, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSR.run(uuidv4(), '格力空调智能控制系统报修', custIds[2], 'support', 'high', 'in_progress', '客户反馈智能温控系统出现间歇性故障，影响正常生产。需要技术人员现场排查硬件连接和固件版本。', userIds.dev, userIds.sales, null);
  insertSR.run(uuidv4(), '比亚迪车载控制板质量投诉', custIds[3], 'complaint', 'high', 'open', '客户投诉最近一批次车载控制板存在焊接不良问题，良品率低于合同约定的99.5%，要求紧急处理并给出整改方案。', userIds.dev, userIds.sales, null);
  insertSR.run(uuidv4(), '华润置地系统升级咨询', custIds[1], 'consult', 'medium', 'resolved', '客户咨询现有楼宇管理系统的升级方案，包括云部署方案、数据迁移策略和培训计划。已提供初步方案文档。', userIds.admin, userIds.sales, '2026-04-02 14:30:00');
  insertSR.run(uuidv4(), '苏宁易购软件授权延期处理', custIds[4], 'support', 'low', 'resolved', '客户软件授权即将到期，需要协助完成续费流程和新的授权文件发放。', userIds.admin, userIds.sales, '2026-04-01 10:15:00');
  insertSR.run(uuidv4(), '新能源科技储能系统调试', custIds[5], 'support', 'medium', 'open', '新安装的储能系统需要进行现场调试和参数优化，客户要求安排技术团队本周内到达现场。', userIds.dev, userIds.sales, null);
  insertSR.run(uuidv4(), '川仪自动化仪表标定服务', custIds[6], 'support', 'low', 'in_progress', '客户购买的精密仪表需要年度标定服务，已安排技术人员远程指导。', userIds.dev, userIds.sales, null);

  console.log('种子数据插入完成！');
  console.log('管理员账号: admin / Admin@123');
}

module.exports = { seedDatabase };
