// ============================================================
// Host half v1.3.0 — 版本台账 + 主题资产/用户主题读写（分块传输 + Host 侧 CSS 校验）
//
// 【职责】
//   维护内存台账（按 packageId 去重、最新在前）
//   versions.note —— Client 面板挂载时上报自身 MANIFEST → 记账
//   versions.list —— 面板查询台账快照 { current, history }
//   themes.builtin.list —— 列出内置主题（项目根 themes/*.css，文件即主题）
//   themeAssets.get —— 共享资产分块读取（panel，8000 字符/片；v1.17.0 起 template.css 已删除）
//   themes.user.list / get / save —— 用户主题（$HOME/.dsh/web-themes-xyy/*.css）
//     get/save 均分块传输（页面↔宿主消息通道有 ~16KB 单条上限，v1.2.2 实测 24KB 返回失败、16.8KB 保存截断）
//     save 为事务化上传协议：uploadId 隔离 + 分片完整性检查 + TTL/容量上限，
//     拼接后 Host 再执行 CSS 语法校验（注释/字符串/花括号/圆括号闭合），错误明确拒绝
//   只传 JSON 标量，不序列化任何 Cordis/DSH 活对象
// ============================================================

// 用户主题目录：按系统用户目录动态拼接 $HOME/.dsh/web-themes-xyy（不硬编码；
// v1.18.0 由 web-themes 改名而来，避免与 DSH 官方未来可能占用 web-themes 目录名冲突）
// 解析策略（三级回退）：
//   1) shell 服务执行 printf %s "$HOME" —— 系统真实用户目录
//   2) sandboxPolicy.workspaceRoot 推导（/home/<user>/... → /home/<user>）
//   3) 硬编码回退（本部署环境已知路径）
const FALLBACK_USER_THEMES_DIR = '/home/lab/.dsh/web-themes-xyy'
// 显式兜底的项目目录（resolveProjectRoot 探测全部失败时使用）
const FALLBACK_PROJECT_DIR = '/home/lab/xyygithub/dsh-markdown-xyy'
// 分块传输：单片字符数（单条消息 ≈ 8KB 安全区，远低于 ~16KB 通道上限）
const CHUNK_SIZE = 8000
// 用户主题总大小上限（防滥用）
const MAX_THEME_LEN = 100000
// 单片数上限（100KB / 8000 字符 → 13 片封顶）
const MAX_CHUNKS = Math.ceil(MAX_THEME_LEN / CHUNK_SIZE)
// 同时存在的未完成上传事务上限（防内存滥用）
const MAX_UPLOAD_BUFFERS = 16
// 未完成上传 TTL（超时后惰性清理）
const UPLOAD_TTL_MS = 5 * 60 * 1000
// 用户主题 id 白名单（Host 与 Client 共用同一规则；拒绝控制字符/点文件/路径分隔符）
const THEME_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
// 上传事务 id 格式（Client 每次保存生成）
const UPLOAD_ID_RE = /^[A-Za-z0-9_-]{8,64}$/
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
        userThemesDir = home + '/.dsh/web-themes-xyy'
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
        userThemesDir = '/' + parts[1] + '/' + parts[2] + '/.dsh/web-themes-xyy'
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
      // v1.8.0：哨兵对 = plugin/assets/panel.css + plugin/assets/themes/strawberry-mocha.css
      // （typography.css 已删除；两者均为插件目录内随包携带的稳定文件）
      // ⚠️ fs 服务要求 resolve() 句柄（{targetKey}），不能直接传字符串路径
      const a = await fsSvc.stat(await fsSvc.resolve(root + '/plugin/assets/panel.css'))
      const b = await fsSvc.stat(await fsSvc.resolve(root + '/plugin/assets/themes/strawberry-mocha.css'))
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

// 大文本按固定大小切片（空文本返回一个空片，保证读/写协议对称）
function sliceChunks(text) {
  if (text.length === 0) return ['']
  const chunks = []
  for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE))
  return chunks
}

// CSS 语法校验（Host 写盘前强制执行；与 client 端 validateCss 同逻辑，双端一致）
// 检测注释/字符串/花括号/圆括号闭合；返回错误信息或 null（通过）
function validateCss(src) {
  let depth = 0
  let paren = 0
  let inComment = false
  let inStr = null
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const c2 = src[i + 1]
    if (inComment) {
      if (c === '*' && c2 === '/') { inComment = false; i += 2 }
      else i++
      continue
    }
    if (inStr !== null) {
      if (c === '\\') i += 2
      else if (c === inStr) { inStr = null; i++ }
      else i++
      continue
    }
    if (c === '/' && c2 === '*') { inComment = true; i += 2; continue }
    if (c === '"' || c === "'") { inStr = c; i++; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth < 0) return '出现多余的 }'
    } else if (c === '(') paren++
    else if (c === ')') {
      paren--
      if (paren < 0) return '出现多余的 )'
    }
    i++
  }
  if (inComment) return '注释未闭合（缺少 */）'
  if (inStr !== null) return '字符串未闭合（缺少 ' + inStr + '）'
  if (depth > 0) return '花括号未闭合（缺少 ' + depth + ' 个 }）'
  if (paren > 0) return '圆括号未闭合（缺少 ' + paren + ' 个 )）'
  return null
}

