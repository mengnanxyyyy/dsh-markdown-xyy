// ============================================================
// Client half v1.2.0 — 主题系统（CSS 文件驱动 + 用户主题动态加载/编辑）+ Markdown 排版 + 版本面板
//
// ⚠️ 本文件由 scripts/build-client.js 拷贝生成 —— 请改源文件 plugin/src/client.core.js 后运行：
//      node scripts/build-client.js
//
// 【架构（v1.2.0 资产文件化）】
//   内置主题 / 共享排版骨架 / 面板样式 / 新建模板 全部由 Host 从文件读取（RPC 返回），
//   客户端只保留逻辑 —— 改 themes/*.css 或 plugin/assets/*.css 后刷新即生效，无需升级插件。
//
// 【文件结构总览】
//   §1 配置区        —— MANIFEST / DEFAULT_SELECTION（默认：系统自带）/ 模板兜底
//   §2 主题元信息    —— THEME_META（显示名/描述/色板预览）
//   §3 资产与主题缓存 —— builtinThemes / typographyCss / panelCss / templateCss（Host 文件驱动）
//   §4 选择引擎      —— applySelection（系统自带=零干预 / 内置/用户主题）+ 外观三档
//   §5 组件          —— VersionCard / ThemeSettings / ThemeEditor / highlightCss / formatCss
//   §6 插件入口 apply()
//
// 【能控制什么 / 到什么程度】（详见 docs/themes.md）
//   ① 全局 token：13 个 --dsw-alias-*（浅/深）→ 整个应用配色
//   ② 强调变量：--mdvr-*（accent/highlight/quote/code/table/link 系）→ 排版层色彩细节
//   ③ 元素排版：typography.css 约 30 条规则 → 全部 Markdown 元素
//   ④ 面板 UI：panel.css 自绘组件样式 → 完全控制
//   限制：不改产品 DOM；:where() 零优先级；token 名单固定 13 个；无持久化
// ============================================================

// ---------- §1 配置区 ----------
// 版本清单（版本面板与 Host 台账使用；与 plugin/host.js 的 MANIFEST 保持一致）
const MANIFEST = {
  version: '1.2.1',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-15',
  changes: [
    '修复：项目根改为按内容探测（workspaceRoot 及其兄弟/上级目录中找 plugin/assets/typography.css + panel.css，再兜底显式路径）——解决 DSH 启动目录 ≠ 项目目录时资产读取失败、设置页无样式的问题',
  ],
}

// 默认选择（会话级内存态，刷新/重启后恢复此值）
// 'system-native' = 系统自带（原生，插件零干预）；其余为第三方主题 id
const DEFAULT_SELECTION = 'system-native'

// 新建用户主题模板的兜底（Host 资产 plugin/assets/template.css 不可用时使用）
const FALLBACK_TEMPLATE_CSS = '/* 主题模板不可用，请检查插件资产 plugin/assets/template.css */\nbody { --mdvr-accent: #5856d6; }\n'

// ---------- §2 主题元信息（第三方主题：显示名/描述/色板预览；CSS 内容运行时由 Host 提供） ----------
// 「系统自带」（id: system-native）不是主题，是特殊选择：插件零干预，见 §4
const THEME_META = {
  'lobeui-emphasis': {
    name: 'LobeUI 风格（强调）',
    desc: 'LobeUI 原生中性色 + 靛蓝强调系统（默认）',
    swatches: ['#f8f8f8', '#ffffff', '#222222', '#5856d6'],
  },
  'inkpaper': {
    name: '墨纸 · InkPaper',
    desc: '暖纸身份：米白纸底 + 墨褐 accent',
    swatches: ['#faf6ef', '#f2ece0', '#8a5a2b', '#8a5a2b'],
  },
  'qingci': {
    name: '青瓷',
    desc: '青绿灰阶：瓷白底 + 青瓷绿 accent',
    swatches: ['#f4f7f5', '#fbfdfb', '#2f6b52', '#2f6b52'],
  },
}

