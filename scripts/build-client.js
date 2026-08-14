// ============================================================
// 构建脚本：把 themes/*.css 内联进 plugin/client.js 的 THEMES 注册表
// 用法：node scripts/build-client.js
// 输入：themes/*.css（主题定义，唯一事实源）+ plugin/src/client.core.js（逻辑骨架）
// 输出：plugin/client.js（构建产物 —— 定义 Cordis Package 时使用）
// 纪律：THEMES 部分禁止手改；改主题只改 themes/*.css，改逻辑只改 client.core.js
// ============================================================

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const themesDir = path.join(root, 'themes')
const coreFile = path.join(root, 'plugin', 'src', 'client.core.js')
const outFile = path.join(root, 'plugin', 'client.js')

const MARKER_START = '/*__THEMES_START__*/'
const MARKER_END = '/*__THEMES_END__*/'

// 1) 读取 themes/*.css（按文件名排序，保证输出稳定）
const themeFiles = fs.readdirSync(themesDir)
  .filter((f) => f.endsWith('.css'))
  .sort()

if (themeFiles.length === 0) {
  console.error('[build] themes/ 下没有 css 文件')
  process.exit(1)
}

const entries = []
for (const f of themeFiles) {
  const id = f.replace(/\.css$/, '')
  const css = fs.readFileSync(path.join(themesDir, f), 'utf8')
  // 模板字符串输出：CSS 文件内容不含反引号与 ${，可直接原样嵌入
  entries.push(`  ${JSON.stringify(id)}: { css: \`${css}\` },`)
}

const themesBlock = [
  'const THEMES = {',
  entries.join('\n'),
  '}',
].join('\n')

// 2) 校验 core 文件含标记
const core = fs.readFileSync(coreFile, 'utf8')
const start = core.indexOf(MARKER_START)
const end = core.indexOf(MARKER_END)
if (start < 0 || end < 0) {
  console.error('[build] client.core.js 缺少 THEMES 标记（/*__THEMES_START__*/ ... /*__THEMES_END__*/）')
  process.exit(1)
}

// 3) 替换标记生成 client.js
const generated = core.slice(0, start) + themesBlock + core.slice(end + MARKER_END.length)
fs.writeFileSync(outFile, generated)

// 4) 输出摘要
console.log(`[build] ok: ${themeFiles.length} 个主题已内联 → plugin/client.js`)
for (const f of themeFiles) console.log(`   - ${f}`)
