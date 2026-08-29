# AGENTS.md — 项目记忆（dsh-markdown-xyy）

> 本文件是给未来 Agent 的项目约定备忘录。动手前先读这里。

## 项目是什么

DeepSeek Harness 上的动态 Cordis 插件（pluginId 前缀 `mdvr`）：**版本记录 + Markdown 对话主题排版**。
- Host 半：版本台账（`versions.note` / `versions.list` RPC，内存态）+ 主题资产/用户主题读写
- Client 半：主题系统（选择引擎 + 设置页 + 编辑器）+ 版本面板
- 源码镜像：`plugin/host.js` + `plugin/client.js`（`client.js` 是构建产物，勿手改）

## 主题铁律（最重要）

1. **主题 = CSS 资产文件**：
   - 内置主题：`plugin/assets/themes/*.css`（当前 4 个：`strawberry-mocha` 标准参考 + `Cyber-Titanium-native` + `High-Vis-Clarity-native` + `Pine-Smoke-Ink-native`）
   - 共享资产：`plugin/assets/panel.css`（面板与设置页样式）/ `template.css`（完整参考主题，仅作新建回退）
   - 用户主题：`$HOME/.dsh/web-themes/*.css` —— 放 CSS 即新主题，无需打包/升级插件
2. **改文件即生效**：Host 每次从文件读取（`themes.builtin.list` / `themes.builtin.get` / `themeAssets.get` / `themes.user.*`），客户端不内联 CSS。
3. **大文本分块协议**：RPC 单条消息上限约 16KB；所有大文本（主题/模板/资产）按 **8000 字符/片** 分块传输。get 侧 `{index, total, chunk}` 循环拉取（校验 index/total 一致）；save 侧按 uploadId 隔离缓冲，**分片全部到齐后** Host 再校验写盘（杜绝缺片/并发混片）。**任何新的大内容 RPC 都必须分块**。
4. **CSS 校验**：保存前 `validateCss`（client 端即时反馈 + Host 写盘前强制，双端同逻辑）检查注释/字符串/花括号/圆括号闭合，错误拒绝保存；超 100KB 拒绝。
5. **项目根探测**：⚠️ `sandboxPolicy.workspaceRoot` 是 DSH 主进程启动目录、不一定是插件项目目录。Host 用 `resolveProjectRoot` 按内容探测（workspaceRoot → 父目录及一级子目录 → `FALLBACK_PROJECT_DIR`），以 `plugin/assets/panel.css` + `plugin/assets/themes/strawberry-mocha.css` 并存为哨兵，首次解析后缓存。**fs 服务的 stat/readText/listDir/writeText 必须传 `resolve()` 返回的句柄对象（{targetKey}），不能传字符串路径**。
6. **用户主题目录不硬编码**：shell 读 `$HOME` → workspaceRoot 推导 → `FALLBACK_USER_THEMES_DIR` 三级回退（`resolveUserThemesDir`）。
7. **挂载机制与产品一致**：浅色写 `body { ... }`，深色写 `body[data-ds-dark-theme] { ... }`（产品用属性选择器，不用 `prefers-color-scheme`）；样式注入晚于产品样式表，同选择器后者胜出。
8. **选择模型**：默认 `system-native`（插件零干预、深浅跟随系统）；内置/用户主题互斥单选；外观 ☀️/🌙/🖥️ 对任意选中主题可用（仅 `themeService` 缺失时禁用）。
9. **用户主题可编辑，内置主题只读**：编辑器 = 透明 textarea 叠彩色 pre 语法高亮 + 格式化 + 保存；「新建用户主题」默认模板取内置 `strawberry-mocha` 内容本身，加载失败回退 `template.css`。
10. 主题 CSS 内定义 13 个 `--dsw-alias-*` 全局 token（浅/深）+ `--mdvr-*` 强调变量；**不再调用 `theme.overrideTokens`**；`panel.css` 里 `var(--mdvr-*)` 必须带默认回退值（如 `var(--mdvr-accent, #5856d6)`）。

## 构建约定

