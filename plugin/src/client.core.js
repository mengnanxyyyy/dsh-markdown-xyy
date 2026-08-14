// ============================================================
// Client half v1.0.0 — 主题系统（CSS 文件驱动 + 用户主题动态加载）+ Markdown 排版 + 版本面板
//
// ⚠️ 本文件由 scripts/build-client.js 生成 —— THEMES 部分禁止手改！
//    主题定义在 themes/*.css（每主题一个 CSS 文件），修改后运行：
//      node scripts/build-client.js
//    逻辑部分源文件：plugin/src/client.core.js
//
// 【文件结构总览】
//   §1 配置区        —— MANIFEST / DEFAULT_SELECTION（默认：系统自带）
//   §2 主题元信息    —— THEME_META（显示名/描述/色板预览）
//   §3 主题注册表    —— THEMES（由构建脚本从 themes/*.css 生成，勿手改）
//   §4 共享排版骨架  —— TYPO_CSS（只引用 var(--dsw-alias-*) / var(--mdvr-*)）
//   §5 面板与设置页样式 —— PANEL_CSS
//   §6 选择引擎      —— applySelection（系统自带=零干预 / 第三方主题）+ 外观三档（readScheme/applyScheme）
//   §7 组件          —— VersionCard / ThemeSettings
//   §8 插件入口 apply()
//
// 【能控制什么 / 到什么程度】（详见 docs/themes.md 与 themes/demo.css 元素目录）
//   ① 全局 token：13 个 --dsw-alias-*（浅/深）→ 整个应用配色
//   ② 强调变量：--mdvr-*（accent/highlight/quote/code/table/link 系）→ 排版层色彩细节
//   ③ 元素排版：TYPO_CSS 约 30 条规则 → 全部 Markdown 元素
//   ④ 面板 UI：自绘组件 + 专属样式 → 完全控制
//   限制：不改产品 DOM；:where() 零优先级；token 名单固定 13 个；无持久化
// ============================================================

// ---------- §1 配置区 ----------
// 版本清单（版本面板与 Host 台账使用；与 plugin/host.js 的 MANIFEST 保持一致）
const MANIFEST = {
  version: '1.0.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-14',
  changes: [
    '用户主题动态加载：~/.dsh/mdvr-themes/ 放 CSS 文件即成为新主题（无需打包/升级插件），设置页一键刷新',
    'Host 新增 themes.user.list / themes.user.get RPC（fs 读取用户目录）',
    '选择模型扩展：user:* 选择走用户主题缓存，与内置第三方一样无深浅之分',
  ],
}

// 默认选择（会话级内存态，刷新/重启后恢复此值）
// 'system-native' = 系统自带（原生，插件零干预）；其余为第三方主题 id
const DEFAULT_SELECTION = 'system-native'

// ---------- §2 主题元信息（第三方主题：显示名/描述/色板预览；CSS 内容在 §3） ----------
// 「系统自带」（id: system-native）不是主题，是特殊选择：插件零干预，见 §6
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

// ---------- §3 主题注册表（构建生成，勿手改） ----------
/*__THEMES_START__*/
/*__THEMES_END__*/

