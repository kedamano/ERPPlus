import { useState, useEffect, useCallback } from 'react'

/**
 * 通用分页 Hook
 * @param {Function} fetchFn - 异步获取数据的函数，接收 { page, limit } 参数
 * @param {object} options - 配置项
 * @param {number} options.defaultLimit - 默认每页数量，默认 20
 * @param {Array} options.deps - 额外的依赖项，变化时自动重新加载
 * @returns {{ data, total, page, limit, totalPages, loading, setPage, setLimit, reload }}
 */
export function usePagination(fetchFn, options = {}) {
  const { defaultLimit = 20, deps = [] } = options
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(defaultLimit)
  const [loading, setLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(0)

  const loadData = useCallback(async (p, l) => {
    setLoading(true)
    try {
      const res = await fetchFn({ page: p, limit: l })
      // 兼容两种响应格式：{ data, total } 和 { data, total, totalPages }
      if (Array.isArray(res)) {
        // 旧格式兼容：直接返回数组
        setData(res)
        setTotal(res.length)
        setTotalPages(1)
      } else {
        setData(res.data || [])
        setTotal(res.total || 0)
        setTotalPages(res.totalPages || Math.ceil((res.total || 0) / (res.limit || l)))
      }
    } catch (e) {
      console.error('Pagination fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    loadData(page, limit)
  }, [page, limit, loadData, ...deps])

  const handleSetPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleSetLimit = (newLimit) => {
    setLimit(newLimit)
    setPage(1) // 切换每页数量时回到第一页
  }

  const reload = useCallback(() => {
    loadData(page, limit)
  }, [loadData, page, limit])

  return {
    data, total, page, limit, totalPages, loading,
    setPage: handleSetPage,
    setLimit: handleSetLimit,
    reload
  }
}

/**
 * 分页 UI 组件
 * @param {{ total, page, limit, totalPages, onChange: (page) => void }} props
 */
export default function Pagination({ total, page, limit, totalPages, onChange }) {
  if (!total || totalPages <= 1) return null

  // 计算显示的页码范围（最多显示 7 个页码按钮）
  const getPageNumbers = () => {
    const pages = []
    const maxButtons = 7
    let start = Math.max(1, page - Math.floor(maxButtons / 2))
    const end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  const pages = getPageNumbers()

  return (
    <div className="pagination">
      <div className="pagination-info">
        共 <strong>{total}</strong> 条记录，第 {page}/{totalPages} 页
      </div>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onChange(1)}
          title="首页"
        >
          <i className="fa-solid fa-angles-left" />
        </button>
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          title="上一页"
        >
          <i className="fa-solid fa-angle-left" />
        </button>

        {pages[0] > 1 && <span className="pagination-ellipsis">...</span>}

        {pages.map(p => (
          <button
            key={p}
            className={`pagination-btn ${p === page ? 'active' : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && <span className="pagination-ellipsis">...</span>}

        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          title="下一页"
        >
          <i className="fa-solid fa-angle-right" />
        </button>
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(totalPages)}
          title="末页"
        >
          <i className="fa-solid fa-angles-right" />
        </button>
      </div>
    </div>
  )
}
