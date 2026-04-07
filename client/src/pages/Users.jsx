import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import Pagination from '../components/Pagination'

export default function UsersPage() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [limit] = useState(20)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = (p = page, s = search) => {
    setLoading(true)
    Promise.all([
      api.get('/users', { params: { page: p, limit, search: s } }),
      api.get('/users/roles/list'),
      api.get('/users/departments/list'),
    ]).then(([u, r, d]) => {
      setUsers(u.data || []); setRoles(r); setDepts(d)
      setTotal(u.total || 0); setTotalPages(u.totalPages || Math.ceil((u.total || 0) / limit))
    }).finally(() => setLoading(false))
  }

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handlePageChange = (p) => { setPage(p); loadAll(p, search) }

  const openModal = (type, data = {}) => { setModal(type); setForm(data) }
  const closeModal = () => { setModal(null); setForm({}) }

  const saveUser = async () => {
    try {
      if (form.id) await api.put(`/users/${form.id}`, form)
      else await api.post('/users', form)
      closeModal(); loadAll(page, search)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const tabs = [
    { id: 'users', label: '用户管理', icon: 'fa-solid fa-user' },
    { id: 'roles', label: '角色权限', icon: 'fa-solid fa-lock' },
    { id: 'departments', label: '部门管理', icon: 'fa-solid fa-building' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1><i className="fa-solid fa-shield-halved" style={{marginRight:10,color:'var(--primary)'}}/>用户与权限管理</h1>
        <p>用户账号管理、角色权限配置、组织架构设置</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color:'#2563eb' }}><i className="fa-solid fa-user"/></div><div className="stat-content"><div className="stat-value">{users.length}</div><div className="stat-label">系统用户</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color:'#2563eb' }}><i className="fa-solid fa-lock"/></div><div className="stat-content"><div className="stat-value">{roles.length}</div><div className="stat-label">角色数量</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color:'#b45309' }}><i className="fa-solid fa-building"/></div><div className="stat-content"><div className="stat-value">{depts.length}</div><div className="stat-label">部门数量</div></div></div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={t.icon}/>{t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="search-bar">
            <input className="form-control search-input" placeholder="搜索用户..." value={search} onChange={handleSearch} />
            <button className="btn btn-primary" onClick={() => openModal('user')}><i className="fa-solid fa-user-plus"/>新增用户</button>
          </div>
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <>
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>用户</th><th>用户名</th><th>部门</th><th>角色</th><th>最后登录</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, flexShrink: 0 }}>{u.full_name?.[0] || 'U'}</div>
                              <div>
                                <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.username}</td>
                          <td>{u.dept_name}</td>
                          <td><span className="badge badge-info">{u.role_name}</span></td>
                          <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.last_login?.slice(0, 16) || '从未登录'}</td>
                          <td><span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{u.status === 'active' ? '启用' : '禁用'}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openModal('user', u)}>编辑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 0' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
            </>
          )}
        </>
      )}

      {tab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {roles.map(r => (
            <div key={r.id} className="card">
              <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🔐</span> {r.name}
                </h3>
                <span className="badge badge-primary">{JSON.parse(r.permissions || '[]').length} 权限</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>{r.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {JSON.parse(r.permissions || '[]').map(p => (
                    <span key={p} className="badge badge-secondary" style={{ fontSize: 11 }}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {depts.map(d => (
            <div key={d.id} className="card">
              <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🏢</span> {d.name}
                </h3>
                <span className="badge badge-info">{d.member_count} 人</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>{d.description}</p>
                {d.manager_name && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    部门经理：<span style={{ color: 'var(--text)', fontWeight: 500 }}>{d.manager_name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 用户弹窗 */}
      {modal === 'user' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑用户' : '新增用户'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">用户名 *</label><input className="form-control" value={form.username || ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={!!form.id} /></div>
                <div className="form-group"><label className="form-label">姓名 *</label><input className="form-control" value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">邮箱 *</label><input className="form-control" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">手机</label><input className="form-control" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">部门</label>
                  <select className="form-control" value={form.department_id || ''} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">请选择</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">角色</label>
                  <select className="form-control" value={form.role_id || ''} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}>
                    <option value="">请选择</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {!form.id && (
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">初始密码</label>
                    <input className="form-control" type="password" placeholder="默认：Admin@123" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                )}
                <div className="form-group"><label className="form-label">状态</label>
                  <select className="form-control" value={form.status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">启用</option><option value="inactive">禁用</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveUser}>保存</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
