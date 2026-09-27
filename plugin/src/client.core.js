// ============================================================
// Client half v1.3.0 — 主题系统（CSS 文件驱动 + 用户主题动态加载/编辑）+ Markdown 排版 + 版本面板
//
// ⚠️ 本文件由 scripts/build-client.js 拷贝生成 —— 请改源文件 plugin/src/client.core.js 后运行：
//      node scripts/build-client.js
//
// 【架构（v1.2.0 资产文件化）】
//   内置主题 / 共享资产（面板样式、模板）/ 新建模板 全部由 Host 从文件读取（RPC 返回），
//   客户端只保留逻辑 —— 改 themes/*.css 或 plugin/assets/*.css 后刷新即生效，无需升级插件。
//
// 【文件结构总览】
//   §1 配置区        —— MANIFEST / DEFAULT_SELECTION（默认：系统自带）/ 模板兜底
//   §2 主题元信息    —— THEME_META（显示名/描述/色板预览）
// §3 资产与主题缓存 —— builtinThemes / panelCss（Host 文件驱动，分块拉取）
//   §4 选择引擎      —— applySelection（先构建后替换，原子切换）+ 外观三档
//   §5 组件          —— VersionCard / ThemeSettings / ThemeEditor / highlightCss / formatCss
//   §6 插件入口 apply()（runSeq/disposed 生命周期隔离，v1.3.0）
//
// 【能控制什么 / 到什么程度】（详见 docs/themes.md）
//   ① 全局 token：14 个 --dsw-alias-*（浅/深）→ 整个应用配色
//   ② 强调变量：--mdvr-*（accent/highlight/quote/code/table/link 系）→ 排版层色彩细节
//   ③ 元素排版：不再注入排版骨架（typography.css 已停用，v1.3.0+ 后缀）→ 产品 ._markdown_* 规则兜底，主题增量覆盖
//   ④ 面板 UI：panel.css 自绘组件样式 → 完全控制
//   限制：不改产品 DOM；:where() 零优先级；token 名单固定 14 个
//   持久化（v1.16.0）：主题选择存浏览器 localStorage，刷新/新页/重启自动恢复；外观模式由产品 theme.setTheme 自持持久化
// ============================================================

// ---------- §1 配置区 ----------
// 版本清单（版本面板与 Host 台账使用；与 plugin/host.js 的 MANIFEST 保持一致）
const MANIFEST = {
  version: '2.1.1',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-09-27',
  changes: [
    '修复文件引用胶囊死锚点（[class*="_fileMention_"] 带下划线在产品产物零命中，v2.0.2 起静默失效；改为不带下划线的 [class*="fileMention"]，命中产品真实类名 .fileMention；门禁第 12 节新增 12.6 项防回归）',
  ],
}

// 初始默认选择（v1.16.0 起用户选中后持久化到 localStorage，不再每次回退）
// 'system-native' = 系统自带（原生，插件零干预）；其余为第三方主题 id
const DEFAULT_SELECTION = 'system-native'

// ---------- 主题选择持久化（v1.16.0：跨刷新/新标签页/重启恢复） ----------
// 仅持久化「选中主题」；外观模式 ☀️/🌙/🖥️ 走产品 theme.setTheme 官方接口（自带持久化），无需重复存储。
// 存储不可用（隐私模式/沙箱）时全部读写静默跳过 → 回退会话级内存态（与旧版行为一致）。
const STORAGE_KEY = 'mdvr:theme:selection'
function readStoredSelection() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const v = window.localStorage.getItem(STORAGE_KEY)
      return typeof v === 'string' && v.length > 0 ? v : null
    }
  } catch (e) { /* 忽略：隐私模式 / 沙箱禁用存储 */ }
  return null
}
function writeStoredSelection(id) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, id)
    }
  } catch (e) { /* 忽略 */ }
}
function clearStoredSelection() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) { /* 忽略 */ }
}

// 新建用户主题起步内容的兜底（所选底子内置主题不可用时使用；v1.17.0 起 template.css 已删除，无独立模板资产）
const FALLBACK_STARTER_CSS = '/* 底子主题不可用（内置主题未加载），请先到设置页确认内置主题列表 */\nbody { --mdvr-accent: #5856d6; }\n'