// ---------- §4 共享排版骨架 ----------
// 只引用 var(--dsw-alias-*)（全局 token）与 var(--mdvr-*)（主题强调变量），不含写死色值。
// :where() 零优先级 → 产品显式样式永远优先，我们只兜底"裸语义元素"。
// ⚠️ themes/demo.css 的 §C 元素目录与本骨架一一对应，修改骨架必须同步 demo.css。
const TYPO_CSS = [
  // 基线：中文友好行高 + 断字兜底
  ':where(p, ul, ol, blockquote, pre, table, li) { line-height: 1.8; overflow-wrap: break-word; }',
  // 字体：Markdown 作用域套用主题 sans 栈
  ':where(p, ul, ol, blockquote, pre, table, h1, h2, h3, h4, h5, h6, li, td, th, a) { font-family: var(--mdvr-sans); }',
  // 段落：首尾去空 + 段间 1em（倍数制节奏）
  ':where(p) { margin: 0; letter-spacing: 0.02em; }',
  ':where(p:not(:first-child)) { margin-top: 1em; }',
  ':where(p:not(:last-child)) { margin-bottom: 1em; }',
  // 标题：阶梯 2/1.6/1.3/1.15/1、700、行高 1.25；h1 带主题色下划线（唯一彩色标题元素）
  ':where(h1, h2, h3, h4, h5, h6) { line-height: 1.25; font-weight: 700; margin: 1.1em 0 0.6em; }',
  ':where(h1) { font-size: 2em; padding-bottom: 0.35em; border-bottom: 1px solid var(--mdvr-accent-faint); }',
  ':where(h2) { font-size: 1.6em; }',
  ':where(h3) { font-size: 1.3em; }',
  ':where(h4) { font-size: 1.15em; }',
  ':where(h5) { font-size: 1em; }',
  ':where(h6) { font-size: 0.9em; color: var(--dsw-alias-label-secondary); }',
  // 列表：主题色 "-" 符号（LobeUI 式），任务列表对齐
  ':where(ul, ol) { margin: 1em 0; margin-left: 1em; padding-left: 0; list-style-position: outside; }',
  ':where(ul) { list-style-type: none; }',
  ':where(ul > li::before) { content: "-"; margin-inline: -1em 0.5em; color: var(--mdvr-accent); opacity: 0.85; }',
  ':where(li) { margin: 0.4em 0; }',
  ':where(li p:first-child) { display: inline; }',
  ':where(li.task-list-item) { list-style: none; }',
  ':where(input[type="checkbox"]) { margin: 0 0.4em 0.2em 0; vertical-align: middle; }',
  // 行内代码：主题 tint 底 + 同色系描边 + 强调字（一眼可辨代码）
  ':where(code, samp) { font-family: var(--mdvr-mono); font-size: 0.875em; line-height: 1; padding: 0.1em 0.4em; margin-inline: 0.15em; border: 1px solid var(--mdvr-code-border); border-radius: 0.25em; background: var(--mdvr-accent-soft); color: var(--mdvr-accent-text); white-space: break-spaces; overflow-wrap: break-word; }',
  // 代码块：中性底（留给未来语法高亮）+ 左侧主题色标条 + 细描边
  ':where(pre) { margin: 1em 0; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; padding: 16px; box-shadow: inset 3px 0 0 0 var(--mdvr-accent), inset 0 0 0 1px var(--dsw-alias-border-l1); overflow-x: auto; font-size: 0.85em; line-height: 1.6; font-variant-ligatures: none; }',
  ':where(pre code) { background: transparent; border: none; padding: 0; margin: 0; font-size: inherit; line-height: inherit; white-space: pre; }',
  // 引用：主题色边条 + tint 底 + 正文提到主色（重点块）
  ':where(blockquote) { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid var(--mdvr-quote-border); border-radius: 0 8px 8px 0; background: var(--mdvr-quote-bg); color: var(--dsw-alias-label-primary); }',
  ':where(blockquote p:first-child) { margin-top: 0; }',
  ':where(blockquote p:last-child) { margin-bottom: 0; }',
  ':where(blockquote blockquote) { background: var(--mdvr-accent-soft); }',
  // 表格：表头主题 tint + 强调字 + 700；外框+横线式，无单元格边框，无斑马纹
  ':where(table) { display: block; overflow-x: auto; width: max-content; max-width: 100%; border-collapse: collapse; border-spacing: 0; margin: 1em 0; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l2); font-size: 0.92em; word-break: auto-phrase; }',
  ':where(th, td) { min-width: 120px; padding: 0.75em 1em; text-align: start; }',
  ':where(th) { background: var(--mdvr-table-head-bg); color: var(--mdvr-table-head-text); font-weight: 700; }',
  ':where(tr) { box-shadow: 0 1px 0 var(--dsw-alias-border-l1); }',
  ':where(tr:last-child) { box-shadow: none; }',
  // 分割线：主题色 30% 虚线（弱化但可见）
  ':where(hr) { border: none; border-top: 1px dashed var(--mdvr-accent-fainter); margin: 1.8em 0; }',
  // 链接：公共信息蓝 + hover 过渡（尊重 reduced-motion）
  ':where(a) { color: var(--mdvr-link); text-decoration: none; }',
  ':where(a:hover) { color: var(--mdvr-link-hover); }',
  '@media (prefers-reduced-motion: no-preference) { :where(a) { transition: color 200ms cubic-bezier(0.05, 0.7, 0.1, 1); } }',
  // 强调/细节：strong 中性 700（浓度强调，保护链接蓝信号）；mark 琥珀 tint；kbd 保持中性
  ':where(strong) { font-weight: 700; color: var(--dsw-alias-label-primary); }',
  ':where(mark) { background: var(--mdvr-highlight-soft); color: var(--dsw-alias-label-primary); padding: 0 0.2em; border-radius: 3px; }',
  ':where(del) { color: var(--dsw-alias-label-secondary); }',
  ':where(sup, sub) { font-size: 0.75em; line-height: 1; }',
  ':where(kbd) { font-family: var(--mdvr-mono); font-size: 0.85em; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 0.15em 0.45em; }',
  ':where(img) { max-width: 100%; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l1); }',
].join('\n')

