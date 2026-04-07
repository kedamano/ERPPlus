import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Pagination from '../components/Pagination'

export default function FinancePage() {
  const [tab, setTab] = useState('dashboard')
  const [vouchers, setVouchers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [accounts, setAccounts] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [voucherItems, setVoucherItems] = useState([
    { account_id: '', description: '', debit: 0, credit: 0 },
    { account_id: '', description: '', debit: 0, credit: 0 },
  ])
  const [invoiceType, setInvoiceType] = useState('receivable')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  useEffect(() => {
    api.get('/finance/stats').then(setStats)
    api.get('/finance/accounts').then(setAccounts)
  }, [])

  const loadTab = useCallback((t, p = 1) => {
    if (t !== tab) setPage(1)
    setLoading(true)
    const calls = {
      vouchers: () => api.get('/finance/vouchers', { params: { page: p, limit } }).then(r => {
        setVouchers(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      receivable: () => api.get('/finance/invoices', { params: { type: 'receivable', page: p, limit } }).then(r => {
        setInvoices(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      payable: () => api.get('/finance/invoices', { params: { type: 'payable', page: p, limit } }).then(r => {
        setInvoices(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
    }
    ;(calls[t] || (() => Promise.resolve()))().finally(() => setLoading(false))
  }, [tab, limit])

  useEffect(() => { loadTab(tab, page) }, [tab, page])

  const switchTab = t => { setTab(t); setSearch(''); setPage(1) }
  const openModal = type => { setModal(type); setForm({}) }
  const closeModal = () => { setModal(null); setForm({}) }
  const handlePageChange = (p) => setPage(p)

  const saveVoucher = async () => {
    if (!voucherItems.length) return alert('请添加至少一条凭证明细')
    for (const item of voucherItems) {
      if (!item.account_id) return alert('每条明细必须选择会计科目')
      if (!item.debit && !item.credit) return alert('每条明细的借方或贷方金额不能都为零')
    }
    if (Math.abs(voucherItems.reduce((s, i) => s + i.debit - i.credit, 0)) > 0.01) return alert('借贷不平衡，请检查')
    try {
      await api.post('/finance/vouchers', { ...form, date: form.date || new Date().toISOString().slice(0, 10), items: voucherItems })
      closeModal(); loadTab('vouchers', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const saveInvoice = async () => {
    try {
      await api.post('/finance/invoices', { ...form, type: invoiceType })
      closeModal(); loadTab(invoiceType, page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const payInvoice = async (inv) => {
    const remaining = inv.total - inv.paid_amount
    const payAmt = prompt(`当前已付 ¥${inv.paid_amount?.toLocaleString()}，未付 ¥${remaining?.toLocaleString()}\n请输入本次付款金额（留空表示全部付清）：`)
    if (payAmt === null) return
    try {
      await api.patch(`/finance/invoices/${inv.id}/pay`, { amount: payAmt ? Number(payAmt) : null })
      loadTab(invoiceType, page); api.get('/finance/stats').then(setStats)
    } catch (e) { alert(e.error || '付款失败') }
  }

  const deleteInvoice = async (id) => {
    if (!confirm('确定要删除该发票吗？')) return
    try {
      await api.delete(`/finance/invoices/${id}`)
      loadTab(invoiceType, page); api.get('/finance/stats').then(setStats)
    } catch (e) { alert(e.error || '删除失败') }
  }

  const mockTrend = [
    { month: '10月', income: 680000, expense: 420000 },
    { month: '11月', income: 720000, expense: 390000 },
    { month: '12月', income: 890000, expense: 510000 },
    { month: '1月', income: 760000, expense: 440000 },
    { month: '2月', income: 810000, expense: 480000 },
    { month: '3月', income: 950000, expense: 520000 },
  ]

  const tabs = [
    { id: 'dashboard', label: '财务概览', icon: 'fa-solid fa-coins' },
    { id: 'vouchers', label: '凭证管理', icon: 'fa-solid fa-file-invoice' },
    { id: 'receivable', label: '应收账款', icon: 'fa-solid fa-arrow-down-to-bracket' },
    { id: 'payable', label: '应付账款', icon: 'fa-solid fa-arrow-up-from-bracket' },
    { id: 'accounts', label: '会计科目', icon: 'fa-solid fa-book' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1><i className="fa-solid fa-coins" style={{marginRight:10,color:'var(--primary)'}}/>财务管理</h1>
        <p>凭证管理、应收应付、账款分析、财务报表全面支持</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={t.icon}/>{t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-building-columns"/></div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.bankBalance / 10000)?.toFixed(0)}万</div>
                <div className="stat-label">银行余额</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-arrow-down-to-bracket"/></div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.receivables / 10000)?.toFixed(0) || 0}万</div>
                <div className="stat-label">应收账款</div>
                {stats.overdueReceivables > 0 && <div className="stat-change down">逾期 {stats.overdueReceivables} 笔</div>}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="fa-solid fa-arrow-up-from-bracket"/></div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.payables / 10000)?.toFixed(0) || 0}万</div>
                <div className="stat-label">应付账款</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}><i className="fa-solid fa-gem"/></div>
              <div className="stat-content">
                <div className="stat-value">¥{((stats.totalAssets || 0) / 10000)?.toFixed(0)}万</div>
                <div className="stat-label">总资产</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-chart-bar" style={{marginRight:8,color:'var(--primary)'}}/>收支趋势</h3></div>
              <div className="card-body">
                <div className="chart-container">
                  <ResponsiveContainer>
                    <BarChart data={stats.monthlyIncome?.length ? stats.monthlyIncome.map((m, i) => ({
                      month: m.month,
                      收入: m.total,
                      支出: stats.monthlyExpense?.[i]?.total || 0
                    })) : mockTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/10000).toFixed(0)}万`} />
                      <Tooltip formatter={v => [`¥${v?.toLocaleString()}`, '']} />
                      <Legend />
                      <Bar dataKey="income" name="收入" fill="#2563eb" radius={[4,4,0,0]} />
                      <Bar dataKey="收入" fill="#2563eb" radius={[4,4,0,0]} />
                      <Bar dataKey="支出" fill="#ef4444" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-book" style={{marginRight:8,color:'var(--primary)'}}/>主要科目余额</h3></div>
              <div className="card-body" style={{ padding: 0 }}>
                <table>
                  <thead><tr><th>科目编码</th><th>科目名称</th><th>类型</th><th>余额</th></tr></thead>
                  <tbody>
                    {accounts.slice(0, 8).map(a => (
                      <tr key={a.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{a.code}</td>
                        <td style={{ fontWeight: 500 }}>{a.name}</td>
                        <td>
                          <span className={`badge ${a.type === 'asset' ? 'badge-primary' : a.type === 'income' ? 'badge-success' : a.type === 'liability' ? 'badge-warning' : 'badge-danger'}`}>
                            {a.type === 'asset' ? '资产' : a.type === 'liability' ? '负债' : a.type === 'income' ? '收入' : '费用'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{a.balance?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 资产负债简表 */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3><i className="fa-solid fa-scale-balanced" style={{marginRight:8,color:'var(--primary)'}}/>简化资产负债表</h3><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>截至今日</span></div>
            <div className="card-body">
              <div className="grid-2">
                <div>
                  <h4 style={{ marginBottom: 12, color: 'var(--primary)' }}>资产</h4>
                  {[
                    { name: '库存现金', val: stats.cashBalance },
                    { name: '银行存款', val: stats.bankBalance },
                    { name: '应收账款', val: stats.receivables },
                  ].map(item => (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>¥{(item.val || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>
                    <span>资产合计</span>
                    <span>¥{((stats.cashBalance || 0) + (stats.bankBalance || 0) + (stats.receivables || 0)).toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom: 12, color: 'var(--danger)' }}>负债</h4>
                  {[
                    { name: '应付账款', val: stats.payables },
                    { name: '应交税费', val: stats.taxPayable },
                  ].map(item => (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>¥{(item.val || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 700, color: 'var(--danger)', fontSize: 15 }}>
                    <span>负债合计</span>
                    <span>¥{((stats.payables || 0) + (stats.taxPayable || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'vouchers' && (
        <>
          <div className="search-bar">
            <input className="form-control search-input" placeholder="搜索凭证..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary" onClick={() => openModal('voucher')}><i className="fa-solid fa-plus"/>新增凭证</button>
          </div>
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>凭证号</th><th>日期</th><th>类型</th><th>摘要</th><th>借方合计</th><th>贷方合计</th><th>状态</th><th>制单人</th></tr></thead>
                    <tbody>
                      {vouchers.map(v => (
                        <tr key={v.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{v.voucher_no}</td>
                          <td style={{ fontSize: 13 }}>{v.date}</td>
                          <td><span className="badge badge-info">{v.type === 'general' ? '普通凭证' : v.type}</span></td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description}</td>
                          <td style={{ fontWeight: 600 }}>¥{v.total_debit?.toLocaleString()}</td>
                          <td style={{ fontWeight: 600 }}>¥{v.total_credit?.toLocaleString()}</td>
                          <td>
                            <span className={`badge ${v.status === 'posted' ? 'badge-success' : 'badge-warning'}`}>
                              {v.status === 'posted' ? '已过账' : '草稿'}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{v.creator_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
              </div>
            </div>
          )}
        </>
      )}

      {(tab === 'receivable' || tab === 'payable') && (
        <>
          <div className="search-bar">
            <input className="form-control search-input" placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary" onClick={() => { setInvoiceType(tab); openModal('invoice') }}><i className="fa-solid fa-plus"/>新增{tab === 'receivable' ? '应收' : '应付'}发票</button>
          </div>
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>发票号</th><th>{tab === 'receivable' ? '客户' : '供应商'}</th><th>金额</th><th>税额</th><th>合计</th><th>到期日</th><th>已付金额</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{inv.invoice_no}</td>
                          <td style={{ fontWeight: 500 }}>{inv.customer_name || inv.supplier_name}</td>
                          <td>¥{inv.amount?.toLocaleString()}</td>
                          <td style={{ color: 'var(--text-muted)' }}>¥{inv.tax?.toFixed(2)}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{inv.total?.toLocaleString()}</td>
                          <td style={{ fontSize: 13, color: inv.due_date < new Date().toISOString().slice(0,10) && inv.status !== 'paid' ? 'var(--danger)' : 'var(--text-muted)' }}>{inv.due_date}</td>
                          <td>¥{inv.paid_amount?.toLocaleString()}</td>
                          <td>
                            <span className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                              {inv.status === 'paid' ? '已付清' : inv.status === 'partial' ? '部分付' : '未付款'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {inv.status !== 'paid' && <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#16a34a', border: 'none' }} onClick={() => payInvoice(inv)} title="付款"><i className="fa-solid fa-credit-card"/></button>}
                              <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => deleteInvoice(inv.id)} title="删除"><i className="fa-solid fa-trash-can"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'accounts' && (
        <div className="card">
          <div className="card-header"><h3>会计科目表</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>科目编码</th><th>科目名称</th><th>科目类型</th><th>余额</th><th>说明</th></tr></thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{a.code}</td>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td>
                      <span className={`badge ${a.type === 'asset' ? 'badge-primary' : a.type === 'income' ? 'badge-success' : a.type === 'liability' ? 'badge-warning' : 'badge-danger'}`}>
                        {a.type === 'asset' ? '资产' : a.type === 'liability' ? '负债' : a.type === 'income' ? '收入' : '费用'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>¥{a.balance?.toLocaleString()}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 凭证弹窗 */}
      {modal === 'voucher' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>新增记账凭证</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">日期</label><input className="form-control" type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">凭证类型</label>
                  <select className="form-control" value={form.type || 'general'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="general">普通凭证</option><option value="payment">付款凭证</option><option value="receipt">收款凭证</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">摘要</label><input className="form-control" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>

              <label className="form-label">凭证明细（借贷平衡）</label>
              <table style={{ width: '100%', marginBottom: 12 }}>
                <thead><tr><th style={{ padding: '8px', background: 'var(--bg)', borderRadius: 4 }}>科目</th><th>摘要</th><th>借方</th><th>贷方</th><th></th></tr></thead>
                <tbody>
                  {voucherItems.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 4px' }}>
                        <select className="form-control" value={item.account_id} onChange={e => { const ni = [...voucherItems]; ni[i] = { ...ni[i], account_id: e.target.value }; setVoucherItems(ni) }}>
                          <option value="">选择科目</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 4px' }}>
                        <input className="form-control" placeholder="摘要" value={item.description} onChange={e => { const ni = [...voucherItems]; ni[i] = { ...ni[i], description: e.target.value }; setVoucherItems(ni) }} />
                      </td>
                      <td style={{ padding: '4px 4px' }}>
                        <input className="form-control" type="number" placeholder="0.00" value={item.debit || ''} onChange={e => { const ni = [...voucherItems]; ni[i] = { ...ni[i], debit: Number(e.target.value), credit: 0 }; setVoucherItems(ni) }} />
                      </td>
                      <td style={{ padding: '4px 4px' }}>
                        <input className="form-control" type="number" placeholder="0.00" value={item.credit || ''} onChange={e => { const ni = [...voucherItems]; ni[i] = { ...ni[i], credit: Number(e.target.value), debit: 0 }; setVoucherItems(ni) }} />
                      </td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => setVoucherItems(items => items.filter((_, j) => j !== i))}><i className="fa-solid fa-xmark"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-secondary btn-sm" onClick={() => setVoucherItems(items => [...items, { account_id: '', description: '', debit: 0, credit: 0 }])}>+ 添加行</button>
              <div style={{ textAlign: 'right', marginTop: 12, fontWeight: 600 }}>
                借方：¥{voucherItems.reduce((s, i) => s + (i.debit || 0), 0).toLocaleString()} &nbsp;&nbsp;
                贷方：¥{voucherItems.reduce((s, i) => s + (i.credit || 0), 0).toLocaleString()}
                {voucherItems.reduce((s, i) => s + i.debit - i.credit, 0) !== 0 && (
                  <span style={{ color: 'var(--danger)', marginLeft: 8 }}>⚠️ 借贷不平衡</span>
                )}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveVoucher}>保存凭证</button></div>
          </div>
        </div>
      )}

      {/* 发票弹窗 */}
      {modal === 'invoice' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>新增{invoiceType === 'receivable' ? '应收' : '应付'}发票</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">{invoiceType === 'receivable' ? '客户名称' : '供应商名称'}</label><input className="form-control" value={form.party_name || ''} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">发票金额</label><input className="form-control" type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">税率</label>
                  <select className="form-control" value={form.tax_rate || 0.13} onChange={e => setForm(f => ({ ...f, tax_rate: Number(e.target.value) }))}>
                    <option value={0.13}>13%</option><option value={0.09}>9%</option><option value={0.06}>6%</option><option value={0.03}>3%</option><option value={0}>0%</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">到期日</label><input className="form-control" type="date" value={form.due_date || ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              {form.amount && <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 8, fontSize: 14 }}>
                税额：¥{(form.amount * (form.tax_rate || 0.13)).toFixed(2)} &nbsp; 含税合计：¥{(form.amount * (1 + (form.tax_rate || 0.13))).toFixed(2)}
              </div>}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveInvoice}>保存</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
