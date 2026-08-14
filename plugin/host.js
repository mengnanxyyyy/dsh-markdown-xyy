// Host half v0.3.0 — 版本台账（镜像 mdvr-1/pkg-2，与 Harness 定义保持一致）
// v0.3.0：放弃「墨纸」暖纸身份，整体替换为 LobeUI 原生设计语言
const MANIFEST = {
  version: '0.3.0',
  name: 'LobeUI 风格',
  palette: 'lobeui',
  date: '2026-08-14',
  changes: [
    '放弃暖纸身份，整体替换为 LobeUI 原生设计语言',
    '配色：中性灰阶（浅 #f8f8f8/#fff，深 #000/#0d0d0d）、主色中性黑 #222（深 #eee）',
    '语义色取 lobe step9：浅 volcano/green/gold、深 red/lime/blue',
    '链接改信息蓝 #0072f5 / #60b1ff（lobe colorLink=colorInfoText）',
    '字体栈换 Geist / Geist Mono 优先（lobe 原生）',
    '引用块去卡片化（4px 中性左边条）、h1 去下边框、列表符号改 "-"',
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
