// scripts/check-release.js —— 发布门禁（零第三方依赖，Node 内置模块）
//
// 把 AGENTS.md 的人工约定转成机器可执行检查：
//   1. manifest/versions.json 合法 JSON + 基本 schema + 顶部条目完整
//   2. 双份 MANIFEST（plugin/host.js + plugin/src/client.core.js）版本一致，且与 manifest 顶部条目一致
//   3. plugin/client.js 与 plugin/src/client.core.js 逐字节一致（构建产物未漂移）
//   4. 全部 JS 通过 node --check（含 minify 产物）
//   5. 共享资产与内置主题存在且非空
//   6. 每个 CSS 文件括号/注释/字符串闭合
//   7. 内置主题必须同时含 body 与 body[data-ds-dark-theme]（深色挂载铁律）
//   8. panel.css 的 var(--mdvr-*) 一律带 fallback（原生模式铁律）
//   9. packageId 唯一（v1.0.0 起的条目）
//  10. minify 双半可在 /tmp 生成并通过语法检查（传输尺寸参考）
//  11. DSH 兼容基线：package.json 的 dshCompatibility ↔ 本机 DSH 运行时契约 ↔ 内置主题 CSS 三方比对
//      + README「版本与兼容性」表与 package.json 的版本一致性
//      + DSH bundling 的 cordis 是否仍落在声明的 peerDependencies 范围内
//      （本机未装 DSH / 基线版本过期 / DSH 内部结构变化 → 警告；名单、槽位、版本表或 cordis peer 真的不一致 → 失败）
//  12. 主题消费面契约：死选择器（.token/.hljs）/ Shiki 变量映射完整性 / 对话流间距走产品旋钮 /
//      产品字体 token 覆盖 / 注释文档引用有效性 —— 均为「曾静默失效」缺陷的回归防护
//
// 用法：node scripts/check-release.js
// 失败返回非零退出码并打印具体原因（file:line 式证据）。
// 环境变量 DSH_INSTALL_ROOT 可显式指定 DSH 安装根（跳过自动探测）。

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const os = require('os')

const root = path.join(__dirname, '..')
let failures = 0
let warnings = 0

function fail(msg) {
  failures++
  console.error('  ✗ ' + msg)
}
function warn(msg) {
  warnings++
  console.warn('  ⚠ ' + msg)
}
function ok(msg) {
  console.log('  ✓ ' + msg)
}

// ---------- CSS 结构校验（与 plugin 内 validateCss 同逻辑） ----------
function cssError(src) {
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
      if (c === '*' && c2 === '/') { inComment = false; i += 2 } else i++
      continue
    }
    if (inStr !== null) {
      if (c === '\\') i += 2
      else if (c === inStr) { inStr = null; i++ } else i++
      continue
    }
    if (c === '/' && c2 === '*') { inComment = true; i += 2; continue }
    if (c === '"' || c === "'") { inStr = c; i++; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth < 0) return '多余的 }'
    } else if (c === '(') paren++
    else if (c === ')') {
      paren--
      if (paren < 0) return '多余的 )'
    }
    i++
  }
  if (inComment) return '注释未闭合'
  if (inStr !== null) return '字符串未闭合'
  if (depth > 0) return '花括号未闭合'
  if (paren > 0) return '圆括号未闭合'
  return null
}

// 提取源码中 MANIFEST.version
function extractManifestVersion(file) {
  const src = fs.readFileSync(file, 'utf8')
  const m = src.match(/const MANIFEST = \{\s*version:\s*'([^']+)'/)
  return m ? m[1] : null
}

// ---------- DSH 安装探测与契约解析（第 11 项用） ----------

