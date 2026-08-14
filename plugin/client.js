// ============================================================
// Client 半 — 主题 + Markdown 排版 + 版本面板
// 职责：
//   1) theme.overrideTokens 叠加 13 个 token（浅色「宣纸」/ 深色「玄夜」）
//   2) styles.insert 注入零优先级排版层（:where()）
//   3) tool.view.cordis (key: self) 渲染版本卡片
// 注意：本文件是当前 Package 的源码镜像，与 Harness 内定义保持一致
// ============================================================

const MANIFEST = {
  version: '0.1.0',
  name: '墨纸 · InkPaper',
  palette: 'inkpaper',
  date: '2026-08-14',
  changes: [
    '搭建快速迭代架构：双半分工 + 版本台账 + 迭代手册',
    '主题层：13 个 token 覆盖（宣纸浅色 / 玄夜深色）',
    'Markdown 排版：标题/列表/代码/引用/表格/分割线基线',
    '版本面板：cordis_run 卡片内显示当前版本与历史台账',
  ],
}

// ---------- 1) 主题层：墨纸 InkPaper（宣纸 light / 玄夜 dark） ----------
const TOKENS = {
  '--dsw-alias-bg-base': { light: '#faf7f1', dark: '#191715' },
  '--dsw-alias-bg-layer-1': { light: '#f3eee4', dark: '#211e1a' },
  '--dsw-alias-bg-layer-2': { light: '#eae3d4', dark: '#2a2621' },
  '--dsw-alias-bg-overlay': { light: '#fdfbf6', dark: '#241f1a' },
  '--dsw-alias-border-l1': { light: '#e3dac6', dark: '#3a342b' },
  '--dsw-alias-border-l2': { light: '#d2c6ac', dark: '#4b4234' },
  '--dsw-alias-brand-primary': { light: '#8a5a2b', dark: '#d9a15c' },
  '--dsw-alias-label-primary': { light: '#2b261e', dark: '#e9e2d4' },
  '--dsw-alias-label-secondary': { light: '#6d6350', dark: '#a39a87' },
  '--dsw-alias-state-error-primary': { light: '#b0452c', dark: '#e0704f' },
  '--dsw-alias-state-success-primary': { light: '#3e7d4c', dark: '#7fb98a' },
  '--dsw-alias-state-warn-primary': { light: '#a97a1d', dark: '#d9a94e' },
  '--dsw-specific-sidebar-fill': { light: '#efe8da', dark: '#1e1b17' },
}

// ---------- 2) 排版层（:where() 零优先级，产品显式样式胜出） ----------
const TYPO_CSS = [
  // 中文友好基线
  ':where(p, ul, ol, blockquote, pre, table) { line-height: 1.75; }',
  ':where(h1, h2, h3, h4, h5, h6) { line-height: 1.35; font-weight: 600; margin: 1.4em 0 0.6em; }',
  ':where(h1) { font-size: 1.5em; padding-bottom: 0.35em; border-bottom: 1px solid var(--dsw-alias-border-l1); }',
  ':where(h2) { font-size: 1.3em; }',
  ':where(h3) { font-size: 1.15em; }',
  ':where(h4) { font-size: 1.05em; }',
  ':where(p) { margin: 0.6em 0; }',
  // 列表
  ':where(ul, ol) { padding-left: 1.6em; margin: 0.6em 0; }',
  ':where(li) { margin: 0.25em 0; }',
  // 代码
  ':where(code) { font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace; font-size: 0.88em; background: var(--dsw-alias-bg-layer-2); padding: 0.15em 0.4em; border-radius: 4px; }',
  ':where(pre) { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 0.9em 1.1em; overflow-x: auto; }',
  ':where(pre code) { background: transparent; padding: 0; font-size: 0.86em; line-height: 1.6; }',
  // 引用 / 链接
  ':where(blockquote) { margin: 0.8em 0; padding: 0.2em 1em; border-left: 3px solid var(--dsw-alias-brand-primary); color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-1); border-radius: 0 8px 8px 0; }',
  ':where(blockquote p) { margin: 0.4em 0; }',
  ':where(a) { color: var(--dsw-alias-brand-primary); text-decoration: none; }',
  ':where(a:hover) { text-decoration: underline; }',
  // 表格
  ':where(table) { border-collapse: collapse; margin: 0.8em 0; width: 100%; font-size: 0.92em; }',
  ':where(th, td) { border: 1px solid var(--dsw-alias-border-l1); padding: 0.45em 0.8em; text-align: left; }',
  ':where(th) { background: var(--dsw-alias-bg-layer-1); font-weight: 600; }',
  ':where(tr:nth-child(even) td) { background: var(--dsw-alias-bg-layer-1); }',
  // 分割线 / kbd / 强调
  ':where(hr) { border: none; border-top: 1px solid var(--dsw-alias-border-l1); margin: 1.4em 0; }',
  ':where(kbd) { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.85em; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 0.1em 0.45em; }',
  ':where(strong) { font-weight: 650; }',
].join('\n')

// ---------- 3) 版本面板样式（自有组件，普通类选择器） ----------
const PANEL_CSS = [
  '.mdvr-card { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); font-size: 13px; line-height: 1.6; }',
  '.mdvr-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
  '.mdvr-title { font-weight: 650; font-size: 13px; }',
  '.mdvr-badge { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); }',
  '.mdvr-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; }',
  '.mdvr-changes { margin: 2px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-changes li { margin: 2px 0; }',
  '.mdvr-hist { border-top: 1px dashed var(--dsw-alias-border-l1); padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-hist-title { font-size: 11px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: 0.05em; }',
  '.mdvr-hist-item { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }',
  '.mdvr-tag { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 10px; flex: none; }',
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