// ---------- §3 资产与主题缓存（Host 文件驱动，改文件刷新即生效） ----------
// 运行时状态（函数体作用域，进程内有效）
let rootCtx = null            // apply() 注入的 ctx 引用（供设置页切换时使用）
let activeSelection = DEFAULT_SELECTION  // 当前选择：'system-native'、内置主题 id 或 'user:<id>'
let themeDisposer = null      // 当前样式表清理函数
let themeService = null       // 产品 theme 服务（外观模式三档切换用，可选）
let builtinThemes = {}        // 内置主题缓存：id → { css }（工作区 themes/*.css）
let userThemes = {}           // 用户主题缓存：id → { css }（~/.dsh/web-themes）
let userThemeIds = []         // 用户主题 id 列表（目录顺序）
let typographyCss = ''        // 共享排版骨架（plugin/assets/typography.css）
let panelCss = ''             // 面板与设置页样式（plugin/assets/panel.css）
let templateCss = ''          // 新建用户主题模板（plugin/assets/template.css）
let assetsPromise = null      // 资产加载 Promise（只拉一次）

// 加载内置主题（工作区 themes/*.css；文件即主题，无需打包升级）
async function loadBuiltinThemes() {
  try {
    const res = await host.call('themes.builtin.list')
    if (!res || !res.ok) return []
    const themes = Array.isArray(res.themes) ? res.themes : []
    const next = {}
    for (const t of themes) {
      if (t && typeof t.id === 'string' && typeof t.css === 'string') next[t.id] = { css: t.css }
    }
    builtinThemes = next
    return Object.keys(builtinThemes)
  } catch (e) {
    return []
  }
}

// 加载共享资产（排版骨架 / 面板样式 / 新建模板）
async function loadAssets() {
  try {
    const res = await host.call('themeAssets.get')
    if (res && res.ok) {
      if (typeof res.typography === 'string') typographyCss = res.typography
      if (typeof res.panel === 'string') panelCss = res.panel
      if (typeof res.template === 'string' && res.template.length > 0) templateCss = res.template
    }
  } catch (e) { /* 忽略：资产缺失时插件仍可用（仅无样式） */ }
}

// 确保资产与内置主题已加载（幂等；失败不阻塞，面板样式留空）
function ensureAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([loadAssets(), loadBuiltinThemes()]).catch(() => {})
  }
  return assetsPromise
}

// 从 Host 加载用户主题（~/.dsh/web-themes/*.css；放文件即新主题，无需打包升级）
async function loadUserThemes() {
  try {
    const listRes = await host.call('themes.user.list')
    if (!listRes || !listRes.ok) return []
    const ids = Array.isArray(listRes.themes) ? listRes.themes : []
    const loaded = []
    for (const id of ids) {
      const res = await host.call('themes.user.get', { id })
      if (res && res.ok && typeof res.css === 'string') {
        userThemes[id] = { css: res.css }
        loaded.push(id)
      }
    }
    userThemeIds = loaded
    return loaded
  } catch (e) {
    return []
  }
}

// 保存 / 新建用户主题：写回 ~/.dsh/web-themes/<id>.css（Host RPC）
async function saveUserTheme(id, css) {
  try {
    const res = await host.call('themes.user.save', { id, css })
    return !!(res && res.ok)
  } catch (e) {
    return false
  }
}

// 从主题 CSS 文本提取色板预览（浅色档 4 色：底色/抬升面/品牌色/强调色；取不到返回空）
function parseThemeSwatches(css) {
  const grab = (name) => {
    const m = css.match(new RegExp(name + '\\s*:\\s*([^;]+);'))
    return m ? m[1].trim() : null
  }
  return [grab('--dsw-alias-bg-base'), grab('--dsw-alias-bg-layer-1'), grab('--dsw-alias-brand-primary'), grab('--mdvr-accent')].filter(Boolean)
}