// 定位本机 DSH 安装根（该目录下 package.json 的 name === '@deepseek-ai/dsh'）。
// 依次尝试：DSH_INSTALL_ROOT → PATH 上的 dsh 可执行文件逐级上溯 → Node 全局 node_modules 布局。
// 全部失败返回 null（第 11 项降级为警告，不拦离线/未装 DSH 的贡献者）。
function findDshRoot() {
  const candidates = []
  if (process.env.DSH_INSTALL_ROOT) candidates.push(process.env.DSH_INSTALL_ROOT)
  try {
    const bin = execFileSync('sh', ['-c', 'command -v dsh'], { stdio: 'pipe' }).toString().trim()
    if (bin) {
      // nvm 等布局下 bin/dsh 是指向 lib/node_modules/@deepseek-ai/dsh/lib/bin.js 的软链
      let dir = path.dirname(fs.realpathSync(bin))
      for (let i = 0; i < 6 && dir !== path.dirname(dir); i++) {
        candidates.push(dir)
        dir = path.dirname(dir)
      }
    }
  } catch (e) { /* PATH 上没有 dsh */ }
  candidates.push(path.join(path.dirname(path.dirname(process.execPath)), 'lib', 'node_modules', '@deepseek-ai', 'dsh'))
  for (const c of candidates) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(c, 'package.json'), 'utf8'))
      if (j.name === '@deepseek-ai/dsh' && j.version) return c
    } catch (e) { /* 候选目录无效，试下一个 */ }
  }
  return null
}

// 从 dsh-client-ui-theme 的产物中提取权威 token 名单。
// 权威源 = 冻结数组 BUILTIN_INSPECT_TOKENS（客户端 Theme.listTokens 暴露的正是它）。
// 解析不出返回 null —— DSH 重构内部结构时降级为警告并要求人工复验，而非误报失败。
function extractDshTokens(dshRoot) {
  const p = path.join(dshRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-theme', 'lib', 'client.js')
  if (!fs.existsSync(p)) return null
  const src = fs.readFileSync(p, 'utf8')
  const start = src.indexOf('BUILTIN_INSPECT_TOKENS')
  if (start < 0) return null
  const end = src.indexOf(']);', start)
  if (end < 0) return null
  const names = [...src.slice(start, end).matchAll(/name:\s*"(--dsw-[a-z0-9-]+)"/g)].map((m) => m[1])
  return names.length > 0 ? names : null
}

// 剥掉 CSS 注释（非换行字符替换为空格，保持行号不变）。
// 门禁只应分析**真实代码**：注释里提到的 token 名/选择器（例如说明文字里的
// 「--dsw-alias-link」或「.token.* 已删除」）不得被当成声明或死选择器。
function stripCssComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
}

// 主题 CSS 实际定义的 --dsw-* 名单（排序去重；已剥注释）
function extractThemeTokens(src) {
  return [...new Set(stripCssComments(src).match(/--dsw-(?:alias|specific)-[a-z0-9-]+/g) || [])].sort()
}

// 极简 semver 范围匹配（零依赖门禁，不引 semver 包）。
// 只支持本项目 peerDependencies 实际用到的两种形式：精确版本 与 ^X.Y.Z。
// 预发布后缀（-alpha.1）按数值部分比较，即对预发布略微宽松——作为守卫足够，且不会误判为通过。
// 无法解析的范围返回 null，调用方必须降级为警告，不得当作通过。
function satisfiesRange(version, range) {
  const parse = (v) => {
    const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v).trim())
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
  }
  const v = parse(version)
  if (!v) return null
  const r = String(range).trim()
  const base = parse(r.startsWith('^') ? r.slice(1) : r)
  if (!base) return null
  if (!r.startsWith('^')) return v[0] === base[0] && v[1] === base[1] && v[2] === base[2]
  // ^X.Y.Z = 同主版本，且不低于 X.Y.Z
  if (v[0] !== base[0]) return false
  if (v[1] !== base[1]) return v[1] > base[1]
  return v[2] >= base[2]
}

