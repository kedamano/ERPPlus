/**
 * BI模块测试数据生成脚本（v3 - 修复列数匹配）
 * 覆盖：员工、客户、销售线索、工单、库存交易、发票、项目任务等
 * 日期分布在当前月份的过去12个月内
 */
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./src/database/db');

function generateTestData() {
  const db = getDb();
  const NOW = new Date();
  const CURRENT_YEAR = NOW.getFullYear();
  const CURRENT_MONTH = NOW.getMonth();

  // ========== 获取已有基础数据 ==========
  const users = db.prepare("SELECT id FROM users").all().map(u => u.id);
  const departments = db.prepare("SELECT id, name FROM departments").all();
  const customers = db.prepare("SELECT id, name FROM customers WHERE status='active'").all();
  const products = db.prepare("SELECT id, code, name, cost_price, sale_price, stock_qty, min_stock, max_stock, supplier_id FROM products WHERE status='active'").all();
  const projects = db.prepare("SELECT id FROM projects").all().map(p => p.id);
  const suppliers = db.prepare("SELECT id FROM suppliers WHERE status='active'").all().map(s => s.id);

  const deptMap = {};
  departments.forEach(d => deptMap[d.name] = d.id);
  const deptIds = Object.values(deptMap);

  console.log(`基础数据: ${users.length}用户, ${departments.length}部门, ${customers.length}客户, ${products.length}产品, ${projects.length}项目, ${suppliers.length}供应商`);

  const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randomBetween = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
  const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

  // 生成过去 monthsBack 个月内的随机日期
  function randomPastDate(monthsBack = 12) {
    const monthOffset = randomInt(0, monthsBack);
    const m = new Date(CURRENT_YEAR, CURRENT_MONTH - monthOffset, randomInt(1, 28));
    return m.toISOString().slice(0, 19).replace('T', ' ');
  }

  let totalInserted = 0;

  // ========== 1. 员工（补充至 30+ 人） ==========
  const surnames = ['王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','胡','朱','高','林','何','郭','马','罗','梁','宋','郑','谢','韩','唐','冯','于','董','萧','程','曹','袁','邓','许','傅','沈','曾','彭','吕'];
  const givenNames = ['伟','芳','娜','敏','静','丽','强','磊','洋','勇','军','杰','涛','明','超','霞','秀英','华','慧','建华','志远','海燕','文博','晓峰','雪梅','俊豪','佳琪','思远','梦瑶','宇航','浩然','雨萱','子涵','梓萱','一诺','欣怡','语桐','铭轩','奕辰'];
  const positions = ['软件工程师','前端开发','后端开发','测试工程师','产品经理','UI设计师','运维工程师','数据分析师','会计','出纳','销售代表','销售主管','客服专员','采购专员','仓库管理员','质检员','生产工人','行政专员','法务专员','市场专员'];
  const genders = ['男','女'];

  const existingEmpNos = db.prepare("SELECT employee_no FROM employees").all().map(e => e.employee_no);
  let empCounter = existingEmpNos.length > 0
    ? Math.max(...existingEmpNos.map(n => parseInt(n.replace('EMP', ''), 10))) + 1
    : 10;

  // 只插入必要的列，其余用默认值
  const insertEmp = db.prepare(`
    INSERT INTO employees (id, employee_no, full_name, gender, birth_date, phone, email, department_id, position, hire_date, contract_type, salary, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const existingEmpCount = db.prepare("SELECT COUNT(*) as cnt FROM employees").get().cnt;
  const empNeeded = Math.max(0, 30 - existingEmpCount);

  for (let i = 0; i < empNeeded; i++) {
    let empNo;
    do { empNo = `EMP${String(empCounter++).padStart(3, '0')}`; } while (existingEmpNos.includes(empNo));
    const surname = random(surnames);
    const given = random(givenNames);
    const name = surname + given;
    const gender = random(genders);
    const dept = random(deptIds);
    const position = random(positions);
    const salary = randomBetween(6000, 35000);
    const hireMonth = randomInt(0, 18);
    const hireDate = new Date(CURRENT_YEAR, CURRENT_MONTH - hireMonth, randomInt(1, 28));
    const birthYear = randomInt(1975, 2000);
    const birthMonth = randomInt(1, 12);
    const birthDay = randomInt(1, 28);

    insertEmp.run(
      uuidv4(), empNo, name, gender,
      `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`,
      `138${String(randomInt(10000000, 99999999))}`,
      `${name.toLowerCase()}@erp.com`,
      dept, position,
      hireDate.toISOString().slice(0, 10),
      random(['正式','正式','正式','实习']),
      salary, 'active'
    );
    totalInserted++;
  }

  // ========== 2. 客户（补充至 25+ 个） ==========
  const industries = ['信息技术','制造业','金融业','房地产','零售业','新能源','医药健康','教育培训','物流运输','农业','餐饮','文化传媒','建筑工程','汽车','化工'];
  const provinces = ['北京市','上海市','广东省','浙江省','江苏省','四川省','湖北省','山东省','福建省','河南省','湖南省','安徽省','重庆市','陕西省','辽宁省'];
  const cities = {
    '北京市':'北京','上海市':'上海','广东省':'深圳','浙江省':'杭州','江苏省':'南京',
    '四川省':'成都','湖北省':'武汉','山东省':'济南','福建省':'福州','河南省':'郑州',
    '湖南省':'长沙','安徽省':'合肥','重庆市':'重庆','陕西省':'西安','辽宁省':'大连'
  };
  const customerNames = [
    '腾讯云计算公司','阿里网络技术公司','字节跳动科技','百度在线网络',
    '京东集团股份','美团科技','网易杭州网络','小米科技',
    '三一重工股份','海尔智家股份','中联重科','徐工集团',
    '招商银行股份','中国平安保险','中信证券股份','兴业银行',
    '万科企业股份','保利发展控股','龙湖集团','碧桂园服务',
    '永辉超市股份','物美科技','大润发流通','叮咚买菜',
    '宁德时代新能源','隆基绿能科技','通威股份','阳光电源',
    '恒瑞医药股份','药明康德','迈瑞医疗','复星医药',
    '新东方教育','好未来教育','猿辅导教育','达内科技',
    '顺丰控股股份','京东物流集团','菜鸟网络','中通快递',
    '中粮集团','牧原食品','温氏食品','新希望六和',
    '海底捞控股','百胜中国','瑞幸咖啡','绝味食品',
    '万达电影','光线传媒','芒果超媒','分众传媒',
    '中国交建股份','中国中铁','中国铁建','中国中冶',
    '上汽集团','长城汽车','广汽集团','吉利汽车',
  ];

  const insertCust = db.prepare(`
    INSERT INTO customers (id, name, type, industry, contact_person, contact_phone, contact_email, address, city, province, credit_level, owner_id, annual_value, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const existingCustNames = db.prepare("SELECT name FROM customers").all().map(c => c.name);
  const customerTypes = ['大型企业','中型企业','小型企业'];
  const creditLevels = ['A','A','A','B','B','B','C'];

  for (const name of customerNames) {
    if (existingCustNames.includes(name)) continue;
    const province = random(provinces);
    const city = cities[province] || province.slice(0, 2);
    const industry = random(industries);
    const type = random(customerTypes);
    const credit = random(creditLevels);
    const surname = random(surnames);
    const given = random(givenNames);

    insertCust.run(
      uuidv4(), name, type, industry,
      surname + given, `139${String(randomInt(10000000, 99999999))}`, `contact@${name.slice(0,4).toLowerCase()}.com`,
      `${city}市某某区某某路${randomInt(1,999)}号`, city, province,
      credit, random(users), randomBetween(200000, 8000000), 'active'
    );
    totalInserted++;
  }

  // ========== 3. 销售线索（50条，分散在12个月内） ==========
  const allCustomers = db.prepare("SELECT id, name FROM customers WHERE status='active'").all();
  const leadTitles = [
    'ERP系统升级采购','智能仓储管理系统','数据分析平台建设','云计算服务年度续约',
    'IoT设备批量采购','网络安全解决方案','AI训练服务器采购','视频会议系统部署',
    '企业邮箱迁移','CRM系统实施','供应链优化咨询','质量检测设备采购',
    '自动化产线改造','能效管理系统','智能门禁系统','机房扩建项目',
    '网络带宽升级','办公设备批量更新','物流追踪系统','客户服务系统升级',
    '电子签章系统','财务共享中心建设','人力资源系统','考勤管理系统',
    '文档管理系统','项目管理系统','合同管理系统','报销管理系统',
    '差旅管理平台','会议预订系统','访客管理系统','资产管理系统',
    '智能停车系统','楼宇自控系统','消防报警系统','视频监控系统',
    '数据备份方案','容灾恢复系统','负载均衡设备','CDN加速服务',
    'SSL证书续费','域名注册续费','云服务器扩容','对象存储服务',
    '短信通知服务','邮件推送服务','小程序开发','APP开发外包',
    '网站改版项目','SEO优化服务',
  ];

  const stages = ['lead','lead','qualified','qualified','proposal','proposal','negotiation','won','lost'];
  const insertLead = db.prepare(`
    INSERT INTO sales_leads (id, title, customer_id, customer_name, amount, stage, probability, expected_close, owner_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 50; i++) {
    const cust = random(allCustomers);
    const stage = random(stages);
    const probMap = { lead: 20, qualified: 40, proposal: 60, negotiation: 75, won: 100, lost: 0 };
    const targetMonth = i % 12;
    const createdDate = new Date(CURRENT_YEAR, CURRENT_MONTH - 11 + targetMonth, randomInt(1, 28));
    const expectedClose = new Date(createdDate.getFullYear(), createdDate.getMonth() + randomInt(1, 6), randomInt(1, 28));

    insertLead.run(
      uuidv4(),
      leadTitles[i % leadTitles.length],
      cust.id, cust.name,
      randomBetween(50000, 3000000),
      stage, probMap[stage],
      expectedClose.toISOString().slice(0, 10),
      random(users), '',
      createdDate.toISOString().slice(0, 19).replace('T', ' '),
      createdDate.toISOString().slice(0, 19).replace('T', ' ')
    );
    totalInserted++;
  }

  // ========== 4. 服务工单（30条） ==========
  const ticketTypes = ['support','support','support','complaint','consult'];
  const ticketPriorities = ['low','medium','medium','high','high'];
  const ticketStatuses = ['open','in_progress','resolved','closed'];
  const ticketTitles = [
    '系统登录异常','数据导出功能报错','报表生成超时','权限配置问题','批量导入失败',
    '移动端页面显示异常','API接口响应慢','数据同步延迟','账号锁定无法登录','审批流程卡住',
    '打印功能异常','文件上传失败','消息通知未收到','搜索功能失效','图表显示错误',
    '产品使用咨询','系统操作培训','接口对接咨询','定制化需求沟通','价格方案咨询',
    '产品质量投诉','交付延迟投诉','售后服务投诉','合同条款投诉','技术支持响应慢',
    '服务器部署支持','数据库优化','性能调优','安全漏洞修复','备份恢复协助',
  ];

  const insertTicket = db.prepare(`
    INSERT INTO service_requests (id, title, customer_id, type, priority, status, description, assignee_id, created_by, resolved_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 30; i++) {
    const cust = random(allCustomers);
    const status = random(ticketStatuses);
    const targetMonth = i % 12;
    const createdDate = new Date(CURRENT_YEAR, CURRENT_MONTH - 11 + targetMonth, randomInt(1, 28));
    const resolvedAt = (status === 'resolved' || status === 'closed')
      ? new Date(createdDate.getFullYear(), createdDate.getMonth() + randomInt(0, 2), randomInt(1, 28)).toISOString().slice(0, 19).replace('T', ' ')
      : null;

    insertTicket.run(
      uuidv4(), ticketTitles[i % ticketTitles.length], cust.id,
      random(ticketTypes), random(ticketPriorities), status,
      '客户反馈的问题描述，需要技术团队跟进处理。', random(users), random(users),
      resolvedAt,
      createdDate.toISOString().slice(0, 19).replace('T', ' '),
      createdDate.toISOString().slice(0, 19).replace('T', ' ')
    );
    totalInserted++;
  }

  // ========== 5. 发票（60条，每月5条，覆盖12个月） ==========
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, invoice_no, type, customer_id, supplier_id, amount, tax, total, due_date, status, paid_amount, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 60; i++) {
    const type = i % 2 === 0 ? 'receivable' : 'payable';
    const isReceivable = type === 'receivable';
    const amount = randomBetween(10000, 500000);
    const tax = Math.round(amount * randomBetween(0.06, 0.13) * 100) / 100;
    const total = Math.round((amount + tax) * 100) / 100;
    const status = random(['unpaid','unpaid','partial','paid','paid']);
    const paidAmount = status === 'paid' ? total : status === 'partial' ? Math.round(total * randomBetween(0.2, 0.8) * 100) / 100 : 0;
    const targetMonth = i % 12;
    const createdDate = new Date(CURRENT_YEAR, CURRENT_MONTH - 11 + targetMonth, randomInt(1, 28));
    const dueDate = new Date(createdDate.getFullYear(), createdDate.getMonth() + randomInt(1, 3), randomInt(1, 28));

    const invoiceNo = isReceivable
      ? `INV-R-${String(202600000 + i).padStart(9, '0')}`
      : `INV-P-${String(202600000 + i).padStart(9, '0')}`;

    insertInvoice.run(
      uuidv4(), invoiceNo, type,
      isReceivable ? random(allCustomers).id : null,
      isReceivable ? null : random(suppliers),
      amount, tax, total,
      dueDate.toISOString().slice(0, 10),
      status, paidAmount, '',
      createdDate.toISOString().slice(0, 19).replace('T', ' '),
      createdDate.toISOString().slice(0, 19).replace('T', ' ')
    );
    totalInserted++;
  }

  // ========== 6. 库存交易记录（120条，每月10条） ==========
  const insertInvTrans = db.prepare(`
    INSERT INTO inventory_transactions (id, product_id, type, quantity, before_qty, after_qty, reference_id, reference_type, operator_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 120; i++) {
    const prod = random(products);
    const type = Math.random() > 0.45 ? 'in' : 'out';
    const qty = type === 'in' ? randomInt(10, 200) : randomInt(5, 100);
    const currentStock = db.prepare("SELECT stock_qty FROM products WHERE id = ?").get(prod.id)?.stock_qty || 0;
    const beforeQty = currentStock;
    const afterQty = type === 'in' ? beforeQty + qty : Math.max(0, beforeQty - qty);

    const targetMonth = i % 12;
    const createdDate = new Date(CURRENT_YEAR, CURRENT_MONTH - 11 + targetMonth, randomInt(1, 28));

    insertInvTrans.run(
      uuidv4(), prod.id, type, qty, beforeQty, afterQty,
      null, type === 'in' ? 'purchase' : 'sale', random(users),
      type === 'in' ? '采购入库' : '销售出库',
      createdDate.toISOString().slice(0, 19).replace('T', ' ')
    );

    // 更新产品库存
    db.prepare("UPDATE products SET stock_qty = ? WHERE id = ?").run(afterQty, prod.id);
    totalInserted++;
  }

  // ========== 7. 项目（补充至 14+ 个） ==========
  const projectNames = [
    '华润置地智慧社区项目','苏宁数字化营销平台','新能源智能监控系统',
    '中交建BIM协同平台','顺丰物流优化系统','海尔IoT中台建设',
    '宁德时代产线MES','永辉供应链管理平台','万达数字标牌系统',
    '海底捞会员运营平台',
  ];

  const insertProj = db.prepare(`
    INSERT INTO projects (id, name, code, customer_id, manager_id, budget, actual_cost, start_date, end_date, status, priority, progress, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const projStatuses = ['planning','in_progress','in_progress','in_progress','completed','on_hold'];

  for (let i = 0; i < 10; i++) {
    const cust = Math.random() > 0.15 ? random(allCustomers) : null;
    const status = random(projStatuses);
    const progress = status === 'completed' ? 100 : status === 'planning' ? randomInt(0, 10) : randomInt(10, 90);
    const budget = randomBetween(200000, 5000000);
    const actualCost = budget * (progress / 100) * randomBetween(0.7, 1.1);
    const startMonth = randomInt(0, 10);
    const startDate = new Date(CURRENT_YEAR, CURRENT_MONTH - startMonth, randomInt(1, 28));
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + randomInt(3, 12), randomInt(1, 28));

    insertProj.run(
      uuidv4(), projectNames[i],
      `PRJ2026${String(10 + i).padStart(3, '0')}`,
      cust ? cust.id : null,
      random(users), budget, Math.round(actualCost * 100) / 100,
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10),
      status, random(['low','medium','medium','high']),
      progress, `${projectNames[i]}的详细描述`
    );
    totalInserted++;
  }

  // ========== 8. 任务（50条，每月4-5条） ==========
  const allProjects = db.prepare("SELECT id FROM projects").all().map(p => p.id);
  const taskTitles = [
    '需求分析','方案设计','原型设计','UI设计','前端开发','后端开发','接口开发','数据库设计',
    '单元测试','集成测试','性能测试','安全测试','用户验收','部署上线','文档编写',
    '技术选型','架构设计','代码审查','Bug修复','数据迁移','培训支持','运维监控',
    '竞品分析','市场调研','客户访谈','合同拟定','进度汇报','风险评估','资源协调',
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, assignee_id, priority, status, start_date, due_date, completed_at, progress, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const taskStatuses = ['todo','in_progress','done','done','done'];

  for (let i = 0; i < 50; i++) {
    const proj = random(allProjects);
    const status = random(taskStatuses);
    const targetMonth = i % 12;
    const startDate = new Date(CURRENT_YEAR, CURRENT_MONTH - 11 + targetMonth, randomInt(1, 28));
    const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + randomInt(1, 4), randomInt(1, 28));
    const completedAt = status === 'done'
      ? new Date(startDate.getFullYear(), startDate.getMonth() + randomInt(0, 2), randomInt(1, 28)).toISOString().slice(0, 19).replace('T', ' ')
      : null;

    insertTask.run(
      uuidv4(), proj, taskTitles[i % taskTitles.length], '',
      random(users), random(['low','medium','medium','high']), status,
      startDate.toISOString().slice(0, 10),
      dueDate.toISOString().slice(0, 10),
      completedAt,
      status === 'done' ? 100 : status === 'in_progress' ? randomInt(10, 80) : 0,
      startDate.toISOString().slice(0, 19).replace('T', ' ')
    );
    totalInserted++;
  }

  // ========== 9. 招聘信息（10条） ==========
  const jobTitles = [
    '高级Java开发工程师','前端React开发','数据分析师','产品经理',
    'Python后端开发','DevOps工程师','UI/UX设计师','项目经理',
    '测试开发工程师','云计算架构师',
  ];

  const insertJob = db.prepare(`
    INSERT INTO job_postings (id, title, department_id, headcount, salary_min, salary_max, requirements, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 10; i++) {
    const salaryMin = randomBetween(8000, 25000);
    insertJob.run(
      uuidv4(), jobTitles[i], random(deptIds),
      randomInt(1, 3), salaryMin, Math.round(salaryMin * randomBetween(1.3, 2.0)),
      `${jobTitles[i]}岗位要求：3年以上工作经验，本科及以上学历`,
      `招聘${jobTitles[i]}，负责公司核心业务系统的开发和维护。`,
      random(['open','open','closed'])
    );
    totalInserted++;
  }

  // ========== 10. 绩效考核（20条） ==========
  const allEmployees = db.prepare("SELECT id FROM employees WHERE status='active'").all().map(e => e.id);
  const insertPerf = db.prepare(`
    INSERT INTO performance_reviews (id, employee_id, reviewer_id, period, score, grade, work_quality, work_efficiency, team_cooperation, innovation, attendance, comments, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const periods = ['2025年度','2025年上半年','2025年下半年','2025年Q1','2025年Q2','2025年Q3','2025年Q4'];

  for (let i = 0; i < 20; i++) {
    const emp = random(allEmployees);
    const score = randomBetween(60, 98);
    const grade = score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 85 ? 'B+' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D';

    insertPerf.run(
      uuidv4(), emp, random(users), random(periods),
      Math.round(score), grade,
      randomBetween(65, 100), randomBetween(65, 100), randomBetween(65, 100),
      randomBetween(60, 100), randomBetween(80, 100),
      '考核评语', random(['draft','approved','approved'])
    );
    totalInserted++;
  }

  console.log(`\n✅ 测试数据插入完成！共插入 ${totalInserted} 条新记录`);
}

try {
  generateTestData();
} catch (e) {
  console.error('❌ 测试数据生成失败:', e);
}
