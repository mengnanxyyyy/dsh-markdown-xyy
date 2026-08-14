// Host half v0.4.0 — 版本台账（镜像 mdvr-1/pkg-3，与 Harness 定义保持一致）
// v0.4.0：Markdown 重点信息强调色系统（靛蓝 accent + 琥珀 highlight）
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