// 从 README 的「版本与兼容性」表提取 [项目版本, DSH 版本]（均已去掉 v 前缀）。
// 锚定到指定标题后的前若干行，避免误抓文档里其他表格；解析不出返回 null。
function extractReadmeVersions(file, heading) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const start = lines.findIndex((l) => l.trim().startsWith(heading))
  if (start < 0) return null
  for (let i = start + 1; i < Math.min(start + 12, lines.length); i++) {
    const cells = lines[i].split('|').map((c) => c.trim().replace(/\*/g, '').replace(/^v/, ''))
    if (cells.length >= 4 && /^\d+\.\d+\.\d+/.test(cells[1]) && /^\d+\.\d+\.\d+/.test(cells[2])) {
      return [cells[1], cells[2]]
    }
  }
  return null
}

console.log('[check-release] 开始发布门禁检查\n')

// ---------- 1. manifest/versions.json ----------
console.log('1) manifest/versions.json')
const manifestPath = path.join(root, 'manifest', 'versions.json')
let manifest = null
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  ok('JSON 可解析')
} catch (e) {
  fail('manifest/versions.json 解析失败: ' + e.message)
}
if (manifest) {
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    fail('entries 缺失或为空')
  } else {
    const top = manifest.entries[0]
    for (const k of ['version', 'packageId', 'name', 'palette', 'date', 'changes']) {
      if (top[k] === undefined) fail('顶部条目缺少字段: ' + k)
    }
    if (!Array.isArray(top.changes)) fail('顶部条目 changes 非数组')
    ok('顶部条目字段完整（' + top.version + '）')
  }
}

// ---------- 2. 双份 MANIFEST + 顶部条目一致性 ----------
console.log('\n2) MANIFEST 一致性')
const hostVersion = extractManifestVersion(path.join(root, 'plugin', 'host.js'))
const coreVersion = extractManifestVersion(path.join(root, 'plugin', 'src', 'client.core.js'))
const clientVersion = extractManifestVersion(path.join(root, 'plugin', 'client.js'))
if (!hostVersion || !coreVersion || !clientVersion) {
  fail('无法从源码提取 MANIFEST.version（host/core/client）')
} else {
  if (hostVersion !== coreVersion) fail(`host=${hostVersion} vs core=${coreVersion}`)
  if (coreVersion !== clientVersion) fail(`core=${coreVersion} vs client=${clientVersion}`)
  if (manifest && manifest.entries[0] && manifest.entries[0].version !== coreVersion) {
    fail(`manifest 顶部=${manifest.entries[0].version} vs 代码=${coreVersion}`)
  }
  if (failures === 0 || hostVersion === coreVersion) ok(`三处一致: v${coreVersion}`)
}

// ---------- 3. client 产物一致性 ----------
console.log('\n3) 构建产物一致性')
const coreSrc = fs.readFileSync(path.join(root, 'plugin', 'src', 'client.core.js'), 'utf8')
const clientArt = fs.readFileSync(path.join(root, 'plugin', 'client.js'), 'utf8')
if (coreSrc === clientArt) ok('plugin/client.js == plugin/src/client.core.js')
else fail('plugin/client.js 与源文件不一致 —— 运行 node scripts/build-client.js')

// ---------- 4. JS 语法 ----------
console.log('\n4) JS 语法检查')
for (const f of ['plugin/host.js', 'plugin/src/client.core.js', 'plugin/client.js', 'scripts/build-client.js', 'scripts/minify.js', 'scripts/check-release.js', 'scripts/build-installed.js', 'lib/index.mjs', 'client/client.js']) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, f)], { stdio: 'pipe' })
    ok(f)
  } catch (e) {
    fail(f + ' 语法错误: ' + (e.stderr ? e.stderr.toString().split('\n')[0] : e.message))
  }
}

