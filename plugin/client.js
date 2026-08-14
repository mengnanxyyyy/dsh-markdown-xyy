// Client half v0.2.0 — 主题 + Markdown 排版 + 版本面板（镜像 mdvr-1/pkg-1，与 Harness 定义保持一致）
// v0.2.0 对标 LobeUI 的细节改动，详见 docs/lobeui-synthesis.md

const MANIFEST = {
  version: '0.2.0',
  name: '墨纸 · InkPaper',
  palette: 'inkpaper',
  date: '2026-08-14',
  changes: [
    '对标 LobeUI：深色近黑、表面分层拉开、语义色解耦（success/warn 取 lobe step9）',
    '字体栈：Markdown 作用域注入中文友好 sans 栈 + 等宽栈（JetBrains Mono 优先）',
    '排版节奏：段落首尾去空 + 段间 1em、行高 1.8、字距 0.02em',
    '标题阶梯 2/1.6/1.3/1.15/1、700、行高 1.25',
    '行内 code 胶囊化（1px 边框）；代码块内描边 + 圆角 8px + padding 16px',
    '表格改外框+横线式（无单元格边框、min-width 120px、横向滚动）',
    'hr 虚线、引用 4px 边条、列表自定义符号、图片内描边、链接 hover 过渡',
  ],
}

// ---------- 1) 字体栈（LobeUI 结构 + 暖纸身份） ----------
const FONT_SANS = [
  '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"',
  '"PingFang SC"', '"Hiragino Sans GB"', '"HarmonyOS Sans SC"',
  '"Microsoft YaHei"', '"Source Han Sans SC"', '"Noto Sans CJK SC"',
  '"Helvetica Neue"', 'Arial', 'sans-serif',
  '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Noto Color Emoji"',
].join(', ')
const FONT_MONO = [
  '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', '"SF Mono"',
  'Menlo', '"Cascadia Code"', 'Consolas', '"Liberation Mono"', 'monospace',
].join(', ')

// ---------- 2) 主题层：墨纸 InkPaper v0.2.0（宣纸 light / 玄夜 dark） ----------
// 结构修正：深色近黑、表面分层拉开、边框加深、语义色解耦（详见 docs/lobeui-synthesis.md）
const TOKENS = {
  '--dsw-alias-bg-base': { light: '#faf6ef', dark: '#14120f' },
  '--dsw-alias-bg-layer-1': { light: '#f2ece0', dark: '#1d1915' },
  '--dsw-alias-bg-layer-2': { light: '#e9e1d0', dark: '#28231d' },
  '--dsw-alias-bg-overlay': { light: '#fffdf8', dark: '#211c17' },
  '--dsw-alias-border-l1': { light: '#dbcfb3', dark: '#3a342b' },
  '--dsw-alias-border-l2': { light: '#c6b68f', dark: '#4a4132' },
  '--dsw-alias-brand-primary': { light: '#8a5a2b', dark: '#d9a15c' },
  '--dsw-alias-label-primary': { light: '#292113', dark: '#efe8da' },
  '--dsw-alias-label-secondary': { light: '#71664f', dark: '#a8a08c' },
  '--dsw-alias-state-error-primary': { light: '#b23a30', dark: '#f4416c' },
  '--dsw-alias-state-success-primary': { light: '#379d4a', dark: '#62c473' },
  '--dsw-alias-state-warn-primary': { light: '#b77900', dark: '#ee9e0b' },
  '--dsw-specific-sidebar-fill': { light: '#ece4d5', dark: '#1a1612' },
}

