import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Pagination, { usePagination } from '../components/Pagination'

const COLORS = ['#2563eb','#3b82f6','#0ea5e9','#f59e0b','#ef4444','#8b5cf6']
const STAGE_LABEL = { lead:'线索', qualified:'意向客户', proposal:'方案制定', negotiation:'商务谈判', won:'赢单', lost:'失单' }
const STAGE_COLOR = { lead:'badge-secondary', qualified:'badge-info', proposal:'badge-primary', negotiation:'badge-warning', won:'badge-success', lost:'badge-danger' }
const TYPE_LABEL = { support:'技术支持', complaint:'投诉', consult:'咨询' }
const PRIORITY_LABEL = { high:'高', medium:'中', low:'低' }
const PRIORITY_COLOR = { high:'badge-danger', medium:'badge-warning', low:'badge-secondary' }
const STATUS_LABEL = { open:'待处理', in_progress:'处理中', resolved:'已解决', closed:'已关闭' }
const STATUS_COLOR = { open:'badge-primary', in_progress:'badge-warning', resolved:'badge-success', closed:'badge-secondary' }

export default function CRMPage() {
  const [tab, setTab] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [leads, setLeads] = useState([])
  const [service, setService] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)

  // 分页状态
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  useEffect(() => {
    api.get('/crm/stats').then(setStats)
    api.get('/users/', { params: { limit: 100, status: 'active' } }).then(r => setUsers(r.data || []))
  }, [])

  const loadTab = useCallback((t, p = 1) => {
    if (t !== tab) setPage(1)
    setLoading(true)
    const calls = {
      customers: () => api.get('/crm/customers', { params: { page: p, limit, search } }).then(r => {
        setCustomers(r.data || [])
        setTotal(r.total || 0)
        setTotalPages(r.totalPages || 1)
      }),
      leads: () => api.get('/crm/leads', { params: { page: p, limit, stage: '' } }).then(r => {
        setLeads(r.data || [])
        setTotal(r.total || 0)
        setTotalPages(r.totalPages || 1)
      }),
      service: () => api.get('/crm/service', { params: { page: p, limit } }).then(r => {
        setService(r.data || [])
        setTotal(r.total || 0)
        setTotalPages(r.totalPages || 1)
      }),
    }
    ;(calls[t] || (() => Promise.resolve()))().finally(() => setLoading(false))
  }, [tab, search, limit])

  useEffect(() => { loadTab(tab, page) }, [tab, page])

  const switchTab = t => { setTab(t); setSearch(''); setPage(1) }
  const openModal = (type, data = {}) => { setModal(type); setForm(data) }
  const closeModal = () => { setModal(null); setForm({}) }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handlePageChange = (newPage) => { setPage(newPage) }

  const saveCustomer = async () => {
    try {
      if (form.id) await api.put(`/crm/customers/${form.id}`, form)
      else await api.post('/crm/customers', form)
      closeModal(); loadTab('customers', page); api.get('/crm/stats').then(setStats)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const saveLead = async () => {
    try {
      if (form.id) await api.put(`/crm/leads/${form.id}`, form)
      else await api.post('/crm/leads', form)
      closeModal(); loadTab('leads', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const saveService = async () => {
    if (!form.title?.trim()) return alert('请输入工单标题')
    setSaving(true)
    try {
      if (form.id) {
        await api.put(`/crm/service/${form.id}`, form)
      } else {
        await api.post('/crm/service', form)
      }
      closeModal(); loadTab('service', page); api.get('/crm/stats').then(setStats)
    } catch (e) { alert(e.response?.data?.error || e.error || '保存失败') }
    finally { setSaving(false) }
  }

  const deleteService = async (id) => {
    if (!confirm('确定要删除该工单吗？此操作不可撤销。')) return
    try {
      await api.delete(`/crm/service/${id}`)
      loadTab('service', page); api.get('/crm/stats').then(setStats)
    } catch (e) { alert('删除失败') }
  }

  const updateServiceStatus = async (id, status) => {
    try {
      await api.patch(`/crm/service/${id}/status`, { status })
      loadTab('service', page); api.get('/crm/stats').then(setStats)
      if (modal === 'serviceDetail') closeModal()
    } catch (e) { alert('更新失败') }
  }

  const tabs = [
    { id: 'customers', label: '客户列表', icon: 'fa-solid fa-handshake' },
    { id: 'leads', label: '销售线索', icon: 'fa-solid fa-filter' },
    { id: 'service', label: '服务请求', icon: 'fa-solid fa-screwdriver-wrench' },
    { id: 'analysis', label: '数据分析', icon: 'fa-solid fa-chart-pie' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1><i className="fa-solid fa-handshake" style={{marginRight:10,color:'var(--primary)'}}/>客户关系管理</h1>
        <p>客户档案、销售线索跟踪、服务请求处理全面管理</p>
      </div>

      {/* KPI */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-building"/></div><div className="stat-content"><div className="stat-value">{stats.totalCustomers}</div><div className="stat-label">客户总数</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-coins"/></div><div className="stat-content"><div className="stat-value">¥{stats.wonDeals?.total ? (stats.wonDeals.total / 10000).toFixed(0) + '万' : '0'}</div><div className="stat-label">已赢单金额</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}><i className="fa-solid fa-chart-line"/></div><div className="stat-content"><div className="stat-value">¥{stats.totalLeadValue ? (stats.totalLeadValue / 10000).toFixed(0) + '万' : '0'}</div><div className="stat-label">商机总值</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="fa-solid fa-headset"/></div><div className="stat-content"><div className="stat-value">{stats.openService}</div><div className="stat-label">待处理工单</div></div></div>
      </div>

      {/* 标签页 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={t.icon}/>{t.label}
          </button>
        ))}
      </div>

      {tab !== 'analysis' && (
        <div className="search-bar">
          <input className="form-control search-input" placeholder="搜索..." value={search} onChange={handleSearch} />
          {tab === 'customers' && <button className="btn btn-primary" onClick={() => openModal('customer')}><i className="fa-solid fa-plus"/>新增客户</button>}
          {tab === 'leads' && <button className="btn btn-primary" onClick={() => openModal('lead')}><i className="fa-solid fa-plus"/>新建线索</button>}
          {tab === 'service' && <button className="btn btn-primary" onClick={() => openModal('service')}><i className="fa-solid fa-plus"/>新建工单</button>}
        </div>
      )}

      {loading && tab !== 'analysis' ? <div className="loading"><div className="spinner" /></div> : (
        <>
          {tab === 'customers' && (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>客户名称</th><th>类型</th><th>行业</th><th>联系人</th><th>联系电话</th><th>省份</th><th>信用等级</th><th>年度价值</th><th>操作</th></tr></thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'var(--primary)', flexShrink: 0 }}>{c.name[0]}</div>
                              <div>
                                <div style={{ fontWeight: 500 }}>{c.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.contact_email}</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge badge-info">{c.type === 'enterprise' ? '企业' : '个人'}</span></td>
                          <td>{c.industry}</td>
                          <td>{c.contact_person}</td>
                          <td style={{ fontSize: 13 }}>{c.contact_phone}</td>
                          <td>{c.province}</td>
                          <td>
                            <span className={`badge ${c.credit_level === 'A' ? 'badge-success' : c.credit_level === 'B' ? 'badge-warning' : 'badge-danger'}`}>
                              {c.credit_level}级
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{(c.annual_value / 10000).toFixed(0)}万</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openModal('customer', c)}>编辑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0 16px 12px' }}>
                  <Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} />
                </div>
              </div>
            </div>
          )}

          {tab === 'leads' && (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>线索标题</th><th>客户</th><th>金额</th><th>阶段</th><th>赢单率</th><th>预计成交</th><th>负责人</th><th>操作</th></tr></thead>
                    <tbody>
                      {leads.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 500 }}>{l.title}</td>
                          <td>{l.customer_full_name || l.customer_name}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{l.amount?.toLocaleString()}</td>
                          <td><span className={`badge ${STAGE_COLOR[l.stage] || 'badge-secondary'}`}>{STAGE_LABEL[l.stage] || l.stage}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="progress-bar" style={{ width: 60 }}>
                                <div className="progress-fill" style={{ width: `${l.probability}%`, background: l.probability >= 70 ? 'var(--success)' : 'var(--primary)' }} />
                              </div>
                              <span style={{ fontSize: 12 }}>{l.probability}%</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{l.expected_close}</td>
                          <td>{l.owner_name}</td>
                          <td><button className="btn btn-secondary btn-sm" onClick={() => openModal('lead', l)}>跟进</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0 16px 12px' }}>
                  <Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} />
                </div>
              </div>
            </div>
          )}

          {tab === 'service' && (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>工单标题</th><th>客户</th><th>类型</th><th>优先级</th><th>负责人</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
                    <tbody>
                      {service.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => openModal('serviceDetail', s)}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.status === 'resolved' || s.status === 'closed' ? 'var(--success-light, #dcfce7)' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className={`fa-solid ${s.type === 'complaint' ? 'fa-triangle-exclamation' : s.type === 'consult' ? 'fa-comments' : 'fa-screwdriver-wrench'}`} style={{ fontSize: 14, color: s.type === 'complaint' ? 'var(--danger, #ef4444)' : 'var(--primary)' }} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 500 }}>{s.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td>{s.customer_name || '—'}</td>
                          <td><span className="badge badge-info">{TYPE_LABEL[s.type] || s.type}</span></td>
                          <td>
                            <span className={`badge ${PRIORITY_COLOR[s.priority] || 'badge-secondary'}`}>
                              {s.priority === 'high' && <i className="fa-solid fa-arrow-up" style={{ marginRight: 3, fontSize: 10 }} />}
                              {PRIORITY_LABEL[s.priority] || s.priority}
                            </span>
                          </td>
                          <td>
                            {s.assignee_name ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>{s.assignee_name[0]}</div>
                                {s.assignee_name}
                              </div>
                            ) : <span style={{ color: 'var(--text-muted)' }}>未分配</span>}
                          </td>
                          <td><span className={`badge ${STATUS_COLOR[s.status] || 'badge-secondary'}`}>{STATUS_LABEL[s.status] || s.status}</span></td>
                          <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.created_at?.slice(0, 16)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openModal('serviceDetail', s)} title="查看详情"><i className="fa-solid fa-eye"/></button>
                              <button className="btn btn-secondary btn-sm" onClick={() => openModal('service', s)} title="编辑"><i className="fa-solid fa-pen"/></button>
                              {s.status === 'open' && <button className="btn btn-sm" style={{ background: '#dbeafe', color: '#2563eb', border: 'none' }} onClick={() => updateServiceStatus(s.id, 'in_progress')} title="开始处理"><i className="fa-solid fa-play"/></button>}
                              {s.status === 'in_progress' && <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#16a34a', border: 'none' }} onClick={() => updateServiceStatus(s.id, 'resolved')} title="标记解决"><i className="fa-solid fa-check"/></button>}
                              <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => deleteService(s.id)} title="删除"><i className="fa-solid fa-trash-can"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0 16px 12px' }}>
                  <Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} />
                </div>
              </div>
            </div>
          )}

          {tab === 'analysis' && (
            <div>
              <div className="grid-2">
                <div className="card">
                  <div className="card-header"><h3>销售阶段分布</h3></div>
                  <div className="card-body">
                    <div className="chart-container">
                      <ResponsiveContainer>
                        <BarChart data={(stats.stageStats || []).map(s => ({ ...s, name: STAGE_LABEL[s.stage] || s.stage }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                          <Tooltip formatter={(v, n) => [n === 'amount' ? `¥${v?.toLocaleString()}` : v, n === 'amount' ? '金额' : '数量']} />
                          <Legend />
                          <Bar dataKey="count" name="数量" fill="#2563eb" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3>客户地区分布</h3></div>
                  <div className="card-body">
                    <div className="chart-container">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={stats.topCustomers?.map((c, i) => ({ name: c.name?.slice(0, 6), value: c.annual_value })) || []} dataKey="value" cx="50%" cy="50%" outerRadius={100}>
                            {(stats.topCustomers || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={v => [`¥${(v/10000).toFixed(0)}万`]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header"><h3>🏆 TOP5 重要客户</h3></div>
                <div className="card-body" style={{ padding: 0 }}>
                  <table><thead><tr><th>排名</th><th>客户名称</th><th>年度价值</th><th>信用等级</th></tr></thead>
                    <tbody>
                      {(stats.topCustomers || []).map((c, i) => (
                        <tr key={c.name}>
                          <td><span style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? ['#f59e0b','#94a3b8','#b45309'][i] : 'var(--bg)', color: i < 3 ? 'white' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{i + 1}</span></td>
                          <td style={{ fontWeight: 500 }}>{c.name}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{(c.annual_value / 10000).toFixed(0)}万</td>
                          <td><span className={`badge ${c.credit_level === 'A' ? 'badge-success' : 'badge-warning'}`}>{c.credit_level}级</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 客户弹窗 */}
      {modal === 'customer' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑客户' : '新增客户'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">客户名称 *</label><input className="form-control" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">行业</label><input className="form-control" value={form.industry || ''} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">信用等级</label>
                  <select className="form-control" value={form.credit_level || 'B'} onChange={e => setForm(f => ({ ...f, credit_level: e.target.value }))}>
                    <option value="A">A级</option><option value="B">B级</option><option value="C">C级</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">联系人</label><input className="form-control" value={form.contact_person || ''} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">联系电话</label><input className="form-control" value={form.contact_phone || ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">省份</label><input className="form-control" value={form.province || ''} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">城市</label><input className="form-control" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">年度价值</label><input className="form-control" type="number" value={form.annual_value || ''} onChange={e => setForm(f => ({ ...f, annual_value: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveCustomer}>保存</button></div>
          </div>
        </div>
      )}

      {/* 线索弹窗 */}
      {modal === 'lead' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '跟进线索' : '新建线索'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">线索标题 *</label><input className="form-control" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">客户名称</label><input className="form-control" value={form.customer_name || ''} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">金额</label><input className="form-control" type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">阶段</label>
                  <select className="form-control" value={form.stage || 'lead'} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                    {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">赢单率(%)</label><input className="form-control" type="number" min={0} max={100} value={form.probability || 20} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">预计成交</label><input className="form-control" type="date" value={form.expected_close || ''} onChange={e => setForm(f => ({ ...f, expected_close: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">备注</label><textarea className="form-control" rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveLead}>保存</button></div>
          </div>
        </div>
      )}

      {/* 新建/编辑工单弹窗 */}
      {modal === 'service' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-screwdriver-wrench" style={{ marginRight: 8, color: 'var(--primary)' }}/>{form.id ? '编辑工单' : '新建工单'}</h2>
              <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">工单标题 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="form-control" placeholder="请简要描述问题或需求" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">关联客户</label>
                  <select className="form-control" value={form.customer_id || ''} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">-- 请选择客户 --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">工单类型</label>
                  <select className="form-control" value={form.type || 'support'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="support">🔧 技术支持</option>
                    <option value="complaint">⚠️ 投诉</option>
                    <option value="consult">💬 咨询</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">优先级</label>
                  <select className="form-control" value={form.priority || 'medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">🟢 低</option>
                    <option value="medium">🟡 中</option>
                    <option value="high">🔴 高</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">指派负责人</label>
                  <select className="form-control" value={form.assignee_id || ''} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                    <option value="">-- 请选择负责人 --</option>
                    {users.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role_name || u.username})</option>)}
                  </select>
                </div>
              </div>
              {form.id && (
                <div className="form-group">
                  <label className="form-label">当前状态</label>
                  <select className="form-control" value={form.status || 'open'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">问题描述</label>
                <textarea className="form-control" rows={4} placeholder="请详细描述问题现象、影响范围、期望解决方式等" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>取消</button>
              <button className="btn btn-primary" onClick={saveService} disabled={saving}>
                {saving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}/>保存中...</> : form.id ? '保存修改' : '创建工单'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 工单详情弹窗 */}
      {modal === 'serviceDetail' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: form.type === 'complaint' ? '#fee2e2' : form.type === 'consult' ? '#dbeafe' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fa-solid ${form.type === 'complaint' ? 'fa-triangle-exclamation' : form.type === 'consult' ? 'fa-comments' : 'fa-screwdriver-wrench'}`} style={{ fontSize: 16, color: form.type === 'complaint' ? '#ef4444' : 'var(--primary)' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>{form.title}</h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>创建于 {form.created_at?.slice(0, 16)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {form.status !== 'closed' && form.status !== 'resolved' && (
                  <button className="btn btn-primary btn-sm" onClick={() => { setModal('service') }}>
                    <i className="fa-solid fa-pen" style={{ marginRight: 4 }}/>编辑
                  </button>
                )}
                <button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button>
              </div>
            </div>
            <div className="modal-body">
              {/* 状态和优先级标签 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <span className={`badge ${STATUS_COLOR[form.status] || 'badge-secondary'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                  {STATUS_LABEL[form.status] || form.status}
                </span>
                <span className={`badge ${PRIORITY_COLOR[form.priority] || 'badge-secondary'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                  {PRIORITY_LABEL[form.priority] || form.priority}优先级
                </span>
                <span className="badge badge-info" style={{ fontSize: 13, padding: '6px 14px' }}>
                  {TYPE_LABEL[form.type] || form.type}
                </span>
              </div>

              {/* 详情信息 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>关联客户</div>
                  <div style={{ fontWeight: 500 }}>{form.customer_name || '未关联'}</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>负责人</div>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {form.assignee_name ? (
                      <>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--primary)' }}>{form.assignee_name[0]}</div>
                        {form.assignee_name}
                      </>
                    ) : <span style={{ color: 'var(--text-muted)' }}>未分配</span>}
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>创建时间</div>
                  <div style={{ fontWeight: 500 }}>{form.created_at?.slice(0, 16)}</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>解决时间</div>
                  <div style={{ fontWeight: 500 }}>{form.resolved_at?.slice(0, 16) || '—'}</div>
                </div>
              </div>

              {/* 问题描述 */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>问题描述</h4>
                <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 10, lineHeight: 1.7, fontSize: 14, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {form.description || '暂无描述'}
                </div>
              </div>

              {/* 快捷状态操作 */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>快捷操作</h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.status === 'open' && (
                    <button className="btn btn-sm" style={{ background: '#dbeafe', color: '#2563eb', border: 'none', padding: '8px 16px' }} onClick={() => updateServiceStatus(form.id, 'in_progress')}>
                      <i className="fa-solid fa-play" style={{ marginRight: 6 }}/>开始处理
                    </button>
                  )}
                  {form.status === 'in_progress' && (
                    <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '8px 16px' }} onClick={() => updateServiceStatus(form.id, 'resolved')}>
                      <i className="fa-solid fa-check" style={{ marginRight: 6 }}/>标记已解决
                    </button>
                  )}
                  {(form.status === 'open' || form.status === 'in_progress') && (
                    <button className="btn btn-sm" style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '8px 16px' }} onClick={() => updateServiceStatus(form.id, 'closed')}>
                      <i className="fa-solid fa-xmark" style={{ marginRight: 6 }}/>关闭工单
                    </button>
                  )}
                  {(form.status === 'resolved' || form.status === 'closed') && (
                    <button className="btn btn-sm" style={{ background: '#dbeafe', color: '#2563eb', border: 'none', padding: '8px 16px' }} onClick={() => updateServiceStatus(form.id, 'open')}>
                      <i className="fa-solid fa-rotate-left" style={{ marginRight: 6 }}/>重新打开
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
