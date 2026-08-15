// scripts/extract-assets.js —— 从当前 plugin/client.js 精确抽取 CSS 资产到 plugin/assets/
// 一次性迁移工具：读取 TYPO_CSS / PANEL_CSS / TEMPLATE_CSS 数组字面量，
// 还原为纯 CSS 文本（每元素一行）写入 assets 文件。
// 用法：node scripts/extract-assets.js

const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '..', 'plugin', 'client.js'), 'utf8')

function extractArray(name) {
  const startMark = 'const ' + name + ' = ['
  const si = src.indexOf(startMark)
  if (si < 0) throw new Error('找不到 ' + startMark)
  // 找到配对的 ]（忽略字符串内部）
  let i = si + startMark.length
  let depth = 1
  const chunks = []
  let cur = ''
  while (i < src.length && depth > 0) {
    const c = src[i]
    if (c === "'" || c === '"') {
      const q = c
      cur += c
      i++
      while (i < src.length) {
        const ch = src[i]
        if (ch === '\\') { cur += ch + (src[i + 1] || ''); i += 2; continue }
        cur += ch
        i++
        if (ch === q) break
      }
      continue
    }
    if (c === '[') depth++
    if (c === ']') depth--
    if (depth > 0) cur += c
    i++
  }
  // 解析元素（单引号字符串，含 \n 转义）
  const re = /'((?:[^'\\]|\\.)*)'/g
  const items = []
  let m
  while ((m = re.exec(cur)) !== null) {
    items.push(m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\'))
  }
  return items.join('\n') + '\n'
}

const outDir = path.join(__dirname, '..', 'plugin', 'assets')
fs.mkdirSync(outDir, { recursive: true })

const jobs = [
  ['TYPO_CSS', 'typography.css'],
  ['PANEL_CSS', 'panel.css'],
  ['TEMPLATE_CSS', 'template.css'],
]
for (const [name, file] of jobs) {
  const css = extractArray(name)
  fs.writeFileSync(path.join(outDir, file), css)
  console.log(`[extract] ${name} → plugin/assets/${file}: ${css.length} bytes`)
}
console.log('[extract] done')
