const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middleware/auth');
const { getDb } = require('../../database/db');

function createAIRouter() {
  const router = express.Router();

  // 文件上传配置
  const uploadsDir = path.join(__dirname, '../../../uploads/ai');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    }
  });

  // 文件类型魔数验证（防止扩展名欺骗）
  const fileTypeMagicNumbers = {
    '.jpg': ['FFD8FF'],
    '.jpeg': ['FFD8FF'],
    '.png': ['89504E47'],
    '.gif': ['47494638'],
    '.webp': ['52494646'],
    '.pdf': ['25504446'],
    '.docx': ['504B0304'], // ZIP格式（docx/xlsx都是zip）
    '.xlsx': ['504B0304'],
    '.txt': null // 文本文件无魔数，需要内容验证
  };

  const validateFileContent = (filePath, ext) => {
    try {
      const magic = fileTypeMagicNumbers[ext];
      if (!magic) return true; // 无魔数要求的类型
      
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      
      const fileMagic = buffer.toString('hex').toUpperCase();
      return magic.some(m => fileMagic.startsWith(m));
    } catch (err) {
      return false;
    }
  };

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.docx', '.txt', '.xlsx'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      // 验证扩展名
      if (!allowed.includes(ext)) {
        return cb(new Error('不支持的文件类型'), false);
      }
      
      // 验证文件名（防止路径遍历）
      const basename = path.basename(file.originalname);
      if (basename.includes('..') || /[<>:"|?*]/.test(basename)) {
        return cb(new Error('非法文件名'), false);
      }
      
      cb(null, true);
    }
  });

  // GLM API 配置
  const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const GLM_API_KEY = process.env.GLM_API_KEY || '';

  /**
   * POST /api/ai/chat - 发送消息并获取AI回复（流式）
   */
  router.post('/chat', authenticate, async (req, res) => {
    try {
      const { messages, model = 'glm-4-flash' } = req.body;

      if (!GLM_API_KEY) {
        return res.status(500).json({ error: 'AI服务未配置API密钥，请联系管理员设置 GLM_API_KEY 环境变量' });
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: '消息不能为空' });
      }

      // 设置流式响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // 调用 GLM API（流式）
      const response = await fetch(GLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GLM_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: true,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('GLM API Error:', response.status, errText);
        // 429 速率限制：返回特殊标记让前端自动重试
        if (response.status === 429) {
          res.write(`data: ${JSON.stringify({ error: 'rate_limit', message: '请求过于频繁，请稍后再试。建议切换到免费模型（GLM-4-Flash）以避免限流。' })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ error: `AI服务错误: ${response.status}`, message: errText })}\n\n`);
        }
        res.end();
        return;
      }

      // 转发流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.write('data: [DONE]\n\n');
              res.end();
              break;
            }
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
        } catch (err) {
          console.error('Stream error:', err);
          res.write(`data: ${JSON.stringify({ error: '流传输中断' })}\n\n`);
          res.end();
        }
      };

      pump();
    } catch (err) {
      console.error('Chat error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  /**
   * POST /api/ai/upload - 上传文件（图片/文档）
   */
  router.post('/upload', authenticate, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件大小不能超过10MB' });
        }
        return res.status(400).json({ error: `上传失败: ${err.message}` });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: '请选择要上传的文件' });
        }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);

      // 验证文件内容（防止扩展名欺骗攻击）
      if (!validateFileContent(req.file.path, ext)) {
        // 删除非法文件
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: '文件内容与扩展名不匹配，可能存在安全风险' });
      }

      // 图片生成可访问的 URL（GLM API 不支持 data: URI）
      let imageUrl = null;
      let base64Data = null;
      if (isImage) {
        const fileBuffer = fs.readFileSync(req.file.path);
        base64Data = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
        imageUrl = `http://localhost:3001/uploads/ai/${req.file.filename}`;
      }

      // 如果是文本文件，读取内容
      let textContent = null;
      if (['.txt', '.csv'].includes(ext)) {
        textContent = fs.readFileSync(req.file.path, 'utf-8');
        // 限制文本文件大小，防止内存溢出
        if (textContent.length > 5 * 1024 * 1024) { // 5MB 文本限制
          return res.status(400).json({ error: '文本文件内容过大（超过5MB）' });
        }
      }

      res.json({
        id: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        isImage,
        base64: base64Data,
        imageUrl,
        textContent
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    });
  });

  /**
   * GET /api/ai/models - 获取可用模型列表
   */
  router.get('/models', authenticate, (req, res) => {
    res.json({
      models: [
        { id: 'glm-4-flash', name: 'GLM-4-Flash', description: '快速响应，适合日常对话', free: true },
        { id: 'glm-4-air', name: 'GLM-4-Air', description: '均衡性能，适合通用任务' },
        { id: 'glm-4-plus', name: 'GLM-4-Plus', description: '高性能模型，适合复杂任务' },
        { id: 'glm-4v-flash', name: 'GLM-4V-Flash', description: '多模态模型，支持图片理解', free: true },
        { id: 'glm-4v', name: 'GLM-4V', description: '多模态高性能，图片分析' },
      ]
    });
  });

  /**
   * POST /api/ai/chat/vision - 多模态对话（图片+文字）
   */
  router.post('/chat/vision', authenticate, async (req, res) => {
    try {
      const { messages, model = 'glm-4v-flash' } = req.body;

      if (!GLM_API_KEY) {
        return res.status(500).json({ error: 'AI服务未配置API密钥' });
      }

      // 设置流式响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // 预处理消息：将 localhost 图片 URL 转换为 base64 data URI（GLM 服务器无法访问 localhost）
      const processedMessages = await Promise.all(messages.map(async m => {
        if (m.role === 'user' && Array.isArray(m.content)) {
          const newContent = await Promise.all(m.content.map(async item => {
            if (item.type === 'image_url') {
              let url = typeof item.image_url === 'string' ? item.image_url : (item.image_url?.url || '');
              // 如果已经是 data:URI，直接使用
              if (url.startsWith('data:')) return { type: 'image_url', image_url: { url } };
              // 如果是 localhost URL，转换为 base64
              if (url.includes('localhost') || url.includes('127.0.0.1')) {
                try {
                  const filePath = url.replace(/^https?:\/\/[^/]+/, '');
                  const fullPath = path.join(__dirname, '..', filePath);
                  if (fs.existsSync(fullPath)) {
                    const ext = path.extname(fullPath).toLowerCase();
                    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
                    const mime = mimeMap[ext] || 'image/png';
                    const buf = fs.readFileSync(fullPath);
                    url = `data:${mime};base64,${buf.toString('base64')}`;
                    console.log(`[Vision] Converted localhost URL to base64 data URI (${buf.length} bytes)`);
                  }
                } catch (convertErr) {
                  console.error('[Vision] Failed to convert localhost URL:', convertErr.message);
                }
              }
              return { type: 'image_url', image_url: { url } };
            }
            return item;
          }));
          return { role: m.role, content: newContent };
        }
        return { role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
      }));

      // 转换消息格式为 GLM 多模态格式
      const formattedMessages = processedMessages.map(m => {
        if (m.role === 'user' && Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content.map(item => {
              if (item.type === 'text') return { type: 'text', text: item.text };
              if (item.type === 'image_url') {
                const url = typeof item.image_url === 'string' ? item.image_url : (item.image_url?.url || '');
                return { type: 'image_url', image_url: { url } };
              }
              return item;
            })
          };
        }
        return { role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
      });

      const response = await fetch(GLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GLM_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          stream: true,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1024
        })
      });

      // 详细日志：打印每条消息的完整结构（不含图片完整URL以节省空间）
      console.log('[Vision] model:', model, 'messages count:', formattedMessages.length);
      formattedMessages.forEach((m, i) => {
        if (typeof m.content === 'string') {
          console.log(`[Vision] msg[${i}] role=${m.role} content=string len=${m.content.length}`);
        } else if (Array.isArray(m.content)) {
          m.content.forEach((c, j) => {
            if (c.type === 'text') console.log(`[Vision] msg[${i}] content[${j}] type=text text="${c.text?.slice(0, 50)}"`);
            else if (c.type === 'image_url') {
              const url = c.image_url?.url || '';
              console.log(`[Vision] msg[${i}] content[${j}] type=image_url url="${url.slice(0, 120)}..."`);
            } else {
              console.log(`[Vision] msg[${i}] content[${j}] type=${c.type}`, JSON.stringify(c).slice(0, 200));
            }
          });
        } else {
          console.log(`[Vision] msg[${i}] role=${m.role} content=unexpected type=${typeof m.content}`, JSON.stringify(m.content).slice(0, 200));
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('GLM Vision API Error:', response.status, errText);
        if (response.status === 429) {
          res.write(`data: ${JSON.stringify({ error: 'rate_limit', message: '请求过于频繁，请稍后再试。' })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ error: `AI服务错误: ${response.status}`, message: errText })}\n\n`);
        }
        res.end();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.write('data: [DONE]\n\n');
              res.end();
              break;
            }
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
        } catch (err) {
          console.error('Stream error:', err);
          res.write(`data: ${JSON.stringify({ error: '流传输中断' })}\n\n`);
          res.end();
        }
      };

      pump();
    } catch (err) {
      console.error('Vision chat error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // ============================================================
  //  AI 数据集成 — 查询 ERP 系统数据
  // ============================================================

  /**
   * POST /api/ai/data-query - 智能数据查询
   * body: { module, query_type, params }
   */
  router.post('/data-query', authenticate, (req, res) => {
    try {
      const { module: mod, query_type } = req.body;
      const db = getDb();
      let data;

      switch (mod) {
        case 'finance':
          data = queryFinance(db, query_type);
          break;
        case 'hr':
          data = queryHR(db, query_type);
          break;
        case 'crm':
          data = queryCRM(db, query_type);
          break;
        case 'inventory':
          data = queryInventory(db, query_type);
          break;
        case 'projects':
          data = queryProjects(db, query_type);
          break;
        case 'dashboard':
          data = queryDashboard(db);
          break;
        default:
          return res.status(400).json({ error: `未知模块: ${mod}` });
      }

      res.json({ module: mod, query_type, data, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('Data query error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/ai/finance-report - 生成财务报表
   * body: { report_type, period }
   */
  router.post('/finance-report', authenticate, (req, res) => {
    try {
      const { report_type = 'summary', period = 'current' } = req.body;
      const db = getDb();
      let report;

      switch (report_type) {
        case 'summary':
          report = generateFinanceSummary(db);
          break;
        case 'balance_sheet':
          report = generateBalanceSheet(db);
          break;
        case 'income_statement':
          report = generateIncomeStatement(db);
          break;
        case 'cash_flow':
          report = generateCashFlow(db);
          break;
        case 'receivable_aging':
          report = generateReceivableAging(db);
          break;
        case 'payable_aging':
          report = generatePayableAging(db);
          break;
        default:
          return res.status(400).json({ error: `未知报表类型: ${report_type}` });
      }

      report.title = getReportTitle(report_type, period);
      report.generated_at = new Date().toISOString();
      report.period = period;
      res.json(report);
    } catch (err) {
      console.error('Finance report error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/ai/smart-chat - 带 ERP 数据上下文的智能对话
   * 自动检测用户意图，注入相关系统数据
   */
  router.post('/smart-chat', authenticate, async (req, res) => {
    try {
      const { messages, model = 'glm-4-flash' } = req.body;

      if (!GLM_API_KEY) {
        return res.status(500).json({ error: 'AI服务未配置API密钥' });
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: '消息不能为空' });
      }

      const db = getDb();

      // 获取系统当前数据作为上下文
      const systemData = getSystemContext(db);

      // 构建增强的 system prompt
      const enhancedSystemPrompt = `你是ERPPlus企业管理系统的AI助手，可以直接访问和分析系统实时数据。

当前系统数据快照（${new Date().toLocaleString('zh-CN')}）：

【财务概览】
- 现金余额：¥${systemData.finance.cashBalance.toLocaleString()}
- 银行余额：¥${systemData.finance.bankBalance.toLocaleString()}
- 应收账款总额：¥${systemData.finance.receivables.toLocaleString()}
- 应付账款总额：¥${systemData.finance.payables.toLocaleString()}
- 逾期应收笔数：${systemData.finance.overdueReceivables}
- 近6个月收入趋势：${JSON.stringify(systemData.finance.monthlyIncome)}
- 近6个月支出趋势：${JSON.stringify(systemData.finance.monthlyExpense)}

【人力资源】
- 在职员工：${systemData.hr.totalEmployees} 人
- 本月新入职：${systemData.hr.newHires} 人
- 招聘中职位：${systemData.hr.openJobs} 个
- 部门分布：${JSON.stringify(systemData.hr.deptStats)}
- 平均薪资：¥${systemData.hr.avgSalary.toLocaleString()}

【CRM客户管理】
- 活跃客户：${systemData.crm.totalCustomers} 家
- 销售线索总价值：¥${systemData.crm.totalLeadValue.toLocaleString()}
- 已赢单总额：¥${systemData.crm.wonDealsAmount.toLocaleString()}
- 待处理服务请求：${systemData.crm.openService} 个
- 销售漏斗：${JSON.stringify(systemData.crm.stageStats)}
- Top客户：${JSON.stringify(systemData.crm.topCustomers)}

【供应链库存】
- 产品总数：${systemData.inventory.totalProducts} 个
- 库存预警（低于安全库存）：${systemData.inventory.lowStock} 个
- 库存总价值：¥${systemData.inventory.totalValue.toLocaleString()}
- 分类统计：${JSON.stringify(systemData.inventory.categoryStats)}
- 库存预警明细：${JSON.stringify(systemData.inventory.stockAlerts)}

【项目管理】
- 项目总数：${systemData.projects.total} 个
- 进行中：${systemData.projects.inProgress} 个
- 计划中：${systemData.projects.planning} 个
- 已完成：${systemData.projects.completed} 个
- 总预算：¥${systemData.projects.totalBudget.toLocaleString()}
- 实际成本：¥${systemData.projects.totalCost.toLocaleString()}
- 逾期项目：${systemData.projects.overdue} 个

请根据以上实时数据回答用户问题。你可以：
1. 直接引用数据回答业务问题
2. 分析数据趋势并给出建议
3. 生成财务报表（通过特殊标记 [FINANCE_REPORT:类型] 触发）
4. 比较不同模块的数据
5. 提供基于数据的管理建议

回答时请注意：
- 使用准确的系统数据，不要编造数据
- 金额使用 ¥ 符号和千分位格式
- 如果用户要求生成报表，在回复开头添加 [GENERATE_REPORT:报表类型] 标记
- 保持专业但友好的语气`;

      // 将增强的 system prompt 放在消息最前面
      const enhancedMessages = [
        { role: 'system', content: enhancedSystemPrompt },
        ...messages.filter(m => m.role !== 'system')
      ];

      // 设置流式响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const response = await fetch(GLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GLM_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: enhancedMessages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('GLM Smart Chat Error:', response.status, errText);
        if (response.status === 429) {
          res.write(`data: ${JSON.stringify({ error: 'rate_limit', message: '请求过于频繁，请稍后再试。建议切换到免费模型（GLM-4-Flash）以避免限流。' })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ error: `AI服务错误: ${response.status}`, message: errText })}\n\n`);
        }
        res.end();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.write('data: [DONE]\n\n');
              res.end();
              break;
            }
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
        } catch (err) {
          console.error('Stream error:', err);
          res.write(`data: ${JSON.stringify({ error: '流传输中断' })}\n\n`);
          res.end();
        }
      };

      pump();
    } catch (err) {
      console.error('Smart chat error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  return router;
}

// ============================================================
//  数据查询辅助函数
// ============================================================

function queryFinance(db, type) {
  switch (type) {
    case 'overview': {
      const cashBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1001'").get()?.balance || 0;
      const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1002'").get()?.balance || 0;
      const receivables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='receivable' AND status!='paid'").get()?.amt || 0;
      const payables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='payable' AND status!='paid'").get()?.amt || 0;
      const overdueReceivables = db.prepare("SELECT COUNT(*) as cnt FROM invoices WHERE type='receivable' AND due_date < date('now') AND status != 'paid'").get().cnt;
      return { cashBalance, bankBalance, receivables, payables, overdueReceivables, totalAssets: cashBalance + bankBalance + receivables };
    }
    case 'monthly_income': {
      return db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as income, SUM(total) as total_with_tax
        FROM invoices WHERE type='receivable' AND created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at) ORDER BY month
      `).all();
    }
    case 'monthly_expense': {
      return db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as expense, SUM(total) as total_with_tax
        FROM invoices WHERE type='payable' AND created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at) ORDER BY month
      `).all();
    }
    case 'invoices': {
      return db.prepare(`
        SELECT i.*, c.name as customer_name, s.name as supplier_name FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ORDER BY i.created_at DESC LIMIT 50
      `).all();
    }
    case 'accounts': {
      return db.prepare('SELECT * FROM accounts ORDER BY code').all();
    }
    case 'vouchers': {
      const vouchers = db.prepare(`
        SELECT v.*, u.full_name as creator_name FROM vouchers v
        LEFT JOIN users u ON v.created_by = u.id
        ORDER BY v.date DESC LIMIT 50
      `).all();
      return vouchers.map(v => {
        const items = db.prepare(`
          SELECT vi.*, a.name as account_name, a.code as account_code FROM voucher_items vi
          JOIN accounts a ON vi.account_id = a.id WHERE vi.voucher_id = ?
        `).all(v.id);
        return { ...v, items };
      });
    }
    default:
      return queryFinance(db, 'overview');
  }
}

function queryHR(db, type) {
  switch (type) {
    case 'overview': {
      const totalEmployees = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE status='active'").get().cnt;
      const newHires = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE hire_date >= date('now', '-30 days') AND status='active'").get().cnt;
      const openJobs = db.prepare("SELECT COUNT(*) as cnt FROM job_postings WHERE status='open'").get().cnt;
      const totalCandidates = db.prepare("SELECT COUNT(*) as cnt FROM candidates").get().cnt;
      const avgSalary = db.prepare("SELECT AVG(salary) as avg FROM employees WHERE status='active'").get().avg || 0;
      return { totalEmployees, newHires, openJobs, totalCandidates, avgSalary: Math.round(avgSalary) };
    }
    case 'employees': {
      return db.prepare(`
        SELECT e.*, d.name as dept_name FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.status='active' ORDER BY e.employee_no
      `).all();
    }
    case 'departments': {
      return db.prepare(`
        SELECT d.name, COUNT(e.id) as count, AVG(e.salary) as avg_salary
        FROM departments d LEFT JOIN employees e ON d.id = e.department_id AND e.status='active'
        GROUP BY d.id ORDER BY count DESC
      `).all();
    }
    case 'payroll': {
      return db.prepare(`
        SELECT d.name as department, COUNT(e.id) as headcount,
               SUM(e.salary) as total_salary, AVG(e.salary) as avg_salary,
               MIN(e.salary) as min_salary, MAX(e.salary) as max_salary
        FROM employees e JOIN departments d ON e.department_id = d.id
        WHERE e.status='active' GROUP BY d.id ORDER BY total_salary DESC
      `).all();
    }
    default:
      return queryHR(db, 'overview');
  }
}

function queryCRM(db, type) {
  switch (type) {
    case 'overview': {
      const totalCustomers = db.prepare("SELECT COUNT(*) as cnt FROM customers WHERE status='active'").get().cnt;
      const totalLeadValue = db.prepare("SELECT SUM(amount) as total FROM sales_leads WHERE stage NOT IN ('lost')").get().total || 0;
      const wonDeals = db.prepare("SELECT COUNT(*) as cnt, SUM(amount) as total FROM sales_leads WHERE stage='won'").get();
      const openService = db.prepare("SELECT COUNT(*) as cnt FROM service_requests WHERE status='open'").get().cnt;
      return { totalCustomers, totalLeadValue, wonDealsCount: wonDeals.cnt, wonDealsAmount: wonDeals.total || 0, openService };
    }
    case 'customers': {
      return db.prepare(`
        SELECT c.*, u.full_name as owner_name FROM customers c
        LEFT JOIN users u ON c.owner_id = u.id
        WHERE c.status='active' ORDER BY c.annual_value DESC LIMIT 30
      `).all();
    }
    case 'sales_funnel': {
      return db.prepare(`
        SELECT stage, COUNT(*) as count, SUM(amount) as amount FROM sales_leads GROUP BY stage ORDER BY count DESC
      `).all();
    }
    case 'top_customers': {
      return db.prepare(`SELECT name, annual_value, credit_level FROM customers ORDER BY annual_value DESC LIMIT 10`).all();
    }
    default:
      return queryCRM(db, 'overview');
  }
}

function queryInventory(db, type) {
  switch (type) {
    case 'overview': {
      const totalProducts = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE status='active'").get().cnt;
      const lowStock = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= min_stock AND status='active'").get().cnt;
      const totalValue = db.prepare("SELECT SUM(stock_qty * cost_price) as val FROM products WHERE status='active'").get().val || 0;
      const categoryStats = db.prepare("SELECT category, COUNT(*) as count, SUM(stock_qty) as total_qty FROM products WHERE status='active' GROUP BY category").all();
      return { totalProducts, lowStock, totalValue: Math.round(totalValue), categoryStats };
    }
    case 'low_stock': {
      return db.prepare(`
        SELECT p.code, p.name, p.stock_qty, p.min_stock, p.unit, p.sale_price, s.name as supplier_name
        FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.stock_qty <= p.min_stock AND p.status='active' ORDER BY (p.stock_qty - p.min_stock)
      `).all();
    }
    case 'products': {
      return db.prepare(`
        SELECT p.*, s.name as supplier_name FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.status='active' ORDER BY p.code
      `).all();
    }
    default:
      return queryInventory(db, 'overview');
  }
}

function queryProjects(db, type) {
  switch (type) {
    case 'overview': {
      const total = db.prepare('SELECT COUNT(*) as cnt FROM projects').get().cnt;
      const inProgress = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'in_progress'").get().cnt;
      const planning = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'planning'").get().cnt;
      const completed = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'completed'").get().cnt;
      const totalBudget = db.prepare('SELECT SUM(budget) as total FROM projects').get().total || 0;
      const totalCost = db.prepare('SELECT SUM(actual_cost) as total FROM projects').get().total || 0;
      const overdue = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE end_date < date('now') AND status NOT IN ('completed', 'cancelled')").get().cnt;
      return { total, inProgress, planning, completed, totalBudget, totalCost, overdue };
    }
    case 'active': {
      return db.prepare(`
        SELECT p.*, c.name as customer_name, u.full_name as manager_name,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_tasks,
               (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
        FROM projects p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON p.manager_id = u.id
        WHERE p.status IN ('in_progress', 'planning') ORDER BY p.end_date ASC
      `).all();
    }
    default:
      return queryProjects(db, 'overview');
  }
}

function queryDashboard(db) {
  const totalRevenue = db.prepare("SELECT SUM(total) as total FROM invoices WHERE type='receivable'").get()?.total || 0;
  const totalCustomers = db.prepare("SELECT COUNT(*) as cnt FROM customers WHERE status='active'").get().cnt;
  const totalEmployees = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE status='active'").get().cnt;
  const activeProjects = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status='in_progress'").get().cnt;
  const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code='1002'").get()?.balance || 0;
  const lowStockItems = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= min_stock AND status='active'").get().cnt;

  const revenueTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           SUM(CASE WHEN type='receivable' THEN total ELSE 0 END) as income,
           SUM(CASE WHEN type='payable' THEN total ELSE 0 END) as expense
    FROM invoices WHERE created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();

  return {
    kpis: { totalRevenue, totalCustomers, totalEmployees, activeProjects, bankBalance, lowStockItems },
    revenueTrend
  };
}

// ============================================================
//  财务报表生成函数
// ============================================================

function getReportTitle(type, period) {
  const titles = {
    summary: '财务综合概览',
    balance_sheet: '资产负债表',
    income_statement: '利润表',
    cash_flow: '现金流量表',
    receivable_aging: '应收账款账龄分析',
    payable_aging: '应付账款账龄分析'
  };
  const periodText = {
    current: '本期',
    monthly: '本月',
    quarterly: '本季度',
    yearly: '本年度'
  };
  return `${titles[type] || '财务报表'}（${periodText[period] || '本期'}）`;
}

function generateFinanceSummary(db) {
  const cashBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1001'").get()?.balance || 0;
  const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1002'").get()?.balance || 0;
  const receivables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='receivable' AND status!='paid'").get()?.amt || 0;
  const payables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='payable' AND status!='paid'").get()?.amt || 0;
  const overdueReceivables = db.prepare("SELECT COUNT(*) as cnt FROM invoices WHERE type='receivable' AND due_date < date('now') AND status != 'paid'").get().cnt;

  const monthlyIncome = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total, SUM(tax) as tax, SUM(total) as grand_total
    FROM invoices WHERE type='receivable' AND created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();

  const monthlyExpense = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total, SUM(tax) as tax, SUM(total) as grand_total
    FROM invoices WHERE type='payable' AND created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();

  const totalRevenue = monthlyIncome.reduce((s, m) => s + (m.total || 0), 0);
  const totalExpense = monthlyExpense.reduce((s, m) => s + (m.total || 0), 0);
  const netProfit = totalRevenue - totalExpense;

  return {
    report_type: 'summary',
    sections: [
      {
        title: '资产概况',
        items: [
          { label: '现金余额', value: cashBalance, type: 'money' },
          { label: '银行存款', value: bankBalance, type: 'money' },
          { label: '应收账款', value: receivables, type: 'money' },
          { label: '总资产', value: cashBalance + bankBalance + receivables, type: 'money' },
        ]
      },
      {
        title: '负债概况',
        items: [
          { label: '应付账款', value: payables, type: 'money' },
          { label: '逾期应收', value: overdueReceivables, type: 'count' },
        ]
      },
      {
        title: '损益概况（近6个月）',
        items: [
          { label: '总收入', value: totalRevenue, type: 'money' },
          { label: '总支出', value: totalExpense, type: 'money' },
          { label: '净利润', value: netProfit, type: 'money', highlight: true },
          { label: '利润率', value: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0, type: 'percent' },
        ]
      }
    ],
    charts: {
      monthly_trend: monthlyIncome.map((m, i) => ({
        month: m.month,
        income: m.total,
        expense: monthlyExpense[i]?.total || 0,
        profit: (m.total || 0) - (monthlyExpense[i]?.total || 0)
      }))
    }
  };
}

function generateBalanceSheet(db) {
  const cashBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1001'").get()?.balance || 0;
  const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1002'").get()?.balance || 0;
  const receivables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='receivable' AND status!='paid'").get()?.amt || 0;
  const payables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='payable' AND status!='paid'").get()?.amt || 0;
  const inventoryValue = db.prepare("SELECT SUM(stock_qty * cost_price) as val FROM products WHERE status='active'").get()?.val || 0;

  const accounts = db.prepare('SELECT code, name, balance FROM accounts ORDER BY code').all();

  const assetAccounts = accounts.filter(a => a.code.startsWith('1'));
  const liabilityAccounts = accounts.filter(a => a.code.startsWith('2'));
  const equityAccounts = accounts.filter(a => a.code.startsWith('3'));

  const totalAssets = assetAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = liabilityAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalEquity = equityAccounts.reduce((s, a) => s + (a.balance || 0), 0);

  return {
    report_type: 'balance_sheet',
    sections: [
      {
        title: '资产',
        items: [
          ...assetAccounts.map(a => ({ label: `${a.code} ${a.name}`, value: a.balance || 0, type: 'money' })),
          { label: '应收账款', value: receivables, type: 'money' },
          { label: '存货', value: inventoryValue, type: 'money' },
          { label: '资产合计', value: totalAssets + receivables + inventoryValue, type: 'money', highlight: true, bold: true },
        ]
      },
      {
        title: '负债',
        items: [
          ...liabilityAccounts.map(a => ({ label: `${a.code} ${a.name}`, value: a.balance || 0, type: 'money' })),
          { label: '应付账款', value: payables, type: 'money' },
          { label: '负债合计', value: totalLiabilities + payables, type: 'money', highlight: true, bold: true },
        ]
      },
      {
        title: '所有者权益',
        items: [
          ...equityAccounts.map(a => ({ label: `${a.code} ${a.name}`, value: a.balance || 0, type: 'money' })),
          { label: '权益合计', value: totalEquity, type: 'money', highlight: true, bold: true },
        ]
      }
    ]
  };
}

function generateIncomeStatement(db) {
  const monthlyData = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
           SUM(CASE WHEN type='receivable' THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN type='receivable' THEN tax ELSE 0 END) as income_tax,
           SUM(CASE WHEN type='payable' THEN amount ELSE 0 END) as expense,
           SUM(CASE WHEN type='payable' THEN tax ELSE 0 END) as expense_tax
    FROM invoices WHERE created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();

  const totalIncome = monthlyData.reduce((s, m) => s + (m.income || 0), 0);
  const totalIncomeTax = monthlyData.reduce((s, m) => s + (m.income_tax || 0), 0);
  const totalExpense = monthlyData.reduce((s, m) => s + (m.expense || 0), 0);
  const totalExpenseTax = monthlyData.reduce((s, m) => s + (m.expense_tax || 0), 0);

  return {
    report_type: 'income_statement',
    sections: [
      {
        title: '收入（近6个月）',
        items: [
          { label: '主营业务收入', value: totalIncome, type: 'money' },
          { label: '税额', value: totalIncomeTax, type: 'money' },
          { label: '收入合计（含税）', value: totalIncome + totalIncomeTax, type: 'money', bold: true },
        ]
      },
      {
        title: '成本费用（近6个月）',
        items: [
          { label: '采购成本', value: totalExpense, type: 'money' },
          { label: '税额', value: totalExpenseTax, type: 'money' },
          { label: '费用合计（含税）', value: totalExpense + totalExpenseTax, type: 'money', bold: true },
        ]
      },
      {
        title: '利润',
        items: [
          { label: '营业利润', value: totalIncome - totalExpense, type: 'money', highlight: true },
          { label: '利润率', value: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0, type: 'percent' },
        ]
      }
    ],
    charts: {
      monthly_profit: monthlyData.map(m => ({
        month: m.month,
        income: m.income,
        expense: m.expense,
        profit: (m.income || 0) - (m.expense || 0)
      }))
    }
  };
}

function generateCashFlow(db) {
  const monthlyReceivable = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total, SUM(paid_amount) as paid
    FROM invoices WHERE type='receivable' AND created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();

  const monthlyPayable = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total, SUM(paid_amount) as paid
    FROM invoices WHERE type='payable' AND created_at >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', created_at) ORDER BY month
  `).all();

  const cashBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1001'").get()?.balance || 0;
  const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1002'").get()?.balance || 0;

  const totalInflow = monthlyReceivable.reduce((s, m) => s + (m.paid || 0), 0);
  const totalOutflow = monthlyPayable.reduce((s, m) => s + (m.paid || 0), 0);

  return {
    report_type: 'cash_flow',
    sections: [
      {
        title: '期初现金',
        items: [
          { label: '库存现金', value: cashBalance, type: 'money' },
          { label: '银行存款', value: bankBalance, type: 'money' },
        ]
      },
      {
        title: '现金流量（近6个月）',
        items: [
          { label: '现金流入', value: totalInflow, type: 'money' },
          { label: '现金流出', value: totalOutflow, type: 'money' },
          { label: '净现金流量', value: totalInflow - totalOutflow, type: 'money', highlight: true },
        ]
      }
    ],
    charts: {
      cash_flow: monthlyReceivable.map((m, i) => ({
        month: m.month,
        inflow: m.paid || 0,
        outflow: monthlyPayable[i]?.paid || 0,
        net: (m.paid || 0) - (monthlyPayable[i]?.paid || 0)
      }))
    }
  };
}

function generateReceivableAging(db) {
  const invoices = db.prepare(`
    SELECT i.*, c.name as customer_name, c.credit_level,
           CAST(julianday('now') - julianday(i.due_date) AS INTEGER) as overdue_days
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.type='receivable' AND i.status != 'paid'
    ORDER BY overdue_days DESC
  `).all();

  const aging = {
    current: invoices.filter(i => i.overdue_days <= 0),
    days_1_30: invoices.filter(i => i.overdue_days > 0 && i.overdue_days <= 30),
    days_31_60: invoices.filter(i => i.overdue_days > 30 && i.overdue_days <= 60),
    days_61_90: invoices.filter(i => i.overdue_days > 60 && i.overdue_days <= 90),
    over_90: invoices.filter(i => i.overdue_days > 90),
  };

  const total = invoices.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0);

  return {
    report_type: 'receivable_aging',
    total_outstanding: total,
    summary: [
      { label: '未到期', value: aging.current.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.current.length, type: 'money' },
      { label: '1-30天', value: aging.days_1_30.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.days_1_30.length, type: 'money' },
      { label: '31-60天', value: aging.days_31_60.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.days_31_60.length, type: 'money' },
      { label: '61-90天', value: aging.days_61_90.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.days_61_90.length, type: 'money' },
      { label: '90天以上', value: aging.over_90.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.over_90.length, type: 'money', highlight: true },
    ],
    details: invoices.map(i => ({
      invoice_no: i.invoice_no,
      customer: i.customer_name,
      credit_level: i.credit_level,
      total: i.total,
      paid: i.paid_amount || 0,
      outstanding: i.total - (i.paid_amount || 0),
      due_date: i.due_date,
      overdue_days: Math.max(0, i.overdue_days || 0)
    }))
  };
}

function generatePayableAging(db) {
  const invoices = db.prepare(`
    SELECT i.*, s.name as supplier_name,
           CAST(julianday(i.due_date) - julianday('now') AS INTEGER) as remaining_days
    FROM invoices i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.type='payable' AND i.status != 'paid'
    ORDER BY remaining_days ASC
  `).all();

  const aging = {
    current: invoices.filter(i => i.remaining_days > 0),
    days_1_30: invoices.filter(i => i.remaining_days <= 0 && i.remaining_days > -30),
    days_31_60: invoices.filter(i => i.remaining_days <= -30 && i.remaining_days > -60),
    days_61_90: invoices.filter(i => i.remaining_days <= -60 && i.remaining_days > -90),
    over_90: invoices.filter(i => i.remaining_days <= -90),
  };

  const total = invoices.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0);

  return {
    report_type: 'payable_aging',
    total_outstanding: total,
    summary: [
      { label: '未到期', value: aging.current.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.current.length, type: 'money' },
      { label: '逾期1-30天', value: aging.days_1_30.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.days_1_30.length, type: 'money' },
      { label: '逾期31-60天', value: aging.days_31_60.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.days_31_60.length, type: 'money' },
      { label: '逾期61-90天', value: aging.days_61_90.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.days_61_90.length, type: 'money' },
      { label: '逾期90天以上', value: aging.over_90.reduce((s, i) => s + (i.total - (i.paid_amount || 0)), 0), count: aging.over_90.length, type: 'money', highlight: true },
    ],
    details: invoices.map(i => ({
      invoice_no: i.invoice_no,
      supplier: i.supplier_name,
      total: i.total,
      paid: i.paid_amount || 0,
      outstanding: i.total - (i.paid_amount || 0),
      due_date: i.due_date,
      remaining_days: Math.max(0, i.remaining_days || 0)
    }))
  };
}

// ============================================================
//  系统上下文获取（供 smart-chat 使用）
// ============================================================

function getSystemContext(db) {
  // 财务
  const cashBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1001'").get()?.balance || 0;
  const bankBalance = db.prepare("SELECT balance FROM accounts WHERE code = '1002'").get()?.balance || 0;
  const receivables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='receivable' AND status!='paid'").get()?.amt || 0;
  const payables = db.prepare("SELECT SUM(total - paid_amount) as amt FROM invoices WHERE type='payable' AND status!='paid'").get()?.amt || 0;
  const overdueReceivables = db.prepare("SELECT COUNT(*) as cnt FROM invoices WHERE type='receivable' AND due_date < date('now') AND status != 'paid'").get().cnt;
  const monthlyIncome = db.prepare(`SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total FROM invoices WHERE type='receivable' AND created_at >= date('now', '-6 months') GROUP BY strftime('%Y-%m', created_at) ORDER BY month`).all();
  const monthlyExpense = db.prepare(`SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total FROM invoices WHERE type='payable' AND created_at >= date('now', '-6 months') GROUP BY strftime('%Y-%m', created_at) ORDER BY month`).all();

  // HR
  const totalEmployees = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE status='active'").get().cnt;
  const newHires = db.prepare("SELECT COUNT(*) as cnt FROM employees WHERE hire_date >= date('now', '-30 days') AND status='active'").get().cnt;
  const openJobs = db.prepare("SELECT COUNT(*) as cnt FROM job_postings WHERE status='open'").get().cnt;
  const deptStats = db.prepare(`SELECT d.name, COUNT(e.id) as count FROM departments d LEFT JOIN employees e ON d.id = e.department_id AND e.status='active' GROUP BY d.id ORDER BY count DESC`).all();
  const avgSalary = db.prepare("SELECT AVG(salary) as avg FROM employees WHERE status='active'").get().avg || 0;

  // CRM
  const totalCustomers = db.prepare("SELECT COUNT(*) as cnt FROM customers WHERE status='active'").get().cnt;
  const totalLeadValue = db.prepare("SELECT SUM(amount) as total FROM sales_leads WHERE stage NOT IN ('lost')").get().total || 0;
  const wonDeals = db.prepare("SELECT COUNT(*) as cnt, SUM(amount) as total FROM sales_leads WHERE stage='won'").get();
  const openService = db.prepare("SELECT COUNT(*) as cnt FROM service_requests WHERE status='open'").get().cnt;
  const stageStats = db.prepare(`SELECT stage, COUNT(*) as count, SUM(amount) as amount FROM sales_leads GROUP BY stage`).all();
  const topCustomers = db.prepare(`SELECT name, annual_value, credit_level FROM customers ORDER BY annual_value DESC LIMIT 5`).all();

  // 库存
  const totalProducts = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE status='active'").get().cnt;
  const lowStock = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE stock_qty <= min_stock AND status='active'").get().cnt;
  const totalValue = db.prepare("SELECT SUM(stock_qty * cost_price) as val FROM products WHERE status='active'").get().val || 0;
  const categoryStats = db.prepare("SELECT category, COUNT(*) as count, SUM(stock_qty) as total_qty FROM products WHERE status='active' GROUP BY category").all();
  const stockAlerts = db.prepare(`SELECT code, name, stock_qty, min_stock FROM products WHERE stock_qty <= min_stock AND status='active' ORDER BY (stock_qty - min_stock) LIMIT 5`).all();

  // 项目
  const total = db.prepare('SELECT COUNT(*) as cnt FROM projects').get().cnt;
  const inProgress = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'in_progress'").get().cnt;
  const planning = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'planning'").get().cnt;
  const completed = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status = 'completed'").get().cnt;
  const totalBudget = db.prepare('SELECT SUM(budget) as total FROM projects').get().total || 0;
  const totalCost = db.prepare('SELECT SUM(actual_cost) as total FROM projects').get().total || 0;
  const overdue = db.prepare("SELECT COUNT(*) as cnt FROM projects WHERE end_date < date('now') AND status NOT IN ('completed', 'cancelled')").get().cnt;

  return {
    finance: { cashBalance, bankBalance, receivables, payables, overdueReceivables, monthlyIncome, monthlyExpense },
    hr: { totalEmployees, newHires, openJobs, deptStats, avgSalary: Math.round(avgSalary) },
    crm: { totalCustomers, totalLeadValue, wonDealsAmount: wonDeals.total || 0, openService, stageStats, topCustomers },
    inventory: { totalProducts, lowStock, totalValue: Math.round(totalValue), categoryStats, stockAlerts },
    projects: { total, inProgress, planning, completed, totalBudget, totalCost, overdue }
  };
}

module.exports = { createAIRouter };
