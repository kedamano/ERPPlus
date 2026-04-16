const { body, param, query, validationResult } = require('express-validator');

// 统一处理验证结果
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '请求参数验证失败',
      details: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
        value: e.value
      }))
    });
  }
  next();
};

// 通用分页参数验证
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  handleValidationErrors
];

// 用户相关验证
const userValidation = {
  create: [
    body('username').trim().notEmpty().withMessage('用户名不能为空')
      .isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50字符之间')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线'),
    body('full_name').trim().notEmpty().withMessage('姓名不能为空')
      .isLength({ min: 2, max: 50 }).withMessage('姓名长度必须在2-50字符之间'),
    body('email').trim().notEmpty().withMessage('邮箱不能为空')
      .isEmail().withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('phone').optional().trim().matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
    body('password').optional().isLength({ min: 6 }).withMessage('密码长度至少6位'),
    body('role_id').optional().isUUID().withMessage('角色ID格式不正确'),
    body('department_id').optional().isUUID().withMessage('部门ID格式不正确'),
    handleValidationErrors
  ],
  update: [
    param('id').isUUID().withMessage('用户ID格式不正确'),
    body('full_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('姓名长度必须在2-50字符之间'),
    body('email').optional().trim().isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
    body('phone').optional().trim().matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
    body('role_id').optional().isUUID().withMessage('角色ID格式不正确'),
    body('department_id').optional().isUUID().withMessage('部门ID格式不正确'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('状态值不正确'),
    handleValidationErrors
  ]
};

// 客户相关验证
const customerValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('客户名称不能为空')
      .isLength({ min: 2, max: 100 }).withMessage('客户名称长度必须在2-100字符之间'),
    body('type').optional().isIn(['enterprise', 'individual']).withMessage('客户类型不正确'),
    body('contact_email').optional().trim().isEmail().withMessage('联系人邮箱格式不正确'),
    body('contact_phone').optional().trim().matches(/^1[3-9]\d{9}$/).withMessage('联系人手机号格式不正确'),
    body('credit_level').optional().isIn(['A', 'B', 'C']).withMessage('信用等级不正确'),
    body('annual_value').optional().isFloat({ min: 0 }).withMessage('年度价值必须是非负数'),
    handleValidationErrors
  ],
  update: [
    param('id').isUUID().withMessage('客户ID格式不正确'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('客户名称长度必须在2-100字符之间'),
    body('credit_level').optional().isIn(['A', 'B', 'C']).withMessage('信用等级不正确'),
    body('annual_value').optional().isFloat({ min: 0 }).withMessage('年度价值必须是非负数'),
    handleValidationErrors
  ]
};

// 线索相关验证
const leadValidation = {
  create: [
    body('title').trim().notEmpty().withMessage('线索标题不能为空')
      .isLength({ min: 2, max: 200 }).withMessage('标题长度必须在2-200字符之间'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('probability').optional().isInt({ min: 0, max: 100 }).withMessage('赢单率必须是0-100之间的整数'),
    body('stage').optional().isIn(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).withMessage('销售阶段不正确'),
    body('expected_close').optional().isISO8601().withMessage('预计成交日期格式不正确'),
    handleValidationErrors
  ],
  update: [
    param('id').isUUID().withMessage('线索ID格式不正确'),
    body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('标题长度必须在2-200字符之间'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('probability').optional().isInt({ min: 0, max: 100 }).withMessage('赢单率必须是0-100之间的整数'),
    body('stage').optional().isIn(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).withMessage('销售阶段不正确'),
    handleValidationErrors
  ]
};

// 服务工单验证
const serviceValidation = {
  create: [
    body('title').trim().notEmpty().withMessage('工单标题不能为空')
      .isLength({ min: 2, max: 200 }).withMessage('标题长度必须在2-200字符之间'),
    body('type').optional().isIn(['support', 'complaint', 'consult']).withMessage('工单类型不正确'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('优先级不正确'),
    body('customer_id').optional().isUUID().withMessage('客户ID格式不正确'),
    body('assignee_id').optional().isUUID().withMessage('负责人ID格式不正确'),
    handleValidationErrors
  ],
  update: [
    param('id').isUUID().withMessage('工单ID格式不正确'),
    body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('标题长度必须在2-200字符之间'),
    body('type').optional().isIn(['support', 'complaint', 'consult']).withMessage('工单类型不正确'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('优先级不正确'),
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('状态不正确'),
    handleValidationErrors
  ],
  updateStatus: [
    param('id').isUUID().withMessage('工单ID格式不正确'),
    body('status').notEmpty().withMessage('状态不能为空')
      .isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('状态不正确'),
    handleValidationErrors
  ]
};

// 产品相关验证
const productValidation = {
  create: [
    body('code').trim().notEmpty().withMessage('产品编码不能为空')
      .isLength({ min: 2, max: 50 }).withMessage('产品编码长度必须在2-50字符之间'),
    body('name').trim().notEmpty().withMessage('产品名称不能为空')
      .isLength({ min: 2, max: 100 }).withMessage('产品名称长度必须在2-100字符之间'),
    body('cost_price').optional().isFloat({ min: 0 }).withMessage('成本价必须是非负数'),
    body('sale_price').optional().isFloat({ min: 0 }).withMessage('销售价必须是非负数'),
    body('stock_qty').optional().isInt({ min: 0 }).withMessage('库存数量必须是非负整数'),
    body('min_stock').optional().isInt({ min: 0 }).withMessage('最小库存必须是非负整数'),
    body('max_stock').optional().isInt({ min: 0 }).withMessage('最大库存必须是非负整数'),
    handleValidationErrors
  ],
  update: [
    param('id').isUUID().withMessage('产品ID格式不正确'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('产品名称长度必须在2-100字符之间'),
    body('cost_price').optional().isFloat({ min: 0 }).withMessage('成本价必须是非负数'),
    body('sale_price').optional().isFloat({ min: 0 }).withMessage('销售价必须是非负数'),
    handleValidationErrors
  ]
};

// 供应商验证
const supplierValidation = {
  create: [
    body('name').trim().notEmpty().withMessage('供应商名称不能为空')
      .isLength({ min: 2, max: 100 }).withMessage('供应商名称长度必须在2-100字符之间'),
    body('contact_email').optional().trim().isEmail().withMessage('邮箱格式不正确'),
    body('contact_phone').optional().trim().matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
    body('credit_rating').optional().isIn(['A', 'B', 'C', 'D']).withMessage('信用评级不正确'),
    handleValidationErrors
  ],
  update: [
    param('id').isUUID().withMessage('供应商ID格式不正确'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('供应商名称长度必须在2-100字符之间'),
    body('credit_rating').optional().isIn(['A', 'B', 'C', 'D']).withMessage('信用评级不正确'),
    handleValidationErrors
  ]
};

// 登录验证
const loginValidation = [
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('password').trim().notEmpty().withMessage('密码不能为空'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  paginationValidation,
  userValidation,
  customerValidation,
  leadValidation,
  serviceValidation,
  productValidation,
  supplierValidation,
  loginValidation
};
