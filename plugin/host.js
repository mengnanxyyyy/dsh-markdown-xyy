// ============================================================
// Host half v1.1.0 — 版本台账 + 用户主题读取（镜像 mdvr-1/pkg-10，与 Harness 定义保持一致）
//
// 【职责】
//   维护内存台账（按 packageId 去重、最新在前）
//   versions.note —— Client 面板挂载时上报自身 MANIFEST → 记账
//   versions.list —— 面板查询台账快照 { current, history }
//   themes.user.list —— 列出用户主题（$HOME/.dsh/web-themes/*.css，动态添加无需打包）
//   themes.user.get —— 读取指定用户主题的 CSS 内容
//   只传 JSON 标量，不序列化任何 Cordis/DSH 活对象
// ============================================================

// 用户主题目录：按系统用户目录动态拼接 $HOME/.dsh/web-themes（不硬编码）
// 解析策略（三级回退）：
//   1) shell 服务执行 printf %s "$HOME" —— 系统真实用户目录
//   2) sandboxPolicy.workspaceRoot 推导（/home/<user>/... → /home/<user>）
//   3) 硬编码回退（本部署环境已知路径）
const FALLBACK_USER_THEMES_DIR = '/home/lab/.dsh/web-themes'
let userThemesDir = null // 首次解析后缓存

async function resolveUserThemesDir(ctx) {
  if (userThemesDir) return userThemesDir
  // 1) 系统用户目录：shell 读取 $HOME
  try {
    const shellSvc = ctx.get('shell')
    if (shellSvc !== undefined) {
      const spec = shellSvc.resolve({ command: 'printf %s "$HOME"' })
      const res = await shellSvc.run(spec)
      const raw = res ? (res.stdout !== undefined ? res.stdout : (res.output !== undefined ? res.output : '')) : ''
      const home = String(raw).trim()
      if (home.startsWith('/')) {
        userThemesDir = home + '/.dsh/web-themes'
        return userThemesDir
      }
    }
  } catch (e) { /* 忽略，走下一步回退 */ }
  // 2) 由 workspaceRoot 推导用户目录（/home/<user>/workspace → /home/<user>）
  try {
    const sp = ctx.get('sandboxPolicy')
    if (sp && typeof sp.workspaceRoot === 'string') {
      const parts = sp.workspaceRoot.split('/')
      if (parts.length >= 3 && parts[1] === 'home') {
        userThemesDir = '/' + parts[1] + '/' + parts[2] + '/.dsh/web-themes'
        return userThemesDir
      }
    }
  } catch (e) { /* 忽略 */ }
  // 3) 最终回退
  userThemesDir = FALLBACK_USER_THEMES_DIR
  return userThemesDir
}

const MANIFEST = {
  version: '1.1.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-14',
  changes: [
    '用户主题目录改为系统动态解析：$HOME/.dsh/web-themes（shell 读 $HOME 优先，回退 workspaceRoot 推导，再回退硬编码）',
    '用户主题目录更名：mdvr-themes → web-themes',
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

    // 列出用户主题 id（$HOME/.dsh/web-themes 下 *.css 文件名，动态添加无需打包）
    harness.handle('themes.user.list', async () => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable', themes: [] }
      try {
        const dir = await fsSvc.resolve(await resolveUserThemesDir(ctx))
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
        const target = await fsSvc.resolve((await resolveUserThemesDir(ctx)) + '/' + id + '.css')
        const css = await fsSvc.readText(target)
        return { ok: true, css }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
    })

    console.log('[mdvr] host ledger ready, manifest v' + MANIFEST.version)
  },
}
