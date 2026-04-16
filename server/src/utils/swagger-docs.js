/**
 * Swagger API 文档定义
 * 为各个路由模块提供 JSDoc 注释
 */

// ==================== 认证模块 ====================

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT Token
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 参数验证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: 用户名或密码错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未授权
 */

// ==================== 用户模块 ====================

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页条数
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *   post:
 *     summary: 创建用户
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *               password:
 *                 type: string
 *                 minLength: 6
 *               email:
 *                 type: string
 *                 format: email
 *               real_name:
 *                 type: string
 *               role:
 *                 type: string
 *               department_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数验证失败
 *       409:
 *         description: 用户名已存在
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: 用户不存在
 *   put:
 *     summary: 更新用户信息
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               real_name:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 用户不存在
 *   delete:
 *     summary: 删除用户
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 删除成功
 *       403:
 *         description: 禁止删除超级管理员
 *       404:
 *         description: 用户不存在
 */

// ==================== CRM 模块 ====================

/**
 * @swagger
 * /crm/customers:
 *   get:
 *     summary: 获取客户列表
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *   post:
 *     summary: 创建客户
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               address:
 *                 type: string
 *               credit_level:
 *                 type: string
 *                 enum: [A, B, C, D]
 *     responses:
 *       201:
 *         description: 创建成功
 */

/**
 * @swagger
 * /crm/customers/{id}:
 *   get:
 *     summary: 获取客户详情
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *   put:
 *     summary: 更新客户信息
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     summary: 删除客户
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 删除成功
 */

/**
 * @swagger
 * /crm/leads:
 *   get:
 *     summary: 获取销售线索列表
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *   post:
 *     summary: 创建销售线索
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               customer_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               stage:
 *                 type: string
 *                 enum: [初步接触, 需求分析, 方案报价, 商务谈判, 赢单, 输单]
 *               win_rate:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               expected_close_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: 创建成功
 */

/**
 * @swagger
 * /crm/service:
 *   get:
 *     summary: 获取服务工单列表
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [待处理, 处理中, 已解决, 已关闭]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *   post:
 *     summary: 创建服务工单
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, priority]
 *             properties:
 *               customer_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [技术支持, 投诉, 咨询]
 *               priority:
 *                 type: string
 *                 enum: [低, 中, 高, 紧急]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */

/**
 * @swagger
 * /crm/service/{id}/status:
 *   patch:
 *     summary: 更新工单状态
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [待处理, 处理中, 已解决, 已关闭]
 *     responses:
 *       200:
 *         description: 更新成功
 */

// ==================== 供应链模块 ====================

/**
 * @swagger
 * /inventory/products:
 *   get:
 *     summary: 获取产品列表
 *     tags: [供应链]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: low_stock
 *         schema:
 *           type: boolean
 *         description: 只显示库存不足的产品
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *   post:
 *     summary: 创建产品
 *     tags: [供应链]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, price]
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *               min_stock:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: 创建成功
 */

/**
 * @swagger
 * /inventory/suppliers:
 *   get:
 *     summary: 获取供应商列表
 *     tags: [供应链]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     summary: 创建供应商
 *     tags: [供应链]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */

/**
 * @swagger
 * /inventory/purchase-orders:
 *   get:
 *     summary: 获取采购订单列表
 *     tags: [供应链]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     summary: 创建采购订单
 *     tags: [供应链]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [supplier_id, items]
 *             properties:
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                     price:
 *                       type: number
 *                       minimum: 0
 *     responses:
 *       201:
 *         description: 创建成功
 */

// ==================== 仪表盘模块 ====================

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: 获取仪表盘统计数据
 *     tags: [仪表盘]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                 charts:
 *                   type: object
 *                 notifications:
 *                   type: array
 */

/**
 * @swagger
 * /dashboard/notifications:
 *   get:
 *     summary: 获取通知列表
 *     tags: [仪表盘]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *   post:
 *     summary: 标记通知为已读
 *     tags: [仪表盘]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 成功
 */

// ==================== 健康检查 ====================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 健康检查
 *     tags: [系统]
 *     responses:
 *       200:
 *         description: 服务正常运行
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 time:
 *                   type: string
 *                   format: date-time
 */
