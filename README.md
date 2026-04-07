# ERPPlus 企业管理系统

> 现代化全栈企业资源规划（ERP）管理系统，基于 Node.js + React + SQLite 构建

---

## 🚀 快速启动

### 方法一：一键启动（推荐）

双击运行根目录下的 **`启动系统.bat`** 文件，系统将自动启动前后端服务并打开浏览器。

### 方法二：手动启动

```bash
# 1. 启动后端（端口 3001）
cd server
node src/index.js

# 2. 启动前端（端口 5173）
cd client
npm run dev
```

访问 http://localhost:5173

---

## 🔐 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | Admin@123 | 超级管理员 |
| zhangwei | Admin@123 | 总经理 |
| wangfang | Admin@123 | 财务经理 |
| chenjun | Admin@123 | 销售经理 |
| lihua | Admin@123 | HR经理 |

---

## 📦 技术栈

| 层次 | 技术选型 |
|------|--------|
| 前端框架 | React 18 + Vite |
| 前端路由 | React Router v6 |
| 数据可视化 | Recharts |
| HTTP 客户端 | Axios |
| 后端框架 | Express.js |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | JWT (jsonwebtoken) |
| 密码加密 | bcryptjs |
| 安全 | helmet + cors + express-rate-limit |

---

## 🏗️ 项目结构

```
ERPPlus/
├── server/                    # 后端服务
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.js          # 数据库连接
│   │   │   ├── schema.js      # 数据库表结构
│   │   │   └── seed.js        # 种子数据
│   │   ├── features/
│   │   │   ├── auth/          # 认证模块
│   │   │   ├── users/         # 用户权限
│   │   │   ├── hr/            # 人力资源
│   │   │   ├── crm/           # 客户关系
│   │   │   ├── inventory/     # 供应链
│   │   │   ├── finance/       # 财务管理
│   │   │   ├── projects/      # 项目管理
│   │   │   └── dashboard/     # 数据看板
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT 认证中间件
│   │   └── index.js           # 入口文件
│   └── data/                  # SQLite 数据文件（自动生成）
│
├── client/                    # 前端应用
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx      # 登录页
│   │   │   ├── Dashboard.jsx  # 工作台
│   │   │   ├── HR.jsx         # 人力资源
│   │   │   ├── CRM.jsx        # 客户关系
│   │   │   ├── Inventory.jsx  # 供应链
│   │   │   ├── Finance.jsx    # 财务管理
│   │   │   ├── Projects.jsx   # 项目管理
│   │   │   └── Users.jsx      # 用户权限
│   │   ├── components/
│   │   │   └── Layout.jsx     # 主布局
│   │   ├── utils/
│   │   │   └── api.js         # API 客户端
│   │   ├── App.jsx            # 根组件
│   │   ├── index.css          # 全局样式
│   │   └── main.jsx           # 入口
│   └── vite.config.js
│
└── 启动系统.bat                # 一键启动脚本
```

---

## 📋 功能模块

### ✅ 已实现

| 模块 | 功能 |
|------|------|
| 🔐 用户认证 | JWT登录/登出、密码修改、个人信息 |
| 👤 用户权限 | 用户管理、角色权限、部门管理 |
| 👥 人力资源 | 员工档案、招聘管理、绩效考核、培训管理 |
| 🤝 客户关系 | 客户管理、销售线索、服务工单、数据分析 |
| 📦 供应链 | 产品库存、供应商管理、采购订单、库存预警 |
| 💰 财务管理 | 凭证管理、应收应付、会计科目、财务报表 |
| 🗂️ 项目管理 | 项目列表、看板任务、进度跟踪、预算分析 |
| 📊 数据看板 | KPI监控、趋势图表、库存预警、实时通知 |

---

## 🎨 界面特性

- ✅ **现代化扁平设计**：专业蓝色主色调，简洁美观
- ✅ **暗色模式**：点击顶栏月亮图标切换
- ✅ **响应式布局**：支持桌面和移动设备
- ✅ **数据可视化**：折线图、柱状图、饼图、进度条
- ✅ **看板视图**：项目任务支持拖拽式看板
- ✅ **模态弹窗**：所有增删改均通过弹窗操作

---

## 📊 种子数据

系统预置以下示例数据：

- 6 个系统用户（含管理员）
- 6 个部门（总经办、HR、财务、销售、IT、生产）
- 8 名员工档案
- 5 家供应商
- 8 种产品
- 8 家客户（含知名企业）
- 6 条销售线索
- 3 张采购订单
- 4 个项目 + 8 个任务
- 9 个会计科目
- 绩效考核记录、系统通知等

---

_ERPPlus v1.0 | 基于 Node.js + React + SQLite_