// ---------- §4 选择引擎 ----------
// 应用选择：注入 骨架 + 主题 CSS + 面板样式（先卸旧表再注入）
// 'system-native'（系统自带）：插件零干预，只注入 panelCss（插件自有 UI），产品界面 100% 出厂观感
// 内置第三方主题 / 'user:<id>' 用户主题：注入 typographyCss + 主题 CSS + panelCss（均无深浅之分）
// 说明：token 与强调变量都直接写在主题 CSS 的 body / body[data-ds-dark-theme] 上，
//       与产品挂载机制一致（注入顺序晚于产品样式表 → 同选择器后者胜出）；
//       切换时旧样式表整体卸载 → 产品观感随之恢复。
function applySelection(ctx, id) {
  if (themeDisposer) { themeDisposer(); themeDisposer = null }
  if (id === 'system-native') {
    // 系统自带：不做任何主题动作（深浅跟随系统，外观三档按钮可用）
    themeDisposer = styles.insert(panelCss)
  } else if (id.indexOf('user:') === 0) {
    // 用户主题（~/.dsh/web-themes）：动态加载，与内置第三方一样无深浅之分
    const entry = userThemes[id.slice(5)]
    if (!entry) return
    themeDisposer = styles.insert(typographyCss + '\n' + entry.css + '\n' + panelCss)
  } else {
    const entry = builtinThemes[id]
    if (!entry) return
    themeDisposer = styles.insert(typographyCss + '\n' + entry.css + '\n' + panelCss)
  }
  activeSelection = id
}

// 读取当前外观模式偏好（light / dark / system），读不到时按跟随系统处理
function readScheme() {
  try {
    if (themeService) {
      const snap = themeService.getTheme()
      if (snap && snap.preference) return snap.preference
    }
  } catch (e) { /* 忽略：服务不可用时回退 */ }
  return 'system'
}

// 切换外观模式：走产品 theme.setTheme 官方接口（实时生效 + 偏好持久化）
// 主题 CSS 用 body / body[data-ds-dark-theme] 挂载，产品切档后自动跟随
function applyScheme(mode) {
  try {
    if (themeService) themeService.setTheme(mode)
  } catch (e) { /* 忽略：非法值或服务不可用 */ }
}

// ---------- §5 组件 ----------
// 版本卡片：展示当前版本徽标 + 本次变更 + 历史台账（数据来自 Host RPC）
function VersionCard(props) {
  const [state, setState] = React.useState({ loading: true, current: null, history: [], error: null })

  React.useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        await host.call('versions.note', { pluginId: props.pluginId || '', packageId: props.packageId, manifest: props.manifest })
        const data = await host.call('versions.list')
        if (!alive) return
        setState({ loading: false, current: data.current || props.manifest, history: data.history || [], error: null })
      } catch (err) {
        if (!alive) return
        setState({ loading: false, current: props.manifest, history: [], error: String((err && err.message) || err) })
      }
    }
    load()
    return () => { alive = false }
  }, [])

  if (state.loading) {
    return React.createElement('div', { className: 'mdvr-card' }, '📜 加载版本记录…')
  }
  if (state.error) {
    return React.createElement('div', { className: 'mdvr-card' }, '📜 版本记录不可用：' + state.error)
  }

  const cur = state.current || props.manifest
  const hist = (state.history || []).filter((e) => e.packageId !== (cur.packageId || ''))
  const changes = Array.isArray(cur.changes) ? cur.changes : []
  const meta = [cur.date, cur.palette].filter(Boolean).join(' · ')

  return React.createElement('div', { className: 'mdvr-card' },
    React.createElement('div', { className: 'mdvr-head' },
      React.createElement('span', { className: 'mdvr-title' }, '📜 ' + (cur.name || '版本记录')),
      React.createElement('span', { className: 'mdvr-badge' }, 'v' + cur.version),
      React.createElement('span', { className: 'mdvr-meta' }, meta),
    ),
    changes.length > 0 && React.createElement('ul', { className: 'mdvr-changes' },
      changes.map((c, i) => React.createElement('li', { key: i }, c)),
    ),
    hist.length > 0 && React.createElement('div', { className: 'mdvr-hist' },
      React.createElement('div', { className: 'mdvr-hist-title' }, '历史版本'),
      hist.map((e, i) => React.createElement('div', { key: i, className: 'mdvr-hist-item' },
        React.createElement('span', { className: 'mdvr-tag' }, 'v' + e.version),
        React.createElement('span', { className: 'mdvr-meta' }, String(e.date || '') + (Array.isArray(e.changes) && e.changes[0] ? ' · ' + e.changes[0] : '')),
      )),
    ),
  )
}

