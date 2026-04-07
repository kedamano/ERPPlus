import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts'
import './Analytics.css'

const COLORS = ['#2563eb', '#3b82f6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#f97316']
const COLORS20 = ['#2563eb','#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#10b981','#22c55e','#84cc16','#eab308','#f59e0b','#f97316','#ef4444','#ec4899','#d946ef','#a855f7','#8b5cf6','#6366f1','#4f46e5','#4338ca','#3730a3']

const fmt = n => {
  if (n == null || isNaN(n)) return '0'
  if (Math.abs(n) >= 100000000) return `${(n/100000000).toFixed(2)}亿`
  if (Math.abs(n) >= 10000) return `${(n/10000).toFixed(1)}万`
  return n.toLocaleString()
}

const moneyFmt = n => `¥${fmt(n)}`

const TABS = [
  { key: 'overview', label: '数据概览', icon: 'fa-solid fa-gauge-high' },
  { key: 'dimension', label: '多维分析', icon: 'fa-solid fa-cube' },
  { key: 'trend', label: '趋势分析', icon: 'fa-solid fa-chart-line' },
  { key: 'forecast', label: '预测与报表', icon: 'fa-solid fa-wand-magic-sparkles' },
]

/* ============ 通用组件 ============ */
function KpiCard({ icon, label, value, color, sub, prefix = '' }) {
  return (
    <div className="bi-kpi-card">
      <div className="bi-kpi-icon" style={{ background: `${color}15`, color }}>
        <i className={icon} />
      </div>
      <div className="bi-kpi-content">
        <div className="bi-kpi-value">{prefix}{typeof value === 'number' ? fmt(value) : value || 0}</div>
        <div className="bi-kpi-label">{label}</div>
        {sub && <div className="bi-kpi-sub">{sub}</div>}
      </div>
    </div>
  )
}

function ChartCard({ title, icon, children, extra, className = '' }) {
  return (
    <div className={`bi-card ${className}`}>
      <div className="bi-card-header">
        <h3><i className={icon} style={{ marginRight: 8, color: 'var(--primary)' }} />{title}</h3>
        {extra && <div className="bi-card-extra">{extra}</div>}
      </div>
      <div className="bi-card-body">{children}</div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="bi-empty-chart">
      <i className="fa-solid fa-chart-pie" />
      <span>暂无数据</span>
    </div>
  )
}

function SectionTitle({ title, desc }) {
  return (
    <div className="bi-section-title">
      <h2>{title}</h2>
      {desc && <p>{desc}</p>}
    </div>
  )
}

