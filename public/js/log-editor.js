// 改进日志内联编辑（独立脚本，不走 webpack chunk，文章页直接加载）
// 点开 📝 改进日志后可打字，保存后通过 API 写回 Notion
(function () {
  const API_URL = 'https://recipe-search-2iw.pages.dev/api/update-log'
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
    contentDiv.querySelectorAll('div, p, li, span').forEach(function (n) {
      if (n.children.length === 0 && n.textContent && n.textContent.trim()) {
        texts.push(n.textContent.trim())
      }
    })
    return texts
      .filter(function (t) { return !TEMPLATE_PREFIXES.some(function (p) { return t.indexOf(p) === 0 }) })
      .join('\n')
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
        .finally(function () {
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

  function attachEditor(toggleEl) {
    var toggleId = getToggleId(toggleEl)
    if (!toggleId || toggleEl.dataset.logBound) return
    toggleEl.dataset.logBound = '1'
    // 展开时注入编辑器（避免 react-notion-x 渲染内容覆盖）
    toggleEl.addEventListener('toggle', function () {
      if (toggleEl.open) {
        setTimeout(function () {
          var contentDiv = toggleEl.querySelector(':scope > div')
          if (contentDiv && !contentDiv.dataset.logInit) {
            contentDiv.dataset.logInit = '1'
            buildEditor(contentDiv, toggleId)
          }
        }, 80)
      }
    })
    // 如果初始就是展开的，也注入
    if (toggleEl.open) {
      setTimeout(function () {
        var contentDiv = toggleEl.querySelector(':scope > div')
        if (contentDiv && !contentDiv.dataset.logInit) {
          contentDiv.dataset.logInit = '1'
          buildEditor(contentDiv, toggleId)
        }
      }, 80)
    }
  }

  window.initLogEditors = function (root) {
    var container = root && root.querySelector ? root : document
    var toggles = container.querySelectorAll('.notion-toggle')
    for (var i = 0; i < toggles.length; i++) attachEditor(toggles[i])
  }
})()