// ---------- §2 主题元信息（第三方主题：显示名/描述/色板预览；CSS 内容运行时由 Host 提供） ----------
// 「系统自带」（id: system-native）不是主题，是特殊选择：插件零干预，见 §4
// v1.7.0：内置主题精简为唯一「草莓猛男粉」（lobeui-emphasis/inkpaper/qingci 已移除，历史在 git）
const THEME_META = {
  'strawberry-mocha': {
    name: '草莓猛男粉',
    desc: '本人喜欢 丝绒草莓甜点 × Catppuccin Mocha 暗夜',
    swatches: ['#faf6f8', '#ffffff', '#d93b68', '#d93b68'],
    swatchesDark: ['#1e1e2e', '#181825', '#fb7185', '#fb7185'],
  },
  // v1.13.4：三个旧用户主题按猛男粉规范升级内置（结构/变量名单/三层作用域对齐草莓猛男粉）
  'Cyber-Titanium-native': {
    name: 'Cyber Titanium · 钛影',
    desc: 'Space Black 空间黑 × 阳极钛紫 × 电光青 × 冷银',
    swatches: ['#f5f6f9', '#ffffff', '#635bff', '#635bff'],
    swatchesDark: ['#111216', '#171920', '#7c72ff', '#7c72ff'],
  },
  'High-Vis-Clarity-native': {
    name: 'High-Vis Clarity · 高清晰',
    desc: '旧显示器/低色域友好：高反差冷白 × 强辨识纯天蓝 × 黄金重点',
    swatches: ['#f4f6f9', '#ffffff', '#007ad9', '#007ad9'],
    swatchesDark: ['#14171a', '#1e2328', '#38a9ff', '#38a9ff'],
  },
  'Pine-Smoke-Ink-native': {
    name: '松烟墨黛',
    desc: '徽墨沉香 × 矿物朱砂 × 远山黛蓝 × 宣纸冷白',
    swatches: ['#faf7f2', '#ffffff', '#b23d35', '#b23d35'],
    swatchesDark: ['#141618', '#1b1e21', '#c34a42', '#c34a42'],
  },
}

// ---------- §3 资产与主题缓存（Host 文件驱动，改文件刷新即生效） ----------
// 运行时状态（函数体作用域，进程内有效）
let rootCtx = null            // apply() 注入的 ctx 引用（供设置页切换时使用）
let activeSelection = DEFAULT_SELECTION  // 当前选择：'system-native'、内置主题 id 或 'user:<id>'
let themeDisposer = null      // 当前样式表清理函数
let themeService = null       // 产品 theme 服务（外观模式三档切换用，可选）
let builtinThemes = {}        // 内置主题缓存：id → { css }（工作区 themes/*.css）
let userThemes = {}           // 用户主题缓存：id → { css }（~/.dsh/web-themes-xyy）
let userThemeIds = []         // 用户主题 id 列表（目录顺序）
let panelCss = ''             // 面板与设置页样式（plugin/assets/panel.css）
let assetsPromise = null      // 资产加载 Promise（失败后重置，允许重试）
let runSeq = 0                // 每次 apply() 递增；异步回调据此判断自己是否仍属于当前 Run（v1.3.0）
let disposed = false          // 当前 Run 是否已卸载（stop/update 后置 true，阻止迟到回调注入）

// 加载内置主题（工作区 themes/*.css；文件即主题，无需打包升级）
// ⚠️ v1.5.0：list 只返回 id，CSS 逐个分块拉取（themes.builtin.get）——
//    旧版 list 内联全部 CSS（大主题 32KB+ 时合计超 ~16KB 通道上限被截断 → 内置列表空白）
async function loadBuiltinThemes() {
  try {
    const res = await host.call('themes.builtin.list')
    if (!res || !res.ok || !Array.isArray(res.themes)) return []
    const ids = res.themes
    // 局部快照：全部加载完成后再一次性替换共享缓存
    const next = {}
    const loaded = []
    for (const id of ids) {
      const css = await fetchChunks('themes.builtin.get', (index) => ({ id, index }))
      if (css !== null) {
        next[id] = { css }
        loaded.push(id)
      }
    }
    builtinThemes = next
    return loaded
  } catch (e) {
    return []
  }
}

// 加载共享资产（面板样式；走分块协议 themeAssets.get，v1.3.0）
// v1.17.0：删除插件资产 template.css（青瓷参考模板）——新建用户主题的起步内容一律取自所选内置主题，
// 不再维护独立模板资产（v1.12.0 的 template-strawberry.css 同理已删）
async function loadAssets() {
  try {
    const pan = await fetchChunks('themeAssets.get', (index) => ({ name: 'panel', index }))
    if (pan !== null) panelCss = pan
  } catch (e) { /* 忽略：资产缺失时插件仍可用（仅无样式） */ }
}

// v1.17.0：新建用户主题起步内容 = 所选「底子」内置主题 CSS（整体复制，浅/深/元素定制全注释）；
// 该底子未加载（极少见）时回退内联最小起步。template.css 已删除，无独立模板资产
function newThemeStarter(baseId) {
  const builtin = baseId ? builtinThemes[baseId] : null
  return (builtin && builtin.css) || FALLBACK_STARTER_CSS
}

// 确保资产与内置主题已加载（幂等；失败重置 Promise，下次调用可重试，v1.3.0）
function ensureAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([loadAssets(), loadBuiltinThemes()]).catch(() => {
      assetsPromise = null // 失败后允许重试，而不是永久缓存失败
    })
  }
  return assetsPromise
}

