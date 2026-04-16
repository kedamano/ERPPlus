/**
 * 权限检查工具函数
 * 统一处理用户权限验证逻辑
 */

/**
 * 判断用户是否拥有指定模块权限
 * @param {string|string[]} permissions - 用户权限列表（JSON字符串或数组）
 * @param {string} perm - 要检查的权限标识
 * @returns {boolean}
 */
export function hasPermission(permissions, perm) {
  if (!permissions) return false
  const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions
  if (perms.includes('*')) return true
  // 支持精确匹配和通配符（如 finance.* 匹配 finance）
  return perms.some(p => p === perm || p === `${perm}.*` || p === '*')
}

/**
 * 检查用户是否拥有多个权限中的任意一个
 * @param {string|string[]} permissions - 用户权限列表
 * @param {string[]} requiredPerms - 需要的权限列表
 * @returns {boolean}
 */
export function hasAnyPermission(permissions, requiredPerms) {
  if (!permissions || !requiredPerms?.length) return false
  return requiredPerms.some(perm => hasPermission(permissions, perm))
}

/**
 * 检查用户是否拥有所有指定权限
 * @param {string|string[]} permissions - 用户权限列表
 * @param {string[]} requiredPerms - 需要的权限列表
 * @returns {boolean}
 */
export function hasAllPermissions(permissions, requiredPerms) {
  if (!permissions || !requiredPerms?.length) return false
  return requiredPerms.every(perm => hasPermission(permissions, perm))
}

/**
 * 解析权限列表（统一处理字符串和数组格式）
 * @param {string|string[]} permissions 
 * @returns {string[]}
 */
export function parsePermissions(permissions) {
  if (!permissions) return []
  return typeof permissions === 'string' ? JSON.parse(permissions) : permissions
}
