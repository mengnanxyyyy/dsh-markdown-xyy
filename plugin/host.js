// Host half v0.2.0 — 版本台账（镜像 mdvr-1/pkg-1，与 Harness 定义保持一致）
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

return {
  apply(ctx) {
    const ledger = []

    const record = (entry) => {
      const prev = ledger.find((e) => e.packageId === entry.packageId)
      if (prev) return false
      ledger.unshift(entry)
      return true
    }

    const snapshot = () => ({
      current: ledger[0] || null,
      history: ledger.map((e) => ({ ...e })),
    })

    // Client 面板挂载时上报自身 MANIFEST → 记账
    harness.handle('versions.note', async (args) => {
      const m = args && args.manifest
      if (!m || typeof m.version !== 'string') {
        return { ok: false, reason: 'bad manifest' }
      }
      record({
        pluginId: String((args && args.pluginId) || ''),
        packageId: String((args && args.packageId) || ''),
        version: m.version,
        name: String(m.name || ''),
        palette: String(m.palette || ''),
        date: String(m.date || ''),
        changes: Array.isArray(m.changes) ? m.changes.map(String) : [],
      })
      return { ok: true, total: ledger.length }
    })

    // 面板查询台账快照
    harness.handle('versions.list', async () => snapshot())

    console.log('[mdvr] host ledger ready, manifest v' + MANIFEST.version)
  },
}
