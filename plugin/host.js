// ============================================================
// Host half v0.5.0 — 版本台账（镜像 mdvr-1/pkg-4，与 Harness 定义保持一致）
//
// 【职责】
//   维护内存台账（按 packageId 去重、最新在前）
//   versions.note —— Client 面板挂载时上报自身 MANIFEST → 记账
//   versions.list —— 面板查询台账快照 { current, history }
//   只传 JSON 标量，不序列化任何 Cordis/DSH 活对象
// ============================================================

const MANIFEST = {
  version: '0.5.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme',
  date: '2026-08-14',
  changes: [
    '主题系统化：全部可定制 CSS 收敛为主题注册表（13 token + --mdvr-* 变量 + 每主题扩展 CSS），全量注释',
    '内置 3 主题：lobeui-emphasis（默认）/ inkpaper（暖纸）/ qingci（青瓷）',
    '设置页「主题设置」：卡片式切换（会话级内存态，默认 ACTIVE_THEME 可配置）',
    '切换引擎：token 层整层替换 + 样式表重建，卸载自动清理',
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
