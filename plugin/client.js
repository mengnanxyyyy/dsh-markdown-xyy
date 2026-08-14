// Client half v0.4.0 — 主题 + Markdown 排版 + 版本面板（镜像 mdvr-1/pkg-3，与 Harness 定义保持一致）
// v0.4.0：Markdown 重点信息强调色系统（靛蓝 accent + 琥珀 highlight）
// 方案合成：docs/readability-synthesis.md（4 人 subagent 团队研究：竞品/色彩/元素/无障碍）

const MANIFEST = {
  version: '0.4.0',
  name: 'LobeUI 风格',
  palette: 'lobeui-emphasis',
  date: '2026-08-14',
  changes: [
    '强调色彩系统：靛蓝 accent + 琥珀 highlight（--mdvr-* 变量，浅/深双档）',
    '元素强调：引用 tint 底+靛蓝边条、行内代码靛蓝 tint+描边+深蓝字、代码块左侧靛蓝标条、表头 tint+700、h1 靛蓝下划线、列表符号/分割线靛蓝',
    'WCAG AA 实测修正：链接改 #005ae0/#60b1ff；浅档语义色加深 #c74330/#287b38/#985d00',
    'strong 保持中性 700；代码块底色保持中性（为语法高亮留白）；kbd 不上色',
  ],
}

// ---------- 1) 字体栈（LobeUI 原生：Geist 优先 + 中文栈） ----------
const FONT_SANS = [
  'Geist', '-apple-system', 'BlinkMacSystemFont',
  '"Segoe UI Variable Display"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial',
  '"HarmonyOS Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"',
  '"Microsoft YaHei UI"', '"Microsoft YaHei"', '"Source Han Sans SC"', '"Noto Sans CJK SC"',
  'ui-sans-serif', 'system-ui', 'sans-serif',
  '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"',
].join(', ')
const FONT_MONO = [
  '"Geist Mono"', 'ui-monospace', 'SFMono-Regular', '"SF Mono"',
  'Menlo', '"Cascadia Code"', 'Consolas', '"Liberation Mono"', 'monospace',
].join(', ')

// ---------- 2) 主题层：LobeUI 原生配色（浅档语义色按 WCAG AA 加深） ----------
const TOKENS = {
  '--dsw-alias-bg-base': { light: '#f8f8f8', dark: '#000000' },
  '--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#0d0d0d' },
  '--dsw-alias-bg-layer-2': { light: '#f0f0f0', dark: '#1a1a1a' },
  '--dsw-alias-bg-overlay': { light: '#ffffff', dark: '#1a1a1a' },
  '--dsw-alias-border-l1': { light: '#e3e3e3', dark: '#202020' },
  '--dsw-alias-border-l2': { light: '#eeeeee', dark: '#1a1a1a' },
  '--dsw-alias-brand-primary': { light: '#222222', dark: '#eeeeee' },
  '--dsw-alias-label-primary': { light: '#080808', dark: '#ffffff' },
  '--dsw-alias-label-secondary': { light: '#666666', dark: '#aaaaaa' },
  '--dsw-alias-state-error-primary': { light: '#c74330', dark: '#f4416c' },
  '--dsw-alias-state-success-primary': { light: '#287b38', dark: '#c4f042' },
  '--dsw-alias-state-warn-primary': { light: '#985d00', dark: '#ffb224' },
  '--dsw-specific-sidebar-fill': { light: '#f0f0f0', dark: '#101010' },
}