// ---------- 3) 排版层 v0.2.0（:where() 零优先级，产品显式样式胜出） ----------
const TYPO_CSS = [
  // 全局自定义属性（命名空间 --mdvr-*，不影响产品）
  ':root { --mdvr-sans: ' + FONT_SANS + '; --mdvr-mono: ' + FONT_MONO + '; --mdvr-mm: 2; }',
  // 基线：行高 1.8（中文友好）+ 断字
  ':where(p, ul, ol, blockquote, pre, table, li) { line-height: 1.8; overflow-wrap: break-word; }',
  ':where(p, ul, ol, blockquote, pre, table, h1, h2, h3, h4, h5, h6, li, td, th, a) { font-family: var(--mdvr-sans); }',
  // 段落：首尾去空 + 段间 1em（倍数制节奏）
  ':where(p) { margin: 0; letter-spacing: 0.02em; }',
  ':where(p:not(:first-child)) { margin-top: 1em; }',
  ':where(p:not(:last-child)) { margin-bottom: 1em; }',
  // 标题：阶梯 2/1.6/1.3/1.15/1、700、1.25（h1 下边框为产品签名）
  ':where(h1, h2, h3, h4, h5, h6) { line-height: 1.25; font-weight: 700; margin: 1.1em 0 0.6em; }',
  ':where(h1) { font-size: 2em; padding-bottom: 0.35em; border-bottom: 1px solid var(--dsw-alias-border-l1); }',
  ':where(h2) { font-size: 1.6em; }',
  ':where(h3) { font-size: 1.3em; }',
  ':where(h4) { font-size: 1.15em; }',
  ':where(h5) { font-size: 1em; }',
  ':where(h6) { font-size: 0.9em; color: var(--dsw-alias-label-secondary); }',
  // 列表：margin 1em + 自定义符号（LobeUI 模式）
  ':where(ul, ol) { margin: 1em 0; margin-left: 1em; padding-left: 0; list-style-position: outside; }',
  ':where(ul) { list-style-type: none; }',
  ':where(ul > li::before) { content: "·"; margin-inline: -1em 0.5em; color: var(--dsw-alias-brand-primary); opacity: 0.6; }',
  ':where(li) { margin: 0.4em 0; }',
  ':where(li p:first-child) { display: inline; }',
  ':where(li.task-list-item) { list-style: none; }',
  ':where(input[type="checkbox"]) { margin: 0 0.4em 0.2em 0; vertical-align: middle; }',
  // 行内 code：胶囊化（1px 边框 + lh 1）
  ':where(code, samp) { font-family: var(--mdvr-mono); font-size: 0.875em; line-height: 1; padding: 0.1em 0.4em; margin-inline: 0.15em; border: 1px solid var(--dsw-alias-border-l1); border-radius: 0.25em; background: var(--dsw-alias-bg-layer-2); white-space: break-spaces; overflow-wrap: break-word; }',
  // 代码块：内描边 + 8px + 固定 16px
  ':where(pre) { margin: 1em 0; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; padding: 16px; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); overflow-x: auto; font-size: 0.85em; line-height: 1.6; font-variant-ligatures: none; }',
  ':where(pre code) { background: transparent; border: none; padding: 0; margin: 0; font-size: inherit; line-height: inherit; white-space: pre; }',
  // 引用：4px 品牌边条 + 卡片底（产品签名）+ 次文字色
  ':where(blockquote) { margin: 1em 0; padding: 0.4em 1em; border-left: 4px solid var(--dsw-alias-brand-primary); border-radius: 0 8px 8px 0; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); }',
  ':where(blockquote p:first-child) { margin-top: 0; }',
  ':where(blockquote p:last-child) { margin-bottom: 0; }',
  ':where(blockquote blockquote) { background: var(--dsw-alias-bg-layer-2); }',
  // 表格：外框 + 横线式，无单元格边框（LobeUI 模式）
  ':where(table) { display: block; overflow-x: auto; width: max-content; max-width: 100%; border-collapse: collapse; border-spacing: 0; margin: 1em 0; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l2); font-size: 0.92em; word-break: auto-phrase; }',
  ':where(th, td) { min-width: 120px; padding: 0.75em 1em; text-align: start; }',
  ':where(th) { background: var(--dsw-alias-bg-layer-1); font-weight: 600; }',
  ':where(tr) { box-shadow: 0 1px 0 var(--dsw-alias-border-l1); }',
  ':where(tr:last-child) { box-shadow: none; }',
  // 分割线：虚线（LobeUI）
  ':where(hr) { border: none; border-top: 1px dashed var(--dsw-alias-border-l2); margin: 1.8em 0; }',
  // 链接：品牌色 + hover 下划线 + 200ms 过渡（尊重 reduced-motion）
  ':where(a) { color: var(--dsw-alias-brand-primary); text-decoration: none; }',
  ':where(a:hover) { text-decoration: underline; }',
  '@media (prefers-reduced-motion: no-preference) { :where(a) { transition: color 200ms cubic-bezier(0.05, 0.7, 0.1, 1); } }',
  // 强调 / 细节
  ':where(strong) { font-weight: 600; }',
  ':where(del) { color: var(--dsw-alias-label-secondary); }',
  ':where(sup, sub) { font-size: 0.75em; line-height: 1; }',
  ':where(kbd) { font-family: var(--mdvr-mono); font-size: 0.85em; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 0.15em 0.45em; }',
  ':where(img) { max-width: 100%; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l1); }',
].join('\n')

// ---------- 4) 版本面板样式（自有组件，普通类选择器，圆角统一 8px） ----------
const PANEL_CSS = [
  '.mdvr-card { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); font-size: 13px; line-height: 1.6; }',
  '.mdvr-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
  '.mdvr-title { font-weight: 650; font-size: 13px; }',
  '.mdvr-badge { font-family: var(--mdvr-mono); font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }',
  '.mdvr-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; opacity: 0.9; }',
  '.mdvr-changes { margin: 2px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-changes li { margin: 2px 0; }',
  '.mdvr-hist { border-top: 1px dashed var(--dsw-alias-border-l1); padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-hist-title { font-size: 11px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: 0.05em; }',
  '.mdvr-hist-item { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }',
  '.mdvr-tag { font-family: var(--mdvr-mono); font-size: 10px; flex: none; }',
].join('\n')

// ---------- 版本卡片组件 ----------
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

// ---------- 插件入口 ----------
return {
  inject: ['theme'],
  apply(ctx) {
    const slots = ctx.get('slots')

    // 主题层：同 source 重调 = 整层替换并置顶；Fiber 卸载自动撤销
    ctx.effect(() => ctx.theme.overrideTokens('md-inkpaper', TOKENS))
    // 排版层：包级样式表，卸载自动清理
    ctx.effect(() => styles.insert(TYPO_CSS + '\n' + PANEL_CSS))

    if (slots === undefined) return
    slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      (props) => React.createElement(VersionCard, { pluginId: props.pluginId || '', packageId: props.packageId, manifest: MANIFEST }),
    ))
  },
}