// 轻量 CSS 语法高亮：单遍正则交替匹配，按顺序着色
// （注释 / 字符串 / 选择器 / 变量 / at 规则 / 颜色 / 数值 / 属性名）
function highlightCss(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const text = esc(src)
  // 选择器需在行首/花括号/分号后出现（避免 @media 里的数值+括号被误判）
  const re = /\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(^|[\n{};])(\s*[^{}\n:;)]+)(?=\s*\{)|(--[\w-]+)|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?(?:%|px|em|rem|s|ms|deg|fr)?\b)|([a-zA-Z-]+)(?=\s*:)/g
  // 注释/字符串分支无捕获组，按匹配文本判定；其余按捕获组索引
  const clsOf = (m) => {
    const head = m[0].charAt(0)
    if (head === '/' && m[0].charAt(1) === '*') return 'hl-com'
    if (head === '"' || head === "'") return 'hl-str'
    if (m[2] != null) return 'hl-sel'
    if (m[3] != null) return 'hl-var'
    if (m[4] != null) return 'hl-at'
    if (m[5] != null) return 'hl-col'
    if (m[6] != null) return 'hl-num'
    return 'hl-prop'
  }
  let out = ''
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    out += text.slice(last, m.index)
    if (m[2] != null) {
      // 选择器分支：边界字符（m[1]）原样输出，选择器本体（m[2]）着色
      out += m[1] + '<span class="hl-sel">' + m[2] + '</span>'
    } else {
      out += '<span class="' + clsOf(m) + '">' + m[0] + '</span>'
    }
    last = m.index + m[0].length
  }
  out += text.slice(last)
  return out
}

// 简单 CSS 格式化：注释暂存 → 花括号/分号统一换行（} 前自动补分号）→ 2 空格缩进 → 注释还原
function formatCss(src) {
  const comments = []
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (c) => {
    comments.push(c)
    return '\u0000C' + (comments.length - 1) + '\u0000'
  })
  s = s
    .replace(/\s*\{\s*/g, ' {\n')
    .replace(/([^;{])\s*\}\s*/g, '$1;\n}\n')
    .replace(/\s*\}\s*/g, '\n}\n')
    .replace(/;\s*/g, ';\n')
  const lines = s.split('\n')
  const out = []
  let indent = 0
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line === ';') continue
    if (line === '}') indent = Math.max(0, indent - 1)
    out.push('  '.repeat(indent) + line)
    if (line.slice(-1) === '{') indent += 1
  }
  let result = out.join('\n')
  comments.forEach((c, i) => { result = result.replace('\u0000C' + i + '\u0000', c) })
  return result
}