/* ============ Tab 1: 数据概览 ============ */
function OverviewTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bi/overview').then(res => { setData(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!data) return <div className="empty-state"><i className="fa-solid fa-circle-exclamation" /><p>数据加载失败</p></div>

  const { hr, crm, inventory, finance, projects } = data

  return (
    <div className="bi-tab-content">
      {/* 人力资源 */}
      <SectionTitle title="人力资源" desc="员工与招聘概览" />
      <div className="bi-kpi-grid">
        <KpiCard icon="fa-solid fa-user-group" label="在职员工" value={hr.totalEmployees} color="#0ea5e9" />
        <KpiCard icon="fa-solid fa-user-plus" label="本月新入职" value={hr.newEmployeesMonth} color="#10b981" />
        <KpiCard icon="fa-solid fa-sack-dollar" label="平均薪资" value={hr.avgSalary} color="#f59e0b" prefix="¥" />
        <KpiCard icon="fa-solid fa-briefcase" label="在招岗位" value={hr.openJobs} color="#8b5cf6" />
        <KpiCard icon="fa-solid fa-id-card" label="候选人总数" value={hr.totalCandidates} color="#ec4899" />
      </div>

      {/* CRM */}
      <SectionTitle title="客户关系" desc="客户与销售漏斗" />
      <div className="bi-kpi-grid">
        <KpiCard icon="fa-solid fa-building" label="活跃客户" value={crm.totalCustomers} color="#2563eb" />
        <KpiCard icon="fa-solid fa-trophy" label="赢单金额" value={crm.wonDealAmount} color="#10b981" prefix="¥" />
        <KpiCard icon="fa-solid fa-funnel-dollar" label="进行中线索" value={crm.openLeads} color="#f59e0b" />
        <KpiCard icon="fa-solid fa-headset" label="待处理工单" value={crm.openTickets} color="#ef4444" />
      </div>

      {/* 供应链 */}
      <SectionTitle title="供应链" desc="库存与采购概览" />
      <div className="bi-kpi-grid">
        <KpiCard icon="fa-solid fa-box" label="产品总数" value={inventory.totalProducts} color="#0ea5e9" />
        <KpiCard icon="fa-solid fa-triangle-exclamation" label="低库存预警" value={inventory.lowStock} color="#ef4444" />
        <KpiCard icon="fa-solid fa-warehouse" label="库存总值" value={inventory.inventoryValue} color="#2563eb" prefix="¥" />
        <KpiCard icon="fa-solid fa-file-invoice" label="待处理采购单" value={inventory.pendingOrders} color="#f59e0b" />
      </div>

      {/* 财务 */}
      <SectionTitle title="财务管理" desc="核心财务指标" />
      <div className="bi-kpi-grid">
        <KpiCard icon="fa-solid fa-building-columns" label="银行余额" value={finance.bankBalance} color="#2563eb" prefix="¥" />
        <KpiCard icon="fa-solid fa-arrow-down" label="应收账款" value={finance.receivables} color="#f59e0b" prefix="¥" />
        <KpiCard icon="fa-solid fa-arrow-up" label="应付账款" value={finance.payables} color="#ef4444" prefix="¥" />
        <KpiCard icon="fa-solid fa-chart-line" label="本月收入" value={finance.monthRevenue} color="#10b981" prefix="¥" />
      </div>

      {/* 项目 */}
      <SectionTitle title="项目管理" desc="项目进度与任务完成率" />
      <div className="bi-kpi-grid">
        <KpiCard icon="fa-solid fa-diagram-project" label="进行中项目" value={projects.activeProjects} color="#8b5cf6" />
        <KpiCard icon="fa-solid fa-clock" label="逾期任务" value={projects.overdueTasks} color="#ef4444" />
        <KpiCard icon="fa-solid fa-list-check" label="任务总数" value={projects.totalTasks} color="#0ea5e9" />
        <KpiCard icon="fa-solid fa-circle-check" label="完成率" value={`${projects.completionRate}%`} color="#10b981" sub={`${projects.doneTasks} / ${projects.totalTasks} 已完成`} />
      </div>
    </div>
  )
}

