// scripts/minify.js —— 安全精简 plugin/client.js / plugin/host.js 用于 cordis_define 传输
//
// 策略（语义零风险）：
//   · 逐字符状态机（normal / '...' / "..." / `...` / 正则 / // 注释 / /* */ 注释）
//   · 注释删除；空白折叠（含换行的空白→单个换行，否则→单个空格）→ ASI 语义原样保留
//   · 字符串、模板字面量（含内部 CSS）内容逐字保留
//   · 可选 --strip-css-comments：仅剥离模板字面量内部的 /* */（CSS 注释，无行为影响）
// 验证：node --check <out>（语法）+ token 流对比（语义等价，忽略空白/注释）
//
// 用法：node scripts/minify.js <in> <out> [--strip-css-comments]

const fs = require('fs')

function tokenize(src, stripCssComments) {
  const toks = []   // 语义 token（忽略空白与注释）
  const out = []    // 输出字符
  let i = 0
  const n = src.length
  let lastSig = '\n'
  const isRegexStart = (prev) => prev === '\n' || prev === '' || /^[(\[,=:!&|?{};+\-*%^~<>]$/.test(prev)

  while (i < n) {
    const c = src[i]
    const c2 = src[i + 1]
    // 行注释：删除（保留其后的换行，由空白分支处理）
    if (c === '/' && c2 === '/') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    // 块注释：删除；若含换行则补一个换行（保持语句边界）
    if (c === '/' && c2 === '*') {
      let hadNl = false
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') hadNl = true
        i++
      }
      i += 2
      if (hadNl) out.push('\n')
      continue
    }
    // 空白：含换行 → 单个换行；否则 → 单个空格（绝不合并运算符）
    if (/\s/.test(c)) {
      let hadNl = false
      while (i < n && /\s/.test(src[i])) {
        if (src[i] === '\n') hadNl = true
        i++
      }
      out.push(hadNl ? '\n' : ' ')
      continue
    }
    // 字符串
    if (c === '"' || c === "'") {
      const q = c
      let s = q
      i++
      while (i < n) {
        const ch = src[i]
        if (ch === '\\') { s += ch + (src[i + 1] || ''); i += 2; continue }
        s += ch
        i++
        if (ch === q) break
      }
      out.push(s)
      toks.push('STR')
      lastSig = 's'
      continue
    }
    // 模板字面量（含 ${} 嵌套）；可选剥离内部 CSS 注释
    if (c === '`') {
      let s = '`'
      i++
      let depth = 0
      while (i < n) {
        const ch = src[i]
        if (ch === '\\') { s += ch + (src[i + 1] || ''); i += 2; continue }
        s += ch
        i++
        if (ch === '`' && depth === 0) break
        if (ch === '$' && src[i] === '{') { s += '{'; i++; depth++ }
        else if (ch === '}' && depth > 0) { depth-- }
      }
      if (stripCssComments) {
        s = s.replace(/\/\*[\s\S]*?\*\//g, '')
      }
      out.push(s)
      toks.push('TPL')
      lastSig = 't'
      continue
    }
    // 正则字面量
    if (c === '/' && isRegexStart(lastSig) && c2 !== '/' && c2 !== '*') {
      let s = '/'
      i++
      let inClass = false
      while (i < n) {
        const ch = src[i]
        if (ch === '\\') { s += ch + (src[i + 1] || ''); i += 2; continue }
        if (ch === '\n') break
        s += ch
        i++
        if (ch === '[') inClass = true
        else if (ch === ']') inClass = false
        else if (ch === '/' && !inClass) break
      }
      out.push(s)
      toks.push('REGEX')
      lastSig = 'r'
      continue
    }
    out.push(c)
    toks.push(c)
    lastSig = c
    i++
  }
  return { out, toks }
}

function assertSemanticEqual(a, b) {
  const ta = tokenize(a).toks.join('|')
  const tb = tokenize(b).toks.join('|')
  if (ta !== tb) {
    let k = 0
    while (k < Math.min(ta.length, tb.length) && ta[k] === tb[k]) k++
    throw new Error('token 流不一致，首个差异位置 ' + k +
      '\n  原: ' + JSON.stringify(ta.slice(Math.max(0, k - 40), k + 40)) +
      '\n  新: ' + JSON.stringify(tb.slice(Math.max(0, k - 40), k + 40)))
  }
}

const [, , input, output, flag] = process.argv
const src = fs.readFileSync(input, 'utf8')
const { out } = tokenize(src, flag === '--strip-css-comments')
let res = out.join('')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .replace(/^ +/gm, '')
  .trim()
res += '\n'
assertSemanticEqual(src, res)
fs.writeFileSync(output, res)
console.log(`[minify] ${input} → ${output}: ${src.length} → ${res.length} bytes (${Math.round((1 - res.length / src.length) * 100)}%↓), token 流等价 ✓`)