// ---------- 3) 强调色彩系统（--mdvr-* 变量，深色档 @media 覆盖） ----------
// 来源：docs/readability-palette.md（靛蓝/琥珀）+ docs/readability-a11y.md（WCAG 实测修正）
const EMPHASIS_VARS = [
  ':root { --mdvr-sans: ' + FONT_SANS + '; --mdvr-mono: ' + FONT_MONO + '; --mdvr-mm: 2;'
    + ' --mdvr-link: #005ae0; --mdvr-link-hover: #0072f5;'
    + ' --mdvr-accent: #5856d6; --mdvr-accent-text: #1d4ed8; --mdvr-accent-soft: #ebebfa;'
    + ' --mdvr-accent-faint: #b4b3ed; --mdvr-accent-fainter: #cdccf3;'
    + ' --mdvr-highlight: #b3541e; --mdvr-highlight-soft: #fdf0dc;'
    + ' --mdvr-code-border: #d5d2f4;'
    + ' --mdvr-table-head-bg: #edecfb; --mdvr-table-head-text: #3b3aa8;'
    + ' --mdvr-quote-bg: #f2f1fc; --mdvr-quote-border: #5856d6; }',
  '@media (prefers-color-scheme: dark) { :root {'
    + ' --mdvr-link: #60b1ff; --mdvr-link-hover: #a7d3ff;'
    + ' --mdvr-accent: #a8a5f5; --mdvr-accent-text: #7dd3fc; --mdvr-accent-soft: #23222d;'
    + ' --mdvr-accent-faint: #535175; --mdvr-accent-fainter: #3c3b53;'
    + ' --mdvr-highlight: #ffb45e; --mdvr-highlight-soft: #3a2f1e;'
    + ' --mdvr-code-border: #3a3750;'
    + ' --mdvr-table-head-bg: #23222d; --mdvr-table-head-text: #c6c3ff;'
    + ' --mdvr-quote-bg: #1d1c26; --mdvr-quote-border: #8f8bf2; } }',
].join('\n')

