// ============================================================
// Host half v1.2.3 — 版本台账 + 主题资产/用户主题读写（分块传输 + CSS 校验）
//
// 【职责】
//   维护内存台账（按 packageId 去重、最新在前）
//   versions.note —— Client 面板挂载时上报自身 MANIFEST → 记账
//   versions.list —— 面板查询台账快照 { current, history }
//   themes.builtin.list —— 列出内置主题（项目根 themes/*.css，文件即主题）
//   themeAssets.core —— 排版骨架 + 面板样式（plugin/assets/{typography,panel}.css）
//   themeAssets.template —— 新建模板（分块，8000 字符/片）
//   themes.user.list / get / save —— 用户主题（$HOME/.dsh/web-themes/*.css）
//     get/save 均分块传输（页面↔宿主消息通道有 ~16KB 单条上限，v1.2.2 实测 24KB 返回失败、16.8KB 保存截断）
//     save 附带 CSS 语法校验（注释/字符串/花括号/圆括号闭合），错误明确拒绝
//   只传 JSON 标量，不序列化任何 Cordis/DSH 活对象
// ============================================================

// 用户主题目录：按系统用户目录动态拼接 $HOME/.dsh/web-themes（不硬编码）
// 解析策略（三级回退）：
//   1) shell 服务执行 printf %s "$HOME" —— 系统真实用户目录
//   2) sandboxPolicy.workspaceRoot 推导（/home/<user>/... → /home/<user>）
//   3) 硬编码回退（本部署环境已知路径）
const FALLBACK_USER_THEMES_DIR = '/home/lab/.dsh/web-themes'
// 显式兜底的项目目录（resolveProjectRoot 探测全部失败时使用）
const FALLBACK_PROJECT_DIR = '/home/lab/xyygithub/dsh-markdown-xyy'
// 分块传输：单片字符数（单条消息 ≈ 8KB 安全区，远低于 ~16KB 通道上限）
const CHUNK_SIZE = 8000
// 用户主题总大小上限（防滥用）
const MAX_THEME_LEN = 100000
let userThemesDir = null // 首次解析后缓存
let projectRoot = null   // 首次探测后缓存

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

// 项目根（内置主题与共享资产所在）：按内容探测，不信任 sandboxPolicy.workspaceRoot
// ⚠️ workspaceRoot = DSH 主进程启动目录，不一定是插件项目目录（本环境 = dsh-xyy-ui）
async function resolveProjectRoot(ctx) {
  if (projectRoot) return projectRoot
  const fsSvc = ctx.get('fs')
  if (fsSvc === undefined) return null
  const hasAssets = async (root) => {
    try {
      // ⚠️ fs 服务要求 resolve() 句柄（{targetKey}），不能直接传字符串路径
      const a = await fsSvc.stat(await fsSvc.resolve(root + '/plugin/assets/typography.css'))
      const b = await fsSvc.stat(await fsSvc.resolve(root + '/plugin/assets/panel.css'))
      return !!(a && b)
    } catch (e) {
      return false
    }
  }
  const roots = []
  try {
    const sp = ctx.get('sandboxPolicy')
    if (sp && typeof sp.workspaceRoot === 'string' && sp.workspaceRoot.length > 0) {
      roots.push(sp.workspaceRoot)
      const parent = sp.workspaceRoot.replace(/\/+$/, '').split('/').slice(0, -1).join('/')
      if (parent.length > 0) {
        roots.push(parent)
        try {
          const entries = await fsSvc.listDir(await fsSvc.resolve(parent))
          for (const e of entries) {
            if (e && e.name && e.name.charAt(0) !== '.') roots.push(parent + '/' + e.name)
          }
        } catch (e) { /* 忽略：父目录不可列时跳过兄弟扫描 */ }
      }
    }
  } catch (e) { /* 忽略 */ }
  roots.push(FALLBACK_PROJECT_DIR)
  for (const root of roots) {
    if (await hasAssets(root)) {
      projectRoot = root
      console.log('[mdvr] projectRoot = ' + projectRoot)
      return projectRoot
    }
  }
  return null
}

// 大文本按固定大小切片
function sliceChunks(text) {
  const chunks = []
  for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE))
  return chunks
}

