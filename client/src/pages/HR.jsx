import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import Pagination from '../components/Pagination'

const STAGE_MAP = { applied: '已投递', screening: '筛选中', interview: '面试中', offer: '已发Offer', hired: '已录用', rejected: '已拒绝' }
const STAGE_COLOR = { applied: 'badge-secondary', screening: 'badge-info', interview: 'badge-primary', offer: 'badge-warning', hired: 'badge-success', rejected: 'badge-danger' }

export default function HRPage() {
  const [tab, setTab] = useState('employees')
  const [employees, setEmployees] = useState([])
  const [jobs, setJobs] = useState([])
  const [candidates, setCandidates] = useState([])
  const [performance, setPerformance] = useState([])
  const [trainings, setTrainings] = useState([])
  const [stats, setStats] = useState({})
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  useEffect(() => {
    Promise.all([
      api.get('/hr/stats'),
      api.get('/users/departments/list'),
    ]).then(([s, d]) => { setStats(s); setDepts(d) })
  }, [])

  const loadTab = useCallback((t, p = 1) => {
    if (t !== tab) setPage(1)
    setLoading(true)
    const map = {
      employees: () => api.get('/hr/employees', { params: { page: p, limit, search } }).then(r => {
        setEmployees(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      jobs: () => api.get('/hr/jobs', { params: { page: p, limit } }).then(r => {
        setJobs(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      candidates: () => api.get('/hr/candidates', { params: { page: p, limit } }).then(r => {
        setCandidates(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      performance: () => api.get('/hr/performance', { params: { page: p, limit } }).then(r => {
        setPerformance(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      trainings: () => api.get('/hr/trainings', { params: { page: p, limit } }).then(r => {
        setTrainings(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
    }
    ;(map[t] || (() => Promise.resolve()))().finally(() => setLoading(false))
  }, [tab, search, limit])

  useEffect(() => { loadTab(tab, page) }, [tab, page])

  const switchTab = (t) => { setTab(t); setSearch(''); setPage(1) }
  const openModal = (type, data = {}) => { setModal(type); setForm(data) }
  const closeModal = () => { setModal(null); setForm({}) }
  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handlePageChange = (p) => setPage(p)

  const saveEmployee = async () => {
    try {
      if (form.id) await api.put(`/hr/employees/${form.id}`, form)
      else await api.post('/hr/employees', form)
      closeModal(); loadTab('employees', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const saveJob = async () => {
    try {
      if (form.id) await api.put(`/hr/jobs/${form.id}`, form)
      else await api.post('/hr/jobs', form)
      closeModal(); loadTab('jobs', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const deleteJob = async (id) => {
    if (!confirm('确定要删除该岗位吗？')) return
    try {
      await api.delete(`/hr/jobs/${id}`)
      loadTab('jobs', page)
    } catch (e) { alert(e.error || '删除失败') }
  }

  const saveTraining = async () => {
    try {
      await api.post('/hr/trainings', form)
      closeModal(); loadTab('trainings', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const tabs = [
    { id: 'employees', label: '员工档案', icon: 'fa-solid fa-id-card' },
    { id: 'jobs', label: '招聘管理', icon: 'fa-solid fa-briefcase' },
    { id: 'candidates', label: '应聘者', icon: 'fa-solid fa-user-graduate' },
    { id: 'performance', label: '绩效考核', icon: 'fa-solid fa-star' },
    { id: 'trainings', label: '培训管理', icon: 'fa-solid fa-book-open' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1><i className="fa-solid fa-users" style={{marginRight:10,color:'var(--primary)'}}/>人力资源管理</h1>
        <p>员工档案、招聘管理、绩效考核、培训发展一体化管理</p>
      </div>

      {/* KPI */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-users"/></div><div className="stat-content"><div className="stat-value">{stats.totalEmployees}</div><div className="stat-label">在职员工</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-user-plus"/></div><div className="stat-content"><div className="stat-value">{stats.newHires}</div><div className="stat-label">本月新增</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}><i className="fa-solid fa-briefcase"/></div><div className="stat-content"><div className="stat-value">{stats.openJobs}</div><div className="stat-label">在招岗位</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-coins"/></div><div className="stat-content"><div className="stat-value">¥{stats.avgSalary?.toLocaleString()}</div><div className="stat-label">平均薪资</div></div></div>
      </div>

      {/* 标签页 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={t.icon} />{t.label}
          </button>
        ))}
      </div>

      {/* 搜索栏 */}
      <div className="search-bar">
        <input className="form-control search-input" placeholder="搜索..." value={search} onChange={handleSearch} />
        {tab === 'employees' && <button className="btn btn-primary" onClick={() => openModal('employee')}><i className="fa-solid fa-user-plus"/>新增员工</button>}
        {tab === 'jobs' && <button className="btn btn-primary" onClick={() => openModal('job')}><i className="fa-solid fa-plus"/>发布岗位</button>}
        {tab === 'trainings' && <button className="btn btn-primary" onClick={() => openModal('training')}><i className="fa-solid fa-plus"/>创建培训</button>}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {tab === 'employees' && <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>工号</th><th>姓名</th><th>部门</th><th>职位</th><th>入职日期</th><th>合同类型</th><th>薪资</th><th>状态</th><th>操作</th></tr></thead>
                  <tbody>
                    {employees.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{e.employee_no}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--primary)', flexShrink: 0 }}>{e.full_name[0]}</div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{e.full_name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{e.dept_name}</td>
                        <td>{e.position}</td>
                        <td style={{ fontSize: 13 }}>{e.hire_date}</td>
                        <td><span className="badge badge-info">{e.contract_type}</span></td>
                        <td style={{ fontWeight: 600 }}>¥{e.salary?.toLocaleString()}</td>
                        <td><span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{e.status === 'active' ? '在职' : '离职'}</span></td>
                        <td><button className="btn btn-secondary btn-sm" onClick={() => openModal('employee', e)}>编辑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
            </>}
            {tab === 'jobs' && <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>职位名称</th><th>部门</th><th>招聘人数</th><th>薪资范围</th><th>应聘人数</th><th>状态</th><th>发布时间</th><th>操作</th></tr></thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id}>
                        <td style={{ fontWeight: 500 }}>{j.title}</td>
                        <td>{j.dept_name}</td>
                        <td>{j.headcount} 人</td>
                        <td style={{ fontSize: 13 }}>¥{j.salary_min?.toLocaleString()} ~ ¥{j.salary_max?.toLocaleString()}</td>
                        <td><span className="badge badge-info">{j.applicant_count} 人</span></td>
                        <td><span className={`badge ${j.status === 'open' ? 'badge-success' : 'badge-secondary'}`}>{j.status === 'open' ? '招聘中' : '已关闭'}</span></td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{j.created_at?.slice(0, 10)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openModal('job', j)}>编辑</button>
                            <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => deleteJob(j.id)}><i className="fa-solid fa-trash-can"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
            </>}

            {tab === 'candidates' && <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>姓名</th><th>应聘职位</th><th>联系方式</th><th>阶段</th><th>评分</th><th>投递时间</th></tr></thead>
                  <tbody>
                    {candidates.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                        <td>{c.job_title}</td>
                        <td style={{ fontSize: 13 }}>{c.phone} / {c.email}</td>
                        <td><span className={`badge ${STAGE_COLOR[c.stage] || 'badge-secondary'}`}>{STAGE_MAP[c.stage] || c.stage}</span></td>
                        <td>{c.score ? <span style={{ color: 'var(--warning)', fontWeight: 600 }}><i className="fa-solid fa-star" />{(c.score/20).toFixed(1)}</span> : '-'}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
            </>}

            {tab === 'performance' && <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>员工</th><th>部门</th><th>考核周期</th><th>工作质量</th><th>工作效率</th><th>团队协作</th><th>综合得分</th><th>等级</th><th>状态</th></tr></thead>
                  <tbody>
                    {performance.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.emp_name}</td>
                        <td>{p.dept_name}</td>
                        <td>{p.period}</td>
                        <td><ScoreBar v={p.work_quality} /></td>
                        <td><ScoreBar v={p.work_efficiency} /></td>
                        <td><ScoreBar v={p.team_cooperation} /></td>
                        <td style={{ fontWeight: 700, color: p.score >= 90 ? 'var(--success)' : p.score >= 75 ? 'var(--warning)' : 'var(--danger)' }}>{p.score}</td>
                        <td><span className={`badge ${p.grade?.startsWith('A') ? 'badge-success' : 'badge-warning'}`}>{p.grade}</span></td>
                        <td><span className={`badge ${p.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>{p.status === 'approved' ? '已批准' : '草稿'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
            </>}

            {tab === 'trainings' && <>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>培训名称</th><th>类型</th><th>讲师</th><th>时间</th><th>地点</th><th>参与人数</th><th>费用</th><th>状态</th></tr></thead>
                  <tbody>
                    {trainings.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>{t.title}</td>
                        <td>{t.type}</td>
                        <td>{t.trainer}</td>
                        <td style={{ fontSize: 13 }}>{t.start_date} ~ {t.end_date}</td>
                        <td>{t.location}</td>
                        <td>{t.actual_participants}/{t.max_participants} 人</td>
                        <td>¥{t.cost?.toLocaleString()}</td>
                        <td><span className={`badge ${t.status === 'completed' ? 'badge-success' : t.status === 'in_progress' ? 'badge-primary' : 'badge-warning'}`}>
                          {t.status === 'completed' ? '已完成' : t.status === 'in_progress' ? '进行中' : '计划中'}
                        </span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
            </>}
          </div>
        </div>
      )}

      {/* 新增员工弹窗 */}
      {modal === 'employee' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑员工' : '新增员工'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">姓名 *</label><input className="form-control" value={form.full_name || ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">性别</label>
                  <select className="form-control" value={form.gender || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">请选择</option><option value="男">男</option><option value="女">女</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">手机</label><input className="form-control" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">邮箱</label><input className="form-control" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">部门</label>
                  <select className="form-control" value={form.department_id || ''} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">请选择</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">职位</label><input className="form-control" value={form.position || ''} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">入职日期</label><input className="form-control" type="date" value={form.hire_date || ''} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">薪资</label><input className="form-control" type="number" value={form.salary || ''} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>取消</button>
              <button className="btn btn-primary" onClick={saveEmployee}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 发布岗位弹窗 */}
      {modal === 'job' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑岗位' : '发布招聘岗位'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">职位名称 *</label><input className="form-control" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">招聘部门</label>
                  <select className="form-control" value={form.department_id || ''} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">请选择</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">招聘人数</label><input className="form-control" type="number" value={form.headcount || 1} onChange={e => setForm(f => ({ ...f, headcount: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">最低薪资</label><input className="form-control" type="number" value={form.salary_min || ''} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">最高薪资</label><input className="form-control" type="number" value={form.salary_max || ''} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">岗位要求</label><textarea className="form-control" rows={3} value={form.requirements || ''} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>取消</button>
              <button className="btn btn-primary" onClick={saveJob}>发布</button>
            </div>
          </div>
        </div>
      )}

      {/* 培训弹窗 */}
      {modal === 'training' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>新建培训计划</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">培训名称 *</label><input className="form-control" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">培训类型</label>
                  <select className="form-control" value={form.type || ''} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option>技能培训</option><option>安全培训</option><option>管理培训</option><option>入职培训</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">讲师</label><input className="form-control" value={form.trainer || ''} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">开始日期</label><input className="form-control" type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">结束日期</label><input className="form-control" type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">地点</label><input className="form-control" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">培训费用</label><input className="form-control" type="number" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>取消</button>
              <button className="btn btn-primary" onClick={saveTraining}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreBar({ v }) {
  if (!v) return <span style={{ color: 'var(--text-muted)' }}>-</span>
  const color = v >= 90 ? 'var(--success)' : v >= 75 ? 'var(--primary)' : 'var(--warning)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="progress-bar" style={{ width: 60 }}>
        <div className="progress-fill" style={{ width: `${v}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v}</span>
    </div>
  )
}
