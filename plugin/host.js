// ============================================================
// Host half v1.0.0 — 版本台账 + 用户主题读取（镜像 mdvr-1/pkg-9，与 Harness 定义保持一致）
//
// 【职责】
//   维护内存台账（按 packageId 去重、最新在前）
//   versions.note —— Client 面板挂载时上报自身 MANIFEST → 记账
//   versions.list —— 面板查询台账快照 { current, history }
//   themes.user.list —— 列出用户主题（~/.dsh/mdvr-themes/*.css，动态添加无需打包）
//   themes.user.get —— 读取指定用户主题的 CSS 内容
//   只传 JSON 标量，不序列化任何 Cordis/DSH 活对象
// ============================================================

// 用户主题目录：用户在此放置 *.css 即成为新主题（无需升级插件）
// 说明：DSH_HOME 无现成插件配置目录，本插件约定此专属目录（见 AGENTS.md）
const USER_THEMES_DIR = '/home/lab/.dsh/mdvr-themes'

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

    // 列出用户主题 id（~/.dsh/mdvr-themes 下 *.css 文件名，动态添加无需打包）
    harness.handle('themes.user.list', async () => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable', themes: [] }
      try {
        const dir = await fsSvc.resolve(USER_THEMES_DIR)
        const entries = await fsSvc.listDir(dir)
        const themes = entries
          .filter((e) => e.name && e.name.endsWith('.css'))
          .map((e) => e.name.replace(/\.css$/, ''))
          .sort()
        return { ok: true, themes }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e), themes: [] }
      }
    })

    // 读取指定用户主题的 CSS 内容（id 防路径穿越：不含 / 与 \，且非 ..）
    harness.handle('themes.user.get', async (args) => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable' }
      const id = args && args.id
      if (!id || id.indexOf('/') >= 0 || id.indexOf('\\') >= 0 || id === '..') {
        return { ok: false, reason: 'bad id' }
      }
      try {
        const target = await fsSvc.resolve(USER_THEMES_DIR + '/' + id + '.css')
        const css = await fsSvc.readText(target)
        return { ok: true, css }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
    })

    console.log('[mdvr] host ledger ready, manifest v' + MANIFEST.version)
  },
}
