// ============================================================
// Host half v1.2.0 — 版本台账 + 主题资产/用户主题读写
//
// 【职责】
//   维护内存台账（按 packageId 去重、最新在前）
//   versions.note —— Client 面板挂载时上报自身 MANIFEST → 记账
//   versions.list —— 面板查询台账快照 { current, history }
//   themes.builtin.list —— 列出内置主题（工作区 themes/*.css，文件即主题，改文件刷新即生效）
//   themeAssets.get —— 读取共享资产（plugin/assets/{typography,panel,template}.css）
//   themes.user.list / get / save —— 用户主题（$HOME/.dsh/web-themes/*.css）
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

// 工作区根目录（内置主题与共享资产所在）：来自 sandboxPolicy.workspaceRoot
async function resolveWorkspaceRoot(ctx) {
  try {
    const sp = ctx.get('sandboxPolicy')
    if (sp && typeof sp.workspaceRoot === 'string' && sp.workspaceRoot.length > 0) {
      return sp.workspaceRoot
    }
  } catch (e) { /* 忽略 */ }
  return null
}

const MANIFEST = {
  version: '1.2.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-14',
  changes: [
    '用户主题管理：新建（模板）/ 编辑（语法高亮 + 一键格式化 + 保存回写）按钮；内置主题只读，编辑仅限用户主题',
    '主题资产文件化：内置主题/排版骨架/面板样式/新建模板改为 Host 从文件读取（改文件即生效，无需升级插件）',
    'Host 新增 themes.builtin.list / themeAssets.get / themes.user.save RPC',
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

    // 列出内置主题（工作区 themes/*.css；文件即主题，改文件后刷新/重启插件即生效，无需升级）
    harness.handle('themes.builtin.list', async () => {
      const fsSvc = ctx.get('fs')
      const root = await resolveWorkspaceRoot(ctx)
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or workspace unavailable', themes: [] }
      }
      try {
        const dir = await fsSvc.resolve(root + '/themes')
        const entries = await fsSvc.listDir(dir)
        const themes = []
        for (const e of entries
          .filter((x) => x.name && x.name.endsWith('.css'))
          .sort((a, b) => (a.name < b.name ? -1 : 1))) {
          const id = e.name.replace(/\.css$/, '')
          try {
            const css = await fsSvc.readText(await fsSvc.resolve(dir + '/' + e.name))
            themes.push({ id, css })
          } catch (err) { /* 单个文件读取失败则跳过 */ }
        }
        return { ok: true, themes }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e), themes: [] }
      }
    })

    // 共享资产：排版骨架 / 面板样式 / 新建模板（plugin/assets/*.css）
    harness.handle('themeAssets.get', async () => {
      const fsSvc = ctx.get('fs')
      const root = await resolveWorkspaceRoot(ctx)
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or workspace unavailable' }
      }
      const read = async (name) => {
        try {
          return await fsSvc.readText(await fsSvc.resolve(root + '/plugin/assets/' + name))
        } catch (e) {
          return null
        }
      }
      const typography = await read('typography.css')
      const panel = await read('panel.css')
      if (typography === null || panel === null) {
        return { ok: false, reason: 'assets missing' }
      }
      return { ok: true, typography, panel, template: (await read('template.css')) || '' }
    })

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

    // 保存 / 新建用户主题：写回 $HOME/.dsh/web-themes/<id>.css
    // 说明：用户主题目录在 ~/.dsh（工作区外），写操作需放开沙箱策略；
    //       id 防路径穿越，css 限长防滥用
    harness.handle('themes.user.save', async (args) => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable' }
      const id = args && args.id
      const css = args && args.css
      if (!id || id.indexOf('/') >= 0 || id.indexOf('\\') >= 0 || id === '..') {
        return { ok: false, reason: 'bad id' }
      }
      if (typeof css !== 'string' || css.length > 200000) {
        return { ok: false, reason: 'bad css' }
      }
      try {
        const dir = await resolveUserThemesDir(ctx)
        // 目录不存在时尽力创建（幂等；shell 可能受限，失败则由 writeText 报错）
        try {
          const dirStat = await fsSvc.stat(dir)
          if (!dirStat) {
            const shellSvc = ctx.get('shell')
            if (shellSvc !== undefined) {
              const safe = "'" + dir.replace(/'/g, "'\\''") + "'"
              await shellSvc.run(shellSvc.resolve({ command: 'mkdir -p ' + safe }))
            }
          }
        } catch (e) { /* 忽略 */ }
        // 用户主动编辑自己的主题文件 → 显式放开沙箱策略
        const policySvc = ctx.get('sandboxPolicy')
        const policy = policySvc !== undefined
          ? policySvc.resolve({ mode: 'danger-full-access' })
          : undefined
        const target = await fsSvc.resolve(dir + '/' + id + '.css')
        await fsSvc.writeText(target, css, undefined, undefined, policy)
        return { ok: true }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
    })

    console.log('[mdvr] host ledger ready, manifest v' + MANIFEST.version)
  },
}
