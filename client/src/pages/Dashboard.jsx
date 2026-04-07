import { useState, useEffect } from 'react'
import api from '../utils/api'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel
} from 'recharts'

const COLORS = ['#2563eb', '#3b82f6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6']
const fmt = n => n >= 10000 ? `${(n/10000).toFixed(1)}万` : n?.toLocaleString() || '0'

function KpiCard({ icon, label, value, color, change, prefix = '' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}18`, color }}>
        <i className={icon} />
      </div>
      <div className="stat-content">
        <div className="stat-value">{prefix}{typeof value === 'number' ? fmt(value) : value}</div>
        <div className="stat-label">{label}</div>
        {change && (
          <div className={`stat-change ${change > 0 ? 'up' : 'down'}`}>
            <i className={change > 0 ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'} style={{ marginRight: 3 }} />
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(res => { setData(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner"/></div>
  if (!data) return <div className="empty-state"><div className="icon">⚠️</div><p>加载失败</p></div>

  const { kpis, revenueTrend, salesFunnel, deptDistribution, projectProgress, stockAlerts, notifications, recentTasks } = data

  return (
    <div>
      <div className="page-header">
        <h1><i className="fa-solid fa-gauge-high" style={{marginRight:10,color:'var(--primary)'}}/>工作台</h1>
        <p>欢迎使用 ERPPlus 企业管理系统，今日一切顺利</p>
      </div>

      {/* KPI */}
      <div className="stats-grid">
        <KpiCard icon="fa-solid fa-building-columns" label="银行余额" value={kpis.bankBalance} color="#2563eb" change={5.2} prefix="¥" />
        <KpiCard icon="fa-solid fa-users" label="在职员工" value={kpis.totalEmployees} color="#0ea5e9" change={2.1} />
        <KpiCard icon="fa-solid fa-handshake" label="活跃客户" value={kpis.totalCustomers} color="#0ea5e9" change={8.6} />
        <KpiCard icon="fa-solid fa-diagram-project" label="进行中项目" value={kpis.activeProjects} color="#7c3aed" />
        <KpiCard icon="fa-solid fa-boxes-stacked" label="采购订单" value={kpis.totalOrders} color="#f59e0b" />
        <KpiCard icon="fa-solid fa-triangle-exclamation" label="库存预警" value={kpis.lowStockItems} color="#ef4444" />
        <KpiCard icon="fa-solid fa-clipboard-list" label="待处理订单" value={kpis.pendingOrders} color="#0891b2" />
        <KpiCard icon="fa-solid fa-credit-card" label="应收账款" value={kpis.receivables} color="#2563eb" prefix="¥" />
      </div>

      {/* 图表行1 */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* 收入趋势 */}
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-chart-line" style={{marginRight:8,color:'var(--primary)'}}/>收支趋势（近6个月）</h3></div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer>
                <LineChart data={revenueTrend.length ? revenueTrend : [
                  { month: '10', income: 680000, expense: 420000 },
                  { month: '11', income: 720000, expense: 390000 },
                  { month: '12', income: 890000, expense: 510000 },
                  { month: '01', income: 760000, expense: 440000 },
                  { month: '02', income: 810000, expense: 480000 },
                  { month: '03', income: 950000, expense: 520000 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                  <Tooltip formatter={v => [`¥${v.toLocaleString()}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="收入" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="expense" name="支出" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 部门人员 */}
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-building-user" style={{marginRight:8,color:'var(--primary)'}}/>部门人员分布</h3></div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={deptDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {deptDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 图表行2 */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* 销售漏斗 */}
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-filter" style={{marginRight:8,color:'var(--primary)'}}/>销售漏斗</h3></div>
          <div className="card-body">
            {(() => {
              const stageMap = { lead: '线索', qualified: '意向', proposal: '方案', negotiation: '商谈', won: '赢单', lost: '失单' }
              const stageColors = { lead: '#6366f1', qualified: '#0891b2', proposal: '#2563eb', negotiation: '#d97706', won: '#16a34a', lost: '#ef4444' }
              const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won']
              return stages.map(stage => {
                const d = salesFunnel.find(s => s.stage === stage)
                return (
                  <div key={stage} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span>{stageMap[stage]}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{d?.count || 0} 条 · ¥{fmt(d?.amount || 0)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min((d?.count || 0) * 20, 100)}%`, background: stageColors[stage] }} />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* 库存预警 */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-triangle-exclamation" style={{marginRight:8,color:'#ef4444'}}/>库存预警</h3>
            <span className="badge badge-danger">{stockAlerts.length} 项</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>产品</th><th>当前库存</th><th>最低库存</th><th>状态</th></tr></thead>
                <tbody>
                  {stockAlerts.slice(0, 6).map(item => (
                    <tr key={item.code}>
                      <td><div style={{ fontWeight: 500 }}>{item.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.code}</div></td>
                      <td style={{ color: item.stock_qty <= 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>{item.stock_qty} {item.unit}</td>
                      <td>{item.min_stock} {item.unit}</td>
                      <td><span className={`badge ${item.stock_qty <= 0 ? 'badge-danger' : 'badge-warning'}`}>{item.stock_qty <= 0 ? '断货' : '低库存'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 项目进度 & 任务 */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-diagram-project" style={{marginRight:8,color:'var(--primary)'}}/>项目进度</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>项目</th><th>进度</th><th>状态</th><th>截止日</th></tr></thead>
                <tbody>
                  {projectProgress.map(p => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td style={{ width: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 32 }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${p.status === 'in_progress' ? 'badge-primary' : 'badge-warning'}`}>{p.status === 'in_progress' ? '进行中' : '规划中'}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.end_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 通知 */}
        <div className="card">
          <div className="card-header"><h3><i className="fa-solid fa-bell" style={{marginRight:8,color:'var(--primary)'}}/>系统通知</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {notifications.slice(0, 6).map(n => (
              <div key={n.id} style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: n.is_read ? 'transparent' : 'rgba(37,99,235,.02)'
              }}>
                <span style={{ fontSize: 16 }}>
                  {n.type === 'success'
                    ? <i className="fa-solid fa-circle-check" style={{color:'#2563eb'}}/>
                    : n.type === 'warning'
                    ? <i className="fa-solid fa-triangle-exclamation" style={{color:'#f59e0b'}}/>
                    : n.type === 'error'
                    ? <i className="fa-solid fa-circle-xmark" style={{color:'#ef4444'}}/>
                    : <i className="fa-solid fa-circle-info" style={{color:'#0ea5e9'}}/>
                  }
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.content}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{n.created_at?.slice(0, 16)}</div>
                </div>
                {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 近期任务 */}
      <div className="card">
        <div className="card-header"><h3><i className="fa-solid fa-list-check" style={{marginRight:8,color:'var(--primary)'}}/>近期任务</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>任务</th><th>所属项目</th><th>负责人</th><th>优先级</th><th>截止日期</th><th>状态</th></tr></thead>
              <tbody>
                {recentTasks.map(t => {
                  const pMap = { high: ['高', 'badge-danger'], medium: ['中', 'badge-warning'], low: ['低', 'badge-secondary'] }
                  const sMap = { todo: ['待开始', 'badge-secondary'], in_progress: ['进行中', 'badge-primary'], done: ['已完成', 'badge-success'] }
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.project_name}</td>
                      <td>{t.assignee_name}</td>
                      <td><span className={`badge ${pMap[t.priority]?.[1] || 'badge-secondary'}`}>{pMap[t.priority]?.[0] || t.priority}</span></td>
                      <td style={{ fontSize: 13, color: t.due_date < new Date().toISOString().slice(0, 10) ? 'var(--danger)' : 'var(--text-muted)' }}>{t.due_date}</td>
                      <td><span className={`badge ${sMap[t.status]?.[1] || 'badge-secondary'}`}>{sMap[t.status]?.[0] || t.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
