// ============================================================
// Host 半 — 版本台账
// 职责：维护内存台账（按 packageId 去重）、提供 RPC
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