- `plugin/client.js` = `plugin/src/client.core.js` 的拷贝（构建产物，禁止手改）；改逻辑只改 `plugin/src/client.core.js`，然后运行 `node scripts/build-client.js`。
- **常驻安装通道（与动态 define 并存）**：`node scripts/build-installed.js` 从同一份源码生成 `lib/index.mjs`（Host 半 ESM 包入口）+ `client/client.js`（`__ModuleLoader__` 注册）；安装进 profile：`dsh plugin --profile web add dsh-markdown-xyy`（npm registry，已发布）← 首选，`add github:mengnanxyyyy/dsh-markdown-xyy[#tag]`（GitHub 备选）/ `add file:/本仓库绝对路径`（本地开发），卸载 `remove`；发新版流程 = 升版本 + `npm publish --registry=https://registry.npmjs.org`（prepack 钩子自动重建+门禁）。通道差异只在 host.js 的 `registerRpc`（有 harness 走 harness.handle，无 harness 走 `ctx.get('webServer')` HTTP 路由 `/mdvr/api/*`）与 client 包装器内的 host/styles 桥。**改 host.js / client.core.js 后两个通道的产物都要重新生成**（build-client.js + build-installed.js）。
- 发布门禁：`node scripts/check-release.js`（MANIFEST 一致性 / 语法 / 资产存在 / CSS 契约 / packageId 唯一 / 常驻双半语法）。

## define 传输约定

- 每次 `cordis_define` 必须同时传 `code.host` + `code.client` 双半（单包双半；host-only 或 client-only 是废包）。
- 用 minify 产物传输（单条消息约 26KB 转义字节上限，全文放不下）：
  ```bash
  node scripts/minify.js plugin/host.js /tmp/host.min.js
  node scripts/minify.js plugin/client.js /tmp/client.min.js   # 可选 --strip-css-comments
  node --check /tmp/host.min.js && node --check /tmp/client.min.js
  ```
- define 后用 `cordis_inspect_self` 核对双半完整，再 `cordis_run`。

## 能力边界（详见 docs/themes.md）

- 能控制：① 全局 13 token（浅/深）② `--mdvr-*` 强调变量 ③ 元素排版（产品 `._markdown_*` 兜底 + 主题 `:where()` 增量覆盖）④ 面板 UI（panel.css）
- 不能：改产品 DOM；token 名单固定；`:where()` 零优先级（产品显式样式优先）；无持久化（内存态，刷新恢复 `DEFAULT_SELECTION`）

## 标准迭代流程

1. 决定版本号（semver）→ 同步更新 `plugin/host.js` + `plugin/src/client.core.js` 的 MANIFEST（双份一致）
2. 改资产或逻辑 → `node scripts/build-client.js`
3. `manifest/versions.json` 顶部插入条目（packageId 留空）
4. `node scripts/check-release.js`
5. minify 双半 → `cordis_define`（kind: existing，双半一次传完）
6. `cordis_inspect_self` 核对 → `cordis_run`（update，可能需审批）→ 验证
7. 回填 packageId → `git commit` + `git tag vX.Y.Z`

## 常见坑

- define 漏传 host 或 client → 先 `cordis_inspect_self` 确认双半完整再 run
- 消息超长静默截断成残缺包（约 26KB 转义上限）→ 用 minify 产物；define 后 inspect 核对
- 浅档语义色要过 WCAG AA：error `#c74330` / success `#287b38` / warn `#985d00`（浅档参考值）
- `body[data-ds-dark-theme]` 选择器拼错 → 深色档不回退
- 动态插件是内存态：进程重启后插件丢失，需用 `plugin/host.js` + `plugin/client.js`（minify 后）重新 define（台账历史在 `manifest/versions.json`）
- packageId 按进程分配、随重启重置：新进程 define 可能拿到与旧条目相同的 id（check-release 对 packageId 重复降级为警告）
- 审批被拒不要重复请求；技术失败读 `cordis_inspect_self` 诊断后修同一插件

## 当前状态

- 当前版本 v1.15.0（对话流节点间距紧凑化）；内置主题 4 个；路线图见 docs/capabilities.md。