import { useContext, useState, useEffect } from 'react'
import { NavLink, useLocation, Navigate } from 'react-router-dom'
import { AuthContext, ThemeContext } from '../App'
import api from '../utils/api'
import { hasPermission, parsePermissions } from '../utils/permissions'

const NAV = [
  { group: '核心模块', items: [
    { path: '/', icon: 'fa-solid fa-gauge-high', label: '工作台', perm: 'dashboard' },
    { path: '/hr', icon: 'fa-solid fa-users', label: '人力资源', perm: 'hr' },
    { path: '/crm', icon: 'fa-solid fa-handshake', label: '客户关系', perm: 'crm' },
    { path: '/inventory', icon: 'fa-solid fa-boxes-stacked', label: '供应链', perm: 'inventory' },
    { path: '/finance', icon: 'fa-solid fa-coins', label: '财务管理', perm: 'finance' },
    { path: '/projects', icon: 'fa-solid fa-diagram-project', label: '项目管理', perm: 'projects' },
  ]},
  { group: '智能助手', items: [
    { path: '/analytics', icon: 'fa-solid fa-chart-pie', label: '商业智能', perm: 'dashboard' },
    { path: '/ai', icon: 'fa-solid fa-robot', label: 'AI 助手', perm: 'ai' },
  ]},
  { group: '系统管理', items: [
    { path: '/users', icon: 'fa-solid fa-shield-halved', label: '用户权限', perm: 'users' },
  ]},
]

// 权限检查函数已从 utils/permissions 导入

export default function Layout({ children }) {
  const { user, logout } = useContext(AuthContext)
  const { theme, toggleTheme } = useContext(ThemeContext)
  const [sidebarOpen, setSidebarOpen] = useState(false)   // 移动端抽屉
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)  // 桌面端迷你模式
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  useEffect(() => {
    api.get('/dashboard').then(d => {
      const notifs = d.notifications || []
      setUnreadCount(notifs.filter(n => !n.is_read).length)
    }).catch(() => {})
  }, [location.pathname])

  const currentLabel = NAV.flatMap(g => g.items).find(i => {
    if (i.path === '/') return location.pathname === '/'
    return location.pathname.startsWith(i.path)
  })?.label || '工作台'

  // 根据用户权限过滤导航菜单
  const userPerms = parsePermissions(user?.permissions)
  const filteredNav = NAV.map(group => ({
    ...group,
    items: group.items.filter(item => hasPermission(userPerms, item.perm))
  })).filter(group => group.items.length > 0)

  // 如果当前页面不在用户权限范围内，重定向到首页
  const currentPath = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1]
  const accessiblePaths = filteredNav.flatMap(g => g.items.map(i => i.path))
  const hasAccess = accessiblePaths.includes('/') && currentPath === '/' || accessiblePaths.some(p => currentPath.startsWith(p))
  if (!hasAccess && currentPath !== '/') {
    return <Navigate to="/" replace />
  }

  return (
    <div className={sidebarCollapsed ? 'layout-collapsed' : ''}>
      {/* 遮罩（移动端） */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <h1>
            <i className="fa-solid fa-layer-group" />
            <span className="sidebar-brand-text">ERPPlus</span>
          </h1>
          {!sidebarCollapsed && <p className="sidebar-brand-sub">企业管理系统</p>}
        </div>
        <nav className="sidebar-nav">
          {filteredNav.map(group => (
            <div className="nav-group" key={group.group}>
              <div className="nav-group-title">{group.group}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <span className="nav-icon">
                    <i className={item.icon} />
                  </span>
                  {!sidebarCollapsed && item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.full_name?.[0] || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="user-details">
                <div className="name">{user?.full_name || user?.username}</div>
                <div className="role">{user?.role_name || '管理员'}</div>
              </div>
            )}
          </div>
        </div>

        {/* 收起/展开按钮 */}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? '展开菜单' : '收起菜单'}
        >
          <i className={`fa-solid ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
          {!sidebarCollapsed && <span>收起</span>}
        </button>
      </aside>

      {/* 顶部栏 */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="header-icon-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            id="menu-btn"
            style={{ display: 'none' }}
          >
            <i className="fa-solid fa-bars" />
          </button>
          <button
            className="header-icon-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开菜单' : '收起菜单'}
          >
            <i className={`fa-solid ${sidebarCollapsed ? 'fa-bars' : 'fa-outdent'}`} />
          </button>
          <div className="breadcrumb">
            <span style={{ color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-leaf" style={{ marginRight: 4, color: 'var(--primary)' }} />
              ERPPlus
            </span>
            <span className="breadcrumb-sep">›</span>
            <span style={{ fontWeight: 600 }}>{currentLabel}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? '切换暗色模式' : '切换亮色模式'}
          >
            <i className={theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
          </button>
          <button className="header-icon-btn" title="系统消息" style={{ position: 'relative' }}>
            <i className="fa-solid fa-bell" />
            <span className="notif-badge">{unreadCount || ''}</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={logout}
            style={{ fontSize: 13, gap: 6 }}
          >
            <i className="fa-solid fa-right-from-bracket" />
            退出
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="main-content">
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
