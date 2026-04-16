/**
 * 结构化日志系统
 * 使用 Winston + Daily Rotate File
 */
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志级别定义
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色配置
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// 日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 控制台格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// 日志目录
const logDir = path.join(__dirname, '../../logs');

// 创建 transports
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug',
  }),
  
  // 所有日志文件（按天轮转）
  new DailyRotateFile({
    filename: path.join(logDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format,
    level: 'info',
  }),
  
  // 错误日志单独文件
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format,
    level: 'error',
  }),
];

// 创建 logger 实例
const logger = winston.createLogger({
  levels,
  format,
  transports,
  exitOnError: false,
});

// 请求上下文追踪
const createRequestLogger = (req) => {
  const requestId = req.headers['x-request-id'] || 
                    req.id || 
                    Math.random().toString(36).substring(2, 15);
  
  return {
    info: (message, meta = {}) => {
      logger.info(message, { requestId, ...meta });
    },
    warn: (message, meta = {}) => {
      logger.warn(message, { requestId, ...meta });
    },
    error: (message, meta = {}) => {
      logger.error(message, { requestId, ...meta });
    },
    debug: (message, meta = {}) => {
      logger.debug(message, { requestId, ...meta });
    },
    http: (message, meta = {}) => {
      logger.http(message, { requestId, ...meta });
    },
  };
};

// 请求日志中间件
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const reqLogger = createRequestLogger(req);
  
  // 将 logger 附加到请求对象
  req.logger = reqLogger;
  
  // 记录请求开始
  reqLogger.http('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });
  
  // 响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'http';
    
    reqLogger[level]('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });
  });
  
  next();
};

// 错误日志中间件
const errorLogger = (err, req, res, next) => {
  const reqLogger = req.logger || logger;
  
  reqLogger.error('Request error', {
    method: req.method,
    url: req.originalUrl,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    body: req.body,
    query: req.query,
    params: req.params,
  });
  
  next(err);
};

module.exports = {
  logger,
  createRequestLogger,
  requestLogger,
  errorLogger,
};