/* ============ Tab 2: 多维分析 ============ */
function DimensionTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bi/multi-dimension').then(res => { setData(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!data) return <div className="empty-state"><i className="fa-solid fa-circle-exclamation" /><p>数据加载失败</p></div>

  return (
    <div className="bi-tab-content">
      {/* 第一行：行业分布 + 地区分布 */}
      <div className="bi-grid-2">
        <ChartCard title="客户行业分布" icon="fa-solid fa-industry">
          <div className="chart-container" style={{ height: 320 }}>
            {data.byIndustry?.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.byIndustry} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={50} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data.byIndustry.map((_, i) => <Cell key={i} fill={COLORS20[i % COLORS20.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, '客户数']} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="客户地区分布" icon="fa-solid fa-map-location-dot">
          <div className="chart-container" style={{ height: 320 }}>
            {data.byRegion?.length ? (
              <ResponsiveContainer>
                <BarChart data={data.byRegion} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Bar dataKey="count" name="客户数" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>

      {/* 第二行：部门人员 + 产品分类 */}
      <div className="bi-grid-2">
        <ChartCard title="部门人员与薪资" icon="fa-solid fa-building-user">
          <div className="chart-container" style={{ height: 320 }}>
            {data.byDepartment?.length ? (
              <ResponsiveContainer>
                <ComposedChart data={data.byDepartment} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v, n) => n === '薪资总额' ? moneyFmt(v) : [v, n]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="人数" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line yAxisId="right" type="monotone" dataKey="avgSalary" name="平均薪资" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="产品分类库存" icon="fa-solid fa-boxes-stacked">
          <div className="chart-container" style={{ height: 320 }}>
            {data.byProductCategory?.length ? (
              <ResponsiveContainer>
                <BarChart data={data.byProductCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v, n) => n === '成本总值' ? moneyFmt(v) : [v, n]} />
                  <Legend />
                  <Bar dataKey="totalStock" name="总库存量" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalCost" name="成本总值" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>

      {/* 第三行：项目状态 + 任务优先级 */}
      <div className="bi-grid-3">
        <ChartCard title="项目状态分布" icon="fa-solid fa-diagram-project">
          <div className="chart-container" style={{ height: 260 }}>
            {data.byProjectStatus?.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.byProjectStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={2}>
                    {data.byProjectStatus.map((_, i) => <Cell key={i} fill={COLORS20[i % COLORS20.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="任务优先级分布" icon="fa-solid fa-list-check">
          <div className="chart-container" style={{ height: 260 }}>
            {data.byTaskPriority?.length ? (
              <ResponsiveContainer>
                <BarChart data={data.byTaskPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="总数" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="done" name="已完成" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="采购订单状态" icon="fa-solid fa-file-invoice">
          <div className="chart-container" style={{ height: 260 }}>
            {data.byOrderStatus?.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.byOrderStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={2}>
                    {data.byOrderStatus.map((_, i) => <Cell key={i} fill={COLORS20[i % COLORS20.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>

      {/* 第四行：发票状态 + 供应商评级 + 销售趋势 */}
      <div className="bi-grid-3">
        <ChartCard title="发票状态分布" icon="fa-solid fa-receipt">
          <div className="chart-container" style={{ height: 260 }}>
            {data.byInvoiceStatus?.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.byInvoiceStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={2}>
                    {data.byInvoiceStatus.map((_, i) => <Cell key={i} fill={COLORS20[i % COLORS20.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="供应商信用评级" icon="fa-solid fa-star">
          <div className="chart-container" style={{ height: 260 }}>
            {data.bySupplierRating?.length ? (
              <ResponsiveContainer>
                <BarChart data={data.bySupplierRating}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Bar dataKey="count" name="供应商数" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="销售月度趋势" icon="fa-solid fa-chart-line">
          <div className="chart-container" style={{ height: 260 }}>
            {data.salesTrend?.length ? (
              <ResponsiveContainer>
                <AreaChart data={data.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v, n) => n === 'wonAmount' ? moneyFmt(v) : [v, n]} />
                  <Legend />
                  <Area type="monotone" dataKey="wonAmount" name="赢单金额" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
                  <Area type="monotone" dataKey="totalCount" name="线索总数" stroke="#2563eb" fill="#2563eb20" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

/* ============ Tab 3: 趋势分析 ============ */
function TrendTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('6m')

  const fetchTrend = useCallback(() => {
    setLoading(true)
    api.get(`/bi/trend?period=${period}`).then(res => { setData(res); setLoading(false) }).catch(() => setLoading(false))
  }, [period])

  useEffect(() => { fetchTrend() }, [fetchTrend])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!data) return <div className="empty-state"><i className="fa-solid fa-circle-exclamation" /><p>数据加载失败</p></div>

  return (
    <div className="bi-tab-content">
      <div className="bi-toolbar">
        <div className="bi-period-selector">
          <span style={{ marginRight: 8, color: 'var(--text-muted)', fontSize: 14 }}>时间范围：</span>
          {[
            { key: '3m', label: '近3个月' },
            { key: '6m', label: '近6个月' },
            { key: '12m', label: '近12个月' },
          ].map(p => (
            <button key={p.key} className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* 财务收支趋势 */}
      <div className="bi-grid-2">
        <ChartCard title="收支趋势" icon="fa-solid fa-chart-line">
          <div className="chart-container" style={{ height: 320 }}>
            {data.financeTrend?.length ? (
              <ResponsiveContainer>
                <AreaChart data={data.financeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v, n) => [moneyFmt(v), n === 'income' ? '收入' : '支出']} />
                  <Legend formatter={v => v === 'income' ? '收入' : '支出'} />
                  <Area type="monotone" dataKey="income" name="income" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="expense" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="应收应付趋势" icon="fa-solid fa-scale-balanced">
          <div className="chart-container" style={{ height: 320 }}>
            {data.arApTrend?.length ? (
              <ResponsiveContainer>
                <ComposedChart data={data.arApTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v, n) => [moneyFmt(v), n]} />
                  <Legend formatter={v => ({ arTotal: '应收总额', arPaid: '应收已收', apTotal: '应付总额', apPaid: '应付已付' }[v] || v)} />
                  <Bar dataKey="arTotal" name="arTotal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="arPaid" name="arPaid" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="apTotal" name="apTotal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="apPaid" name="apPaid" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>

      {/* 客户 + 线索 */}
      <div className="bi-grid-2">
        <ChartCard title="新增客户趋势" icon="fa-solid fa-user-plus">
          <div className="chart-container" style={{ height: 300 }}>
            {data.customerTrend?.length ? (
              <ResponsiveContainer>
                <BarChart data={data.customerTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Bar dataKey="count" name="新增客户" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="销售线索趋势" icon="fa-solid fa-funnel-dollar">
          <div className="chart-container" style={{ height: 300 }}>
            {data.leadTrend?.length ? (
              <ResponsiveContainer>
                <ComposedChart data={data.leadTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                  <Tooltip formatter={(v, n) => n === 'amount' ? moneyFmt(v) : [v, n]} />
                  <Legend formatter={v => v === 'amount' ? '金额' : '数量'} />
                  <Bar yAxisId="left" dataKey="count" name="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="amount" name="amount" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>

      {/* 库存 + 任务 + 工单 */}
      <div className="bi-grid-2">
        <ChartCard title="出入库趋势" icon="fa-solid fa-warehouse">
          <div className="chart-container" style={{ height: 300 }}>
            {data.inventoryTrend?.length ? (
              <ResponsiveContainer>
                <AreaChart data={data.inventoryTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Legend formatter={v => v === 'inbound' ? '入库' : '出库'} />
                  <Area type="monotone" dataKey="inbound" name="inbound" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
                  <Area type="monotone" dataKey="outbound" name="outbound" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>

        <ChartCard title="工单趋势" icon="fa-solid fa-headset">
          <div className="chart-container" style={{ height: 300 }}>
            {data.ticketTrend?.length ? (
              <ResponsiveContainer>
                <ComposedChart data={data.ticketTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Legend formatter={v => v === 'total' ? '总工单' : '已解决'} />
                  <Bar dataKey="total" name="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </ChartCard>
      </div>

      {/* 任务完成趋势 */}
      <ChartCard title="任务完成趋势" icon="fa-solid fa-check-double">
        <div className="chart-container" style={{ height: 280 }}>
          {data.taskTrend?.length ? (
            <ResponsiveContainer>
              <BarChart data={data.taskTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip />
                <Bar dataKey="count" name="完成任务数" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </ChartCard>
    </div>
  )
}

/* ============ Tab 4: 预测与报表 ============ */
function ForecastTab() {
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('sales')
  const [reportData, setReportData] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' })
  const [groupBy, setGroupBy] = useState('')

  useEffect(() => {
    api.get('/bi/forecast').then(res => { setForecast(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadReport()
  }, [reportType])

  const loadReport = () => {
    setReportLoading(true)
    const params = new URLSearchParams()
    if (dateRange.start_date) params.set('start_date', dateRange.start_date)
    if (dateRange.end_date) params.set('end_date', dateRange.end_date)
    if (groupBy) params.set('group_by', groupBy)
    api.get(`/bi/report/${reportType}?${params}`).then(res => { setReportData(res); setReportLoading(false) }).catch(() => setReportLoading(false))
  }

  const exportReport = () => {
    const token = localStorage.getItem('erp_token')
    const params = new URLSearchParams()
    if (dateRange.start_date) params.set('start_date', dateRange.start_date)
    if (dateRange.end_date) params.set('end_date', dateRange.end_date)
    if (groupBy) params.set('group_by', groupBy)
    window.open(`${api.defaults.baseURL}/bi/export/${reportType}?${params}&token=${token}`, '_blank')
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!forecast) return <div className="empty-state"><i className="fa-solid fa-circle-exclamation" /><p>数据加载失败</p></div>

  const reportTypes = [
    { key: 'sales', label: '销售报表', icon: 'fa-solid fa-chart-bar' },
    { key: 'finance', label: '财务报表', icon: 'fa-solid fa-coins' },
    { key: 'inventory', label: '库存报表', icon: 'fa-solid fa-boxes-stacked' },
    { key: 'hr', label: '人力资源报表', icon: 'fa-solid fa-users' },
    { key: 'projects', label: '项目报表', icon: 'fa-solid fa-diagram-project' },
  ]

  // 合并历史数据和预测数据
  const incomeHistory = forecast.incomeHistory || []
  const expenseHistory = forecast.expenseHistory || []
  const forecastChartData = [
    ...incomeHistory.map(d => ({ month: d.month, income: d.total, expense: 0 })),
  ]
  expenseHistory.forEach(d => {
    const existing = forecastChartData.find(f => f.month === d.month)
    if (existing) existing.expense = d.total
    else forecastChartData.push({ month: d.month, income: 0, expense: d.total })
  })
  if (forecast.forecastIncome != null || forecast.forecastExpense != null) {
    const lastMonth = forecastChartData.length > 0 ? forecastChartData[forecastChartData.length - 1].month : ''
    const nextMonth = lastMonth ? (() => {
      const [y, m] = lastMonth.split('-').map(Number)
      return `${y}-${String(m + 1 > 12 ? 1 : m + 1).padStart(2, '0')}`
    })() : '预测'
    forecastChartData.push({
      month: nextMonth,
      income: forecast.forecastIncome || 0,
      expense: forecast.forecastExpense || 0,
      isForecast: true,
    })
  }

  return (
    <div className="bi-tab-content">
      {/* 预测概览 */}
      <SectionTitle title="智能预测" desc="基于历史数据的趋势预测" />
      <div className="bi-kpi-grid">
        <KpiCard icon="fa-solid fa-chart-line" label="下月预计收入" value={forecast.forecastIncome} color="#10b981" prefix="¥" sub="线性回归预测" />
        <KpiCard icon="fa-solid fa-chart-line" label="下月预计支出" value={forecast.forecastExpense} color="#ef4444" prefix="¥" sub="线性回归预测" />
        <KpiCard icon="fa-solid fa-users" label="预计新增客户" value={forecast.forecastCustomers} color="#0ea5e9" sub="下月预测" />
        <KpiCard icon="fa-solid fa-trophy" label="当前赢单率" value={`${forecast.winRate}%`} color="#f59e0b" sub={`管道价值 ${moneyFmt(forecast.pipelineValue)}`} />
      </div>

      {/* 收支预测图表 */}
      <ChartCard title="收支趋势与预测" icon="fa-solid fa-wand-magic-sparkles" extra={<span className="bi-forecast-legend"><span className="bi-forecast-dot actual" />实际 <span className="bi-forecast-dot predict" />预测</span>}>
        <div className="chart-container" style={{ height: 320 }}>
          {forecastChartData.length > 1 ? (
            <ResponsiveContainer>
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                <Tooltip formatter={(v, n) => [moneyFmt(v), n === 'income' ? '收入' : '支出']} />
                <Legend formatter={v => v === 'income' ? '收入' : '支出'} />
                <Line type="monotone" dataKey="income" name="income" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={d => d.isForecast ? '5 5' : '0'} />
                <Line type="monotone" dataKey="expense" name="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} strokeDasharray={d => d.isForecast ? '5 5' : '0'} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </ChartCard>

      {/* 库存消耗预警 */}
      {forecast.consumption?.length > 0 && (
        <ChartCard title="库存消耗预警" icon="fa-solid fa-battery-quarter" extra={<span className="badge badge-danger">TOP {forecast.consumption.length}</span>}>
          <div className="bi-card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="bi-table">
                <thead>
                  <tr>
                    <th>产品名称</th>
                    <th>分类</th>
                    <th>当前库存</th>
                    <th>最低库存</th>
                    <th>日均消耗</th>
                    <th>预计可用天数</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.consumption.map(item => {
                    const daysLeft = item.daysRemaining
                    const isUrgent = daysLeft <= 7
                    const isWarning = daysLeft <= 30
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{item.category}</td>
                        <td>{item.stock_qty} {item.unit}</td>
                        <td>{item.min_stock} {item.unit}</td>
                        <td>{item.dailyConsumption} {item.unit}/天</td>
                        <td>
                          <span style={{ color: isUrgent ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--text)', fontWeight: 600 }}>
                            {daysLeft >= 999 ? '充足' : `${daysLeft} 天`}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isUrgent ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-success'}`}>
                            {isUrgent ? '紧急' : isWarning ? '预警' : '正常'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ChartCard>
      )}

      {/* 逾期应收 */}
      {forecast.overdueInvoices?.length > 0 && (
        <ChartCard title="逾期应收账款" icon="fa-solid fa-clock" extra={<span className="badge badge-danger">{forecast.overdueInvoices.length} 笔</span>}>
          <div className="bi-card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="bi-table">
                <thead>
                  <tr>
                    <th>发票号</th>
                    <th>客户</th>
                    <th>应收金额</th>
                    <th>剩余未付</th>
                    <th>逾期天数</th>
                    <th>到期日</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.overdueInvoices.map(inv => (
                    <tr key={inv.invoice_no}>
                      <td style={{ fontWeight: 500 }}>{inv.invoice_no}</td>
                      <td>{inv.customer_name}</td>
                      <td>{moneyFmt(inv.total)}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{moneyFmt(inv.remaining)}</td>
                      <td>
                        <span className="badge badge-danger">{inv.overdueDays} 天</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{inv.due_date?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ChartCard>
      )}

      {/* 报表中心 */}
      <SectionTitle title="报表中心" desc="选择报表类型查看详情，支持导出CSV" />
      <div className="bi-report-section">
        <div className="bi-report-toolbar">
          <div className="bi-report-types">
            {reportTypes.map(rt => (
              <button key={rt.key} className={`btn btn-sm ${reportType === rt.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setReportType(rt.key)}>
                <i className={rt.icon} style={{ marginRight: 4 }} />
                {rt.label}
              </button>
            ))}
          </div>
          <div className="bi-report-filters">
            <input type="date" className="form-input" value={dateRange.start_date} onChange={e => setDateRange({ ...dateRange, start_date: e.target.value })} placeholder="开始日期" />
            <span style={{ color: 'var(--text-muted)' }}>~</span>
            <input type="date" className="form-input" value={dateRange.end_date} onChange={e => setDateRange({ ...dateRange, end_date: e.target.value })} placeholder="结束日期" />
            {reportType !== 'inventory' && reportType !== 'hr' && reportType !== 'projects' && (
              <select className="form-select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                <option value="">默认分组</option>
                {reportType === 'sales' && <>
                  <option value="customer">按客户</option>
                  <option value="stage">按阶段</option>
                </>}
                {reportType === 'finance' && <option value="type">按类型</option>}
              </select>
            )}
            <button className="btn btn-sm btn-secondary" onClick={loadReport}><i className="fa-solid fa-magnifying-glass" style={{ marginRight: 4 }} />查询</button>
            <button className="btn btn-sm btn-primary" onClick={exportReport}><i className="fa-solid fa-download" style={{ marginRight: 4 }} />导出CSV</button>
          </div>
        </div>

        {reportLoading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : reportData ? (
          <div className="bi-report-content">
            {/* 汇总信息 */}
            {reportData.summary && (
              <div className="bi-report-summary">
                {Object.entries(reportData.summary).map(([key, val]) => {
                  const labels = {
                    totalCount: '总数', totalAmount: '总金额', avgAmount: '平均金额',
                    wonAmount: '赢单金额', lostAmount: '失单金额',
                    totalIncome: '总收入', totalExpense: '总支出', totalTax: '总税额',
                    totalWithTax: '含税总额', totalPaid: '已付总额', outstanding: '未付余额',
                    totalProducts: '产品总数', totalCostValue: '库存成本', totalSaleValue: '销售价值',
                    lowStockCount: '低库存', outOfStockCount: '断货', avgMargin: '平均毛利',
                    totalEmployees: '员工总数', avgSalary: '平均薪资', maxSalary: '最高薪资',
                    minSalary: '最低薪资', totalSalaryCost: '薪资总成本',
                    totalProjects: '项目总数', totalBudget: '总预算', totalCost: '总成本',
                    avgProgress: '平均进度', activeCount: '进行中', completedCount: '已完成',
                  }
                  const label = labels[key] || key
                  const isMoney = key.includes('Amount') || key.includes('amount') || key.includes('Income') || key.includes('Expense') || key.includes('Tax') || key.includes('Paid') || key.includes('Cost') || key.includes('Value') || key.includes('Margin') || key.includes('Budget') || key.includes('Salary') || key.includes('outstanding')
                  return (
                    <div key={key} className="bi-summary-item">
                      <div className="bi-summary-label">{label}</div>
                      <div className="bi-summary-value">{isMoney ? moneyFmt(val) : typeof val === 'number' ? val.toLocaleString() : val}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 图表：销售报表 */}
            {reportType === 'sales' && reportData.main?.length > 0 && (
              <ChartCard title="销售分布" icon="fa-solid fa-chart-bar">
                <div className="chart-container" style={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={reportData.main.slice(0, 15)} margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="groupKey" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                      <Tooltip formatter={(v, n) => n === 'totalAmount' ? moneyFmt(v) : [v, n]} />
                      <Legend formatter={v => ({ totalAmount: '总金额', avgAmount: '平均金额', count: '数量' }[v] || v)} />
                      <Bar dataKey="totalAmount" name="totalAmount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* 图表：财务报表 */}
            {reportType === 'finance' && reportData.main?.length > 0 && (
              <ChartCard title="财务分布" icon="fa-solid fa-chart-bar">
                <div className="chart-container" style={{ height: 300 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={reportData.main.slice(0, 15)} margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="groupKey" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                      <Tooltip formatter={(v, n) => [moneyFmt(v), n]} />
                      <Legend />
                      <Bar dataKey="totalAmount" name="金额" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalPaid" name="已付" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* 图表：HR部门薪资 */}
            {reportType === 'hr' && reportData.deptStats?.length > 0 && (
              <ChartCard title="部门薪资分布" icon="fa-solid fa-building-user">
                <div className="chart-container" style={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={reportData.deptStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v, n) => n === 'avgSalary' || n === 'totalSalary' ? moneyFmt(v) : [v, n]} />
                      <Legend formatter={v => v === 'count' ? '人数' : v === 'avgSalary' ? '平均薪资' : '薪资总额'} />
                      <Bar dataKey="count" name="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                      <Line type="monotone" dataKey="avgSalary" name="avgSalary" stroke="#f59e0b" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* 明细表格 */}
            {reportData.main && reportData.main.length > 0 && reportType !== 'hr' && reportType !== 'projects' && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><h3>明细数据</h3><span className="badge badge-secondary">{reportData.main.length} 条</span></div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table className="bi-table">
                      <thead>
                        <tr>{Object.keys(reportData.main[0]).map(k => <th key={k}>{k}</th>)}</tr>
                      </thead>
                      <tbody>
                        {reportData.main.slice(0, 50).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j}>{typeof val === 'number' && val > 100 ? moneyFmt(val) : val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* HR员工表 */}
            {reportType === 'hr' && reportData.employees?.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><h3>员工列表</h3><span className="badge badge-secondary">{reportData.employees.length} 人</span></div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table className="bi-table">
                      <thead>
                        <tr><th>工号</th><th>姓名</th><th>部门</th><th>职位</th><th>入职日期</th><th>薪资</th><th>电话</th><th>邮箱</th></tr>
                      </thead>
                      <tbody>
                        {reportData.employees.slice(0, 50).map(emp => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: 500 }}>{emp.employee_no}</td>
                            <td>{emp.full_name}</td>
                            <td>{emp.department_name}</td>
                            <td>{emp.position}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{emp.hire_date?.slice(0, 10)}</td>
                            <td style={{ fontWeight: 600 }}>{moneyFmt(emp.salary)}</td>
                            <td>{emp.phone}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{emp.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 项目报表 */}
            {reportType === 'projects' && reportData.projects?.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><h3>项目列表</h3><span className="badge badge-secondary">{reportData.projects.length} 个</span></div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table className="bi-table">
                      <thead>
                        <tr><th>项目名称</th><th>客户</th><th>项目经理</th><th>预算</th><th>实际成本</th><th>进度</th><th>任务</th><th>状态</th></tr>
                      </thead>
                      <tbody>
                        {reportData.projects.map(proj => {
                          const statusMap = { planning: ['规划中', 'badge-secondary'], in_progress: ['进行中', 'badge-primary'], completed: ['已完成', 'badge-success'], on_hold: ['暂停', 'badge-warning'] }
                          const [statusLabel, statusBadge] = statusMap[proj.status] || [proj.status, 'badge-secondary']
                          return (
                            <tr key={proj.id}>
                              <td style={{ fontWeight: 500 }}>{proj.name}</td>
                              <td>{proj.customer_name || '-'}</td>
                              <td>{proj.manager_name || '-'}</td>
                              <td>{moneyFmt(proj.budget)}</td>
                              <td style={{ color: proj.actual_cost > proj.budget ? 'var(--danger)' : 'var(--text)' }}>{moneyFmt(proj.actual_cost)}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div className="progress-bar" style={{ flex: 1, minWidth: 60 }}>
                                    <div className="progress-fill" style={{ width: `${proj.progress || 0}%` }} />
                                  </div>
                                  <span style={{ fontSize: 12, width: 36 }}>{proj.progress || 0}%</span>
                                </div>
                              </td>
                              <td>{proj.doneTasks}/{proj.totalTasks}</td>
                              <td><span className={`badge ${statusBadge}`}>{statusLabel}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 库存流水 */}
            {reportType === 'inventory' && reportData.transactions?.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><h3>近期出入库记录</h3><span className="badge badge-secondary">{reportData.transactions.length} 条</span></div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table className="bi-table">
                      <thead>
                        <tr><th>时间</th><th>产品</th><th>类型</th><th>数量</th><th>操作人</th><th>备注</th></tr>
                      </thead>
                      <tbody>
                        {reportData.transactions.slice(0, 50).map(tx => (
                          <tr key={tx.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{tx.created_at?.slice(0, 16)}</td>
                            <td style={{ fontWeight: 500 }}>{tx.product_name}</td>
                            <td><span className={`badge ${tx.type === 'in' ? 'badge-success' : 'badge-danger'}`}>{tx.type === 'in' ? '入库' : '出库'}</span></td>
                            <td style={{ fontWeight: 600, color: tx.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>{tx.type === 'in' ? '+' : '-'}{tx.quantity}</td>
                            <td>{tx.operator_name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{tx.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state"><i className="fa-solid fa-file-circle-question" /><p>请选择报表类型并查询</p></div>
        )}
      </div>
    </div>
  )
}

/* ============ 主页面 ============ */
export default function Analytics() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="bi-page">
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-chart-pie" style={{ marginRight: 10, color: 'var(--primary)' }} />
          商业智能与分析
        </h1>
        <p>KPI 监控、多维分析、趋势预测、自定义报表，一站式数据洞察平台</p>
      </div>

      {/* Tab 导航 */}
      <div className="bi-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`bi-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={tab.icon} style={{ marginRight: 6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'dimension' && <DimensionTab />}
      {activeTab === 'trend' && <TrendTab />}
      {activeTab === 'forecast' && <ForecastTab />}
    </div>
  )
}