// CSS 语法校验：注释/字符串/花括号/圆括号闭合检查；返回错误信息或 null（通过）
// ⚠️ 与 plugin/host.js 的 validateCss 保持一致（双端同逻辑）
function validateCss(src) {
  let depth = 0
  let paren = 0
  let inComment = false
  let inStr = null
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const c2 = src[i + 1]
    if (inComment) {
      if (c === '*' && c2 === '/') { inComment = false; i += 2 }
      else i++
      continue
    }
    if (inStr !== null) {
      if (c === '\\') i += 2
      else if (c === inStr) { inStr = null; i++ }
      else i++
      continue
    }
    if (c === '/' && c2 === '*') { inComment = true; i += 2; continue }
    if (c === '"' || c === "'") { inStr = c; i++; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth < 0) return '出现多余的 }'
    } else if (c === '(') paren++
    else if (c === ')') {
      paren--
      if (paren < 0) return '出现多余的 )'
    }
    i++
  }
  if (inComment) return '注释未闭合（缺少 */）'
  if (inStr !== null) return '字符串未闭合（缺少 ' + inStr + '）'
  if (depth > 0) return '花括号未闭合（缺少 ' + depth + ' 个 }）'
  if (paren > 0) return '圆括号未闭合（缺少 ' + paren + ' 个 )）'
  return null
}

// 分块拉取并拼接（页面↔宿主消息通道有 ~16KB 单条上限，v1.2.3 起大文本分块传输）
// argFn(index) 构造第 index 片的参数；严格校验响应 index/total 一致性，异常返回 null（v1.3.0）
async function fetchChunks(method, argFn) {
  const first = await host.call(method, argFn(0))
  if (!first || !first.ok || first.index !== 0 || !Number.isSafeInteger(first.total) ||
      first.total < 1 || typeof first.chunk !== 'string') {
    return null
  }
  let text = first.chunk
  const total = first.total
  for (let i = 1; i < total; i++) {
    const r = await host.call(method, argFn(i))
    if (!r || !r.ok || r.index !== i || r.total !== total || typeof r.chunk !== 'string') {
      return null // 响应不一致（文件中途变更/协议异常）：整体失败，避免拼接错位
    }
    text += r.chunk
  }
  return text
}

// 从 Host 加载用户主题（~/.dsh/web-themes-xyy/*.css；放文件即新主题，无需打包升级）
// 成功返回 id 列表（缓存已原子替换为最新快照）；失败返回 null（调用方应区分“无主题”与“读取失败”，v1.3.0）
async function loadUserThemes() {
  try {
    const listRes = await host.call('themes.user.list')
    if (!listRes || !listRes.ok) return null
    const ids = Array.isArray(listRes.themes) ? listRes.themes : []
    // 局部快照：全部加载完成后再一次性替换共享缓存（避免旧缓存残留/半更新状态）
    const next = {}
    const loaded = []
    for (const id of ids) {
      const css = await fetchChunks('themes.user.get', (index) => ({ id, index }))
      if (css !== null) {
        next[id] = { css }
        loaded.push(id)
      }
    }
    userThemes = next
    userThemeIds = loaded
    return loaded
  } catch (e) {
    return null
  }
}

// 保存 / 新建用户主题：本地 CSS 校验（错误禁止保存）→ 事务化分块上传（uploadId，v1.3.0）→ 写回 ~/.dsh/web-themes-xyy/<id>.css
// 返回 { ok, reason? }：reason 为用户可读的错误说明（语法错误 / 超限 / 写入失败）
async function saveUserTheme(id, css) {
  const err = validateCss(css)
  if (err) return { ok: false, reason: 'CSS 语法错误：' + err }
  // 每次保存生成唯一事务 id：Host 以 uploadId+id 隔离并发上传，杜绝同主题混片
  const uploadId = 'u' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  try {
    const chunks = []
    for (let i = 0; i < css.length; i += 8000) chunks.push(css.slice(i, i + 8000))
    if (chunks.length === 0) chunks.push('')
    for (let i = 0; i < chunks.length; i++) {
      const res = await host.call('themes.user.save', { id, uploadId, index: i, total: chunks.length, chunk: chunks[i] })
      if (!res || !res.ok) {
        return { ok: false, reason: (res && res.reason) || '保存失败' }
      }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String((e && e.message) || e) }
  }
}

// v1.13.3：从主题 CSS 提取双档色板预览（各 4 色：底色/抬升面/品牌色/强调色）
// 浅 = 首次出现（浅色档 body）、深 = 末次出现（body[data-ds-dark-theme]）；单档主题深色档回退浅色档值
function parseThemeSwatches(css) {
  const grab = (name) => {
    const re = new RegExp(name + '\\s*:\\s*([^;]+);', 'g')
    const all = []
    let m
    while ((m = re.exec(css)) !== null) all.push(m[1].trim())
    return all
  }
  const names = ['--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-brand-primary', '--mdvr-accent']
  const light = names.map((n) => { const a = grab(n); return a[0] || null }).filter(Boolean)
  const dark = names.map((n) => { const a = grab(n); return a.length > 1 ? a[a.length - 1] : (a[0] || null) }).filter(Boolean)
  return { light, dark }
}

