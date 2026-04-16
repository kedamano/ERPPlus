/**
 * Swagger/OpenAPI 文档配置
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ERPPlus API 文档',
      version: '1.0.0',
      description: '企业ERP管理系统后端API接口文档',
      contact: {
        name: '技术支持',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: '开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '请输入 JWT Token，格式：Bearer {token}',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '用户ID' },
            username: { type: 'string', description: '用户名' },
            email: { type: 'string', format: 'email', description: '邮箱' },
            real_name: { type: 'string', description: '真实姓名' },
            role: { type: 'string', description: '角色' },
            department_id: { type: 'string', format: 'uuid', description: '部门ID' },
            status: { type: 'string', enum: ['active', 'inactive'], description: '状态' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '客户ID' },
            name: { type: 'string', description: '客户名称' },
            contact: { type: 'string', description: '联系人' },
            phone: { type: 'string', description: '电话' },
            email: { type: 'string', format: 'email', description: '邮箱' },
            address: { type: 'string', description: '地址' },
            credit_level: { type: 'string', enum: ['A', 'B', 'C', 'D'], description: '信用等级' },
            status: { type: 'string', enum: ['active', 'inactive'], description: '状态' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '线索ID' },
            customer_id: { type: 'string', format: 'uuid', description: '客户ID' },
            title: { type: 'string', description: '标题' },
            amount: { type: 'number', description: '预计金额' },
            stage: { type: 'string', enum: ['初步接触', '需求分析', '方案报价', '商务谈判', '赢单', '输单'], description: '阶段' },
            win_rate: { type: 'integer', minimum: 0, maximum: 100, description: '赢单率(%)' },
            expected_close_date: { type: 'string', format: 'date', description: '预计成交日期' },
            owner_id: { type: 'string', format: 'uuid', description: '负责人ID' },
            status: { type: 'string', enum: ['active', 'inactive'], description: '状态' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' },
          },
        },
        ServiceTicket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '工单ID' },
            customer_id: { type: 'string', format: 'uuid', description: '客户ID' },
            title: { type: 'string', description: '标题' },
            type: { type: 'string', enum: ['技术支持', '投诉', '咨询'], description: '类型' },
            priority: { type: 'string', enum: ['低', '中', '高', '紧急'], description: '优先级' },
            status: { type: 'string', enum: ['待处理', '处理中', '已解决', '已关闭'], description: '状态' },
            owner_id: { type: 'string', format: 'uuid', description: '负责人ID' },
            description: { type: 'string', description: '描述' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '产品ID' },
            code: { type: 'string', description: '产品编码' },
            name: { type: 'string', description: '产品名称' },
            category: { type: 'string', description: '分类' },
            price: { type: 'number', description: '单价' },
            stock: { type: 'integer', description: '库存数量' },
            min_stock: { type: 'integer', description: '最低库存' },
            status: { type: 'string', enum: ['active', 'inactive'], description: '状态' },
            created_at: { type: 'string', format: 'date-time', description: '创建时间' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: '错误信息' },
            detail: { type: 'string', description: '详细错误' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', description: '错误信息' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', description: '字段名' },
                  message: { type: 'string', description: '错误描述' },
                  value: { type: 'string', description: '字段值' },
                },
              },
            },
          },
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', description: '数据列表' },
            total: { type: 'integer', description: '总记录数' },
            page: { type: 'integer', description: '当前页码' },
            limit: { type: 'integer', description: '每页条数' },
            totalPages: { type: 'integer', description: '总页数' },
          },
        },
      },
    },
    tags: [
      { name: '认证', description: '用户登录、登出、Token管理' },
      { name: '用户', description: '用户管理和权限控制' },
      { name: '人力资源', description: '员工档案、招聘、绩效' },
      { name: 'CRM', description: '客户、线索、服务工单' },
      { name: '供应链', description: '产品、供应商、采购' },
      { name: '财务', description: '凭证、应收应付、报表' },
      { name: '项目', description: '项目管理和任务看板' },
      { name: '仪表盘', description: '数据统计和KPI' },
      { name: 'BI分析', description: '商业智能和数据分析' },
      { name: 'AI助手', description: '智能对话和文档处理' },
    ],
  },
  apis: ['./src/features/**/*.js', './src/utils/swagger-docs.js'], // 扫描路由文件中的 JSDoc 注释
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
