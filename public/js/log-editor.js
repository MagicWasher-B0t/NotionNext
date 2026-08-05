// 改进日志内联编辑（独立脚本，_document 全局加载）
// 用事件委托监听 toggle 点击，展开后把内容变成可编辑输入框，保存写回 Notion
(function () {
  var API_URL = 'https://recipe-search-2iw.pages.dev/api/update-log'
  var PWD_KEY = 'recipe_log_pwd'
  var TEMPLATE_PREFIXES = ['（待填写', '(待填写', '格式示例', '待填写', '（示例', '(示例']

  // 自检标记：URL 带 ?logtest=1 时显示"脚本已加载"（用于排查）
  try {
    if (window.location.search.indexOf('logtest=1') > -1) {
      var dbg = document.createElement('div')
      dbg.textContent = '✓ 编辑器脚本已加载（log-editor.js）'
      dbg.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#4a9e6f;color:#fff;text-align:center;padding:6px;font-size:13px;'
      document.body.appendChild(dbg)
    }
  } catch (e) {}

  function getToggleId(el) {
    var m = (el.className || '').match(/notion-block-([0-9a-f-]{36})/)
    return m ? m[1] : null
  }

  function extractLogText(contentDiv) {
    var texts = []
    var nodes = contentDiv.querySelectorAll('div, p, li, span')
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i]
      if (n.children.length === 0 && n.textContent && n.textContent.trim()) {
        texts.push(n.textContent.trim())
      }
    }
    var filtered = []
    for (var j = 0; j < texts.length; j++) {
      var skip = false
      for (var k = 0; k < TEMPLATE_PREFIXES.length; k++) {
        if (texts[j].indexOf(TEMPLATE_PREFIXES[k]) === 0) { skip = true; break }
      }
      if (!skip) filtered.push(texts[j])
    }
    return filtered.join('\n')
  }

  function buildEditor(contentDiv, toggleId) {
    contentDiv.innerHTML = ''
    var wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;'

    var ta = document.createElement('textarea')
    ta.value = extractLogText(contentDiv)
    ta.rows = 2
    ta.placeholder = '记录：日期 ｜ 改动 ｜ 效果'
    ta.style.cssText =
      'width:100%;box-sizing:border-box;font-size:13px;line-height:1.5;padding:8px 10px;' +
      'border:1px solid #e5ded5;border-radius:8px;background:#faf7f2;color:#555;' +
      'font-family:inherit;resize:vertical;min-height:52px;'

    var btn = document.createElement('button')
    btn.textContent = '保存'
    btn.style.cssText =
      'align-self:flex-start;font-size:12px;padding:5px 14px;border:none;border-radius:999px;' +
      'background:#e8634a;color:#fff;cursor:pointer;font-weight:600;'
    btn.onclick = function () {
      var pwd = localStorage.getItem(PWD_KEY)
      if (!pwd) {
        pwd = window.prompt('请输入编辑密码：')
        if (!pwd) return
        localStorage.setItem(PWD_KEY, pwd)
      }
      btn.textContent = '保存中…'
      btn.disabled = true
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleId: toggleId, content: ta.value, password: pwd })
      })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j } }) })
        .then(function (r) {
          if (r.ok) { btn.textContent = '✓ 已保存'; btn.style.background = '#4a9e6f' }
          else {
            btn.textContent = '✗ 保存失败'; btn.style.background = '#d9534f'
            if (r.j && r.j.error && r.j.error.indexOf('密码') > -1) {
              localStorage.removeItem(PWD_KEY)
              btn.textContent = '密码错误，点此重试'
            }
          }
        })
        .catch(function () { btn.textContent = '✗ 网络错误'; btn.style.background = '#d9534f' })
        .then(function () {
          setTimeout(function () {
            btn.textContent = '保存'
            btn.style.background = '#e8634a'
            btn.disabled = false
          }, 2500)
        })
    }

    wrap.appendChild(ta)
    wrap.appendChild(btn)
    contentDiv.appendChild(wrap)
  }

  // 把某个改进日志的内容区变成编辑器（幂等）
  function setupEditor(toggleEl) {
    if (!toggleEl || toggleEl.dataset.logInit) return
    var toggleId = getToggleId(toggleEl)
    if (!toggleId) return
    var contentDiv = toggleEl.querySelector(':scope > div')
    if (!contentDiv) return
    toggleEl.dataset.logInit = '1'
    buildEditor(contentDiv, toggleId)
  }

  // 事件委托：点击任何改进日志的标题（展开）→ 注入编辑器
  document.addEventListener('click', function (e) {
    var t = e.target
    var summary = t && t.closest ? t.closest('.notion-toggle summary') : null
    if (!summary) return
    var toggle = summary.closest('.notion-toggle')
    if (toggle) setTimeout(function () { setupEditor(toggle) }, 120)
  }, true)

  // 初始处理已展开的 + 多轮扫描 + MutationObserver 兜底
  function scan() {
    var root = document.getElementById('notion-article') || document.body
    var toggles = root.querySelectorAll('.notion-toggle')
    for (var i = 0; i < toggles.length; i++) {
      if (toggles[i].open) setupEditor(toggles[i])
    }
  }
  function boot() { setTimeout(scan, 100) }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    setTimeout(boot, 300)
  }
  setTimeout(scan, 1500)
  setTimeout(scan, 4000)
  setTimeout(function () {
    var target = document.getElementById('notion-article') || document.body
    new MutationObserver(scan).observe(target, { childList: true, subtree: true })
  }, 2000)
})()