// ---------- §4 选择引擎 ----------
// 应用选择：注入 主题 CSS + 面板样式（后缀变更：不再注入排版骨架 typography.css）
// 'system-native'（系统自带）：插件零干预，只注入 panelCss（插件自有 UI），产品界面 100% 出厂观感
// 内置第三方主题 / 'user:<id>' 用户主题：注入 主题 CSS + panelCss（均无深浅之分）
// 排版由产品 ._markdown_* 规则兜底（= 系统自带观感底子），主题只覆盖自己想改的属性（增量皮肤模型）
// 说明：token 与强调变量都直接写在主题 CSS 的 body / body[data-ds-dark-theme] 上，
//       与产品挂载机制一致（注入顺序晚于产品样式表 → 同选择器后者胜出）；
//       切换时旧样式表整体卸载 → 产品观感随之恢复。
// v1.3.0 原子切换：先解析目标 CSS 并成功插入新样式，再卸载旧样式 —— 目标缺失/插入失败时旧主题保持不动。
// 返回 true = 切换成功；false = 目标不可用（调用方不应更新选中状态）。
// v1.16.0：切换成功后把选择写入 localStorage（persist=false 时跳过，用于启动恢复路径——
//   避免把「读取失败时的临时回退默认值」覆盖掉用户已保存的选择）。
function applySelection(ctx, id, persist) {
  let css = null
  if (id === 'system-native') {
    css = panelCss
  } else if (id.indexOf('user:') === 0) {
    const entry = userThemes[id.slice(5)]
    if (entry) css = entry.css + '\n' + panelCss
  } else {
    const entry = builtinThemes[id]
    if (entry) css = entry.css + '\n' + panelCss
  }
  if (css === null) return false
  const nextDisposer = styles.insert(css)
  if (themeDisposer) { themeDisposer(); themeDisposer = null }
  themeDisposer = nextDisposer
  activeSelection = id
  if (persist !== false) writeStoredSelection(id)
  return true
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
// v1.3.0：返回是否成功 —— 服务缺失或调用抛错时不假装切换成功
function applyScheme(mode) {
  try {
    if (themeService) {
      themeService.setTheme(mode)
      return true
    }
  } catch (e) { /* 忽略：非法值或服务不可用 */ }
  return false
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

// 简单 CSS 格式化（v1.3.0 安全版）：先保护 url() / 字符串 / 注释（占位符），
// 再统一花括号/分号换行 + 2 空格缩进，最后按序还原 —— 字符串与 data URI 内容不再被拆坏
function formatCss(src) {
  const tokens = []
  const stash = (match) => {
    tokens.push(match)
    return '\u0000T' + (tokens.length - 1) + '\u0000'
  }
  // 保护顺序：url(...) 整体 > 引号字符串 > 注释（占位符不含 { } ; 字符）
  let s = src
    .replace(/url\([^)]*\)/gi, stash)
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, stash)
    .replace(/\/\*[\s\S]*?\*\//g, stash)
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
  // 还原：占位符是唯一标记，逆序还原避免占位符互相干扰
  for (let i = tokens.length - 1; i >= 0; i--) {
    result = result.split('\u0000T' + i + '\u0000').join(tokens[i])
  }
  return result
}

// 用户主题编辑器：新建（填文件名）或编辑（载入现有 CSS）
// 编辑体验：彩色 pre 叠在透明文字 textarea 之下 → 输入即实时语法高亮；
// 「🧹 格式化」一键排版；「💾 保存」写回 ~/.dsh/web-themes-xyy/<id>.css
function ThemeEditor(props) {
  const [name, setName] = React.useState(props.id || '')
  const [css, setCss] = React.useState(props.initialCss || '')
  const [status, setStatus] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  // v1.17.0：新建模式可选「底子主题」—— 起步内容 = 所选内置主题 CSS 整体复制（默认草莓猛男粉）
  const [base, setBase] = React.useState(props.baseId || 'strawberry-mocha')
  // 高亮结果与输入分离：输入即时（onChange 只 setCss），高亮异步（rAF）→ 大文本粘贴/编辑不卡顿
  const [hl, setHl] = React.useState(() => highlightCss(props.initialCss || ''))
  const taRef = React.useRef(null)
  const preRef = React.useRef(null)
  React.useEffect(() => {
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0)
    const caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout
    const id = raf(() => setHl(highlightCss(css)))
    return () => caf(id)
  }, [css])

  const syncScroll = (e) => {
    const p = preRef.current
    if (p) { p.scrollTop = e.target.scrollTop; p.scrollLeft = e.target.scrollLeft }
  }
  const closeRef = React.useRef(null)
  const onKeyDown = (e) => {
    // v1.3.0：Escape 退出 Tab 捕获（焦点移到关闭按钮），避免键盘困在编辑器
    if (e.key === 'Escape') {
      const b = closeRef.current
      if (b) { b.focus(); b.click() }
      return
    }
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
  // v1.17.0：切换底子主题 = 以该内置主题内容整体替换起步 CSS（文件名与下方编辑内容都会被替换，通常在动手编辑前切换）
  const onBaseChange = (e) => {
    const id = e.target.value
    const label = ((props.bases || []).find((b) => b.id === id) || {}).name || id
    setBase(id)
    setCss(newThemeStarter(id))
    setStatus('底子已切换为「' + label + '」，起步内容已替换')
  }
  const onSave = async () => {
    const id = props.isNew ? name.trim() : props.id
    if (props.isNew && !/^[a-zA-Z0-9_-]+$/.test(id)) {
      setStatus('⚠️ 文件名仅允许字母 / 数字 / 下划线 / 连字符')
      return
    }
    setBusy(true)
    setStatus('')
    const result = await saveUserTheme(id, css)
    setBusy(false)
    if (result.ok) {
      setStatus('✅ 已保存到 ~/.dsh/web-themes-xyy/' + id + '.css')
      props.onSaved(id)
    } else {
      setStatus('❌ ' + (result.reason || '保存失败（目录不可写或文件已锁定）'))
    }
  }

  const onFormat = () => {
    const next = formatCss(css)
    // v1.3.0：格式化结果必须通过语法校验才覆盖原文（防止误格式化破坏内容）
    if (validateCss(next) !== null) {
      setStatus('⚠️ 格式化结果不合法，已保留原文')
      return
    }
    setCss(next)
    setStatus('')
  }

  return React.createElement('div', { className: 'mdvr-editor' },
    React.createElement('div', { className: 'mdvr-editor-head' },
      React.createElement('span', { className: 'mdvr-editor-title', id: 'mdvr-editor-title' },
        props.isNew ? '🆕 新建用户主题' : '✏️ 编辑用户主题：' + props.id + '.css'),
      React.createElement('button', { ref: closeRef, className: 'mdvr-editor-close', type: 'button', title: '关闭（Esc）', onClick: props.onClose }, '✕'),
    ),
    props.isNew && React.createElement('div', { className: 'mdvr-editor-row' },
      React.createElement('label', { className: 'mdvr-editor-label', htmlFor: 'mdvr-editor-name' }, '文件名（不含 .css）'),
      React.createElement('input', {
        id: 'mdvr-editor-name',
        className: 'mdvr-editor-input',
        value: name,
        placeholder: '例如 my-theme',
        onChange: (e) => setName(e.target.value),
      }),
    ),
    props.isNew && props.bases && props.bases.length > 0 && React.createElement('div', { className: 'mdvr-editor-row' },
      React.createElement('label', { className: 'mdvr-editor-label', htmlFor: 'mdvr-editor-base' }, '底子主题（起步内容）'),
      React.createElement('select', {
        id: 'mdvr-editor-base',
        className: 'mdvr-editor-input',
        value: base,
        onChange: onBaseChange,
      }, props.bases.map((b) => React.createElement('option', { key: b.id, value: b.id }, b.name))),
    ),
    React.createElement('div', { className: 'mdvr-editor-body' },
      React.createElement('pre', { ref: preRef, className: 'mdvr-editor-pre', 'aria-hidden': true, dangerouslySetInnerHTML: { __html: hl } }),
      React.createElement('textarea', {
        ref: taRef,
        className: 'mdvr-editor-ta',
        value: css,
        'aria-labelledby': 'mdvr-editor-title',
        'aria-describedby': 'mdvr-editor-hint mdvr-editor-status',
        spellCheck: false,
        autoCapitalize: 'off',
        autoCorrect: 'off',
        wrap: 'off', // 与 pre 的 white-space:pre 对齐：不软换行，长行横向滚动（杜绝断行错位）
        onChange: (e) => setCss(e.target.value),
        onScroll: syncScroll,
        onKeyDown,
      }),
    ),
    React.createElement('div', { className: 'mdvr-editor-foot' },
      React.createElement('span', { className: 'mdvr-editor-status', id: 'mdvr-editor-status', role: 'status' }, status),
      React.createElement('span', { className: 'mdvr-editor-hint', id: 'mdvr-editor-hint' }, 'Tab 缩进 · 高亮为本地预览'),
      React.createElement('button', { className: 'mdvr-editor-btn', type: 'button', onClick: onFormat }, '🧹 格式化'),
      React.createElement('button', {
        className: 'mdvr-editor-btn mdvr-editor-btn-primary',
        type: 'button',
        disabled: busy,
        onClick: onSave,
      }, busy ? '保存中…' : '💾 保存'),
    ),
  )
}

// 主题设置页：外观模式 + 选择（系统自带 / 内置主题 / 用户主题）
// 选择模型（v0.9.0 + v1.0.0 + v1.2.0 + v1.3.0）：
//   - 「系统自带」= 默认：插件零干预，深浅跟随系统，☀️/🌙/🖥️ 三档可用
//   - 内置第三方主题 & 用户主题：无深浅之分 —— 选中后三档按钮变灰禁用（除非回到「系统自带」）
//   - 用户主题：~/.dsh/web-themes-xyy/ 放 CSS 文件 + 点「刷新」即生效；卡片右上「✏️ 编辑」进编辑器
//   - 内置主题只读（无编辑按钮），主题文件在仓库 themes/*.css
//   - 资产异步加载（Host 文件驱动），就绪前显示加载占位
// v1.3.0：卸载/竞态防护（mountedRef + request generation）、刷新失败提示、主题卡按钮化（键盘可达）+ aria-pressed
function ThemeSettings() {
  const [sel, setSel] = React.useState(activeSelection)
  const [scheme, setSchemeState] = React.useState(readScheme())
  const [userIds, setUserIds] = React.useState([])
  const [builtinIds, setBuiltinIds] = React.useState([])
  const [ready, setReady] = React.useState(false) // 资产就绪前显示占位（useEffect 中置 true）
  const [userError, setUserError] = React.useState('') // 用户主题加载/刷新失败提示
  const [refreshing, setRefreshing] = React.useState(false)
  // 编辑器状态：null = 关闭；{ isNew, id, css } = 新建 / 编辑中
  const [editor, setEditor] = React.useState(null)
  // v1.13.2：内置主题列表 = 系统自带（并入）+ 各内置主题（色板 + 名称，无描述行）
  const entries = builtinIds.map((id) => ({ id, meta: THEME_META[id] || { name: id, desc: '', swatches: [] } }))
  // v1.17.0：新建用户主题的「底子主题」可选列表（全部内置主题，显示名取 THEME_META）
  const baseOptions = builtinIds.map((id) => ({ id, name: (THEME_META[id] || { name: id }).name }))
  const schemeOptions = [
    ['light', '☀️ 浅色'],
    ['dark', '🌙 深色'],
    ['system', '🖥️ 跟随系统'],
  ]
  // 渲染 helpers（压缩重复的卡片结构）
  // v1.13.3：色卡两行（上=浅档 4 色 / 下=深档 4 色），行高与右侧名称+描述两行一致
  const swatchRow = (colors) => React.createElement('span', { className: 'mdvr-theme-swatch-row' },
    colors.map((c, i) => React.createElement('span', { key: i, className: 'mdvr-theme-swatch', style: { background: c } })),
  )
  const swatchGrid = (light, dark) => React.createElement('span', { className: 'mdvr-theme-swatches' },
    swatchRow(light && light.length ? light : ['#cccccc']),
    swatchRow(dark && dark.length ? dark : (light && light.length ? light : ['#cccccc'])),
  )
  const themeInfo = (name, desc) => React.createElement('span', { className: 'mdvr-theme-info' },
    React.createElement('span', { className: 'mdvr-theme-name' }, name),
    React.createElement('span', { className: 'mdvr-theme-desc' }, desc),
  )

  // v1.3.0：卸载防护 + latest-request-wins（旧请求晚到不覆盖新结果）
  const mountedRef = React.useRef(true)
  const reqRef = React.useRef(0)
  const selRef = React.useRef(sel)
  selRef.current = sel

  // 刷新 / 加载用户主题列表（request generation；失败保留旧列表并提示）
  const refreshUsers = () => {
    const req = ++reqRef.current
    setRefreshing(true)
    setUserError('')
    loadUserThemes().then((ids) => {
      if (!mountedRef.current || req !== reqRef.current) return
      setRefreshing(false)
      if (ids === null) {
        setUserError('读取用户主题失败（目录不可读或 RPC 异常），当前显示上次结果')
      } else {
        setUserIds(ids)
      }
    })
  }

  // 挂载时：等待资产就绪 → 加载内置 + 用户主题
  React.useEffect(() => {
    mountedRef.current = true
    let alive = true
    ensureAssets().then(() => {
      if (!alive) return
      setBuiltinIds(Object.keys(builtinThemes))
      setReady(true)
      refreshUsers()
    })
    return () => { mountedRef.current = false; alive = false; reqRef.current++ }
  }, [])

  // 打开编辑器：编辑现有用户主题（载入 CSS 内容）
  const openEditor = (id) => {
    const entry = userThemes[id]
    if (!entry) return
    setEditor({ isNew: false, id, css: entry.css })
  }
  // 保存成功回调：刷新列表；若该主题正被使用则重新应用（修改即时生效）
  const handleSaved = (id) => {
    setEditor(null)
    const req = ++reqRef.current
    setRefreshing(true)
    loadUserThemes().then((ids) => {
      if (!mountedRef.current || req !== reqRef.current) return
      setRefreshing(false)
      if (ids !== null) setUserIds(ids)
      // 正在使用中的主题修改后即时重新应用（applySelection 原子切换，失败时保留旧样式）
      if (selRef.current === 'user:' + id) applySelection(rootCtx, 'user:' + id)
    })
  }
  // 资产未就绪时先占位（一般几十毫秒）
  if (!ready) {
    return React.createElement('div', { className: 'mdvr-themes' },
      React.createElement('div', { className: 'mdvr-themes-title' }, '⏳ 加载主题资产…'),
    )
  }

  return React.createElement('div', { className: 'mdvr-themes' },
    // 外观模式（持久保存；v1.13.0 起对任意选中主题可用，主题自带浅深两档即跟随切换）
    React.createElement('div', { className: 'mdvr-themes-title' }, '外观模式（持久保存）'),
    React.createElement('div', { className: 'mdvr-schemes' },
      schemeOptions.map(([mode, label]) => {
        const selMode = scheme === mode
        return React.createElement('button', {
          key: mode,
          type: 'button',
          className: 'mdvr-scheme-btn' + (selMode ? ' mdvr-scheme-btn-active' : ''),
          disabled: !themeService, // 仅 theme 服务缺失时禁用（v1.13.0）
          'aria-pressed': selMode,
          onClick: () => { if (applyScheme(mode)) setSchemeState(mode) },
        }, label)
      }),
    ),
    // v1.13.5：内置主题列表与用户主题同构（色板双行 + 名称 + 描述），系统自带并入其中
    React.createElement('div', { className: 'mdvr-themes-title mdvr-themes-title-gap' }, '内置主题'),
    [{ id: 'system-native', name: '系统自带', desc: 'DSH 出厂观感：深浅跟随系统，插件零干预', light: ['#ffffff', '#f9fafb', '#0f1115', '#5686fe'], dark: ['#0f1115', '#1b1e24', '#5686fe', '#3d6df4'] }]
      .concat(entries.map(({ id, meta }) => ({ id, name: meta.name || id, desc: meta.desc || '', light: meta.swatches || [], dark: meta.swatchesDark || [] })))
      .map(({ id, name, desc, light, dark }) => {
        const selTheme = sel === id
        return React.createElement('div', {
          key: id,
          className: 'mdvr-theme-card' + (selTheme ? ' mdvr-theme-card-active' : ''),
        },
          React.createElement('button', {
            type: 'button',
            className: 'mdvr-theme-main',
            'aria-pressed': selTheme,
            onClick: () => { if (applySelection(rootCtx, id)) setSel(id) },
          },
            swatchGrid(light, dark),
            themeInfo(name + (selTheme ? ' ✓' : ''), desc),
          ),
        )
      }),
    // 用户主题（~/.dsh/web-themes-xyy/：放 CSS 文件即新主题，点刷新生效；可编辑）
    React.createElement('div', { className: 'mdvr-themes-title mdvr-themes-title-gap' }, '用户主题（~/.dsh/web-themes-xyy/）'),
    React.createElement('div', { className: 'mdvr-user-actions' },
      React.createElement('button', {
        className: 'mdvr-refresh-btn',
        type: 'button',
        disabled: refreshing,
        onClick: refreshUsers,
      }, refreshing ? '🔄 刷新中…' : '🔄 刷新用户主题'),
      React.createElement('button', {
        className: 'mdvr-refresh-btn',
        type: 'button',
        onClick: () => ensureAssets().then(() => setEditor({ isNew: true, id: null, baseId: 'strawberry-mocha', css: newThemeStarter('strawberry-mocha') })),
      }, '🆕 新建用户主题'),
      React.createElement('span', { className: 'mdvr-themes-title' }, '放入 CSS 文件后点刷新即生效'),
    ),
    // v1.3.0：刷新失败提示（与“暂无主题”区分开）
    userError && React.createElement('div', { className: 'mdvr-user-error', role: 'alert' }, '⚠️ ' + userError),
    userIds.length === 0 && !userError && React.createElement('div', { className: 'mdvr-themes-title' }, '（暂无用户主题，点「新建」或放入 CSS 文件）'),
    // v1.3.0：用户主题卡 = 外层容器 + 两个兄弟按钮（选择 / 编辑），键盘可达、无嵌套交互
    userIds.map((id) => {
      const entry = userThemes[id]
      const selUser = sel === 'user:' + id
      const sw = entry ? parseThemeSwatches(entry.css) : { light: [], dark: [] }
      return React.createElement('div', {
        key: id,
        className: 'mdvr-theme-card mdvr-theme-card-editable' + (selUser ? ' mdvr-theme-card-active' : ''),
      },
        React.createElement('button', {
          type: 'button',
          className: 'mdvr-theme-main',
          'aria-pressed': selUser,
          onClick: () => { if (applySelection(rootCtx, 'user:' + id)) setSel('user:' + id) },
        },
          swatchGrid(sw.light, sw.dark),
          themeInfo(id + (selUser ? ' ✓' : ''), '用户主题：~/.dsh/web-themes-xyy/' + id + '.css'),
        ),
        React.createElement('button', {
          type: 'button',
          className: 'mdvr-edit-btn',
          title: '编辑 ' + id + '.css',
          'aria-label': '编辑用户主题 ' + id,
          onClick: () => openEditor(id),
        }, '✏️ 编辑'),
      )
    }),
    // 编辑器（新建 / 编辑用户主题）
    editor && React.createElement(ThemeEditor, {
      isNew: editor.isNew,
      id: editor.id,
      initialCss: editor.css,
      baseId: editor.baseId || (editor.isNew ? 'strawberry-mocha' : undefined), // v1.17.0：新建时默认底子草莓猛男粉
      bases: editor.isNew ? baseOptions : [], // v1.17.0：新建时可选全部内置主题为底子
      onClose: () => setEditor(null),
      onSaved: handleSaved,
    }),
  )
}

// ---------- §6 插件入口 ----------
return {
  apply(ctx) {
    const run = ++runSeq
    disposed = false
    rootCtx = ctx
    // 捕获产品 theme 服务（外观三档切换用；可选，缺失时按钮自动禁用）
    const themeSvc = ctx.get('theme')
    themeService = themeSvc !== undefined ? themeSvc : null // 每次 apply 重新解析，不残留旧 Run 的引用
    // 资产异步加载（Host 文件驱动），完成后恢复上次会话选中的主题（v1.16.0 localStorage 持久化）
    // v1.3.0：run/disposed 双检查 —— stop/update 后迟到的 Promise 不再注入样式（杜绝幽灵样式）
    // v1.16.0：启动恢复校验三个分支 —— 内置/系统自带直接应用；用户主题先拉目录再校验（读取失败
    //   保留下次重试、不覆盖存储；主题被删除则清存储）；非法值清存储。persist=false 避免恢复路径的
    //   回退写入污染用户已保存的选择。
    ensureAssets().then(async () => {
      if (disposed || run !== runSeq) return
      let target = DEFAULT_SELECTION
      const stored = readStoredSelection()
      if (stored !== null) {
        if (stored === 'system-native' || builtinThemes[stored]) {
          target = stored
        } else if (stored.indexOf('user:') === 0) {
          const got = await loadUserThemes()
          if (disposed || run !== runSeq) return
          if (got === null) {
            target = DEFAULT_SELECTION // 目录读取失败：本次回默认，但不清存储（下次再试）
          } else if (userThemes[stored.slice(5)]) {
            target = stored
          } else {
            clearStoredSelection() // 该用户主题已不存在：清存储回默认
          }
        } else {
          clearStoredSelection() // 非法/已移除的引用：清存储回默认
        }
      }
      if (activeSelection === DEFAULT_SELECTION) applySelection(ctx, target, false)
    })
    // v1.16.0：跨标签页/窗口同步 —— 另一标签页改选择后本页跟随（storage 事件只在“其他标签页”触发）。
    // 页面关闭时 ctx.effect 自动移除监听；存储不可用则整个监听不挂载。
    const onStorageSync = (e) => {
      try {
        if (!e || e.key !== STORAGE_KEY || disposed || run !== runSeq) return
        if (e.newValue === null || e.newValue === activeSelection) return
        if (e.newValue.indexOf('user:') === 0 && !userThemes[e.newValue.slice(5)]) {
          // 本页用户主题缓存还没加载（设置页未打开过）：先拉目录再应用；被删则 applySelection 返回 false 不动现状
          loadUserThemes().then(() => {
            if (!disposed && run === runSeq) applySelection(rootCtx, e.newValue)
          })
          return
        }
        applySelection(rootCtx, e.newValue)
      } catch (err) { /* 忽略：沙箱/隐私模式无 storage */ }
    }
    ctx.effect(() => {
      let w = null
      try { if (typeof window !== 'undefined') w = window } catch (e) { w = null }
      if (!w) return () => {}
      w.addEventListener('storage', onStorageSync)
      return () => w.removeEventListener('storage', onStorageSync)
    })
    // Fiber 卸载清理：还原注入的样式表 + 标记 Run 失效（stop/update/undefine 时自动执行）
    ctx.effect(() => () => {
      disposed = true
      if (themeDisposer) { themeDisposer(); themeDisposer = null }
      rootCtx = null
      themeService = null
      assetsPromise = null // 下次 apply 重新加载资产（不沿用旧 Run 的缓存 Promise）
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
