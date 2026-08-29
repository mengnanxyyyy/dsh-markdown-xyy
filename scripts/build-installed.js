// scripts/build-installed.js —— 生成常驻安装包的双半产物（零第三方依赖）
//
// 常驻安装（dsh plugin --profile web add file:本仓库）与动态 define 共用同一份源码：
//   · 源：plugin/host.js（Host 半）+ plugin/src/client.core.js（Client 半）
//   · 产物：
//       lib/index.mjs       —— Host 半：ESM 导出 { name, inject, apply }（npm 包 main，.mjs 无条件按 ESM 解析）
//       client/client.js    —— Client 半：window.__ModuleLoader__.load 注册（npm 包 exports "./client"）
//   · 差异只在通道：动态模式用 harness 全局 / 全局 host & styles；常驻模式用
//     webServer HTTP 路由（/mdvr/api/*）+ 包装器内自建的 host/styles 桥（同签名）。
//
// 用法：node scripts/build-installed.js
// 产物均为生成文件（禁止手改）；改逻辑只改 plugin/host.js 与 plugin/src/client.core.js。

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const pkgName = pkg.name

function readSource(name) {
  const p = path.join(root, 'plugin', name)
  if (!fs.existsSync(p)) throw new Error('缺少源文件: ' + p)
  return fs.readFileSync(p, 'utf8')
}

// ---------- Host 半：lib/index.mjs ----------
const hostBody = readSource('host.js')
const lib = `// ============================================================
// lib/index.mjs —— 生成文件（scripts/build-installed.js），勿手改。
// 源：plugin/host.js（常驻安装版 Host 半，npm 包 main 入口）。
// 通道说明：body 内 registerRpc() 在无 harness 全局时自动落到 webServer HTTP 路由。
// ============================================================

const plugin = (function () {
${hostBody}
})()

export const name = ${JSON.stringify(pkgName)}
export const inject = plugin.inject || []
export const apply = plugin.apply
`

// ---------- Client 半：client/client.js ----------
const clientBody = readSource('src/client.core.js')
const client = `// ============================================================
// client/client.js —— 生成文件（scripts/build-installed.js），勿手改。
// 源：plugin/src/client.core.js（常驻安装版 Client 半，载体 = __ModuleLoader__ 模块）。
// 差异：动态模式由运行时注入全局 host/styles/React；常驻模式在此包装器内提供同签名桥：
//   · React   —— require('react')（模块表提供）
//   · host    —— fetch 到 Host 半的 webServer 路由 /mdvr/api/<method>（JSON，同 RPC 形状）
//   · styles  —— document.head 注入 <style>（disposer 语义与动态 applySelection 一致）
// 其余逻辑（slots/theme 走 ctx）与动态版完全同源。
// ============================================================

window.__ModuleLoader__ && window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkgName)},
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    // 常驻客户端模块表将 react 作为模块提供（动态版为运行时注入全局）
    var React = require('react')

    // host 桥：Client→Host JSON RPC，协议与动态 harness.handle 一致（{ok,...} 形状原样透传）
    const host = {
      call: async (method, args) => {
        const res = await fetch('/mdvr/api/' + method, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(args || {}),
        })
        if (!res.ok) throw new Error('mdvr rpc http ' + res.status)
        return res.json()
      },
    }

    // styles 桥：注入 <style>，返回 disposer（与动态 applySelection 的 themeDisposer 语义一致）
    const styles = {
      insert: (css) => {
        const el = document.createElement('style')
        el.setAttribute('data-mdvr-style', 'theme')
        el.textContent = String(css || '')
        document.head.appendChild(el)
        return () => { el.remove() }
      },
    }

    const __plugin = (function () {
${clientBody}
    })()

    exports.name = ${JSON.stringify(pkgName)}
    exports.inject = ['slots', 'theme']
    exports.apply = function (ctx) { return __plugin.apply(ctx) }

    return module.exports
  },
})
`

fs.mkdirSync(path.join(root, 'lib'), { recursive: true })
fs.mkdirSync(path.join(root, 'client'), { recursive: true })
fs.writeFileSync(path.join(root, 'lib/index.mjs'), lib, 'utf8')
fs.writeFileSync(path.join(root, 'client/client.js'), client, 'utf8')
console.log('[build-installed] ok: lib/index.mjs + client/client.js（' + pkgName + '）')