// ============================================================
// Client half v0.7.0 — 主题系统（CSS 文件驱动）+ Markdown 排版 + 版本面板
//
// ⚠️ 本文件由 scripts/build-client.js 生成 —— THEMES 部分禁止手改！
//    主题定义在 themes/*.css（每主题一个 CSS 文件），修改后运行：
//      node scripts/build-client.js
//    逻辑部分源文件：plugin/src/client.core.js
//
// 【文件结构总览】
//   §1 配置区        —— MANIFEST / ACTIVE_THEME（默认主题）
//   §2 主题元信息    —— THEME_META（显示名/描述/色板预览）
//   §3 主题注册表    —— THEMES（由构建脚本从 themes/*.css 生成，勿手改）
//   §4 共享排版骨架  —— TYPO_CSS（只引用 var(--dsw-alias-*) / var(--mdvr-*)）
//   §5 面板与设置页样式 —— PANEL_CSS
//   §6 主题切换引擎  —— activateTheme（注入主题 CSS + 骨架 + 面板）
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
  version: '0.7.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-14',
  changes: [
    '新增「原生」主题（themes/native.css）：完全不注入插件样式（不覆盖 token、不注入排版骨架、不定义变量），一键恢复 DSH 出厂观感',
    '面板样式变量加回退值：原生模式下插件自有 UI（版本卡片/主题设置页）仍正常渲染',
    '切换引擎支持原生分支：原生主题仅注入 PANEL_CSS，离开时自动卸载全部插件样式',
  ],
}

// 默认主题 id（设置页切换为会话级内存态，刷新/重启后恢复此值）
const ACTIVE_THEME = 'lobeui-emphasis'

// ---------- §2 主题元信息（显示名/描述/色板预览；CSS 内容在 §3） ----------
const THEME_META = {
  'native': {
    name: '原生（无插件样式）',
    desc: '完全恢复 DSH 出厂观感：不覆盖 token、不注入排版',
    swatches: ['#ffffff', '#f9fafb', '#0f1115', '#5686fe'],
    native: true, // 原生模式标记：运行时只注入 PANEL_CSS，跳过 TYPO_CSS 与主题 CSS
  },
  'demo': {
    name: 'DSH 默认',
    desc: 'DSH 出厂观感（全元素目录参考）',
    swatches: ['#ffffff', '#f9fafb', '#0f1115', '#5686fe'],
  },
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
  '.mdvr-theme-card { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; text-align: left; font-size: 13px; color: var(--dsw-alias-label-primary); }',
  '.mdvr-theme-card:hover { border-color: var(--mdvr-accent-faint, #b4b3ed); }',
  '.mdvr-theme-card-active { border-color: var(--mdvr-accent, #5856d6); box-shadow: 0 0 0 1px var(--mdvr-accent, #5856d6); }',
  '.mdvr-theme-swatches { display: flex; gap: 4px; }',
  '.mdvr-theme-swatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--dsw-alias-border-l1); }',
  '.mdvr-theme-info { display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-theme-name { font-weight: 650; }',
  '.mdvr-theme-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); }',
].join('\n')

// ---------- §6 主题切换引擎 ----------
// 运行时状态（函数体作用域，进程内有效）
let rootCtx = null            // apply() 注入的 ctx 引用（供设置页切换时使用）
let activeThemeId = ACTIVE_THEME  // 当前生效主题 id
let themeDisposer = null      // 当前样式表清理函数

// 激活主题：注入 骨架 + 主题 CSS + 面板样式（先卸旧表再注入）
// 原生模式（THEME_META[id].native）：只注入 PANEL_CSS，不碰产品 token 与排版
// 说明：token 与强调变量都直接写在主题 CSS 的 body / body[data-ds-dark-theme] 上，
//       与产品挂载机制一致（注入顺序晚于产品样式表 → 同选择器后者胜出）；
//       切换主题时旧样式表整体卸载 → 产品观感随之恢复。
function activateTheme(ctx, id) {
  const entry = THEMES[id]
  if (!entry) return
  if (themeDisposer) { themeDisposer(); themeDisposer = null }
  const meta = THEME_META[id] || {}
  if (meta.native) {
    // 原生模式：仅保留插件自有 UI 的最小样式（不影响产品界面）
    themeDisposer = styles.insert(PANEL_CSS)
  } else {
    themeDisposer = styles.insert(TYPO_CSS + '\n' + entry.css + '\n' + PANEL_CSS)
  }
  activeThemeId = id
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

// 主题设置页：主题卡片列表（色板预览 + 名称 + 描述），点击即切换（会话级内存态）
function ThemeSettings() {
  const [active, setActive] = React.useState(activeThemeId)
  const entries = Object.keys(THEMES).map((id) => ({ id, meta: THEME_META[id] || { name: id, desc: '', swatches: [] } }))

  return React.createElement('div', { className: 'mdvr-themes' },
    React.createElement('div', { className: 'mdvr-themes-title' },
      '主题切换（会话级：刷新/重启后恢复默认 ' + ACTIVE_THEME + '）'),
    entries.map(({ id, meta }) => {
      const sel = id === active
      return React.createElement('button', {
        key: id,
        className: 'mdvr-theme-card' + (sel ? ' mdvr-theme-card-active' : ''),
        onClick: () => { activateTheme(rootCtx, id); setActive(id) },
      },
        React.createElement('span', { className: 'mdvr-theme-swatches' },
          (meta.swatches || []).map((c, i) => React.createElement('span', {
            key: i,
            className: 'mdvr-theme-swatch',
            style: { background: c },
          })),
        ),
        React.createElement('span', { className: 'mdvr-theme-info' },
          React.createElement('span', { className: 'mdvr-theme-name' }, meta.name + (sel ? ' ✓' : '')),
          React.createElement('span', { className: 'mdvr-theme-desc' }, meta.desc),
        ),
      )
    }),
  )
}

// ---------- §8 插件入口 ----------
return {
  apply(ctx) {
    rootCtx = ctx
    // 按配置应用默认主题（ACTIVE_THEME）
    activateTheme(ctx, ACTIVE_THEME)
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