// ---------- §5 面板与设置页样式（插件自有组件，普通类选择器） ----------
const PANEL_CSS = [
  // 版本卡片
  '.mdvr-card { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); font-size: 13px; line-height: 1.6; }',
  '.mdvr-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
  '.mdvr-title { font-weight: 650; font-size: 13px; }',
  '.mdvr-badge { font-family: var(--mdvr-mono, ui-monospace, Menlo, Consolas, monospace); font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--mdvr-accent, #5856d6); color: #ffffff; }',
  '.mdvr-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; opacity: 0.9; }',
  '.mdvr-changes { margin: 2px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-changes li { margin: 2px 0; }',
  '.mdvr-hist { border-top: 1px dashed var(--mdvr-accent-fainter, #cdccf3); padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-hist-title { font-size: 11px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: 0.05em; }',
  '.mdvr-hist-item { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }',
  '.mdvr-tag { font-family: var(--mdvr-mono, ui-monospace, Menlo, Consolas, monospace); font-size: 10px; flex: none; }',
  // 主题设置页
  '.mdvr-themes { display: flex; flex-direction: column; gap: 8px; }',
  '.mdvr-themes-title { font-size: 12px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-themes-title-gap { margin-top: 6px; }',
  // 外观模式三档按钮（浅色 / 深色 / 跟随系统；第三方主题激活时禁用变灰）
  '.mdvr-schemes { display: flex; gap: 6px; }',
  '.mdvr-scheme-btn { flex: 1; padding: 6px 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; font-size: 12px; color: var(--dsw-alias-label-primary); }',
  '.mdvr-scheme-btn:hover:not(:disabled) { border-color: var(--mdvr-accent-faint, #b4b3ed); }',
  '.mdvr-scheme-btn:disabled { opacity: 0.45; cursor: not-allowed; }',
  '.mdvr-scheme-btn-active { border-color: var(--mdvr-accent, #5856d6); box-shadow: 0 0 0 1px var(--mdvr-accent, #5856d6); font-weight: 650; }',
  '.mdvr-theme-card { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; text-align: left; font-size: 13px; color: var(--dsw-alias-label-primary); }',
  '.mdvr-theme-card:hover { border-color: var(--mdvr-accent-faint, #b4b3ed); }',
  '.mdvr-theme-card-active { border-color: var(--mdvr-accent, #5856d6); box-shadow: 0 0 0 1px var(--mdvr-accent, #5856d6); }',
  '.mdvr-theme-swatches { display: flex; gap: 4px; }',
  '.mdvr-theme-swatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--dsw-alias-border-l1); }',
  '.mdvr-theme-info { display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-theme-name { font-weight: 650; }',
  '.mdvr-theme-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); }',
  // 用户主题区（刷新按钮）
  '.mdvr-user-actions { display: flex; align-items: center; gap: 8px; }',
  '.mdvr-refresh-btn { padding: 4px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; font-size: 12px; color: var(--dsw-alias-label-primary); }',
  '.mdvr-refresh-btn:hover { border-color: var(--mdvr-accent-faint, #b4b3ed); }',
].join('\n')

// ---------- §6 选择引擎 ----------
// 运行时状态（函数体作用域，进程内有效）
let rootCtx = null            // apply() 注入的 ctx 引用（供设置页切换时使用）
let activeSelection = DEFAULT_SELECTION  // 当前选择：'system-native'、内置主题 id 或 'user:<id>'
let themeDisposer = null      // 当前样式表清理函数
let themeService = null       // 产品 theme 服务（外观模式三档切换用，可选）
let userThemes = {}           // 用户主题缓存：id → { css }（来自 ~/.dsh/mdvr-themes，动态加载）
let userThemeIds = []         // 用户主题 id 列表（目录顺序）

// 从 Host 加载用户主题（~/.dsh/mdvr-themes/*.css；放文件即新主题，无需打包升级）
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

// 从主题 CSS 文本提取色板预览（浅色档 4 色：底色/抬升面/品牌色/强调色；取不到返回空）
function parseThemeSwatches(css) {
  const grab = (name) => {
    const m = css.match(new RegExp(name + '\\s*:\\s*([^;]+);'))
    return m ? m[1].trim() : null
  }
  return [grab('--dsw-alias-bg-base'), grab('--dsw-alias-bg-layer-1'), grab('--dsw-alias-brand-primary'), grab('--mdvr-accent')].filter(Boolean)
}