// 用户主题编辑器：新建（填文件名）或编辑（载入现有 CSS）
// 编辑体验：彩色 pre 叠在透明文字 textarea 之下 → 输入即实时语法高亮；
// 「🧹 格式化」一键排版；「💾 保存」写回 ~/.dsh/web-themes/<id>.css
function ThemeEditor(props) {
  const [name, setName] = React.useState(props.id || '')
  const [css, setCss] = React.useState(props.initialCss || '')
  const [status, setStatus] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const taRef = React.useRef(null)
  const preRef = React.useRef(null)

  const syncScroll = (e) => {
    const p = preRef.current
    if (p) { p.scrollTop = e.target.scrollTop; p.scrollLeft = e.target.scrollLeft }
  }
  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const en = ta.selectionEnd
    const next = css.slice(0, s) + '  ' + css.slice(en)
    setCss(next)
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2 }, 0)
  }
  const onSave = async () => {
    const id = props.isNew ? name.trim() : props.id
    if (props.isNew && !/^[a-zA-Z0-9_-]+$/.test(id)) {
      setStatus('⚠️ 文件名仅允许字母 / 数字 / 下划线 / 连字符')
      return
    }
    setBusy(true)
    setStatus('')
    const ok = await saveUserTheme(id, css)
    setBusy(false)
    if (ok) {
      setStatus('✅ 已保存到 ~/.dsh/web-themes/' + id + '.css')
      props.onSaved(id)
    } else {
      setStatus('❌ 保存失败（目录不可写或文件已锁定）')
    }
  }

  return React.createElement('div', { className: 'mdvr-editor' },
    React.createElement('div', { className: 'mdvr-editor-head' },
      React.createElement('span', { className: 'mdvr-editor-title' },
        props.isNew ? '🆕 新建用户主题' : '✏️ 编辑用户主题：' + props.id + '.css'),
      React.createElement('button', { className: 'mdvr-editor-close', title: '关闭', onClick: props.onClose }, '✕'),
    ),
    props.isNew && React.createElement('div', { className: 'mdvr-editor-row' },
      React.createElement('span', { className: 'mdvr-editor-label' }, '文件名（不含 .css）'),
      React.createElement('input', {
        className: 'mdvr-editor-input',
        value: name,
        placeholder: '例如 my-theme',
        onChange: (e) => setName(e.target.value),
      }),
    ),
    React.createElement('div', { className: 'mdvr-editor-body' },
      React.createElement('pre', { ref: preRef, className: 'mdvr-editor-pre', dangerouslySetInnerHTML: { __html: highlightCss(css) } }),
      React.createElement('textarea', {
        ref: taRef,
        className: 'mdvr-editor-ta',
        value: css,
        spellCheck: false,
        autoCapitalize: 'off',
        autoCorrect: 'off',
        onChange: (e) => setCss(e.target.value),
        onScroll: syncScroll,
        onKeyDown,
      }),
    ),
    React.createElement('div', { className: 'mdvr-editor-foot' },
      React.createElement('span', { className: 'mdvr-editor-status' }, status),
      React.createElement('span', { className: 'mdvr-editor-hint' }, 'Tab 缩进 · 高亮为本地预览'),
      React.createElement('button', { className: 'mdvr-editor-btn', onClick: () => setCss(formatCss(css)) }, '🧹 格式化'),
      React.createElement('button', {
        className: 'mdvr-editor-btn mdvr-editor-btn-primary',
        disabled: busy,
        onClick: onSave,
      }, busy ? '保存中…' : '💾 保存'),
    ),
  )
}

