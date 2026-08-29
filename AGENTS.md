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
   - 共享资产：`plugin/assets/panel.css`（面板与设置页样式）；**`template.css` 已删除（v1.17.0）**——新建用户主题起步一律取自所选内置主题，无独立模板资产
   - 用户主题：`$HOME/.dsh/web-themes-xyy/*.css` —— 放 CSS 即新主题，无需打包/升级插件
2. **改文件即生效**：Host 每次从文件读取（`themes.builtin.list` / `themes.builtin.get` / `themeAssets.get` / `themes.user.*`），客户端不内联 CSS。
3. **大文本分块协议**：RPC 单条消息上限约 16KB；所有大文本（主题/模板/资产）按 **8000 字符/片** 分块传输。get 侧 `{index, total, chunk}` 循环拉取（校验 index/total 一致）；save 侧按 uploadId 隔离缓冲，**分片全部到齐后** Host 再校验写盘（杜绝缺片/并发混片）。**任何新的大内容 RPC 都必须分块**。
4. **CSS 校验**：保存前 `validateCss`（client 端即时反馈 + Host 写盘前强制，双端同逻辑）检查注释/字符串/花括号/圆括号闭合，错误拒绝保存；超 100KB 拒绝。
5. **项目根探测**：⚠️ `sandboxPolicy.workspaceRoot` 是 DSH 主进程启动目录、不一定是插件项目目录。Host 用 `resolveProjectRoot` 按内容探测（workspaceRoot → 父目录及一级子目录 → `FALLBACK_PROJECT_DIR`），以 `plugin/assets/panel.css` + `plugin/assets/themes/strawberry-mocha.css` 并存为哨兵，首次解析后缓存。**fs 服务的 stat/readText/listDir/writeText 必须传 `resolve()` 返回的句柄对象（{targetKey}），不能传字符串路径**。
6. **用户主题目录不硬编码**：shell 读 `$HOME` → workspaceRoot 推导 → `FALLBACK_USER_THEMES_DIR` 三级回退（`resolveUserThemesDir`）。
7. **挂载机制与产品一致**：浅色写 `body { ... }`，深色写 `body[data-ds-dark-theme] { ... }`（产品用属性选择器，不用 `prefers-color-scheme`）；样式注入晚于产品样式表，同选择器后者胜出。
8. **选择模型**：默认 `system-native`（插件零干预、深浅跟随系统）；内置/用户主题互斥单选；外观 ☀️/🌙/🖥️ 对任意选中主题可用（仅 `themeService` 缺失时禁用）。
9. **用户主题可编辑，内置主题只读**：编辑器 = 透明 textarea 叠彩色 pre 语法高亮 + 格式化 + 保存；「新建用户主题」（v1.17.0）**可选底子内置主题**（4 选 1，默认 `strawberry-mocha`），起步 = 底子主题 CSS 整体复制，无独立模板资产（template.css 已删）；内置主题只读。
10. 主题 CSS 内定义 13 个 `--dsw-alias-*` 全局 token（浅/深）+ `--mdvr-*` 强调变量；**不再调用 `theme.overrideTokens`**；`panel.css` 里 `var(--mdvr-*)` 必须带默认回退值（如 `var(--mdvr-accent, #5856d6)`）。
11. **选择持久化（v1.16.0）**：选中主题写入浏览器 `localStorage`（键 `mdvr:theme:selection`），刷新/新开页面/重启自动恢复；启动恢复校验（内置/系统自带直用；用户主题先拉目录再校验，读取失败保留不覆盖、主题被删则清存储）；`applySelection` 成功即写入（`persist=false` 供启动恢复路径，避免回退值污染存储）；跨标签页经 `storage` 事件实时同步。外观模式不重复持久化（产品 `theme.setTheme` 自带）。存储不可用（隐私模式/沙箱）时静默回退会话级内存态。

## 构建约定

