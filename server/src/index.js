const express = require('express');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { swaggerUi, specs } = require('./utils/swagger');
require('./utils/swagger-docs'); // 加载 Swagger 文档定义
const { initDatabase } = require('./database/schema');
const { seedDatabase } = require('./database/seed');
const { migratePermissions, migrateDatabase } = require('./database/migrate');
const { createAuthRouter } = require('./features/auth/auth.router');
const usersRouter = require('./features/users/users.router');
const hrRouter = require('./features/hr/hr.router');
const crmRouter = require('./features/crm/crm.router');
const inventoryRouter = require('./features/inventory/inventory.router');
const financeRouter = require('./features/finance/finance.router');
const projectsRouter = require('./features/projects/projects.router');
const dashboardRouter = require('./features/dashboard/dashboard.router');
const biRouter = require('./features/bi/bi.router');
const { createAIRouter } = require('./features/ai/ai.router');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全头
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// 限流
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: '请求过于频繁，请稍后再试' } }));

// 结构化日志
app.use(requestLogger);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的图片等）
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// API 文档（仅在非生产环境）
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ERPPlus API 文档',
  }));
  logger.info('API 文档已启用: http://localhost:' + PORT + '/api-docs');
}

// API路由
app.use('/api/auth', createAuthRouter());
app.use('/api/users', usersRouter);
app.use('/api/hr', hrRouter);
app.use('/api/crm', crmRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/finance', financeRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/bi', biRouter);
app.use('/api/ai', createAIRouter());

// 错误日志
app.use(errorLogger);

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: '服务器内部错误', detail: err.message });
});

// 404处理
app.use((req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl });
  res.status(404).json({ error: '接口不存在' });
});

// 启动
initDatabase();
migratePermissions();
migrateDatabase();
seedDatabase();

app.listen(PORT, () => {
  logger.info(`ERP后端服务启动成功`, { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`\n🚀 ERP后端服务启动成功！`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/api-docs`);
  console.log(`🔒 登录账号: admin / Admin@123\n`);
});

module.exports = app;
