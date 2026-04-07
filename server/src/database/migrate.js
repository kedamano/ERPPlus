/**
 * 数据库迁移脚本
 * 在服务器启动时自动运行
 */
const { getDb } = require('./db');

function migratePermissions() {
  const db = getDb();

  // 定义每个角色应有的最新权限
  const rolePermissions = {
    '超级管理员': ['*'],
    '财务经理': ['dashboard', 'finance', 'inventory', 'ai', 'self'],
    '人事经理': ['dashboard', 'hr', 'ai', 'self'],
    '销售经理': ['dashboard', 'crm', 'projects', 'ai', 'self'],
    '普通员工': ['dashboard', 'ai', 'self'],
  };

  const updateStmt = db.prepare('UPDATE roles SET permissions = ? WHERE name = ?');
  let updated = 0;

  for (const [roleName, perms] of Object.entries(rolePermissions)) {
    const existing = db.prepare('SELECT permissions FROM roles WHERE name = ?').get(roleName);
    if (existing) {
      const newPerms = JSON.stringify(perms);
      // 仅当权限内容不同时才更新
      if (existing.permissions !== newPerms) {
        updateStmt.run(newPerms, roleName);
        updated++;
      }
    }
  }

  if (updated > 0) {
    console.log(`✅ 权限迁移完成，更新了 ${updated} 个角色的权限`);
  }
}

function migrateDatabase() {
  const db = getDb();

  // 获取 service_requests 表的列信息
  const tableInfo = db.prepare("PRAGMA table_info(service_requests)").all();
  const columnNames = tableInfo.map(col => col.name);

  // 添加 created_by 列
  if (!columnNames.includes('created_by')) {
    db.exec("ALTER TABLE service_requests ADD COLUMN created_by TEXT REFERENCES users(id)");
    console.log('✅ 迁移：service_requests 表添加 created_by 列');
  }

  // 添加 updated_at 列
  if (!columnNames.includes('updated_at')) {
    db.exec("ALTER TABLE service_requests ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))");
    console.log('✅ 迁移：service_requests 表添加 updated_at 列');
  }
}

module.exports = { migratePermissions, migrateDatabase };