// ---------- 5. 资产与内置主题存在且非空 ----------
console.log('\n5) 资产与内置主题完整性')
// v1.12.0：template-strawberry.css 已删除（新建用户主题改取内置主题内容）
// v1.17.0：template.css（青瓷参考模板）已删除——新建起步取自所选内置主题，资产契约只剩 panel.css
const assets = ['panel.css']
for (const a of assets) {
  const p = path.join(root, 'plugin', 'assets', a)
  const st = fs.existsSync(p) ? fs.statSync(p) : null
  if (!st || st.size === 0) fail('plugin/assets/' + a + ' 缺失或为空')
  else ok('plugin/assets/' + a + ' (' + st.size + ' B)')
}
// v1.6.0：内置主题内聚到 plugin/assets/themes（随插件目录打包携带），旧布局 themes/ 兼容回退
const themeDir = path.join(root, 'plugin', 'assets', 'themes')
const themeDirFallback = path.join(root, 'themes')
const themeDirUsed = fs.existsSync(themeDir) ? themeDir : themeDirFallback
const themeSrc = (t) => {
  const p = path.join(themeDir, t)
  return fs.existsSync(p) ? p : path.join(themeDirFallback, t)
}
const themes = fs.existsSync(themeDirUsed)
  ? fs.readdirSync(themeDirUsed).filter((f) => f.endsWith('.css'))
  : []
if (themes.length === 0) fail(themeDirUsed + ' 下没有内置主题（plugin/assets/themes 或 themes/）')
else ok('内置主题 ' + themes.length + ' 个（' + themeDirUsed + '）: ' + themes.join(', '))

// ---------- 6. CSS 结构闭合 ----------
console.log('\n6) CSS 结构检查')
const cssFiles = assets.map((a) => path.join(root, 'plugin', 'assets', a))
  .concat(themes.map(themeSrc))
for (const f of cssFiles) {
  const src = fs.readFileSync(f, 'utf8')
  const err = cssError(src)
  if (err) fail(path.relative(root, f) + ': ' + err)
  else ok(path.relative(root, f))
}

// ---------- 7. 内置主题深色挂载铁律 ----------
console.log('\n7) 内置主题挂载选择器')
for (const t of themes) {
  const src = fs.readFileSync(themeSrc(t), 'utf8')
  const hasLight = /(^|[\n])\s*body\s*\{/.test(src)
  const hasDark = /body\[data-ds-dark-theme\]/.test(src)
  if (!hasLight || !hasDark) fail(t + ': 必须同时包含 body{...} 与 body[data-ds-dark-theme]{...}')
  else ok(t + ' 浅/深双档齐全')
}

// ---------- 8. panel.css 的 --mdvr-* 必须带 fallback ----------
console.log('\n8) panel.css fallback 铁律')
const panelSrc = fs.readFileSync(path.join(root, 'plugin', 'assets', 'panel.css'), 'utf8')
const mdvrUses = panelSrc.match(/var\(--mdvr-[a-z0-9-]+/g) || []
const noFallback = mdvrUses.filter((u) => {
  const idx = panelSrc.indexOf(u)
  return panelSrc.slice(idx + u.length, idx + u.length + 30).indexOf(',') < 0
})
if (noFallback.length > 0) fail('panel.css 存在无 fallback 的 var(--mdvr-*): ' + noFallback.join(', '))
else ok('panel.css 全部 ' + mdvrUses.length + ' 处 var(--mdvr-*) 带 fallback')

// ---------- 9. packageId 提示（v1.0.0 起；跨进程复用已知，重复即警告） ----------
console.log('\n9) packageId 唯一性')
if (manifest) {
  // Host 的 packageId 按进程分配、计数器随重启重置，持久镜像必然出现跨进程复用
  // （例：v1.4.0 与 v1.2.0 均记录 pkg-17），无法机械区分"误抄"与"合法复用"，
  // 因此一律降级为警告提示，不再判失败。
  const seen = new Map()
  let dup = 0
  for (const e of manifest.entries) {
    const v = String(e.version || '')
    const minor = v.split('.').map(Number)
    const modern = minor.length >= 3 && minor[0] >= 1
    if (!modern || !e.packageId) continue
    if (seen.has(e.packageId)) {
      warn(`packageId ${e.packageId} 在 ${seen.get(e.packageId)} 与 ${v} 重复（跨进程复用：Host 计数随重启重置，已知正常；如为同进程两条目则需人工核查）`)
      dup++
    } else {
      seen.set(e.packageId, v)
    }
  }
  if (dup > 0) warn(`另检测到历史条目 v0.1.0/v0.2.0 共用 pkg-1（已知遗留）`)
  else ok('v1.0.0+ 条目 packageId 无重复')
}

// ---------- 10. minify 产物 ----------
console.log('\n10) minify 产物')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdvr-check-'))
for (const [src, name] of [['plugin/host.js', 'host'], ['plugin/client.js', 'client']]) {
  const out = path.join(tmpDir, name + '.min.js')
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'minify.js'), path.join(root, src), out], { stdio: 'pipe' })
    execFileSync(process.execPath, ['--check', out], { stdio: 'pipe' })
    const size = fs.statSync(out).size
    if (size > 24000) warn(name + '.min.js 达 ' + size + ' B，接近 ~26KB 传输上限')
    else ok(name + '.min.js ' + size + ' B 语法通过')
  } catch (e) {
    fail(name + ' minify 失败: ' + (e.stderr ? e.stderr.toString().split('\n')[0] : e.message))
  }
}
try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (e) { /* 忽略 */ }