// 应用选择：注入 骨架 + 主题 CSS + 面板样式（先卸旧表再注入）
// 'system-native'（系统自带）：插件零干预，只注入 PANEL_CSS（插件自有 UI），产品界面 100% 出厂观感
// 内置第三方主题 / 'user:<id>' 用户主题：注入 TYPO_CSS + 主题 CSS + PANEL_CSS（均无深浅之分）
// 说明：token 与强调变量都直接写在主题 CSS 的 body / body[data-ds-dark-theme] 上，
//       与产品挂载机制一致（注入顺序晚于产品样式表 → 同选择器后者胜出）；
//       切换时旧样式表整体卸载 → 产品观感随之恢复。
function applySelection(ctx, id) {
  if (themeDisposer) { themeDisposer(); themeDisposer = null }
  if (id === 'system-native') {
    // 系统自带：不做任何主题动作（深浅跟随系统，外观三档按钮可用）
    themeDisposer = styles.insert(PANEL_CSS)
  } else if (id.indexOf('user:') === 0) {
    // 用户主题（~/.dsh/mdvr-themes）：动态加载，与内置第三方一样无深浅之分
    const entry = userThemes[id.slice(5)]
    if (!entry) return
    themeDisposer = styles.insert(TYPO_CSS + '\n' + entry.css + '\n' + PANEL_CSS)
  } else {
    const entry = THEMES[id]
    if (!entry) return
    themeDisposer = styles.insert(TYPO_CSS + '\n' + entry.css + '\n' + PANEL_CSS)
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

// ---------- §7 组件 ----------
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

// 主题设置页：外观模式 + 选择（系统自带 / 内置主题 / 用户主题）
// 选择模型（v0.9.0 + v1.0.0）：
//   - 「系统自带」= 默认：插件零干预，深浅跟随系统，☀️/🌙/🖥️ 三档可用
//   - 内置第三方主题 & 用户主题：无深浅之分 —— 选中后三档按钮变灰禁用（除非回到「系统自带」）
//   - 用户主题：~/.dsh/mdvr-themes/ 放 CSS 文件 + 点「刷新」即生效，无需打包升级
//   - 各组互斥（单选），点击即切换
function ThemeSettings() {
  const [sel, setSel] = React.useState(activeSelection)
  const [scheme, setSchemeState] = React.useState(readScheme())
  const [userIds, setUserIds] = React.useState([])
  const isSystem = sel === 'system-native'
  const entries = Object.keys(THEMES).map((id) => ({ id, meta: THEME_META[id] || { name: id, desc: '', swatches: [] } }))
  const schemeOptions = [
    ['light', '☀️ 浅色'],
    ['dark', '🌙 深色'],
    ['system', '🖥️ 跟随系统'],
  ]
  // 系统自带卡片的色板预览（DSH 出厂色）
  const systemSwatches = ['#ffffff', '#f9fafb', '#0f1115', '#5686fe']

  // 挂载时加载用户主题
  React.useEffect(() => {
    let alive = true
    loadUserThemes().then((ids) => { if (alive) setUserIds(ids) })
    return () => { alive = false }
  }, [])

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
    // 内置第三方主题（无深浅之分）
    React.createElement('div', { className: 'mdvr-themes-title mdvr-themes-title-gap' }, '内置主题（无深浅之分）'),
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
    // 用户主题（~/.dsh/mdvr-themes/：放 CSS 文件即新主题，点刷新生效）
    React.createElement('div', { className: 'mdvr-themes-title mdvr-themes-title-gap' }, '用户主题（~/.dsh/mdvr-themes/）'),
    React.createElement('div', { className: 'mdvr-user-actions' },
      React.createElement('button', {
        className: 'mdvr-refresh-btn',
        onClick: () => { loadUserThemes().then((ids) => setUserIds(ids)) },
      }, '🔄 刷新用户主题'),
      React.createElement('span', { className: 'mdvr-themes-title' }, '放入 CSS 文件后点刷新即生效'),
    ),
    userIds.length === 0 && React.createElement('div', { className: 'mdvr-themes-title' }, '（暂无用户主题）'),
    userIds.map((id) => {
      const entry = userThemes[id]
      const selUser = sel === 'user:' + id
      const swatches = entry ? parseThemeSwatches(entry.css) : []
      return React.createElement('button', {
        key: id,
        className: 'mdvr-theme-card' + (selUser ? ' mdvr-theme-card-active' : ''),
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
          React.createElement('span', { className: 'mdvr-theme-desc' }, '用户主题：~/.dsh/mdvr-themes/' + id + '.css'),
        ),
      )
    }),
  )
}

// ---------- §8 插件入口 ----------
return {
  apply(ctx) {
    rootCtx = ctx
    // 捕获产品 theme 服务（外观三档切换用；可选，缺失时按钮自动禁用）
    const themeSvc = ctx.get('theme')
    if (themeSvc !== undefined) themeService = themeSvc
    // 按配置应用默认选择（DEFAULT_SELECTION = 'system-native'，插件零干预）
    applySelection(ctx, DEFAULT_SELECTION)
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
