import { marked } from 'marked'
import DOMPurify from 'dompurify'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) {
      const language = (lang || 'code').trim() || 'code'
      // 使用 div 包裹 header + pre，避免 div 嵌在 pre 内（非法 HTML，DOMPurify/浏览器会修正导致样式错乱）
      return `<div class="md-pre"><div class="md-pre-header"><span>${escapeHtml(language)}</span><button type="button" class="md-copy-btn" title="复制" aria-label="复制"><i class="fa-regular fa-copy" aria-hidden="true"></i></button></div><pre><code>${escapeHtml(text)}</code></pre></div>`
    },
    codespan({ text }) {
      return `<code class="md-inline">${escapeHtml(text)}</code>`
    }
  }
})

const SAFE_PURIFY = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target', 'rel', 'class', 'title', 'aria-label', 'aria-hidden', 'type'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
}

/**
 * 将 Markdown 转为可安全插入 DOM 的 HTML（防 XSS，链接协议受限）。
 */
export function renderSafeMarkdown(text) {
  const raw = marked.parse(text || '', { async: false })
  return DOMPurify.sanitize(raw, SAFE_PURIFY)
}