// ---------- 11. DSH 兼容基线（声明 ↔ 本机 DSH 运行时契约 ↔ 内置主题 CSS） ----------
console.log('\n11) DSH 兼容基线')
// 声明源 = package.json 的 dshCompatibility。刻意不复用 `dsh` 字段：那是 DSH 自身的
// bundle / client 登记位，由 profile boot 与 patch 机制消费，塞入额外键有被误读的风险。
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const baseline = pkg.dshCompatibility
if (!baseline || !baseline.verifiedAgainst || !Array.isArray(baseline.themeTokens) || !Array.isArray(baseline.slots)) {
  fail('package.json 缺少 dshCompatibility 基线（需 verifiedAgainst + themeTokens + slots）')
} else {
  ok(`声明基线 DSH ${baseline.verifiedAgainst}（复验于 ${baseline.verifiedDate || '未记日期'}）`)
  const declaredTokens = [...new Set(baseline.themeTokens)].sort()
  const declaredSet = new Set(declaredTokens)

  // 11.1 内置主题 CSS 必须全量、无增补地覆盖声明名单（不依赖本机 DSH，永远检查）
  for (const t of themes) {
    const used = extractThemeTokens(fs.readFileSync(themeSrc(t), 'utf8'))
    const missing = declaredTokens.filter((n) => !used.includes(n))
    const extra = used.filter((n) => !declaredSet.has(n))
    if (missing.length || extra.length) {
      fail(`${t}: 主题 token 名单 ≠ 声明基线（缺 [${missing.join(', ')}] / 多 [${extra.join(', ')}]）`)
    } else {
      ok(`${t} 全量覆盖声明基线 ${declaredTokens.length} 个 token`)
    }
  }

  // 11.2 README 版本表：新增的声明点必须与 package.json 同步，否则又是一个静默漂移面
  for (const [file, heading] of [['README.md', '## 版本与兼容性'], ['README.en.md', '## Versions & compatibility']]) {
    const p = path.join(root, file)
    if (!fs.existsSync(p)) {
      warn(file + ' 缺失，跳过版本表核对')
      continue
    }
    const got = extractReadmeVersions(p, heading)
    if (!got) {
      fail(`${file}: 标题「${heading}」下未找到形如 | v项目版本 | DSH版本 | 的表格行`)
      continue
    }
    const [projVer, dshVer] = got
    if (projVer !== pkg.version) fail(`${file} 版本表项目版本=${projVer} vs package.json=${pkg.version}`)
    else if (dshVer !== baseline.verifiedAgainst) fail(`${file} 版本表 DSH=${dshVer} vs dshCompatibility.verifiedAgainst=${baseline.verifiedAgainst}`)
    else ok(`${file} 版本表与 package.json 一致（v${projVer} / DSH ${dshVer}）`)
  }

  const dshRoot = findDshRoot()
  if (!dshRoot) {
    warn('未检测到本机 DSH 安装 —— 跳过运行时契约比对（可用 DSH_INSTALL_ROOT 指定安装根）')
  } else {
    let dshVersion = null
    try { dshVersion = JSON.parse(fs.readFileSync(path.join(dshRoot, 'package.json'), 'utf8')).version } catch (e) { /* 下面统一告警 */ }
    if (!dshVersion) {
      warn('无法读取本机 DSH 版本：' + dshRoot)
    } else if (dshVersion !== baseline.verifiedAgainst) {
      warn(`本机 DSH ${dshVersion} ≠ 声明基线 ${baseline.verifiedAgainst} —— 声明已过期，复验后更新 dshCompatibility`)
    } else {
      ok(`本机 DSH 版本与基线一致: ${dshVersion}`)
    }

    // 11.3 L0 token 名单：DSH 权威表 ↔ 声明基线（不一致即失败，这是最易静默漂移的契约）
    const dshTokens = extractDshTokens(dshRoot)
    if (!dshTokens) {
      warn('无法从本机 DSH 解析 BUILTIN_INSPECT_TOKENS —— 内部结构可能已变，请人工核对 token 名单')
    } else {
      const dshSet = new Set(dshTokens)
      const onlyDeclared = declaredTokens.filter((t) => !dshSet.has(t))
      const onlyDsh = dshTokens.filter((t) => !declaredSet.has(t))
      if (onlyDeclared.length || onlyDsh.length) {
        fail(`L0 token 名单与 DSH 不一致：声明多出 [${onlyDeclared.join(', ')}] / DSH 新增 [${onlyDsh.join(', ')}]`)
      } else {
        ok(`L0 token 名单与 DSH 权威表逐名一致（${dshTokens.length} 个）`)
      }
    }

    // 11.4 槽位契约（.d.ts 文本存在性；槽位消失 = 插件注册落空）
    const slotFiles = {
      'settings.section': ['dsh-client-ui-settings', 'lib', 'types', 'client', 'contract', 'slots.d.ts'],
      'tool.view.cordis': ['dsh-client-ui-cordis', 'lib', 'types', 'client', 'slots.d.ts'],
    }
    for (const slot of baseline.slots) {
      const rel = slotFiles[slot]
      if (!rel) {
        warn(`声明了未知槽位 ${slot}（门禁无对应契约文件，请补充核对方式）`)
        continue
      }
      const p = path.join(dshRoot, 'node_modules', '@deepseek-ai', ...rel)
      if (!fs.existsSync(p)) {
        warn(`槽位契约文件缺失，无法核对 ${slot}: ${rel.join('/')}`)
        continue
      }
      const src = fs.readFileSync(p, 'utf8')
      if (src.includes(`'${slot}'`) || src.includes(`"${slot}"`)) ok(`槽位契约在: ${slot}`)
      else fail(`DSH 已不再声明槽位 ${slot}（${rel.join('/')}）—— 插件注册会落空`)
    }

    // 11.5 深色挂载标记（产品是否仍按该属性切深色档）
    const attr = baseline.darkAttribute || 'data-ds-dark-theme'
    const themeCli = path.join(dshRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-theme', 'lib', 'client.js')
    if (fs.existsSync(themeCli)) {
      if (fs.readFileSync(themeCli, 'utf8').includes(`[${attr}]`)) ok(`深色标记仍是产品用法: body[${attr}]`)
      else fail(`DSH 主题产物中已无 [${attr}] —— 内置主题的深色档选择器会失效`)
    } else {
      warn('未找到 dsh-client-ui-theme 产物，跳过深色标记核对')
    }

    // 11.6 cordis 版本：DSH 实际 bundling 的 cordis 是否仍落在我们声明的 peer 范围内。
    // 这条防的是「DSH 换 cordis 大版而插件声明静默失效」——peer 范围本身不会被 npm 在此处校验。
    const cordisPkg = path.join(dshRoot, 'node_modules', '@deepseek-ai', 'cordis', 'package.json')
    const peerRange = (pkg.peerDependencies || {})['@deepseek-ai/cordis']
    if (!fs.existsSync(cordisPkg)) {
      warn('未找到 DSH bundling 的 @deepseek-ai/cordis，跳过 cordis 版本核对')
    } else if (!peerRange) {
      fail('package.json 未声明 @deepseek-ai/cordis 的 peerDependencies 范围')
    } else {
      let cordisVer = null
      try { cordisVer = JSON.parse(fs.readFileSync(cordisPkg, 'utf8')).version } catch (e) { /* 下面统一告警 */ }
      const fits = cordisVer ? satisfiesRange(cordisVer, peerRange) : null
      if (fits === null) {
        warn(`无法解析 cordis 版本或 peer 范围（cordis=${cordisVer} peer=${peerRange}）—— 请人工核对`)
      } else if (!fits) {
        fail(`DSH bundling 的 cordis ${cordisVer} 不满足 peerDependencies "${peerRange}" —— 插件声明已与运行时脱节`)
      } else if (baseline.cordis && baseline.cordis !== cordisVer) {
        warn(`DSH bundling 的 cordis ${cordisVer} ≠ 基线记录 ${baseline.cordis}（仍在 ${peerRange} 内）—— 复验后更新 dshCompatibility.cordis`)
      } else {
        ok(`cordis ${cordisVer} 满足 peer "${peerRange}" 且与基线一致`)
      }
    }

    // 说明：hostServices / clientServices 的签名无法从文件静态判定，
    // 列为 manualCoverage —— 靠人工经 cordis_inspect 复验，本门禁不假装覆盖。
  }
}

// ---------- 12. 主题消费面契约（与 DSH 0.1.6 实测对齐；防 v2.0.2 修好的问题回归） ----------
console.log('\n12) 主题消费面契约')
// 本节的每一项都对应一个「曾经静默失效」的真实缺陷：
//   12.1 死选择器（DSH 无 Prism/hljs，.token.*/.hljs-* 永不命中）
//   12.2 Shiki 变量映射完整性（唯一能接管代码着色的入口）
//   12.3 对话流间距不得用 flex gap（会与产品 margin-top 叠加，方向相反）
//   12.4 产品字体 token 覆盖（否则 markdown 正文不跟随主题字体）
//   12.5 主题注释里的文档引用必须真实存在（防死链）
{
  const dshRoot2 = findDshRoot()

  // 12.1 主题 CSS 内不得存在 .token.* / .hljs-* 选择器
  //      ⚠️ 必须**剥注释后再判**：说明文字里提到这些选择器不得误报为死规则
  for (const t of themes) {
    const lines = stripCssComments(fs.readFileSync(themeSrc(t), 'utf8')).split('\n')
    const dead = []
    lines.forEach((line, i) => {
      if (/\.token\.|\.hljs-/.test(line)) dead.push(i + 1)
    })
    if (dead.length) fail(`${t}: 存在 .token.*/.hljs-* 选择器（DSH 无 Prism/hljs，永不命中）: 行 ${dead.join(', ')}`)
    else ok(`${t} 无 .token.*/.hljs-* 死选择器`)
  }

  // 12.2 每个主题必须定义 DSH 实际提供的全部 --shiki-token-*
  let shikiNames = null
  if (dshRoot2) {
    const p = path.join(dshRoot2, 'node_modules', '@deepseek-ai', 'dsh-client-ui-theme', 'lib', 'client.js')
    if (fs.existsSync(p)) {
      shikiNames = [...new Set([...fs.readFileSync(p, 'utf8').matchAll(/(--shiki-token-[a-z-]+)/g)].map((m) => m[1]))].sort()
    }
  }
  if (!shikiNames || shikiNames.length === 0) {
    warn('无法从本机 DSH 提取 --shiki-token-* 名单，跳过 12.2')
  } else {
    for (const t of themes) {
      const code = stripCssComments(fs.readFileSync(themeSrc(t), 'utf8'))
      // ⚠️ 必须**浅/深两档各自**声明：只在一档声明会让另一档落回产品默认色。
      // 主题的结构是 body{…}（浅）与 body[data-ds-dark-theme]{…}（深），块内无嵌套花括号。
      const light = (code.match(/(?:^|\n)body\s*\{([\s\S]*?)\n\}/) || [])[1] || ''
      const dark = (code.match(/body\[data-ds-dark-theme\]\s*\{([\s\S]*?)\n\}/) || [])[1] || ''
      const declared = (n) => new RegExp(n.replace(/-/g, '\\-') + '\\s*:')
      const missingLight = shikiNames.filter((n) => !declared(n).test(light))
      const missingDark = shikiNames.filter((n) => !declared(n).test(dark))
      if (missingLight.length || missingDark.length) {
        fail(`${t}: Shiki 映射未成对 —— 浅色档缺 [${missingLight.join(', ')}] / 深色档缺 [${missingDark.join(', ')}]`)
      } else {
        ok(`${t} 覆盖全部 ${shikiNames.length} 个 --shiki-token-*（浅/深成对）`)
      }
    }
  }

  // 12.3 [data-chat-flow] 不得用 gap（产品该列间距是 margin-top，gap 会叠加而非替代）
  for (const t of themes) {
    const code = stripCssComments(fs.readFileSync(themeSrc(t), 'utf8'))
    const block = code.match(/\[data-chat-flow\]\s*\{[^}]*\}/)
    const usesKnob = /--dsh-chat-flow-gap\s*:/.test(code)
    if (block && /(^|\s)gap\s*:/.test(block[0])) {
      fail(`${t}: [data-chat-flow] 用了 flex gap —— 会与产品 margin-top 叠加（间距变大），应覆盖 --dsh-chat-flow-gap`)
    } else if (!usesKnob) {
      fail(`${t}: 未覆盖 --dsh-chat-flow-gap —— 对话流间距收紧不生效`)
    } else {
      ok(`${t} 对话流间距走产品旋钮 --dsh-chat-flow-gap`)
    }
  }

  // 12.4 产品字体 token 覆盖（markdown 的 font: 简写全部由这两个 token 派生）
  const fontTokens = ['--dsw-font-family', '--ds-font-family-code']
  for (const t of themes) {
    const code = stripCssComments(fs.readFileSync(themeSrc(t), 'utf8'))
    const missing = fontTokens.filter((n) => !new RegExp(n.replace(/-/g, '\\-') + '\\s*:').test(code))
    if (missing.length) fail(`${t}: 未覆盖产品字体 token [${missing.join(', ')}] —— markdown 正文字体不跟随主题`)
    else ok(`${t} 覆盖产品字体 token ${fontTokens.join(' / ')}`)
  }

  // 12.5 主题注释里引用的 docs/*.md 必须存在
  //      这一项刻意用**原始文本**——引用本来就写在注释里，剥注释反而查不到
  for (const t of themes) {
    const src = fs.readFileSync(themeSrc(t), 'utf8')
    const refs = [...new Set([...src.matchAll(/docs\/[A-Za-z0-9._/-]+\.md/g)].map((m) => m[0]))]
    const dead = refs.filter((r) => !fs.existsSync(path.join(root, r)))
    if (dead.length) fail(`${t}: 注释引用了不存在的文档 [${dead.join(', ')}]`)
    else if (refs.length) ok(`${t} 注释文档引用 ${refs.length} 处全部有效`)
  }
}

// ---------- 汇总 ----------
console.log('\n[check-release] 完成: ' + (failures === 0 ? '全部通过' : failures + ' 项失败') + (warnings ? '，' + warnings + ' 项警告' : ''))
process.exit(failures === 0 ? 0 : 1)
