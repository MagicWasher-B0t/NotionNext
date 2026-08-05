// 改进日志内联编辑（独立脚本，_document 全局加载）
// 页面加载后直接扫描所有改进日志 toggle，把内容区替换成可编辑输入框
(function () {
  var API_URL = 'https://recipe-search-2iw.pages.dev/api/update-log'
  var PWD_KEY = 'recipe_log_pwd'
  var TEMPLATE_PREFIXES = ['（待填写', '(待填写', '格式示例', '待填写', '（示例', '(示例']
  var DEBUG = window.location.search.indexOf('logtest=1') > -1
  // 绿字：确认脚本已执行
  if (DEBUG) {
    try {
      var ok = document.createElement('div')
      ok.textContent = '✓ 脚本已加载'
      ok.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#4a9e6f;color:#fff;text-align:center;padding:6px;font-size:13px;'
      document.body.appendChild(ok)
    } catch (e) {}
  }

  function dbg(msg) {
    if (!DEBUG) return
    try {
      var el = document.createElement('div')
      el.textContent = msg
      el.style.cssText = 'position:fixed;top:28px;left:0;right:0;z-index:99999;background:#e8634a;color:#fff;text-align:center;padding:4px;font-size:12px;'
      document.body.appendChild(el)
    } catch (e) {}
  }

  function getToggleId(el) {
    // react-notion-x 的 block id 是 32 位无连字符的十六进制
    var m = (el.className || '').match(/notion-block-([0-9a-f]{32})/)
    return m ? m[1] : null
  }

  function getContentDiv(toggleEl) {
    var children = toggleEl.children
    for (var i = 0; i < children.length; i++) {
      if (children[i].tagName === 'DIV') return children[i]
    }
    return null
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

  function todayStr() {
    var d = new Date()
    var m = String(d.getMonth() + 1); if (m.length === 1) m = '0' + m
    var day = String(d.getDate()); if (day.length === 1) day = '0' + day
    return d.getFullYear() + '-' + m + '-' + day
  }
  // 保存时自动加当天日期（内容已有日期则不重复加）
  function addDatePrefix(text) {
    var t = (text || '').trim()
    if (!t) return ''
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return text
    return todayStr() + ' ｜ ' + t
  }

  function buildEditor(contentDiv, toggleId) {
    var existing = extractLogText(contentDiv)
    contentDiv.innerHTML = ''
    var wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;'

    var ta = document.createElement('textarea')
    ta.value = existing
    ta.rows = 2
    // 从 Notion 实时拉取最新内容（静态页面里的是旧快照，保存后需要拉取最新的）
    fetch(API_URL + '?toggleId=' + encodeURIComponent(toggleId))
      .then(function (r) { return r.json() })
      .then(function (j) { if (j && j.content !== undefined) ta.value = j.content })
      .catch(function () {})
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
        body: JSON.stringify({ toggleId: toggleId, content: addDatePrefix(ta.value), password: pwd })
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

  function setupEditor(toggleEl) {
    try {
      if (!toggleEl || toggleEl.dataset.logInit) return
      var toggleId = getToggleId(toggleEl)
      if (!toggleId) { dbg('⚠ 未找到 toggleId'); return }
      var contentDiv = getContentDiv(toggleEl)
      if (!contentDiv) { dbg('⚠ 未找到内容区'); return }
      toggleEl.dataset.logInit = '1'
      buildEditor(contentDiv, toggleId)
    } catch (e) {
      dbg('⚠ 出错: ' + e.message)
    }
  }

  var scannedCount = 0
  function scan() {
    try {
      var root = document.getElementById('notion-article') || document.body
      var toggles = root.querySelectorAll('.notion-toggle')
      scannedCount = toggles.length
      for (var i = 0; i < toggles.length; i++) setupEditor(toggles[i])
    } catch (e) {}
  }

  function boot() { setTimeout(scan, 100) }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    setTimeout(boot, 200)
  }
  // 多轮扫描 + 全程监听动态渲染
  setTimeout(scan, 1200)
  setTimeout(scan, 3000)
  setTimeout(scan, 6000)
  setTimeout(function () {
    var obs = new MutationObserver(scan)
    var root = document.getElementById('notion-article') || document.body
    obs.observe(root, { childList: true, subtree: true })
  }, 500)
})()
