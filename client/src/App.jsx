import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import Layout from './components/Layout'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import HRPage from './pages/HR'
import CRMPage from './pages/CRM'
import InventoryPage from './pages/Inventory'
import FinancePage from './pages/Finance'
import ProjectsPage from './pages/Projects'
import UsersPage from './pages/Users'
import AIAssistant from './pages/AIAssistant'
import Analytics from './pages/Analytics'

export const AuthContext = createContext(null)
export const ThemeContext = createContext(null)

function PrivateRoute({ children }) {
  const { user } = useContext(AuthContext)
  return user ? children : <Navigate to="/login" replace />
}

/** 判断用户是否拥有指定模块权限 */
function hasPermission(permissions, perm) {
  if (!permissions) return false
  const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions
  if (perms.includes('*')) return true
  return perms.some(p => p === perm || p === `${perm}.*`)
}

/** 带权限校验的路由守卫组件 */
function AuthorizedRoute({ children, permission }) {
  const { user } = useContext(AuthContext)
  const perms = user?.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : []
  if (!hasPermission(perms, permission)) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('erp_user')
    return stored ? JSON.parse(stored) : null
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('erp_theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('erp_theme', theme)
  }, [theme])

  const login = (userData, token) => {
    localStorage.setItem('erp_token', token)
    localStorage.setItem('erp_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('erp_token')
    localStorage.removeItem('erp_user')
    setUser(null)
  }

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider value={{ user, login, logout }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/*" element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/hr/*" element={<AuthorizedRoute permission="hr"><HRPage /></AuthorizedRoute>} />
                    <Route path="/crm/*" element={<AuthorizedRoute permission="crm"><CRMPage /></AuthorizedRoute>} />
                    <Route path="/inventory/*" element={<AuthorizedRoute permission="inventory"><InventoryPage /></AuthorizedRoute>} />
                    <Route path="/finance/*" element={<AuthorizedRoute permission="finance"><FinancePage /></AuthorizedRoute>} />
                    <Route path="/projects/*" element={<AuthorizedRoute permission="projects"><ProjectsPage /></AuthorizedRoute>} />
                    <Route path="/users/*" element={<AuthorizedRoute permission="users"><UsersPage /></AuthorizedRoute>} />
                    <Route path="/ai/*" element={<AuthorizedRoute permission="ai"><AIAssistant /></AuthorizedRoute>} />
                    <Route path="/analytics/*" element={<AuthorizedRoute permission="dashboard"><Analytics /></AuthorizedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  )
}