// 主题设置页：外观模式 + 选择（系统自带 / 内置主题 / 用户主题）
// 选择模型（v0.9.0 + v1.0.0 + v1.2.0）：
//   - 「系统自带」= 默认：插件零干预，深浅跟随系统，☀️/🌙/🖥️ 三档可用
//   - 内置第三方主题 & 用户主题：无深浅之分 —— 选中后三档按钮变灰禁用（除非回到「系统自带」）
//   - 用户主题：~/.dsh/web-themes/ 放 CSS 文件 + 点「刷新」即生效；卡片右上「✏️ 编辑」进编辑器
//   - 内置主题只读（无编辑按钮），主题文件在仓库 themes/*.css
//   - 资产异步加载（Host 文件驱动），就绪前显示加载占位
function ThemeSettings() {
  const [sel, setSel] = React.useState(activeSelection)
  const [scheme, setSchemeState] = React.useState(readScheme())
  const [userIds, setUserIds] = React.useState([])
  const [builtinIds, setBuiltinIds] = React.useState([])
  const [ready, setReady] = React.useState(false) // 资产就绪前显示占位（useEffect 中置 true）
  // 编辑器状态：null = 关闭；{ isNew, id, css } = 新建 / 编辑中
  const [editor, setEditor] = React.useState(null)
  const isSystem = sel === 'system-native'
  const entries = builtinIds.map((id) => ({ id, meta: THEME_META[id] || { name: id, desc: '', swatches: [] } }))
  const schemeOptions = [
    ['light', '☀️ 浅色'],
    ['dark', '🌙 深色'],
    ['system', '🖥️ 跟随系统'],
  ]
  // 系统自带卡片的色板预览（DSH 出厂色）
  const systemSwatches = ['#ffffff', '#f9fafb', '#0f1115', '#5686fe']

  // 挂载时：等待资产就绪 → 加载内置 + 用户主题
  React.useEffect(() => {
    let alive = true
    ensureAssets().then(() => {
      if (!alive) return
      setBuiltinIds(Object.keys(builtinThemes))
      setReady(true)
      loadUserThemes().then((ids) => { if (alive) setUserIds(ids) })
    })
    return () => { alive = false }
  }, [])

  // 打开编辑器：编辑现有用户主题（载入 CSS 内容）
  const openEditor = (id) => {
    const entry = userThemes[id]
    if (!entry) return
    setEditor({ isNew: false, id, css: entry.css })
  }
  // 保存成功回调：刷新列表；若该主题正被使用则重新应用（修改即时生效）
  const handleSaved = (id) => {
    loadUserThemes().then((ids) => {
      setUserIds(ids)
      if (sel === 'user:' + id) applySelection(rootCtx, 'user:' + id)
    })
    setEditor(null)
  }
  // 资产未就绪时先占位（一般几十毫秒）
  if (!ready) {
    return React.createElement('div', { className: 'mdvr-themes' },
      React.createElement('div', { className: 'mdvr-themes-title' }, '⏳ 加载主题资产…'),
    )
  }

  return React.createElement('div', { className: 'mdvr-themes' },
    // 外观模式（持久保存；仅「系统自带」下可用，第三方/用户主题无深浅之分）
    React.createElement('div', { className: 'mdvr-themes-title' }, '外观模式（持久保存）'),
    React.createElement('div', { className: 'mdvr-schemes' },
      schemeOptions.map(([mode, label]) => {
        const selMode = scheme === mode
        return React.createElement('button', {
          key: mode,
          className: 'mdvr-scheme-btn' + (selMode ? ' mdvr-scheme-btn-active' : ''),
          disabled: !isSystem, // 第三方/用户主题激活时变灰禁用
          onClick: () => { applyScheme(mode); setSchemeState(mode) },
        }, label)
      }),
    ),
    // 「系统自带」：插件零干预（默认选择）
    React.createElement('div', { className: 'mdvr-themes-title mdvr-themes-title-gap' }, '主题'),
    React.createElement('button', {
      className: 'mdvr-theme-card' + (isSystem ? ' mdvr-theme-card-active' : ''),
      onClick: () => { applySelection(rootCtx, 'system-native'); setSel('system-native') },
    },
      React.createElement('span', { className: 'mdvr-theme-swatches' },
        systemSwatches.map((c, i) => React.createElement('span', {
          key: i,
          className: 'mdvr-theme-swatch',
          style: { background: c },
        })),
      ),
      React.createElement('span', { className: 'mdvr-theme-info' },
        React.createElement('span', { className: 'mdvr-theme-name' }, '系统自带' + (isSystem ? ' ✓' : '')),
        React.createElement('span', { className: 'mdvr-theme-desc' }, 'DSH 出厂观感：深浅跟随系统，插件零干预'),
      ),
    ),
    // 内置第三方主题（无深浅之分；只读，不可编辑）
    React.createElement('div', { className: 'mdvr-themes-title mdvr-themes-title-gap' }, '内置主题（无深浅之分 · 只读）'),
    entries.map(({ id, meta }) => {
      const selTheme = sel === id
      return React.createElement('button', {
        key: id,
        className: 'mdvr-theme-card' + (selTheme ? ' mdvr-theme-card-active' : ''),
        onClick: () => { applySelection(rootCtx, id); setSel(id) },
      },
        React.createElement('span', { className: 'mdvr-theme-swatches' },
          (meta.swatches || []).map((c, i) => React.createElement('span', {
            key: i,
            className: 'mdvr-theme-swatch',
            style: { background: c },
          })),
        ),
        React.createElement('span', { className: 'mdvr-theme-info' },
          React.createElement('span', { className: 'mdvr-theme-name' }, meta.name + (selTheme ? ' ✓' : '')),
          React.createElement('span', { className: 'mdvr-theme-desc' }, meta.desc),
        ),
      )
    }),
    // 用户主题（~/.dsh/web-themes/：放 CSS 文件即新主题，点刷新生效；可编辑）
    React.createElement('div', { className: 'mdvr-themes-title mdvr-themes-title-gap' }, '用户主题（~/.dsh/web-themes/）'),
    React.createElement('div', { className: 'mdvr-user-actions' },
      React.createElement('button', {
        className: 'mdvr-refresh-btn',
        onClick: () => { loadUserThemes().then((ids) => setUserIds(ids)) },
      }, '🔄 刷新用户主题'),
      React.createElement('button', {
        className: 'mdvr-refresh-btn',
        onClick: () => setEditor({ isNew: true, id: null, css: templateCss || FALLBACK_TEMPLATE_CSS }),
      }, '🆕 新建用户主题'),
      React.createElement('span', { className: 'mdvr-themes-title' }, '放入 CSS 文件后点刷新即生效'),
    ),
    userIds.length === 0 && React.createElement('div', { className: 'mdvr-themes-title' }, '（暂无用户主题，点「新建」或放入 CSS 文件）'),
    userIds.map((id) => {
      const entry = userThemes[id]
      const selUser = sel === 'user:' + id
      const swatches = entry ? parseThemeSwatches(entry.css) : []
      return React.createElement('div', {
        key: id,
        className: 'mdvr-theme-card mdvr-theme-card-editable' + (selUser ? ' mdvr-theme-card-active' : ''),
        onClick: () => { applySelection(rootCtx, 'user:' + id); setSel('user:' + id) },
      },
        React.createElement('span', { className: 'mdvr-theme-swatches' },
          (swatches.length ? swatches : ['#cccccc']).map((c, i) => React.createElement('span', {
            key: i,
            className: 'mdvr-theme-swatch',
            style: { background: c },
          })),
        ),
        React.createElement('span', { className: 'mdvr-theme-info' },
          React.createElement('span', { className: 'mdvr-theme-name' }, id + (selUser ? ' ✓' : '')),
          React.createElement('span', { className: 'mdvr-theme-desc' }, '用户主题：~/.dsh/web-themes/' + id + '.css'),
        ),
        React.createElement('button', {
          className: 'mdvr-edit-btn',
          title: '编辑 ' + id + '.css',
          onClick: (e) => { e.stopPropagation(); openEditor(id) },
        }, '✏️ 编辑'),
      )
    }),
    // 编辑器（新建 / 编辑用户主题）
    editor && React.createElement(ThemeEditor, {
      isNew: editor.isNew,
      id: editor.id,
      initialCss: editor.css,
      onClose: () => setEditor(null),
      onSaved: handleSaved,
    }),
  )
}

