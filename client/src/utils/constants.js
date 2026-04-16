/**
 * 全局常量定义
 * 集中管理应用中使用的各种映射关系和配置
 */

// ==================== CRM 相关 ====================

/** 销售线索阶段映射 */
export const STAGE_MAP = {
  lead: '线索',
  qualified: '意向客户',
  proposal: '方案报价',
  negotiation: '商务谈判',
  won: '已赢单',
  lost: '已输单'
}

/** 销售线索阶段颜色 */
export const STAGE_COLOR = {
  lead: 'badge-secondary',
  qualified: 'badge-info',
  proposal: 'badge-primary',
  negotiation: 'badge-warning',
  won: 'badge-success',
  lost: 'badge-error'
}

/** 服务工单类型映射 */
export const SERVICE_TYPE_MAP = {
  support: '技术支持',
  complaint: '投诉',
  inquiry: '咨询'
}

/** 服务工单优先级映射 */
export const PRIORITY_MAP = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
}

/** 服务工单优先级颜色 */
export const PRIORITY_COLOR = {
  low: 'badge-secondary',
  medium: 'badge-info',
  high: 'badge-warning',
  urgent: 'badge-error'
}

/** 服务工单状态映射 */
export const SERVICE_STATUS_MAP = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭'
}

/** 服务工单状态颜色 */
export const SERVICE_STATUS_COLOR = {
  open: 'badge-error',
  in_progress: 'badge-warning',
  resolved: 'badge-success',
  closed: 'badge-secondary'
}

// ==================== 人力资源相关 ====================

/** 员工状态映射 */
export const EMPLOYEE_STATUS_MAP = {
  active: '在职',
  resigned: '离职',
  on_leave: '休假',
  probation: '试用期'
}

/** 员工状态颜色 */
export const EMPLOYEE_STATUS_COLOR = {
  active: 'badge-success',
  resigned: 'badge-secondary',
  on_leave: 'badge-warning',
  probation: 'badge-info'
}

/** 招聘阶段映射 */
export const CANDIDATE_STAGE_MAP = {
  applied: '已申请',
  screening: '筛选中',
  interview: '面试中',
  offer: '已发Offer',
  hired: '已录用',
  rejected: '已拒绝'
}

// ==================== 项目相关 ====================

/** 项目状态映射 */
export const PROJECT_STATUS_MAP = {
  planning: '计划中',
  in_progress: '进行中',
  completed: '已完成',
  on_hold: '已暂停',
  cancelled: '已取消'
}

/** 项目状态颜色 */
export const PROJECT_STATUS_COLOR = {
  planning: 'badge-info',
  in_progress: 'badge-primary',
  completed: 'badge-success',
  on_hold: 'badge-warning',
  cancelled: 'badge-secondary'
}

/** 任务状态映射 */
export const TASK_STATUS_MAP = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消'
}

/** 任务优先级映射 */
export const TASK_PRIORITY_MAP = {
  low: '低',
  medium: '中',
  high: '高'
}

// ==================== 财务相关 ====================

/** 发票类型映射 */
export const INVOICE_TYPE_MAP = {
  receivable: '应收账款',
  payable: '应付账款'
}

/** 发票状态映射 */
export const INVOICE_STATUS_MAP = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付款',
  overdue: '已逾期'
}

/** 发票状态颜色 */
export const INVOICE_STATUS_COLOR = {
  unpaid: 'badge-warning',
  partial: 'badge-info',
  paid: 'badge-success',
  overdue: 'badge-error'
}

/** 凭证状态映射 */
export const VOUCHER_STATUS_MAP = {
  draft: '草稿',
  posted: '已过账',
  cancelled: '已取消'
}

// ==================== 库存相关 ====================

/** 采购订单状态映射 */
export const PO_STATUS_MAP = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  ordered: '已下单',
  partially_received: '部分收货',
  received: '已收货',
  cancelled: '已取消'
}

/** 采购订单状态颜色 */
export const PO_STATUS_COLOR = {
  draft: 'badge-secondary',
  pending: 'badge-warning',
  approved: 'badge-info',
  ordered: 'badge-primary',
  partially_received: 'badge-info',
  received: 'badge-success',
  cancelled: 'badge-error'
}

/** 库存交易类型映射 */
export const TRANSACTION_TYPE_MAP = {
  in: '入库',
  out: '出库',
  adjust: '调整',
  transfer: '调拨'
}

// ==================== 通用 ====================

/** 通用状态映射 */
export const COMMON_STATUS_MAP = {
  active: '启用',
  inactive: '禁用'
}

/** 通用状态颜色 */
export const COMMON_STATUS_COLOR = {
  active: 'badge-success',
  inactive: 'badge-secondary'
}

/** 日期格式化选项 */
export const DATE_FORMAT_OPTIONS = {
  short: { year: 'numeric', month: '2-digit', day: '2-digit' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  datetime: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
}

/** 分页默认配置 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100
}
