// 改进日志内联编辑：把博客文章页的「📝 改进日志」toggle 变成可编辑文本框
// 点开后可打字，保存后通过 Worker API 写回 Notion
const API_URL = 'https://recipe-search-2iw.pages.dev/api/update-log' // 改进日志写回 API
const PWD_KEY = 'recipe_log_pwd'

// 模板提示行（不是用户记录，不预填进编辑框）
const TEMPLATE_PREFIXES = ['（待填写', '(待填写', '格式示例', '待填写', '（示例', '(示例']

function getToggleId(el) {
  const m = (el.className || '').match(/notion-block-([0-9a-f-]{36})/)
  return m ? m[1] : null
}

// 提取 toggle 现有的用户记录（过滤模板提示）
function extractLogText(contentDiv) {
  const texts = []
  contentDiv.querySelectorAll('div, p, li, span').forEach(n => {
    if (n.children.length === 0 && n.textContent && n.textContent.trim()) {
      texts.push(n.textContent.trim())
    }
  })
  return texts.filter(t => !TEMPLATE_PREFIXES.some(p => t.startsWith(p))).join('\n')
}

function attachEditor(toggleEl) {
  const toggleId = getToggleId(toggleEl)
  const contentDiv = toggleEl.querySelector(':scope > div')
  if (!toggleId || !contentDiv || contentDiv.dataset.logInit) return
  contentDiv.dataset.logInit = '1'

  const existing = extractLogText(contentDiv)
  contentDiv.innerHTML = ''

  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;'

  const ta = document.createElement('textarea')
  ta.value = existing
  ta.rows = 2
  ta.placeholder = '记录：日期 ｜ 改动 ｜ 效果'
  ta.style.cssText =
    'width:100%;box-sizing:border-box;font-size:13px;line-height:1.5;padding:8px 10px;' +
    'border:1px solid #e5ded5;border-radius:8px;background:#faf7f2;color:#555;' +
    'font-family:inherit;resize:vertical;min-height:52px;'

  const btn = document.createElement('button')
  btn.textContent = '保存'
  btn.style.cssText =
    'align-self:flex-start;font-size:12px;padding:5px 14px;border:none;border-radius:999px;' +
    'background:#e8634a;color:#fff;cursor:pointer;font-weight:600;'
  btn.onclick = async () => {
    let pwd = localStorage.getItem(PWD_KEY)
    if (!pwd) {
      pwd = window.prompt('请输入编辑密码：')
      if (!pwd) return
      localStorage.setItem(PWD_KEY, pwd)
    }
    btn.textContent = '保存中…'
    btn.disabled = true
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleId, content: ta.value, password: pwd })
      })
      const j = await res.json()
      if (res.ok) {
        btn.textContent = '✓ 已保存'
        btn.style.background = '#4a9e6f'
      } else {
        btn.textContent = '✗ 保存失败'
        btn.style.background = '#d9534f'
        if (j.error && j.error.includes('密码')) {
          localStorage.removeItem(PWD_KEY)
          btn.textContent = '密码错误，点此重试'
        }
      }
    } catch (e) {
      btn.textContent = '✗ 网络错误'
      btn.style.background = '#d9534f'
    }
    setTimeout(() => {
      btn.textContent = '保存'
      btn.style.background = '#e8634a'
      btn.disabled = false
    }, 2500)
  }

  wrap.appendChild(ta)
  wrap.appendChild(btn)
  contentDiv.appendChild(wrap)
}

export function initLogEditors(root) {
  if (typeof document === 'undefined') return
  const container = root && root.querySelector ? root : document
  const toggles = container.querySelectorAll('.notion-toggle')
  toggles.forEach(attachEditor)
}
