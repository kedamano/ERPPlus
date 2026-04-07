/**
 * 分页工具函数 - 为后端 API 提供统一的分页支持
 */

/**
 * 从 req.query 解析分页参数
 * @param {object} query - req.query 对象
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * 构建分页响应
 * @param {Array} data - 当前页数据
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} limit - 每页数量
 * @returns {{ data: Array, total: number, page: number, limit: number, totalPages: number }}
 */
function paginate(data, total, page, limit) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = { parsePagination, paginate };
