import { useState, useRef, useEffect, useCallback, useContext } from 'react'
import api, { apiFetch } from '../utils/api'
import { renderSafeMarkdown } from '../utils/safeMarkdown'
import { AuthContext } from '../App'
import './AIAssistant.css'

/* 金额格式化 */
function fmtMoney(v) {
  if (v == null || isNaN(v)) return '¥0'
  return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ===== 财务报表卡片组件 ===== */
function ReportCard({ report }) {
  if (!report) return null

  return (
    <div className="ai-report-card">
      <div className="ai-report-header">
        <div className="ai-report-title">
          <i className="fa-solid fa-chart-column" />
          <span>{report.title}</span>
        </div>
        <div className="ai-report-time">
          <i className="fa-regular fa-clock" />
          生成于 {new Date(report.generated_at).toLocaleString('zh-CN')}
        </div>
      </div>

      {/* 分区块渲染 */}
      {report.sections?.map((section, si) => (
        <div key={si} className="ai-report-section">
          <div className="ai-report-section-title">{section.title}</div>
          <table className="ai-report-table">
            <tbody>
              {section.items?.map((item, ii) => (
                <tr key={ii} className={item.highlight ? 'highlight' : ''}>
                  <td className={`ai-report-label ${item.bold ? 'bold' : ''}`}>{item.label}</td>
                  <td className={`ai-report-value ${item.bold ? 'bold' : ''}`}>
                    {item.type === 'money' ? fmtMoney(item.value) :
                     item.type === 'percent' ? `${item.value}%` :
                     item.type === 'count' ? `${item.value} 笔` :
                     item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* 账龄分析明细表 */}
      {report.details && report.details.length > 0 && (
        <div className="ai-report-section">
          <div className="ai-report-section-title">明细清单</div>
          <div className="ai-report-table-wrap">
            <table className="ai-report-table ai-report-table-detail">
              <thead>
                <tr>
                  {Object.keys(report.details[0]).map(k => (
                    <th key={k}>{detailHeader(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.details.map((row, ri) => (
                  <tr key={ri}>
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k}>
                        {k.includes('amount') || k.includes('total') || k.includes('paid') || k === 'outstanding'
                          ? fmtMoney(v)
                          : k.includes('date') ? v : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 趋势图表（纯 CSS 柱状图） */}
      {report.charts?.monthly_trend && (
        <div className="ai-report-section">
          <div className="ai-report-section-title">趋势图</div>
          <BarChart data={report.charts.monthly_trend} />
        </div>
      )}
      {report.charts?.monthly_profit && (
        <div className="ai-report-section">
          <div className="ai-report-section-title">月度利润</div>
          <BarChart data={report.charts.monthly_profit} />
        </div>
      )}
      {report.charts?.cash_flow && (
        <div className="ai-report-section">
          <div className="ai-report-section-title">现金流量</div>
          <BarChart data={report.charts.cash_flow} />
        </div>
      )}
    </div>
  )
}

/* 明细表头映射 */
function detailHeader(k) {
  const map = {
    invoice_no: '发票号', customer: '客户', supplier: '供应商', credit_level: '信用等级',
    total: '金额', paid: '已付', outstanding: '未付', due_date: '到期日',
    overdue_days: '逾期天数', remaining_days: '剩余天数'
  }
  return map[k] || k
}

/* ===== 纯 CSS 柱状图组件 ===== */
function BarChart({ data }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => Math.max(Math.abs(d.income || d.expense || d.inflow || d.outflow || d.profit || d.net || 0)), 1))

  return (
    <div className="ai-bar-chart">
      <div className="ai-bar-chart-legend">
        {data[0].income != null && <span className="legend-income"><i />收入</span>}
        {data[0].expense != null && <span className="legend-expense"><i />支出</span>}
        {data[0].inflow != null && <span className="legend-income"><i />流入</span>}
        {data[0].outflow != null && <span className="legend-expense"><i />流出</span>}
        {data[0].profit != null && <span className="legend-profit"><i />净利润</span>}
        {data[0].net != null && <span className="legend-profit"><i />净流量</span>}
      </div>
      {data.map((d, i) => (
        <div key={i} className="ai-bar-row">
          <span className="ai-bar-label">{d.month}</span>
          <div className="ai-bar-group">
            {d.income != null && (
              <div className="ai-bar-item" style={{ height: `${(Math.abs(d.income) / maxVal) * 100}%` }}>
                <span>{fmtMoney(d.income)}</span>
              </div>
            )}
            {d.expense != null && (
              <div className="ai-bar-item expense" style={{ height: `${(Math.abs(d.expense) / maxVal) * 100}%` }}>
                <span>{fmtMoney(d.expense)}</span>
              </div>
            )}
            {d.inflow != null && (
              <div className="ai-bar-item" style={{ height: `${(Math.abs(d.inflow) / maxVal) * 100}%` }}>
                <span>{fmtMoney(d.inflow)}</span>
              </div>
            )}
            {d.outflow != null && (
              <div className="ai-bar-item expense" style={{ height: `${(Math.abs(d.outflow) / maxVal) * 100}%` }}>
                <span>{fmtMoney(d.outflow)}</span>
              </div>
            )}
            {d.profit != null && (
              <div className={`ai-bar-item ${d.profit < 0 ? 'negative' : 'profit'}`} style={{ height: `${(Math.abs(d.profit) / maxVal) * 100}%` }}>
                <span>{fmtMoney(d.profit)}</span>
              </div>
            )}
            {d.net != null && (
              <div className={`ai-bar-item ${d.net < 0 ? 'negative' : 'profit'}`} style={{ height: `${(Math.abs(d.net) / maxVal) * 100}%` }}>
                <span>{fmtMoney(d.net)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ===== 消息气泡组件 ===== */
function MessageBubble({ msg, isLast, onGenerateReport }) {
  const isUser = msg.role === 'user'

  const onMarkdownClick = (e) => {
    const btn = e.target.closest('.md-copy-btn')
    if (!btn) return
    const pre = btn.closest('.md-pre')
    const code = pre?.querySelector('code')
    if (code) navigator.clipboard.writeText(code.textContent || '')
  }

  /* 检测 AI 回复中的报表标记 */
  const renderContent = () => {
    if (isUser) return <div className="ai-msg-text">{msg.content}</div>

    const text = msg.content || ''

    /* 解析 [GENERATE_REPORT:xxx] 标记 */
    const reportMatch = text.match(/\[GENERATE_REPORT:([\w_]+)\]/)
    const cleanText = text.replace(/\[GENERATE_REPORT:[\w_]+\]/g, '').trim()

    return (
      <>
        {cleanText && (
          <div
            className="ai-msg-text ai-msg-markdown"
            onClick={onMarkdownClick}
            role="presentation"
            dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(cleanText) }}
          />
        )}
        {msg.report && <ReportCard report={msg.report} />}
        {reportMatch && !msg.report && (
          <div className="ai-report-trigger">
            <button onClick={() => onGenerateReport?.(reportMatch[1])}>
              <i className="fa-solid fa-chart-column" />
              <span>生成 {reportLabel(reportMatch[1])}</span>
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <div className={`ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-ai'}`}>
      <div className="ai-msg-avatar">
        {isUser ? <i className="fa-solid fa-user" /> : <i className="fa-solid fa-robot" />}
      </div>
      <div className="ai-msg-body">
        <div className="ai-msg-content">
          {renderContent()}
          {msg.imagePreviews?.length > 0 && (
            <div className="ai-msg-images">
              {msg.imagePreviews.map((img, i) => <img key={i} src={img} alt="上传图片" className="ai-msg-img" />)}
            </div>
          )}
          {msg.file && (
            <div className="ai-msg-file"><i className="fa-solid fa-file" /><span>{msg.file}</span></div>
          )}
        </div>
        {!isUser && isLast && !msg.done && (
          <span className="ai-typing">
            <i className="fa-solid fa-circle fa-xs" style={{ opacity: 0.4 }} />
            <i className="fa-solid fa-circle fa-xs" style={{ opacity: 0.6, animationDelay: '0.2s' }} />
            <i className="fa-solid fa-circle fa-xs" style={{ opacity: 0.8, animationDelay: '0.4s' }} />
          </span>
        )}
      </div>
    </div>
  )
}

function reportLabel(type) {
  const map = {
    summary: '财务综合概览', balance_sheet: '资产负债表',
    income_statement: '利润表', cash_flow: '现金流量表',
    receivable_aging: '应收账龄分析', payable_aging: '应付账龄分析'
  }
  return map[type] || type
}

// ============================================================
//  主组件
// ============================================================
export default function AIAssistant() {
  const { user } = useContext(AuthContext)
  const userId = user?.id || 'anonymous'

  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem(`erp_ai_conversations_${userId}`)
    return saved ? JSON.parse(saved) : []
  })
  const [activeConvId, setActiveConvId] = useState(() => {
    return localStorage.getItem(`erp_ai_active_conv_${userId}`) || null
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('glm-4-flash')
  const [showModelSelect, setShowModelSelect] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [pendingFiles, setPendingFiles] = useState([])
  const [models, setModels] = useState([])
  const [retryCooldownSec, setRetryCooldownSec] = useState(null)

  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations
  const mountedRef = useRef(true)
  const retryTimerRef = useRef(null)

  const clearRetryTimers = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current)
      retryTimerRef.current = null
    }
    setRetryCooldownSec(null)
  }, [])

  const activeConv = conversations.find(c => c.id === activeConvId)
  const messages = activeConv?.messages || []

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearRetryTimers()
    }
  }, [clearRetryTimers])

  useEffect(() => { api.get('/ai/models').then(d => setModels(d.models || [])).catch(() => {}) }, [])
  /* 与导入逻辑一致：修正历史 localStorage 中可能出现的重复 id */
  useEffect(() => {
    setConversations(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev
      const used = new Set()
      let changed = false
      const next = prev.map((c, i) => {
        let id = c?.id
        if (!id || used.has(id)) {
          changed = true
          do {
            id = `conv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 10)}`
          } while (used.has(id))
        }
        used.add(id)
        return id === c.id ? c : { ...c, id }
      })
      return changed ? next : prev
    })
  }, [userId])
  useEffect(() => { localStorage.setItem(`erp_ai_conversations_${userId}`, JSON.stringify(conversations)) }, [conversations, userId])
  useEffect(() => { localStorage.setItem(`erp_ai_active_conv_${userId}`, activeConvId || '') }, [activeConvId, userId])
  useEffect(() => {
    if (!conversations.length) {
      if (activeConvId) setActiveConvId(null)
      return
    }
    if (activeConvId && !conversations.some(c => c.id === activeConvId)) {
      setActiveConvId(conversations[0].id)
    }
  }, [conversations, activeConvId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px' }
  }, [input])

  /* 创建新对话 */
  const newConversation = useCallback(() => {
    const id = 'conv-' + Date.now()
    const conv = { id, title: '新对话', messages: [], model, createdAt: new Date().toISOString() }
    setConversations(prev => [conv, ...prev])
    setActiveConvId(id)
    setPendingFiles([])
    return id
  }, [model])

  /* 生成财务报表 */
  const generateReport = async (reportType) => {
    if (!activeConvId || reportLoading) return
    setReportLoading(true)
    try {
      const res = await apiFetch('/api/ai/finance-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType, period: 'current' })
      })
      const report = await res.json()
      if (report.error) throw new Error(report.error)

      // 把报表附加到对话的最后一条 AI 消息
      setConversations(prev => prev.map(c => {
        if (c.id !== activeConvId) return c
        const msgs = [...c.messages]
        const lastMsg = msgs[msgs.length - 1]
        if (lastMsg && lastMsg.role === 'assistant') {
          msgs[msgs.length - 1] = { ...lastMsg, report, done: true }
        }
        return { ...c, messages: msgs }
      }))
    } catch (err) {
      alert('生成报表失败: ' + err.message)
    } finally {
      setReportLoading(false)
    }
  }

  /* 发送消息（使用 smart-chat 接口，自动注入系统数据） */
  const sendMessage = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || loading) return

    let convId = activeConvId
    if (!convId) convId = newConversation()

    const priorMessages = (conversationsRef.current.find(c => c.id === convId)?.messages) || []

    const msgText = input.trim()
    const images = pendingFiles.filter(f => f.isImage).map(f => f.base64)
    const imagePreviews = pendingFiles.filter(f => f.isImage).map(f => f.base64)
    setInput('')
    setPendingFiles([])
    setRetryCount(0)

    await doSendMessage(convId, msgText, images, null, imagePreviews, priorMessages)
  }

  const scheduleRateLimitRetry = useCallback((fn) => {
    clearRetryTimers()
    setRateLimited(true)
    let sec = 3
    setRetryCooldownSec(sec)
    retryTimerRef.current = setInterval(() => {
      sec -= 1
      if (sec <= 0) {
        if (retryTimerRef.current) {
          clearInterval(retryTimerRef.current)
          retryTimerRef.current = null
        }
        setRetryCooldownSec(null)
        setRateLimited(false)
        if (mountedRef.current) fn()
        return
      }
      setRetryCooldownSec(sec)
    }, 1000)
  }, [clearRetryTimers])

  const doSendMessage = async (convId, msgText, images, forceModel, imagePreviews, priorMessages) => {
    const userMsg = {
      role: 'user',
      content: msgText,
      images: images || [],
      imagePreviews: imagePreviews || [],
      file: null,
      timestamp: new Date().toISOString()
    }

    const assistantMsg = { role: 'assistant', content: '', done: false, timestamp: new Date().toISOString() }

    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c
      const updatedMsgs = [...c.messages, userMsg, assistantMsg]
      const title = c.messages.length === 0 ? (msgText?.slice(0, 30) || '对话') : c.title
      return { ...c, messages: updatedMsgs, title }
    }))

    setLoading(true)

    try {
      const hasImages = userMsg.images && userMsg.images.length > 0
      const isVision = hasImages
      const useModel = forceModel || (isVision ? (model.includes('4v') ? model : 'glm-4v-flash') : model)

      // 构建对话历史（历史中的图片不发送给 API，避免 localhost URL 报错和请求体过大）
      const apiMessages = []
      const historyBase = priorMessages != null
        ? priorMessages
        : (conversationsRef.current.find(c => c.id === convId)?.messages || [])
      for (const m of historyBase) {
        if (m.role === 'user') {
          // 历史消息只发文字，不发图片（图片只有当前消息才用 base64 发送）
          const textContent = typeof m.content === 'string' ? m.content : ''
          if (textContent) {
            apiMessages.push({ role: 'user', content: textContent })
          }
        } else if (m.role === 'assistant' && m.content) {
          // 过滤掉包含错误信息的 assistant 回复
          let cleanContent = m.content
          if (typeof cleanContent === 'string' && cleanContent.includes('API 调用参数有误')) {
            cleanContent = cleanContent.replace(/\n*\s*⚠️\s*错误[:：]?\s*\{.*?\}\s*/g, '').trim()
            if (!cleanContent) continue // 跳过纯错误消息
          }
          apiMessages.push({ role: 'assistant', content: cleanContent })
        }
      }
      // 当前消息
      if (hasImages) {
        const content = [
          ...(msgText ? [{ type: 'text', text: msgText }] : []),
          ...userMsg.images.map(img => ({ type: 'image_url', image_url: { url: img } }))
        ]
        apiMessages.push({ role: 'user', content })
      } else {
        apiMessages.push({ role: 'user', content: msgText })
      }

      // 使用 smart-chat（带数据上下文）或 vision 接口
      const endpoint = isVision ? '/ai/chat/vision' : '/ai/smart-chat'

      const response = await apiFetch(`/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model: useModel })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        // 429 自动降级到免费模型重试
        if (response.status === 429 && useModel !== 'glm-4-flash' && retryCount < 2) {
          setRetryCount(prev => prev + 1)
          // 移除已添加的 user+assistant 占位消息
          setConversations(prev => prev.map(c => {
            if (c.id !== convId) return c
            return { ...c, messages: c.messages.slice(0, -2) }
          }))
          scheduleRateLimitRetry(() => {
            setRetryCount(0)
            void doSendMessage(convId, msgText, images, 'glm-4-flash', imagePreviews, priorMessages)
          })
          setLoading(false)
          return
        }
        throw new Error(err.error || '请求失败')
      }

      setRateLimited(false)
      setRetryCount(0)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6))
              if (json.error === 'rate_limit') {
                // 流式返回的 429 错误，自动降级重试
                if (useModel !== 'glm-4-flash' && retryCount < 2) {
                  setRetryCount(prev => prev + 1)
                  // 移除本轮 user+assistant 占位，与 HTTP 429 回滚一致，避免重试时重复用户消息
                  setConversations(prev => prev.map(c => {
                    if (c.id !== convId) return c
                    return { ...c, messages: c.messages.slice(0, -2) }
                  }))
                  scheduleRateLimitRetry(() => {
                    setRetryCount(0)
                    void doSendMessage(convId, msgText, images, 'glm-4-flash', imagePreviews, priorMessages)
                  })
                  return // 跳出 pump 循环
                }
                fullContent += '\n\n⚠️ 请求过于频繁，请稍后再试或切换到免费模型（GLM-4-Flash）。'
                break
              }
              if (json.error) { fullContent += `\n\n⚠️ 错误: ${json.message || json.error}`; break }
              const delta = json.choices?.[0]?.delta?.content || ''
              fullContent += delta

              setConversations(prev => prev.map(c => {
                if (c.id !== convId) return c
                const msgs = [...c.messages]
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent }
                return { ...c, messages: msgs }
              }))
            } catch (e) { /* skip */ }
          }
        }
      }

      setConversations(prev => prev.map(c => {
        if (c.id !== convId) return c
        const msgs = [...c.messages]
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent, done: true }
        return { ...c, messages: msgs }
      }))

    } catch (err) {
      console.error('Send message error:', err)
      setConversations(prev => prev.map(c => {
        if (c.id !== convId) return c
        const msgs = [...c.messages]
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: `抱歉，发生了错误：${err.message}`, done: true }
        return { ...c, messages: msgs }
      }))
    } finally {
      setLoading(false)
    }
  }

  /* 上传文件 */
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiFetch('/api/ai/upload', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setPendingFiles(prev => [...prev, data])
      } catch (err) { alert(`上传失败: ${err.message}`) }
    }
    e.target.value = ''
  }

  /* 删除对话（只删第一条匹配 id，避免历史上重复 id 时误删多条） */
  const deleteConversation = (id, e) => {
    e.stopPropagation()
    if (!confirm('确定删除这个对话吗？')) return
    setConversations(prev => {
      const idx = (prev || []).findIndex(c => c?.id === id)
      if (idx === -1) return prev
      const next = [...(prev || []).slice(0, idx), ...(prev || []).slice(idx + 1)]
      if (activeConvId === id) {
        const still = next.find(c => c?.id === id)
        setActiveConvId(still ? id : (next[0]?.id ?? null))
      }
      return next
    })
  }

  const importInputRef = useRef(null)

  const exportConversations = useCallback(() => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      conversations
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `erp-ai-conversations-${userId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [conversations, userId])

  const importConversations = useCallback((e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''))
        const list = Array.isArray(data) ? data : data.conversations
        if (!Array.isArray(list)) throw new Error('文件格式无效')
        const raw = list.map((c, i) => ({
          id: typeof c?.id === 'string' ? c.id : null,
          title: typeof c?.title === 'string' ? c.title : '导入的对话',
          messages: Array.isArray(c?.messages) ? c.messages : [],
          model: c?.model,
          createdAt: c?.createdAt || new Date().toISOString()
        }))
        if (!confirm(`将合并 ${raw.length} 个对话到当前列表，是否继续？`)) return
        setConversations(prev => {
          const used = new Set((prev || []).map(c => c?.id).filter(Boolean))
          const merged = raw.map((c, idx) => {
            let nid = c.id
            if (!nid || used.has(nid)) {
              do {
                nid = `conv-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 10)}`
              } while (used.has(nid))
            }
            used.add(nid)
            return { ...c, id: nid }
          })
          return [...merged, ...(prev || [])]
        })
      } catch (err) {
        alert('导入失败：' + (err.message || '无法解析 JSON'))
      }
    }
    reader.readAsText(file)
  }, [])

  /* 快捷命令 */
  const quickCommands = [
    { icon: 'fa-solid fa-chart-line', label: '经营分析', prompt: '请综合分析当前企业的经营状况，包括财务、人力、销售和库存各方面', color: '#2563eb' },
    { icon: 'fa-solid fa-file-invoice-dollar', label: '财务报表', prompt: '请帮我生成一份完整的财务综合概览报表', reportType: 'summary', color: '#2563eb' },
    { icon: 'fa-solid fa-scale-balanced', label: '资产负债', prompt: '请生成资产负债表，展示企业当前的资产负债状况', reportType: 'balance_sheet', color: '#d97706' },
    { icon: 'fa-solid fa-money-bill-trend-up', label: '利润分析', prompt: '请生成利润表，分析企业近6个月的收支和利润情况', reportType: 'income_statement', color: '#dc2626' },
    { icon: 'fa-solid fa-users', label: '人力概览', prompt: '请介绍当前公司的人力资源情况，包括员工分布、薪资水平、招聘状态等', color: '#7c3aed' },
    { icon: 'fa-solid fa-warehouse', label: '库存预警', prompt: '请检查当前库存状况，列出所有低于安全库存的产品并给出采购建议', color: '#ea580c' },
    { icon: 'fa-solid fa-handshake', label: '销售分析', prompt: '请分析当前CRM销售漏斗、客户分布和赢单情况，给出销售策略建议', color: '#0891b2' },
    { icon: 'fa-solid fa-diagram-project', label: '项目进度', prompt: '请汇总当前所有项目的进度、预算使用情况，标注逾期风险项目', color: '#4f46e5' },
  ]

  /* 点击快捷命令 */
  const handleQuickCmd = (cmd) => {
    if (cmd.reportType) {
      // 如果是报表命令，直接发送消息让 AI 回复 + 自动生成报表
      setInput(cmd.prompt)
      setTimeout(() => sendMessage(), 100)
    } else {
      setInput(cmd.prompt)
      textareaRef.current?.focus()
    }
  }

  return (
    <div className={`ai-assistant ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* ====== 侧边栏 ====== */}
      <aside className={`ai-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ai-sidebar-brand">
          <div className="ai-sidebar-logo"><i className="fa-solid fa-robot" /></div>
          <span className="ai-sidebar-title">AI 助手</span>
        </div>

        <div className="ai-sidebar-actions">
          <button className="ai-new-chat-btn" onClick={newConversation}>
            <i className="fa-solid fa-plus" />
            <span>新建对话</span>
          </button>
          <div className="ai-sidebar-io">
            <button type="button" className="ai-io-btn" onClick={exportConversations} title="导出为 JSON">
              <i className="fa-solid fa-file-export" />
              <span>导出</span>
            </button>
            <button type="button" className="ai-io-btn" onClick={() => importInputRef.current?.click()} title="从 JSON 合并导入">
              <i className="fa-solid fa-file-import" />
              <span>导入</span>
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="ai-import-input"
              onChange={importConversations}
            />
          </div>
        </div>

        <div className="ai-sidebar-list">
          <div className="ai-sidebar-section-label">对话历史</div>
          {conversations.length === 0 && (
            <div className="ai-sidebar-empty">
              <i className="fa-regular fa-comment-dots" />
              <p>暂无对话</p>
            </div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`ai-sidebar-item ${conv.id === activeConvId ? 'active' : ''}`}
              onClick={() => { setActiveConvId(conv.id); setPendingFiles([]) }}
            >
              <i className="fa-regular fa-message" />
              <span className="ai-sidebar-item-title">{conv.title}</span>
              <button className="ai-sidebar-item-del" onClick={(e) => deleteConversation(conv.id, e)} title="删除对话">
                <i className="fa-regular fa-trash-can" />
              </button>
            </div>
          ))}
        </div>

        <div className="ai-sidebar-footer">
          <button className="ai-sidebar-collapse-btn" onClick={() => setSidebarOpen(false)}>
            <i className="fa-solid fa-angles-left" />
            <span>收起侧栏</span>
          </button>
        </div>
      </aside>

      {/* ====== 主区域 ====== */}
      <main className="ai-main">
        {/* 顶部栏 */}
        <div className="ai-topbar">
          <div className="ai-topbar-left">
            {!sidebarOpen && (
              <button className="ai-topbar-icon" onClick={() => setSidebarOpen(true)} title="展开侧栏">
                <i className="fa-solid fa-bars" />
              </button>
            )}
            <div className="ai-topbar-model" onClick={() => setShowModelSelect(!showModelSelect)}>
              <i className="fa-solid fa-microchip" />
              <span>{models.find(m => m.id === model)?.name || model}</span>
              <i className="fa-solid fa-chevron-down fa-xs" />
              {showModelSelect && (
                <div className="ai-model-dropdown">
                  {models.map(m => (
                    <div
                      key={m.id}
                      className={`ai-model-option ${m.id === model ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setModel(m.id); setShowModelSelect(false) }}
                    >
                      <div><strong>{m.name}</strong>{m.free && <span className="ai-model-free">免费</span>}</div>
                      <small>{m.description}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="ai-data-badge">
              <i className="fa-solid fa-database" />
              数据已集成
            </span>
          </div>
          <div className="ai-topbar-right">
            <button className="ai-topbar-icon" onClick={newConversation} title="新建对话">
              <i className="fa-solid fa-pen-to-square" />
            </button>
          </div>
        </div>

        {/* 速率限制提示 */}
        {rateLimited && (
          <div style={{
            background: 'linear-gradient(90deg, #fef3c7, #fde68a)',
            color: '#92400e',
            padding: '8px 16px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid #fbbf24'
          }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ animation: 'pulse 1s infinite' }} />
            <span>
              当前模型请求频繁，正在自动切换到 <strong>GLM-4-Flash（免费）</strong> 重试
              {retryCooldownSec != null ? `（${retryCooldownSec} 秒）` : ''}…
            </span>
          </div>
        )}

        {/* 消息区域 */}
        <div className="ai-messages">
          {messages.length === 0 ? (
            <div className="ai-welcome">
              <div className="ai-welcome-icon"><i className="fa-solid fa-robot" /></div>
              <h2>ERPPlus AI 助手</h2>
              <p>基于智谱 GLM 大模型，已集成财务、人力、CRM、库存、项目等全系统数据</p>

              <div className="ai-quick-commands">
                {quickCommands.map(cmd => (
                  <button key={cmd.label} className="ai-quick-cmd" onClick={() => handleQuickCmd(cmd)}>
                    <div className="ai-quick-cmd-icon" style={{ background: `${cmd.color}15`, color: cmd.color }}>
                      <i className={cmd.icon} />
                    </div>
                    <div className="ai-quick-cmd-text">
                      <span>{cmd.label}</span>
                      <small>{cmd.prompt}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                msg={msg}
                isLast={idx === messages.length - 1}
                onGenerateReport={generateReport}
              />
            ))
          )}
          {reportLoading && (
            <div className="ai-report-loading">
              <i className="fa-solid fa-spinner fa-spin" />
              <span>正在生成报表...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 待上传文件预览 */}
        {pendingFiles.length > 0 && (
          <div className="ai-pending-files">
            {pendingFiles.map((f, i) => (
              <div key={i} className="ai-pending-file">
                {f.isImage
                  ? <img src={f.base64} alt="预览" className="ai-pending-thumb" />
                  : <div className="ai-pending-doc"><i className="fa-solid fa-file-lines" /><span>{f.originalName}</span></div>
                }
                <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入区域 */}
        <div className="ai-input-area">
          <div className="ai-input-container">
            <div className="ai-input-box">
              <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.csv" multiple onChange={handleFileUpload} />
              <button className="ai-input-btn" onClick={() => fileInputRef.current?.click()} title="上传文件或图片">
                <i className="fa-solid fa-paperclip" />
              </button>
              <textarea ref={textareaRef} className="ai-input-textarea"
                placeholder="问我任何企业数据问题，如「本月利润是多少」「生成财务报表」..."
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                rows={1} />
              <button
                className={`ai-send-btn ${loading || (!input.trim() && pendingFiles.length === 0) ? 'disabled' : ''}`}
                onClick={sendMessage}
                disabled={loading || (!input.trim() && pendingFiles.length === 0)}
                title={loading ? '停止生成' : '发送'}>
                {loading ? <i className="fa-solid fa-stop" /> : <i className="fa-solid fa-paper-plane" />}
              </button>
            </div>
            <div className="ai-input-hint">
              <span>GLM 大模型驱动 · 已接入 ERP 全系统数据</span>
              <span><kbd>Enter</kbd> 发送 · <kbd>Shift + Enter</kbd> 换行</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