const MANIFEST = {
  version: '1.18.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-29',
  changes: [
    '用户主题目录改名 $HOME/.dsh/web-themes → $HOME/.dsh/web-themes-xyy（避免与 DSH 官方未来可能占用 web-themes 目录名冲突）；Host 解析/回退常量与客户端文案同步',
  ],
}

return {
  apply(ctx) {
    const ledger = []
    // 分块保存缓冲区：id → { total, chunks: [] }（apply 作用域内，随插件重启清空）
    const saveBuffers = new Map()

    // RPC 注册（双通道）：
    //   动态 define 模式：harness 为动态 Host 半注入的全局 → harness.handle（Package-private RPC）
    //   常驻安装模式：无 harness 全局 → 走 webServer HTTP 路由（/mdvr/api/<method>，JSON），
    //     客户端侧由 build-installed 包装的 HTTP 桥（host.call 同签名）对接
    const registerRpc = (method, handler) => {
      const h = typeof harness === 'undefined' ? undefined : harness
      if (h && typeof h.handle === 'function') return h.handle(method, handler)
      const ws = ctx.get('webServer')
      if (ws !== undefined && typeof ws.register === 'function') {
        return ws.register({
          kind: 'exact',
          path: '/mdvr/api/' + method,
          handler: async (req, res) => {
            const args = await readJsonBody(req)
            let out
            try { out = await handler(args) } catch (e) {
              out = { ok: false, reason: String((e && e.message) || e) }
            }
            res.writeHead(200, {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            })
            res.end(JSON.stringify(out))
          },
        })
      }
      return () => {}
    }

    // 读取请求 JSON 体（常驻 HTTP 通道用；过大/解析失败回退 {}）
    const readJsonBody = (req) => new Promise((resolve) => {
      let data = ''
      let done = false
      const finish = (v) => { if (!done) { done = true; resolve(v) } }
      req.on('data', (c) => {
        data += c
        if (data.length > 1e6) { finish(null); req.destroy() }
      })
      req.on('end', () => {
        try { finish(JSON.parse(data || '{}')) } catch (e) { finish({}) }
      })
      req.on('error', () => finish({}))
    })

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
    registerRpc('versions.note', async (args) => {
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
    registerRpc('versions.list', async () => snapshot())

    // 列出内置主题 id（优先插件目录内 plugin/assets/themes/*.css，随插件包携带；兼容回退仓库根 themes/）
    // 文件即主题，改文件后刷新/重启插件即生效，无需升级。
    // ⚠️ v1.5.0：只返回 id 列表；完整 CSS 走 themes.builtin.get 分块拉取——
    //    单条 RPC 内联多份大主题 CSS 会超 ~16KB 通道上限被截断（v1.4.0 实测 48KB → 列表全空）。
    registerRpc('themes.builtin.list', async () => {
      const fsSvc = ctx.get('fs')
      const root = await resolveProjectRoot(ctx)
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or project root unavailable', themes: [] }
      }
      try {
        // v1.6.0：内置主题内聚到 plugin/assets/themes（打包 plugin/ 目录即携带）；旧布局 themes/ 回退
        let dir = await fsSvc.resolve(root + '/plugin/assets/themes')
        const st = await fsSvc.stat(dir)
        if (!st) dir = await fsSvc.resolve(root + '/themes')
        const entries = await fsSvc.listDir(dir)
        const themes = entries
          .filter((x) => x.name && x.name.endsWith('.css'))
          .map((x) => x.name.replace(/\.css$/, ''))
          .sort()
        return { ok: true, themes }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e), themes: [] }
      }
    })

    // 读取指定内置主题（分块）：{id, index} → {ok, id, index, total, chunk}（v1.5.0 与用户主题同协议；v1.6.0 assets 优先）
    registerRpc('themes.builtin.get', async (args) => {
      const fsSvc = ctx.get('fs')
      const root = await resolveProjectRoot(ctx)
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or project root unavailable' }
      }
      const id = args && args.id
      if (typeof id !== 'string' || !THEME_ID_RE.test(id)) {
        return { ok: false, reason: 'bad id' }
      }
      try {
        let text = null
        try {
          text = await fsSvc.readText(await fsSvc.resolve(root + '/plugin/assets/themes/' + id + '.css'))
        } catch (e) { /* 回退旧布局 */ }
        if (text === null) {
          text = await fsSvc.readText(await fsSvc.resolve(root + '/themes/' + id + '.css'))
        }
        const chunks = sliceChunks(text)
        const index = Number(args && args.index)
        if (!Number.isSafeInteger(index) || index < 0 || index >= chunks.length) {
          return { ok: false, reason: 'bad index' }
        }
        return { ok: true, id, index, total: chunks.length, chunk: chunks[index] }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
    })

    // 共享资产分块读取（panel）：{name, index} → {ok, index, total, chunk}
    // 统一分块协议（v1.3.0）；v1.8.0 移除 typography、v1.12.0 移除 template-strawberry、
    // v1.17.0 移除 template（新建用户主题起步改取所选内置主题内容）
    registerRpc('themeAssets.get', async (args) => {
      const fsSvc = ctx.get('fs')
      const root = await resolveProjectRoot(ctx)
      const name = args && args.name
      if (fsSvc === undefined || root === null) {
        return { ok: false, reason: 'fs or project root unavailable' }
      }
      if (name !== 'panel') {
        return { ok: false, reason: 'bad name' }
      }
      try {
        const text = await fsSvc.readText(await fsSvc.resolve(root + '/plugin/assets/' + name + '.css'))
        const chunks = sliceChunks(text)
        const index = Number(args && args.index)
        if (!Number.isSafeInteger(index) || index < 0 || index >= chunks.length) {
          return { ok: false, reason: 'bad index' }
        }
        return { ok: true, index, total: chunks.length, chunk: chunks[index] }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
    })

    // 列出用户主题 id（$HOME/.dsh/web-themes-xyy 下 *.css 文件名，动态添加无需打包）
    registerRpc('themes.user.list', async () => {
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
    registerRpc('themes.user.get', async (args) => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable' }
      const id = args && args.id
      if (typeof id !== 'string' || !THEME_ID_RE.test(id)) {
        return { ok: false, reason: 'bad id' }
      }
      try {
        const target = await fsSvc.resolve((await resolveUserThemesDir(ctx)) + '/' + id + '.css')
        const text = await fsSvc.readText(target)
        const chunks = sliceChunks(text)
        const index = Number(args && args.index)
        if (!Number.isSafeInteger(index) || index < 0 || index >= chunks.length) {
          return { ok: false, reason: 'bad index' }
        }
        return { ok: true, id, index, total: chunks.length, chunk: chunks[index] }
      } catch (e) {
        return { ok: false, reason: String((e && e.message) || e) }
      }
    })

    // 保存 / 新建用户主题（事务化分块上传 + Host 侧 CSS 校验 + 大小/并发/TTL 上限）
    // 协议：client 生成 uploadId，依次发送 {id, uploadId, index, total, chunk}；
    // 所有分片完整到达后拼接 → Host validateCss → 写盘（v1.3.0：不再“最后一片即提交”）
    registerRpc('themes.user.save', async (args) => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, reason: 'fs unavailable' }
      const id = args && args.id
      const uploadId = args && args.uploadId
      if (typeof id !== 'string' || !THEME_ID_RE.test(id)) return { ok: false, reason: 'bad id' }
      if (typeof uploadId !== 'string' || !UPLOAD_ID_RE.test(uploadId)) {
        return { ok: false, reason: 'bad uploadId' }
      }
      const chunk = String((args && args.chunk) || '')
      const index = Number(args && args.index)
      const total = Number(args && args.total)
      // 安全整数校验：拒绝 NaN/小数/Infinity/负数/越界（v1.3.0）
      if (!Number.isSafeInteger(index) || !Number.isSafeInteger(total) ||
          total < 1 || total > MAX_CHUNKS || index < 0 || index >= total) {
        return { ok: false, reason: 'bad chunk metadata' }
      }
      if (chunk.length > CHUNK_SIZE) return { ok: false, reason: '单块过大(>8000字符)' }

      // 惰性清理超时未完成的上传事务
      const now = Date.now()
      for (const [k, b] of saveBuffers) {
        if (now - b.lastAt > UPLOAD_TTL_MS) saveBuffers.delete(k)
      }

      const key = uploadId + ':' + id
      let buf = saveBuffers.get(key)
      if (!buf) {
        if (saveBuffers.size >= MAX_UPLOAD_BUFFERS) {
          return { ok: false, reason: '未完成的上传事务过多，请稍后重试' }
        }
        buf = { id, total, chunks: [], received: new Set(), bytes: 0, lastAt: now }
        saveBuffers.set(key, buf)
      } else if (buf.total !== total) {
        return { ok: false, reason: 'total 与首片不一致' }
      }
      if (buf.received.has(index)) return { ok: false, reason: '重复分片' }
      buf.chunks[index] = chunk
      buf.received.add(index)
      buf.bytes += chunk.length
      buf.lastAt = now
      if (buf.bytes > MAX_THEME_LEN) {
        saveBuffers.delete(key)
        return { ok: false, reason: '主题过大(>100KB)' }
      }
      // 分片未全部到达：继续等待（绝不提前提交）
      if (buf.received.size < total) return { ok: true, pending: true }

      // 全部到达：拼接 + Host 侧 CSS 校验 + 写盘
      saveBuffers.delete(key)
      const css = buf.chunks.join('')
      const cssErr = validateCss(css)
      if (cssErr) return { ok: false, reason: 'CSS 语法错误：' + cssErr }
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
