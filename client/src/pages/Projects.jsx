import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import Pagination from '../components/Pagination'

const STATUS_MAP = { planning: ['规划中', 'badge-warning'], in_progress: ['进行中', 'badge-primary'], completed: ['已完成', 'badge-success'], on_hold: ['暂停', 'badge-secondary'], cancelled: ['已取消', 'badge-danger'] }
const PRIORITY_MAP = { high: ['高', 'badge-danger'], medium: ['中', 'badge-warning'], low: ['低', 'badge-secondary'] }
const TASK_STATUS = { todo: ['待开始', 'badge-secondary'], in_progress: ['进行中', 'badge-primary'], done: ['已完成', 'badge-success'] }

export default function ProjectsPage() {
  const [tab, setTab] = useState('list')
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(12)

  useEffect(() => {
    api.get('/projects/stats/overview').then(setStats)
    api.get('/users', { params: { limit: 100 } }).then(r => setUsers(r.data || []))
    api.get('/crm/customers', { params: { limit: 100 } }).then(r => setCustomers(r.data || []))
  }, [])

  const loadProjects = useCallback((p = page, s = search) => {
    setLoading(true)
    api.get('/projects', { params: { page: p, limit, search: s } }).then(r => {
      setProjects(r.data || [])
      setTotal(r.total || 0)
      setTotalPages(r.totalPages || 1)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [page, limit, search])

  useEffect(() => { loadProjects(page, search) }, [page, search])

  const loadTasks = useCallback((projectId, p = 1) => {
    api.get(`/projects/${projectId}/tasks`, { params: { page: p, limit: 50 } }).then(r => {
      setTasks(r.data || [])
    })
  }, [])

  const selectProject = (p) => {
    setSelectedProject(p)
    setTab('tasks')
    loadTasks(p.id)
  }

  const openModal = (type, data = {}) => { setModal(type); setForm(data) }
  const closeModal = () => { setModal(null); setForm({}) }

  const saveProject = async () => {
    try {
      if (form.id) await api.put(`/projects/${form.id}`, form)
      else await api.post('/projects', form)
      closeModal(); loadProjects(page, search)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const saveTask = async () => {
    try {
      if (form.id) await api.put(`/projects/tasks/${form.id}`, form)
      else await api.post(`/projects/${selectedProject.id}/tasks`, form)
      closeModal(); loadTasks(selectedProject.id)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const updateTaskStatus = async (task, status) => {
    try {
      await api.put(`/projects/tasks/${task.id}`, { ...task, status })
      loadTasks(selectedProject.id)
    } catch (e) { alert('更新失败') }
  }

  const deleteTask = async (taskId) => {
    if (!confirm('确定要删除该任务吗？')) return
    try {
      await api.delete(`/projects/tasks/${taskId}`)
      loadTasks(selectedProject.id)
    } catch (e) { alert('删除失败') }
  }

  const deleteProject = async (projectId) => {
    if (!confirm('确定要删除该项目及其所有任务吗？此操作不可撤销。')) return
    try {
      await api.delete(`/projects/${projectId}`)
      setSelectedProject(null)
      setTab('list')
      loadProjects(page, search)
    } catch (e) { alert('删除失败') }
  }

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handlePageChange = (p) => setPage(p)

  const tabs = [
    { id: 'list', label: '项目列表', icon: 'fa-solid fa-list' },
    ...(selectedProject ? [{ id: 'tasks', label: `${selectedProject.name.slice(0, 8)}... 任务`, icon: 'fa-solid fa-thumbtack' }] : []),
    { id: 'overview', label: '数据概览', icon: 'fa-solid fa-chart-pie' },
  ]

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  }

  return (
    <div>
      <div className="page-header">
        <h1><i className="fa-solid fa-diagram-project" style={{marginRight:10,color:'var(--primary)'}}/>项目管理</h1>
        <p>项目规划、任务跟踪、进度管理、资源协作一体化</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color:'#2563eb' }}><i className="fa-solid fa-diagram-project"/></div><div className="stat-content"><div className="stat-value">{stats.total}</div><div className="stat-label">项目总数</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color:'#2563eb' }}><i className="fa-solid fa-rocket"/></div><div className="stat-content"><div className="stat-value">{stats.inProgress}</div><div className="stat-label">进行中</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color:'#b45309' }}><i className="fa-solid fa-sack-dollar"/></div><div className="stat-content"><div className="stat-value">¥{((stats.totalBudget || 0) / 10000).toFixed(0)}万</div><div className="stat-label">总预算</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fee2e2', color:'#b91c1c' }}><i className="fa-solid fa-clock"/></div><div className="stat-content"><div className="stat-value" style={{ color: stats.overdueProjects > 0 ? 'var(--danger)' : 'inherit' }}>{stats.overdueProjects}</div><div className="stat-label">逾期项目</div></div></div>
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

      {tab === 'list' && (
        <>
          <div className="search-bar">
            <input className="form-control search-input" placeholder="搜索项目..." value={search} onChange={handleSearch} />
            <button className="btn btn-primary" onClick={() => openModal('project')}><i className="fa-solid fa-plus"/>新建项目</button>
          </div>
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {projects.map(p => (
                <div key={p.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow .15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>
                  <div className="card-header">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.code}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className={`badge ${STATUS_MAP[p.status]?.[1] || 'badge-secondary'}`}>{STATUS_MAP[p.status]?.[0] || p.status}</span>
                      <span className={`badge ${PRIORITY_MAP[p.priority]?.[1] || 'badge-secondary'}`}>{PRIORITY_MAP[p.priority]?.[0] || p.priority}优先</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-muted)' }}>项目进度</span>
                        <span style={{ fontWeight: 600 }}>{p.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${p.progress}%`, background: p.progress >= 80 ? 'var(--success)' : p.progress >= 40 ? 'var(--primary)' : 'var(--warning)' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 12 }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>负责人：</span>{p.manager_name}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>客户：</span>{p.customer_name || '内部项目'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>预算：</span>¥{(p.budget / 10000).toFixed(0)}万</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>实耗：</span>¥{(p.actual_cost / 10000).toFixed(0)}万</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>开始：</span>{p.start_date}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>截止：</span><span style={{ color: p.end_date < new Date().toISOString().slice(0,10) && p.status !== 'completed' ? 'var(--danger)' : 'inherit' }}>{p.end_date}</span></div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        任务：{p.done_count}/{p.task_count}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openModal('project', p)}>编辑</button>
                        <button className="btn btn-primary btn-sm" onClick={() => selectProject(p)}>查看任务</button>
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }} title="删除项目"><i className="fa-solid fa-trash-can"/></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} />
            </>
          )}
        </>
      )}

      {tab === 'tasks' && selectedProject && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setTab('list')}>← 返回</button>
            <div>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedProject.name}</span>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--text-muted)' }}>进度 {selectedProject.progress}%</span>
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => openModal('task')}><i className="fa-solid fa-plus"/>新增任务</button>
          </div>

          <div className="kanban">
            {[['todo', '待开始', '⏳'], ['in_progress', '进行中', '🚀'], ['done', '已完成', '✅']].map(([status, label, icon]) => (
              <div className="kanban-col" key={status}>
                <div className="kanban-col-header">
                  <span>{icon} {label}</span>
                  <span className="badge badge-secondary">{tasksByStatus[status]?.length || 0}</span>
                </div>
                <div className="kanban-col-body">
                  {tasksByStatus[status]?.map(task => (
                    <div key={task.id} className="kanban-card" onClick={() => openModal('task', task)}>
                      <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 14 }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span className={`badge ${PRIORITY_MAP[task.priority]?.[1] || 'badge-secondary'}`} style={{ fontSize: 11 }}>
                          {PRIORITY_MAP[task.priority]?.[0]}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{task.assignee_name}</span>
                        <span style={{ color: task.due_date < new Date().toISOString().slice(0,10) && task.status !== 'done' ? 'var(--danger)' : 'inherit' }}>{task.due_date}</span>
                      </div>
                      {task.progress > 0 && (
                        <div className="progress-bar" style={{ marginTop: 8 }}>
                          <div className="progress-fill" style={{ width: `${task.progress}%` }} />
                        </div>
                      )}
                      {status !== 'done' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          {status === 'todo' && <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => updateTaskStatus(task, 'in_progress')}>开始</button>}
                          {status === 'in_progress' && <button className="btn btn-success btn-sm" style={{ fontSize: 11 }} onClick={() => updateTaskStatus(task, 'done')}>完成</button>}
                          <button className="btn btn-sm" style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => deleteTask(task.id)}><i className="fa-solid fa-trash-can"/></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {tasksByStatus[status]?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>暂无任务</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'overview' && (
        <div>
          <div className="grid-2">
            <div className="card">
              <div className="card-header"><h3>项目状态分布</h3></div>
              <div className="card-body">
                {[
                  { status: 'planning', count: stats.planning, color: '#f59e0b' },
                  { status: 'in_progress', count: stats.inProgress, color: '#2563eb' },
                  { status: 'completed', count: stats.completed, color: '#16a34a' },
                ].map(item => (
                  <div key={item.status} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                      <span>{STATUS_MAP[item.status]?.[0]}</span>
                      <span style={{ fontWeight: 600 }}>{item.count || 0} 个</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${((item.count || 0) / (stats.total || 1)) * 100}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>任务完成情况</h3></div>
              <div className="card-body">
                {(stats.taskStats || []).map(ts => {
                  const sMap = { todo: ['待开始', '#94a3b8'], in_progress: ['进行中', '#2563eb'], done: ['已完成', '#16a34a'] }
                  return (
                    <div key={ts.status} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sMap[ts.status]?.[1], flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{sMap[ts.status]?.[0] || ts.status}</span>
                      <span style={{ fontWeight: 600, fontSize: 18 }}>{ts.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3>预算执行情况</h3></div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span>总预算</span><span style={{ fontWeight: 600 }}>¥{((stats.totalBudget || 0) / 10000).toFixed(0)}万</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span>已支出</span><span style={{ fontWeight: 600, color: 'var(--danger)' }}>¥{((stats.totalCost || 0) / 10000).toFixed(0)}万</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
                <span>剩余预算</span><span style={{ fontWeight: 600, color: 'var(--success)' }}>¥{(((stats.totalBudget || 0) - (stats.totalCost || 0)) / 10000).toFixed(0)}万</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${Math.min(((stats.totalCost || 0) / (stats.totalBudget || 1)) * 100, 100)}%`, background: (stats.totalCost / stats.totalBudget) > 0.9 ? 'var(--danger)' : 'var(--primary)' }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                预算执行率 {(((stats.totalCost || 0) / (stats.totalBudget || 1)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新建项目弹窗 */}
      {modal === 'project' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑项目' : '新建项目'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">项目名称 *</label><input className="form-control" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">关联客户</label>
                  <select className="form-control" value={form.customer_id || ''} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">内部项目</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">优先级</label>
                  <select className="form-control" value={form.priority || 'medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">开始日期</label><input className="form-control" type="date" value={form.start_date || ''} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">截止日期</label><input className="form-control" type="date" value={form.end_date || ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">预算金额</label><input className="form-control" type="number" value={form.budget || ''} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">项目进度</label><input className="form-control" type="number" min={0} max={100} value={form.progress || 0} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">项目描述</label><textarea className="form-control" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveProject}>保存</button></div>
          </div>
        </div>
      )}

      {/* 新建任务弹窗 */}
      {modal === 'task' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑任务' : '新增任务'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">任务标题 *</label><input className="form-control" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">负责人</label>
                  <select className="form-control" value={form.assignee_id || ''} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                    <option value="">请选择</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">优先级</label>
                  <select className="form-control" value={form.priority || 'medium'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">状态</label>
                  <select className="form-control" value={form.status || 'todo'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="todo">待开始</option><option value="in_progress">进行中</option><option value="done">已完成</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">截止日期</label><input className="form-control" type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">任务描述</label><textarea className="form-control" rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveTask}>保存</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
