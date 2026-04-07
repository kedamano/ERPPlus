import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Pagination from '../components/Pagination'

const COLORS = ['#2563eb','#3b82f6','#0ea5e9','#f59e0b','#ef4444','#8b5cf6']

export default function InventoryPage() {
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  useEffect(() => {
    api.get('/inventory/inventory/stats').then(setStats)
  }, [])

  const loadTab = useCallback((t, p = 1) => {
    if (t !== tab) setPage(1)
    setLoading(true)
    const calls = {
      products: () => api.get('/inventory/products', { params: { page: p, limit, search } }).then(r => {
        setProducts(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      suppliers: () => api.get('/inventory/suppliers', { params: { page: p, limit, search } }).then(r => {
        setSuppliers(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
      orders: () => api.get('/inventory/purchase-orders', { params: { page: p, limit } }).then(r => {
        setOrders(r.data || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1)
      }),
    }
    ;(calls[t] || (() => Promise.resolve()))().finally(() => setLoading(false))
  }, [tab, search, limit])

  useEffect(() => { loadTab(tab, page) }, [tab, page])

  const switchTab = t => { setTab(t); setSearch(''); setPage(1) }
  const openModal = (type, data = {}) => { setModal(type); setForm(data); setOrderItems([{ product_id: '', quantity: 1, unit_price: 0 }]) }
  const closeModal = () => { setModal(null); setForm({}) }
  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }
  const handlePageChange = (p) => setPage(p)

  const saveProduct = async () => {
    try {
      if (form.id) await api.put(`/inventory/products/${form.id}`, form)
      else await api.post('/inventory/products', form)
      closeModal(); loadTab('products', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const saveSupplier = async () => {
    try {
      if (form.id) await api.put(`/inventory/suppliers/${form.id}`, form)
      else await api.post('/inventory/suppliers', form)
      closeModal(); loadTab('suppliers', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const deleteSupplier = async (id) => {
    if (!confirm('确定要删除该供应商吗？此操作不可撤销。')) return
    try {
      await api.delete(`/inventory/suppliers/${id}`)
      loadTab('suppliers', page)
    } catch (e) { alert(e.error || '删除失败') }
  }

  const saveOrder = async () => {
    try {
      await api.post('/inventory/purchase-orders', { ...form, items: orderItems })
      closeModal(); loadTab('orders', page)
    } catch (e) { alert(e.error || '保存失败') }
  }

  const updateOrderStatus = async (id, status) => {
    try {
      await api.put(`/inventory/purchase-orders/${id}/status`, { status })
      loadTab('orders', page); api.get('/inventory/inventory/stats').then(setStats)
    } catch (e) { alert(e.error || '操作失败') }
  }

  // 所有产品（用于弹窗下拉，不分页）
  const [allProducts, setAllProducts] = useState([])
  const [allSuppliers, setAllSuppliers] = useState([])
  const loadDropdowns = () => {
    api.get('/inventory/products', { params: { limit: 999 } }).then(r => setAllProducts(r.data || []))
    api.get('/inventory/suppliers', { params: { limit: 999 } }).then(r => setAllSuppliers(r.data || []))
  }

  const tabs = [
    { id: 'products', label: '产品库存', icon: 'fa-solid fa-boxes-stacked' },
    { id: 'suppliers', label: '供应商', icon: 'fa-solid fa-industry' },
    { id: 'orders', label: '采购订单', icon: 'fa-solid fa-cart-shopping' },
    { id: 'analysis', label: '库存分析', icon: 'fa-solid fa-chart-bar' },
  ]

  const statusColors = { draft:'badge-secondary', pending:'badge-warning', approved:'badge-primary', received:'badge-success', cancelled:'badge-danger' }
  const statusLabels = { draft:'草稿', pending:'待审批', approved:'已审批', received:'已收货', cancelled:'已取消' }

  return (
    <div>
      <div className="page-header">
        <h1><i className="fa-solid fa-boxes-stacked" style={{marginRight:10,color:'var(--primary)'}}/>供应链管理</h1>
        <p>产品库存监控、供应商管理、采购订单全流程管理</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-boxes-stacked"/></div><div className="stat-content"><div className="stat-value">{stats.totalProducts}</div><div className="stat-label">产品总数</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}><i className="fa-solid fa-triangle-exclamation"/></div><div className="stat-content"><div className="stat-value" style={{ color: stats.lowStock > 0 ? 'var(--danger)' : 'inherit' }}>{stats.lowStock}</div><div className="stat-label">库存预警</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fa-solid fa-coins"/></div><div className="stat-content"><div className="stat-value">¥{stats.totalValue ? (stats.totalValue / 10000).toFixed(0) + '万' : '0'}</div><div className="stat-label">库存总值</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}><i className="fa-solid fa-industry"/></div><div className="stat-content"><div className="stat-value">{suppliers.length || '-'}</div><div className="stat-label">供应商数</div></div></div>
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

      {tab !== 'analysis' && (
        <div className="search-bar">
          <input className="form-control search-input" placeholder="搜索..." value={search} onChange={handleSearch} />
          {tab === 'products' && <button className="btn btn-primary" onClick={() => openModal('product')}><i className="fa-solid fa-plus"/>新增产品</button>}
          {tab === 'suppliers' && <button className="btn btn-primary" onClick={() => openModal('supplier')}><i className="fa-solid fa-plus"/>新增供应商</button>}
          {tab === 'orders' && <button className="btn btn-primary" onClick={() => { loadDropdowns(); openModal('order') }}><i className="fa-solid fa-plus"/>新建采购单</button>}
        </div>
      )}

      {loading && tab !== 'analysis' ? <div className="loading"><div className="spinner" /></div> : (
        <>
          {tab === 'products' && (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>产品编码</th><th>产品名称</th><th>分类</th><th>当前库存</th><th>最低库存</th><th>成本价</th><th>销售价</th><th>供应商</th><th>库存状态</th><th>操作</th></tr></thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{p.code}</td>
                          <td style={{ fontWeight: 500 }}>{p.name}</td>
                          <td><span className="badge badge-info">{p.category}</span></td>
                          <td>
                            <span style={{ fontWeight: 600, color: p.stock_qty <= p.min_stock ? 'var(--danger)' : p.stock_qty <= p.min_stock * 1.5 ? 'var(--warning)' : 'var(--success)' }}>
                              {p.stock_qty} {p.unit}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{p.min_stock} {p.unit}</td>
                          <td>¥{p.cost_price?.toLocaleString()}</td>
                          <td style={{ fontWeight: 500 }}>¥{p.sale_price?.toLocaleString()}</td>
                          <td style={{ fontSize: 13 }}>{p.supplier_name}</td>
                          <td>
                            {p.stock_qty <= 0 ? <span className="badge badge-danger">断货</span>
                              : p.stock_qty <= p.min_stock ? <span className="badge badge-warning">低库存</span>
                              : <span className="badge badge-success">正常</span>}
                          </td>
                          <td><button className="btn btn-secondary btn-sm" onClick={() => openModal('product', p)}>编辑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '0 16px 12px' }}><Pagination total={total} page={page} limit={limit} totalPages={totalPages} onChange={handlePageChange} /></div>
              </div>
            </div>
          )}

          {tab === 'suppliers' && (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>供应商名称</th><th>分类</th><th>联系人</th><th>联系电话</th><th>邮箱</th><th>账期</th><th>信用评级</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                      {suppliers.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>{s.name[0]}</div>
                              <div style={{ fontWeight: 500 }}>{s.name}</div>
                            </div>
                          </td>
                          <td>{s.category}</td>
                          <td>{s.contact_person}</td>
                          <td style={{ fontSize: 13 }}>{s.contact_phone}</td>
                          <td style={{ fontSize: 13 }}>{s.contact_email}</td>
                          <td>{s.payment_terms}</td>
                          <td><span className={`badge ${s.credit_rating === 'A' ? 'badge-success' : 'badge-warning'}`}>{s.credit_rating}级</span></td>
                          <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>{s.status === 'active' ? '合作中' : '停用'}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => openModal('supplier', s)}>编辑</button>
                              <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={() => deleteSupplier(s.id)}><i className="fa-solid fa-trash-can"/></button>
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

          {tab === 'orders' && (
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>订单号</th><th>供应商</th><th>订单金额</th><th>下单日期</th><th>预计到货</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{o.order_no}</td>
                          <td style={{ fontWeight: 500 }}>{o.supplier_name}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{o.total_amount?.toLocaleString()}</td>
                          <td style={{ fontSize: 13 }}>{o.order_date}</td>
                          <td style={{ fontSize: 13 }}>{o.expected_date}</td>
                          <td><span className={`badge ${statusColors[o.status] || 'badge-secondary'}`}>{statusLabels[o.status] || o.status}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {o.status === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => updateOrderStatus(o.id, 'approved')}>审批</button>}
                              {o.status === 'approved' && <button className="btn btn-success btn-sm" onClick={() => updateOrderStatus(o.id, 'received')}>确认收货</button>}
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

          {tab === 'analysis' && (
            <div>
              <div className="grid-2">
                <div className="card">
                  <div className="card-header"><h3>按类别库存分布</h3></div>
                  <div className="card-body">
                    <div className="chart-container">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={stats.categoryStats || []} dataKey="total_qty" nameKey="category" cx="50%" cy="50%" outerRadius={100}>
                            {(stats.categoryStats || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Cell />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><h3>最近入库记录</h3></div>
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>产品</th><th>类型</th><th>数量</th><th>时间</th></tr></thead>
                        <tbody>
                          {(stats.recentTx || []).slice(0, 8).map(tx => (
                            <tr key={tx.id}>
                              <td style={{ fontWeight: 500 }}>{tx.product_name}</td>
                              <td><span className={`badge ${tx.type === 'in' ? 'badge-success' : 'badge-danger'}`}>{tx.type === 'in' ? '入库' : '出库'}</span></td>
                              <td>{tx.quantity}</td>
                              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.created_at?.slice(0, 16)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 产品弹窗 */}
      {modal === 'product' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑产品' : '新增产品'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">产品编码 *</label><input className="form-control" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">产品名称 *</label><input className="form-control" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">产品分类</label><input className="form-control" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">单位</label>
                  <select className="form-control" value={form.unit || '件'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {['件', '套', '个', '台', '箱', '桶', '吨', '千克'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">成本价</label><input className="form-control" type="number" value={form.cost_price || ''} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">销售价</label><input className="form-control" type="number" value={form.sale_price || ''} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">最低库存</label><input className="form-control" type="number" value={form.min_stock || ''} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">最高库存</label><input className="form-control" type="number" value={form.max_stock || ''} onChange={e => setForm(f => ({ ...f, max_stock: e.target.value }))} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveProduct}>保存</button></div>
          </div>
        </div>
      )}

      {/* 供应商弹窗 */}
      {modal === 'supplier' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{form.id ? '编辑供应商' : '新增供应商'}</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">供应商名称 *</label><input className="form-control" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">分类</label>
                  <select className="form-control" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">请选择</option>
                    {['原材料', '零部件', '设备', '办公用品', '技术服务', '物流', '其他'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">信用评级</label>
                  <select className="form-control" value={form.credit_rating || 'B'} onChange={e => setForm(f => ({ ...f, credit_rating: e.target.value }))}>
                    <option value="A">A级 - 优秀</option><option value="B">B级 - 良好</option><option value="C">C级 - 一般</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">联系人</label><input className="form-control" value={form.contact_person || ''} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">联系电话</label><input className="form-control" value={form.contact_phone || ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">邮箱</label><input className="form-control" type="email" value={form.contact_email || ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">账期</label>
                  <select className="form-control" value={form.payment_terms || 'net30'} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}>
                    <option value="net15">15天</option><option value="net30">30天</option><option value="net60">60天</option><option value="net90">90天</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">地址</label><input className="form-control" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                {form.id && (
                  <div className="form-group"><label className="form-label">状态</label>
                    <select className="form-control" value={form.status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">合作中</option><option value="inactive">停用</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveSupplier}>保存</button></div>
          </div>
        </div>
      )}

      {/* 采购单弹窗 */}
      {modal === 'order' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>新建采购订单</h2><button className="modal-close" onClick={closeModal}><i className="fa-solid fa-xmark"/></button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">供应商 *</label>
                  <select className="form-control" value={form.supplier_id || ''} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">请选择</option>
                    {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">预计到货</label><input className="form-control" type="date" value={form.expected_date || ''} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} /></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">采购明细</label>
                {orderItems.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select className="form-control" value={item.product_id} onChange={e => {
                      const p = products.find(p => p.id === e.target.value)
                      const ni = [...orderItems]; ni[i] = { ...ni[i], product_id: e.target.value, unit_price: p?.cost_price || 0 }; setOrderItems(ni)
                    }}>
                      <option value="">选择产品</option>
                      {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="form-control" type="number" placeholder="数量" style={{ width: 80 }} value={item.quantity} onChange={e => { const ni = [...orderItems]; ni[i] = { ...ni[i], quantity: Number(e.target.value) }; setOrderItems(ni) }} />
                    <input className="form-control" type="number" placeholder="单价" style={{ width: 100 }} value={item.unit_price} onChange={e => { const ni = [...orderItems]; ni[i] = { ...ni[i], unit_price: Number(e.target.value) }; setOrderItems(ni) }} />
                    <button className="btn btn-danger btn-sm" onClick={() => setOrderItems(items => items.filter((_, j) => j !== i))}><i className="fa-solid fa-xmark"/></button>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => setOrderItems(items => [...items, { product_id: '', quantity: 1, unit_price: 0 }])}>+ 添加明细</button>
              </div>
              <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                合计金额：¥{orderItems.reduce((s, i) => s + i.quantity * i.unit_price, 0).toLocaleString()}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>取消</button><button className="btn btn-primary" onClick={saveOrder}>提交</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