// ---------- 4) 排版层 v0.4.0（:where() 零优先级，产品显式样式胜出） ----------
const TYPO_CSS = [
  // 基线：行高 1.8（中文友好）+ 断字
  ':where(p, ul, ol, blockquote, pre, table, li) { line-height: 1.8; overflow-wrap: break-word; }',
  ':where(p, ul, ol, blockquote, pre, table, h1, h2, h3, h4, h5, h6, li, td, th, a) { font-family: var(--mdvr-sans); }',
  // 段落：首尾去空 + 段间 1em（倍数制节奏）
  ':where(p) { margin: 0; letter-spacing: 0.02em; }',
  ':where(p:not(:first-child)) { margin-top: 1em; }',
  ':where(p:not(:last-child)) { margin-bottom: 1em; }',
  // 标题：阶梯 2/1.6/1.3/1.15/1、700、1.25；h1 加 45% 靛蓝下划线（唯一彩色标题元素）
  ':where(h1, h2, h3, h4, h5, h6) { line-height: 1.25; font-weight: 700; margin: 1.1em 0 0.6em; }',
  ':where(h1) { font-size: 2em; padding-bottom: 0.35em; border-bottom: 1px solid var(--mdvr-accent-faint); }',
  ':where(h2) { font-size: 1.6em; }',
  ':where(h3) { font-size: 1.3em; }',
  ':where(h4) { font-size: 1.15em; }',
  ':where(h5) { font-size: 1em; }',
  ':where(h6) { font-size: 0.9em; color: var(--dsw-alias-label-secondary); }',
  // 列表：靛蓝 "-" 符号（opacity .85）
  ':where(ul, ol) { margin: 1em 0; margin-left: 1em; padding-left: 0; list-style-position: outside; }',
  ':where(ul) { list-style-type: none; }',
  ':where(ul > li::before) { content: "-"; margin-inline: -1em 0.5em; color: var(--mdvr-accent); opacity: 0.85; }',
  ':where(li) { margin: 0.4em 0; }',
  ':where(li p:first-child) { display: inline; }',
  ':where(li.task-list-item) { list-style: none; }',
  ':where(input[type="checkbox"]) { margin: 0 0.4em 0.2em 0; vertical-align: middle; }',
  // 行内 code：靛蓝 tint 底 + 靛蓝描边 + 深蓝字（tint 上文字 AA 实测 #1d4ed8 5.72:1）
  ':where(code, samp) { font-family: var(--mdvr-mono); font-size: 0.875em; line-height: 1; padding: 0.1em 0.4em; margin-inline: 0.15em; border: 1px solid var(--mdvr-code-border); border-radius: 0.25em; background: var(--mdvr-accent-soft); color: var(--mdvr-accent-text); white-space: break-spaces; overflow-wrap: break-word; }',
  // 代码块：中性底 + inset 3px 靛蓝左标条（保留给未来语法高亮）
  ':where(pre) { margin: 1em 0; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; padding: 16px; box-shadow: inset 3px 0 0 0 var(--mdvr-accent), inset 0 0 0 1px var(--dsw-alias-border-l1); overflow-x: auto; font-size: 0.85em; line-height: 1.6; font-variant-ligatures: none; }',
  ':where(pre code) { background: transparent; border: none; padding: 0; margin: 0; font-size: inherit; line-height: inherit; white-space: pre; }',
  // 引用：4px 靛蓝边条 + tint 底 + 正文提到 primary（重点块）
  ':where(blockquote) { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid var(--mdvr-quote-border); border-radius: 0 8px 8px 0; background: var(--mdvr-quote-bg); color: var(--dsw-alias-label-primary); }',
  ':where(blockquote p:first-child) { margin-top: 0; }',
  ':where(blockquote p:last-child) { margin-bottom: 0; }',
  ':where(blockquote blockquote) { background: var(--mdvr-accent-soft); }',
  // 表格：表头靛蓝 tint + 靛蓝字 + 700；外框/横线式不变，无斑马纹
  ':where(table) { display: block; overflow-x: auto; width: max-content; max-width: 100%; border-collapse: collapse; border-spacing: 0; margin: 1em 0; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l2); font-size: 0.92em; word-break: auto-phrase; }',
  ':where(th, td) { min-width: 120px; padding: 0.75em 1em; text-align: start; }',
  ':where(th) { background: var(--mdvr-table-head-bg); color: var(--mdvr-table-head-text); font-weight: 700; }',
  ':where(tr) { box-shadow: 0 1px 0 var(--dsw-alias-border-l1); }',
  ':where(tr:last-child) { box-shadow: none; }',
  // 分割线：30% 靛蓝虚线
  ':where(hr) { border: none; border-top: 1px dashed var(--mdvr-accent-fainter); margin: 1.8em 0; }',
  // 链接：信息蓝（AA 修正 #005ae0/#60b1ff）+ 200ms 过渡（尊重 reduced-motion）
  ':where(a) { color: var(--mdvr-link); text-decoration: none; }',
  ':where(a:hover) { color: var(--mdvr-link-hover); }',
  '@media (prefers-reduced-motion: no-preference) { :where(a) { transition: color 200ms cubic-bezier(0.05, 0.7, 0.1, 1); } }',
  // 强调 / 细节：strong 中性 700（浓度强调）；mark 琥珀 tint；kbd 保持中性
  ':where(strong) { font-weight: 700; color: var(--dsw-alias-label-primary); }',
  ':where(mark) { background: var(--mdvr-highlight-soft); color: var(--dsw-alias-label-primary); padding: 0 0.2em; border-radius: 3px; }',
  ':where(del) { color: var(--dsw-alias-label-secondary); }',
  ':where(sup, sub) { font-size: 0.75em; line-height: 1; }',
  ':where(kbd) { font-family: var(--mdvr-mono); font-size: 0.85em; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 0.15em 0.45em; }',
  ':where(img) { max-width: 100%; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l1); }',
].join('\n')

// ---------- 5) 版本面板样式（自有组件，普通类选择器，圆角统一 8px） ----------
const PANEL_CSS = [
  '.mdvr-card { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); font-size: 13px; line-height: 1.6; }',
  '.mdvr-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
  '.mdvr-title { font-weight: 650; font-size: 13px; }',
  '.mdvr-badge { font-family: var(--mdvr-mono); font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--mdvr-accent); color: #ffffff; }',
  '.mdvr-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; opacity: 0.9; }',
  '.mdvr-changes { margin: 2px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-changes li { margin: 2px 0; }',
  '.mdvr-hist { border-top: 1px dashed var(--mdvr-accent-fainter); padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }',
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
    ctx.effect(() => ctx.theme.overrideTokens('md-lobeui', TOKENS))
    // 排版层：强调变量 + 元素规则 + 面板样式，包级样式表，卸载自动清理
    ctx.effect(() => styles.insert(EMPHASIS_VARS + '\n' + TYPO_CSS + '\n' + PANEL_CSS))

    if (slots === undefined) return
    slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      (props) => React.createElement(VersionCard, { pluginId: props.pluginId || '', packageId: props.packageId, manifest: MANIFEST }),
    ))
  },
}