// ---------- §6 插件入口 ----------
return {
  apply(ctx) {
    rootCtx = ctx
    // 捕获产品 theme 服务（外观三档切换用；可选，缺失时按钮自动禁用）
    const themeSvc = ctx.get('theme')
    if (themeSvc !== undefined) themeService = themeSvc
    // 资产异步加载（Host 文件驱动），完成后应用默认选择（DEFAULT_SELECTION = 'system-native'）
    ensureAssets().then(() => {
      if (activeSelection === DEFAULT_SELECTION) applySelection(ctx, DEFAULT_SELECTION)
    })
    // Fiber 卸载清理：还原注入的样式表（stop/update/undefine 时自动执行）
    ctx.effect(() => () => {
      if (themeDisposer) { themeDisposer(); themeDisposer = null }
    })

    const slots = ctx.get('slots')
    if (slots === undefined) return
    // 设置页：主题设置（settings.section 列表条目，id 唯一）
    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'mdvr-theme', label: '主题设置' },
      () => React.createElement(ThemeSettings),
    ))
    // run 卡片：版本面板（tool.view.cordis，key 固定 self）
    slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      (props) => React.createElement(VersionCard, { pluginId: props.pluginId || '', packageId: props.packageId, manifest: MANIFEST }),
    ))
  },
}
