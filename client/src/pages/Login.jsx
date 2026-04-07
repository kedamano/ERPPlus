import { useState, useContext } from 'react'
import { AuthContext } from '../App'
import api from '../utils/api'

export default function LoginPage() {
  const { login } = useContext(AuthContext)
  const [form, setForm] = useState({ username: 'admin', password: 'Admin@123' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      login(res.user, res.token)
    } catch (err) {
      setError(err.error || '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 70%, #0f172a 100%)',
      padding: 20, position: 'relative', overflow: 'hidden'
    }}>
      {/* 装饰圆圈 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            background: `rgba(59,130,246,${0.04 + i * 0.015})`,
            width: `${180 + i * 90}px`, height: `${180 + i * 90}px`,
            top: `${15 + i * 12}%`, left: `${5 + i * 14}%`,
            transform: 'translate(-50%,-50%)',
            animation: `pulse ${3 + i * 0.7}s ease-in-out infinite`
          }} />
        ))}
        {/* 右侧大圆 */}
        {[...Array(4)].map((_, i) => (
          <div key={`r${i}`} style={{
            position: 'absolute', borderRadius: '50%',
            background: `rgba(147,197,253,${0.03 + i * 0.01})`,
            width: `${220 + i * 100}px`, height: `${220 + i * 100}px`,
            bottom: `${10 + i * 8}%`, right: `${5 + i * 10}%`,
            transform: 'translate(50%,50%)',
            animation: `pulse ${4 + i * 0.5}s ease-in-out infinite reverse`
          }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(37,99,235,.4)'
          }}>
            <i className="fa-solid fa-leaf" style={{ fontSize: 30, color: 'white' }} />
          </div>
          <h1 style={{ color: 'white', fontSize: 30, fontWeight: 700, marginBottom: 6 }}>ERPPlus</h1>
          <p style={{ color: 'rgba(147,197,253,.8)', fontSize: 14 }}>企业资源规划管理系统</p>
        </div>

        {/* 登录卡片 */}
        <div style={{
          background: 'rgba(255,255,255,.97)', borderRadius: 20, padding: '40px 40px 36px',
          boxShadow: '0 25px 60px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.1)'
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>
            <i className="fa-solid fa-circle-user" style={{ marginRight: 8, color: '#2563eb' }} />
            欢迎回来
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>请输入您的账号和密码登录</p>

          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-user" style={{ marginRight: 6 }} />
                用户名
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-user" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#2563eb', fontSize: 14
                }} />
                <input
                  className="form-control" type="text" placeholder="请输入用户名"
                  style={{ paddingLeft: 36 }}
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-lock" style={{ marginRight: 6 }} />
                密码
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-lock" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#2563eb', fontSize: 14
                }} />
                <input
                  className="form-control"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="请输入密码"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: 4
                  }}
                >
                  <i className={showPwd ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8, justifyContent: 'center', gap: 8 }}
              disabled={loading}
            >
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin" /> 登录中...</>
                : <><i className="fa-solid fa-right-to-bracket" /> 登录系统</>
              }
            </button>
          </form>

          <div style={{
            marginTop: 24, padding: 14, background: '#f1f5f9', borderRadius: 10,
            fontSize: 13, color: '#64748b', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <i className="fa-solid fa-circle-info" style={{ color: '#2563eb', fontSize: 16 }} />
            <span><strong>演示账号：</strong>admin / Admin@123</span>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'rgba(147,197,253,.6)', fontSize: 12 }}>
          <i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }} />
          数据安全加密传输 · © 2026 ERPPlus
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity: .6; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%,-50%) scale(1.08); }
        }
      `}</style>
    </div>
  )
}
