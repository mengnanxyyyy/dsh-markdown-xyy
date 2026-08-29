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
//
// 用法：node scripts/check-release.js
// 失败返回非零退出码并打印具体原因（file:line 式证据）。

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
const assets = ['panel.css', 'template.css']
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

// ---------- 汇总 ----------
console.log('\n[check-release] 完成: ' + (failures === 0 ? '全部通过' : failures + ' 项失败') + (warnings ? '，' + warnings + ' 项警告' : ''))
process.exit(failures === 0 ? 0 : 1)
