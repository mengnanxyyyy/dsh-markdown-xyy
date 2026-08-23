// scripts/build-client.js —— 生成 plugin/client.js（供 cordis_define 镜像）
//
// v1.2.0 起架构变更：主题/骨架/面板样式/模板全部由 Host 从文件读取（RPC），
// 客户端不再内联 CSS —— 因此本脚本只做「源 → 产物」拷贝 + 资产完整性检查。
//
// 用法：node scripts/build-client.js
// 产物：plugin/client.js == plugin/src/client.core.js（禁止手改 client.js）

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const core = path.join(root, 'plugin', 'src', 'client.core.js')
const out = path.join(root, 'plugin', 'client.js')

// 资产完整性检查（运行时由 Host 读取，缺文件会导致面板无样式）
// v1.8.0：typography.css 已删除（排版骨架停用），哨兵改为 panel.css + themes/strawberry-mocha.css
// v1.12.0：template-strawberry.css 已删除（新建用户主题改取内置主题内容）
const assets = ['panel.css', 'template.css']
const assetRoot = path.join(root, 'plugin', 'assets')
let missing = 0
for (const a of assets) {
  const p = path.join(assetRoot, a)
  if (!fs.existsSync(p)) {
    console.error(`[build] ⚠️ 缺少资产文件 plugin/assets/${a}`)
    missing++
  }
}
// 项目根探测哨兵双文件（与 host.js resolveProjectRoot 保持一致）
for (const s of ['panel.css', 'themes/strawberry-mocha.css']) {
  if (!fs.existsSync(path.join(assetRoot, s))) {
    console.error(`[build] ⚠️ 缺少项目根探测哨兵 plugin/assets/${s}`)
    missing++
  }
}
if (missing > 0) process.exit(1)

const src = fs.readFileSync(core, 'utf8')
fs.writeFileSync(out, src)
console.log(`[build] ok: plugin/src/client.core.js → plugin/client.js (${src.length} bytes，资产完整)`)