- `plugin/client.js` = `plugin/src/client.core.js` 的拷贝（构建产物，禁止手改）；改逻辑只改 `plugin/src/client.core.js`，然后运行 `node scripts/build-client.js`。
- **常驻安装通道（与动态 define 并存）**：`node scripts/build-installed.js` 从同一份源码生成 `lib/index.mjs`（Host 半 ESM 包入口）+ `client/client.js`（`__ModuleLoader__` 注册）；安装进 profile：`dsh plugin --profile web add dsh-markdown-xyy`（npm registry，已发布），卸载 `remove`；发新版走 npm 发布（`package.json` 的 `prepack` 钩子自动重建常驻双半 + 跑门禁）。通道差异只在 host.js 的 `registerRpc`（有 harness 走 harness.handle，无 harness 走 `ctx.get('webServer')` HTTP 路由 `/mdvr/api/*`）与 client 包装器内的 host/styles 桥。**改 host.js / client.core.js 后两个通道的产物都要重新生成**（build-client.js + build-installed.js）。
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
- 不能：改产品 DOM；token 名单固定；`:where()` 零优先级（产品显式样式优先）。持久化已解决：选中主题存 `localStorage`（见 主题铁律 11），不再「刷新恢复 `DEFAULT_SELECTION`」

## 发布许可（最高优先级，2026-08-29 用户明示）

- **未获用户明确确认，禁止任何发布动作**：① 打 tag（`git tag`）② push 到 GitHub ③ `npm publish`。
- 日常开发只允许**本地 `git commit`**（改代码/重建产物/改 docs 等均属开发，可自主进行），但**不得**因此顺带 tag / push / publish。
- 需要发布时，先向用户说明将执行哪一步（tag / push / publish），**等用户明确同意后才执行**；被拒或未答复均视为不执行。
- 违反后果按越权处理：已打未确认的 tag 需主动删除并向用户说明。

## 标准迭代流程

1. 决定版本号（semver）→ 同步更新 `plugin/host.js` + `plugin/src/client.core.js` 的 MANIFEST（双份一致）
2. 改资产或逻辑 → `node scripts/build-client.js`
3. `manifest/versions.json` 顶部插入条目（packageId 留空）
4. `node scripts/check-release.js`
5. minify 双半 → `cordis_define`（kind: existing，双半一次传完）
6. `cordis_inspect_self` 核对 → `cordis_run`（update，可能需审批）→ 验证
7. 回填 packageId → `git commit`（本地提交）——**tag / push / npm publish 走「发布许可」规则，未经用户确认不得执行**

## 常见坑

- define 漏传 host 或 client → 先 `cordis_inspect_self` 确认双半完整再 run
- 消息超长静默截断成残缺包（约 26KB 转义上限）→ 用 minify 产物；define 后 inspect 核对
- 浅档语义色要过 WCAG AA：error `#c74330` / success `#287b38` / warn `#985d00`（浅档参考值）
- `body[data-ds-dark-theme]` 选择器拼错 → 深色档不回退
- 动态插件是内存态：进程重启后插件丢失，需用 `plugin/host.js` + `plugin/client.js`（minify 后）重新 define（台账历史在 `manifest/versions.json`）
- packageId 按进程分配、随重启重置：新进程 define 可能拿到与旧条目相同的 id（check-release 对 packageId 重复降级为警告）
- 审批被拒不要重复请求；技术失败读 `cordis_inspect_self` 诊断后修同一插件

## 当前状态

- 当前版本 v1.18.0（用户主题目录改名 `~/.dsh/web-themes-xyy`，避免与 DSH 官方目录名冲突；v1.17.0 新建可选底子主题；v1.16.0 主题选择持久化）；内置主题 4 个；路线图见 docs/capabilities.md。
- 提交历史已重建为「每发布版本一个提交 + 顶部 docs 提交」（共 36 个）；旧历史备份在本地分支 `backup-pre-cleanup`，**勿推送**。
- README 双语维护（`README.md` 中文 + `README.en.md` 英文镜像，顶部互挂语言徽章）：公众版只展示「安装即用」（npm registry / github:），**勿回填**动态 define、`file:` 本地开发类内容（动态 define 流程只存在于 docs/development.md）；主题预览图 = `screenshots/*.jpg`（4 张，README 画廊引用）。
- 待决：`plugin/host.js` 的 FALLBACK_* 常量硬编码了本机目录（运行时兜底，功能正常；公开仓库可见，未定是否中性化）。