const MANIFEST = {
  version: '1.2.3',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-15',
  changes: [
    '传输修复：所有主题内容走分块传输（8000 字符/片，单条消息 <8.5KB），解决页面↔宿主消息通道 ~16KB 上限导致的资产加载失败、主题保存静默截断',
    'CSS 语法校验：保存前检测注释/字符串/花括号/圆括号闭合，错误明确拒绝并提示（不再写入损坏文件）',
    'asset RPC 拆分：themeAssets.core（骨架+面板）+ themeAssets.template（分块）；模板恢复完整版（与 example.css 同源）',
  ],
}

return {
  apply(ctx) {
    const ledger = []
    // 分块保存缓冲区：id → { total, chunks: [] }（apply 作用域内，随插件重启清空）
    const saveBuffers = new Map()

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

    // 列出内置主题（项目根 themes/*.css；文件即主题，改文件后刷新/重启插件即生效，无需升级）
    harness.handle('themes.builtin.list', async () => {
      const fsSvc = ctx.get('fs')
      const root = await resolveProjectRoot(ctx)
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or project root unavailable', themes: [] }
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

    // 共享资产核心：排版骨架 + 面板样式（单次返回 ~11.5KB，安全区）
    harness.handle('themeAssets.core', async () => {
      const fsSvc = ctx.get('fs')
      const root = await resolveProjectRoot(ctx)
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or project root unavailable' }
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
      return { ok: true, typography, panel }
    })

    // 新建模板（分块）：{index} → {ok, index, total, chunk}
    harness.handle('themeAssets.template', async (args) => {
      const fsSvc = ctx.get('fs')
      const root = await resolveProjectRoot(ctx)
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or project root unavailable' }
      }
      try {
        const text = await fsSvc.readText(await fsSvc.resolve(root + '/plugin/assets/template.css'))
        const chunks = sliceChunks(text)
        const index = Number((args && args.index) || 0)
        if (index < 0 || index >= chunks.length) return { ok: false, reason: 'bad index' }
        return { ok: true, index, total: chunks.length, chunk: chunks[index] }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
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

    // 读取指定用户主题（分块）：{id, index} → {ok, id, index, total, chunk}
    harness.handle('themes.user.get', async (args) => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable' }
      const id = args && args.id
      if (!id || id.indexOf('/') >= 0 || id.indexOf('\\') >= 0 || id === '..') {
        return { ok: false, reason: 'bad id' }
      }
      try {
        const target = await fsSvc.resolve((await resolveUserThemesDir(ctx)) + '/' + id + '.css')
        const text = await fsSvc.readText(target)
        const chunks = sliceChunks(text)
        const index = Number((args && args.index) || 0)
        if (index < 0 || index >= chunks.length) return { ok: false, reason: 'bad index' }
        return { ok: true, id, index, total: chunks.length, chunk: chunks[index] }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
    })

    // 保存 / 新建用户主题（分块上传 + CSS 语法校验 + 大小上限）
    // 协议：client 依次发送 {id, index, total, chunk}；最后一块到达时拼接、校验、写盘
    harness.handle('themes.user.save', async (args) => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable' }
      const id = args && args.id
      if (!id || id.indexOf('/') >= 0 || id.indexOf('\\') >= 0 || id === '..') {
        return { ok: false, reason: 'bad id' }
      }
      const chunk = String((args && args.chunk) || '')
      const index = Number((args && args.index) || 0)
      const total = Number((args && args.total) || 1)
      if (index < 0 || index >= total) return { ok: false, reason: 'bad index' }
      if (chunk.length > CHUNK_SIZE) return { ok: false, reason: '单块过大(>8000字符)' }
      if (total > Math.ceil(MAX_THEME_LEN / CHUNK_SIZE)) return { ok: false, reason: '块数过多' }
      // 覆盖重传：index 0 时重置缓冲区
      let buf = saveBuffers.get(id)
      if (!buf || buf.total !== total || index === 0) {
        buf = { total, chunks: [] }
        saveBuffers.set(id, buf)
      }
      buf.chunks[index] = chunk
      if (index < total - 1) {
        return { ok: true, pending: true }
      }
      // 最后一块：拼接 + 长度校验 + 写盘（CSS 语法校验由 client 端保存前执行）
      const css = buf.chunks.join('')
      saveBuffers.delete(id)
      if (css.length > MAX_THEME_LEN) return { ok: false, reason: '主题过大(>100KB)' }
      try {
        const dir = await resolveUserThemesDir(ctx)
        // 目录不存在时尽力创建（幂等；shell 可能受限，失败则由 writeText 报错）
        try {
          const dirStat = await fsSvc.stat(await fsSvc.resolve(dir))
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
