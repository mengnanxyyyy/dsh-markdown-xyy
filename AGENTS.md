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
10. 主题 CSS 内定义 14 个 `--dsw-alias-*` 全局 token（浅/深，v2.1.0 起 DSH 新增 idle）+ `--mdvr-*` 强调变量；**不再调用 `theme.overrideTokens`**；`panel.css` 里 `var(--mdvr-*)` 必须带默认回退值（如 `var(--mdvr-accent, #5856d6)`）。
11. **选择持久化（v1.16.0）**：选中主题写入浏览器 `localStorage`（键 `mdvr:theme:selection`），刷新/新开页面/重启自动恢复；启动恢复校验（内置/系统自带直用；用户主题先拉目录再校验，读取失败保留不覆盖、主题被删则清存储）；`applySelection` 成功即写入（`persist=false` 供启动恢复路径，避免回退值污染存储）；跨标签页经 `storage` 事件实时同步。外观模式不重复持久化（产品 `theme.setTheme` 自带）。存储不可用（隐私模式/沙箱）时静默回退会话级内存态。
12. **主题对产品的写入面只有四组（v2.0.2 核定，勿扩大）**：① L0 平台 token 14 个（v2.1.0 起 DSH 新增 idle）② 字体 token `--dsw-font-family` / `--ds-font-family-code` ③ 语法高亮 `--shiki-token-*` 9 个 ④ 对话流间距 `--dsh-chat-flow-gap`。清单与门禁项对应见 `docs/variables.md` §2.1。四条踩过的坑：
    - **代码着色只能经 `--shiki-token-*` 变量**：DSH 无 Prism/Highlight.js（全产物无 `hljs`/`token` 类名），走 Shiki css-variables 主题，token 色由内联 style 落地。**`.token.*` / `.hljs-*` 选择器永不命中**——v1.10.0–v2.0.2 整段规则都是死代码，v2.0.2 已删除。`--hl-*` 保留为调色单一真源，经 `--shiki-token-*: var(--hl-*)` 映射生效。已知取舍：Shiki 无 per-token 选择器，关键字加粗无法保留。
    - **markdown 字体必须覆盖 `--dsw-font-family` / `--ds-font-family-code`**：产品的 markdown 字体 token 全部由这两个派生且 `var()` 在使用处解析；只在 `body` 设 `font-family` 没用（产品容器有 `font:` 简写、h1–h4 各有自己的 token）。另注意**没有** `--dsw-font-family-mono` 这个 token。
    - **对话流间距不能用 flex `gap`**：产品该列没有 `gap`，间距是兄弟元素 `margin-top: var(--dsh-chat-flow-gap,16px)`；`gap` 与 margin **叠加不折叠**，写 `gap:5px` 会把 16px 变成 21px（与收紧意图相反）。
    - **文件引用胶囊是 `<button>` 不是 `<a>`**：行内文件引用用 `[class*="_fileMention_"]` 定位（`data-ref-chip` 属性仅在部分情况存在，不可依赖）。
    - **写注释也要当代码看**：门禁分析前会剥 CSS 注释（`stripCssComments`）——注释里提到 token 名/选择器不会被误判。改门禁时别退回"按行首猜注释"的做法。

## 构建约定

- `plugin/client.js` = `plugin/src/client.core.js` 的拷贝（构建产物，禁止手改）；改逻辑只改 `plugin/src/client.core.js`，然后运行 `node scripts/build-client.js`。
- **常驻安装通道（与动态 define 并存）**：`node scripts/build-installed.js` 从同一份源码生成 `lib/index.mjs`（Host 半 ESM 包入口）+ `client/client.js`（`__ModuleLoader__` 注册）；安装进 profile：`dsh plugin --profile web add dsh-markdown-xyy`（npm registry，已发布），卸载 `remove`；发新版走 npm 发布（`package.json` 的 `prepack` 钩子自动重建常驻双半 + 跑门禁）。通道差异只在 host.js 的 `registerRpc`（有 harness 走 harness.handle，无 harness 走 `ctx.get('webServer')` HTTP 路由 `/mdvr/api/*`）与 client 包装器内的 host/styles 桥。**改 host.js / client.core.js 后两个通道的产物都要重新生成**（build-client.js + build-installed.js）。
- 发布门禁：`node scripts/check-release.js`（MANIFEST 一致性 / 语法 / 资产存在 / CSS 契约 / packageId 唯一 / 常驻双半语法 / **DSH 兼容基线**）。

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

- 能控制：① 全局 14 token（浅/深，v2.1.0 起 DSH 新增 idle）② `--mdvr-*` 强调变量 ③ 元素排版（产品 `._markdown_*` 兜底 + 主题 `:where()` 增量覆盖）④ 面板 UI（panel.css）
- 不能：改产品 DOM；token 名单固定；`:where()` 零优先级（产品显式样式优先）。持久化已解决：选中主题存 `localStorage`（见 主题铁律 11），不再「刷新恢复 `DEFAULT_SELECTION`」

## DSH 版本对齐基线

- **基线声明**：`package.json` 的 `dshCompatibility`（**独立顶层字段**）。⚠️ 不要塞进 `dsh` 字段——那是 DSH 自身的 `bundle` / `client` 登记位，被 profile boot 与 patch 机制消费，塞额外键有被误读的风险。当前基线 **DSH 0.1.7-rc.2**（复验 2026-09-26），随附 **cordis 4.0.4**。
- **门禁第 11 项**（`check-release.js`）做三方比对「声明基线 ↔ 本机 DSH 运行时权威源 ↔ 4 套内置主题 CSS」：
  - `themeTokens`（14 个）↔ DSH `dsh-client-ui-theme` 产物里的冻结数组 `BUILTIN_INSPECT_TOKENS`（即客户端 `Theme.listTokens` 的源）↔ 各主题 CSS 实际定义名单；
  - `slots`（`settings.section` / `tool.view.cordis`）↔ DSH 对应 `.d.ts` 契约文件；
  - `darkAttribute`（`data-ds-dark-theme`）↔ DSH 主题产物是否仍按该属性切深色档；
  - `cordis` ↔ DSH bundling 的 `@deepseek-ai/cordis` 是否仍落在 `peerDependencies` 声明的范围内（第 11.6 项）。**这条防的是 DSH 换 cordis 大版而插件声明静默脱节**——npm 不会在此处校验 peer 范围。范围匹配由门禁内置的极简 `satisfiesRange`（仅支持 `^X.Y.Z` 与精确版本）完成，**不引 semver 依赖**；解析不出范围时降级为警告，不假装通过。
- **README 版本表**：`README.md` 的「版本与兼容性」与 `README.en.md` 的「Versions & compatibility」各含一张 `| 本项目版本 | 对齐的 DSH 版本 |` 表格。⚠️ 这是**新增的版本同步点**（连同四处 MANIFEST → 共 6 处），门禁第 11.2 项会核对它是否等于 `package.json` 的 `version` 与 `dshCompatibility.verifiedAgainst`——改版本号时别忘了这两张表，改标题文字也要同步改门禁里的锚点字符串（`extractReadmeVersions` 按标题定位）。
- **判定取向**：名单不一致 / 槽位消失 / 深色标记消失 / cordis 越出 peer 范围 = **fail**（精确漂移信号）；本机未装 DSH、基线版本号过期（DSH 或 cordis 记录与实测不同但仍在范围内）、DSH 内部结构变化导致解析失败 = **warn**（环境差异，不拦离线贡献者与 git 安装）。
- **动态客户端 ctx 门禁（已核，勿踩）**：DSH 动态沙箱里 `ctx.get(name)` 是**可选查询、无需声明**，而直接 `ctx.<服务名>` 访问**必须**在插件返回对象的 `inject` 里声明，否则被 Guard 拒绝。本项目**全量使用 `ctx.get(...)`**，因此 `dsh.client.inject: []` 正确且完整；若哪天改成直接访问，必须同步补 `inject`。另：`slots` 由静态外壳模块 `dsh-client-ui-slots` 提供（该包无 `dsh.client`），天然先于所有动态插件，无需 inject。
- **`dsh.client.external` 无需声明**：外壳有冻结的 `PLATFORM_MODULES` 基座（React / Cordis / 静态 UI 库），`external` **只用于追加基座之外的模块请求**。本项目客户端半只 `require('react')`（在基座内），故留空；官方仅用 React 的包同样不声明。
- **门禁不假装覆盖**：`hostServices`（fs/shell/sandboxPolicy/webServer）与 `clientServices`（theme）的方法签名**无法从文件静态判定**，列为 `manualCoverage`——DSH 升版后需人工经 `cordis_inspect_query`（Host/Client `Service.listService`）复验，再更新基线。
- **DSH 升版后的标准动作**：① 用 `cordis_inspect` 复验 host/client 服务签名 ② 跑门禁看第 11 项是否报警 ③ 更新 `dshCompatibility.verifiedAgainst` / `verifiedDate` / `cordis` ④ 若 DSH 增删了 token 或槽位，先改主题 CSS 与插件注册，再更新声明。
- **排障提醒**：客户端 bundle 的 URL 必须带**精确 `?rev=`**（DSH 内部按 `chunkUrl(id, file, rev)` 全等匹配），直接 `curl /plugins/<id>/client.js` 会拿到 404——那是请求形状问题，**不等于插件没加载**。要判断客户端半是否真的加载，查 `cordis_inspect_query`（client / Slots）的槽位 **occupants**。
- 探测本机 DSH 安装根的顺序：`DSH_INSTALL_ROOT` 环境变量 → PATH 上 `dsh` 可执行文件逐级上溯 → Node 全局 `node_modules` 布局。

## 发布许可（最高优先级，2026-08-29 用户明示）

- **未获用户明确确认，禁止任何发布动作**：① 打 tag（`git tag`）② push 到 GitHub ③ `npm publish`。
- 日常开发只允许**本地 `git commit`**（改代码/重建产物/改 docs 等均属开发，可自主进行），但**不得**因此顺带 tag / push / publish。
- 需要发布时，先向用户说明将执行哪一步（tag / push / publish），**等用户明确同意后才执行**；被拒或未答复均视为不执行。
- 违反后果按越权处理：已打未确认的 tag 需主动删除并向用户说明。

## 标准迭代流程

1. 决定版本号（semver）→ 同步更新 `plugin/host.js` + `plugin/src/client.core.js` 的 MANIFEST（双份一致）+ `README.md` / `README.en.md` 的「版本与兼容性」表（**门禁第 11.2 项会核对**）
2. 改资产或逻辑 → `node scripts/build-client.js`
3. `manifest/versions.json` 顶部插入条目（packageId 留空）
4. `node scripts/check-release.js`
5. minify 双半 → `cordis_define`（kind: existing，双半一次传完）
6. `cordis_inspect_self` 核对 → `cordis_run`（update，可能需审批）→ 验证
7. 回填 packageId → `git commit`（本地提交）——**tag / push / npm publish 走「发布许可」规则，未经用户确认不得执行**

## 常见坑

- **改了主题资产但 GUI 没变化（v2.0.2 实测确认）**：常驻安装通道下 Host 的资产根优先取 **`__MDVR_PKG_ROOT__`（插件包自身目录）**，而不是工作区仓库 —— 所以改 `plugin/assets/themes/*.css` 后，运行中的 GUI 仍读 `~/.dsh/profiles/web/node_modules/dsh-markdown-xyy/` 里那份**独立副本**（非软链）。验证方法：`POST /mdvr/api/themes.builtin.get {id,index}` 拉全分片后与工作区文件 `cmp`。要让改动可见：① 升版并重装该包（走发布流程）② 从本地仓库路径安装 ③ 走动态 define 通道（无 `__MDVR_PKG_ROOT__` → 回退 `resolveProjectRoot` → 工作区）④ 临时预览：把修好的 CSS 作为**用户主题**放进 `~/.dsh/web-themes-xyy/`（插件原生支持的路径，不动安装包）。
- define 漏传 host 或 client → 先 `cordis_inspect_self` 确认双半完整再 run
- 消息超长静默截断成残缺包（约 26KB 转义上限）→ 用 minify 产物；define 后 inspect 核对
- 浅档语义色要过 WCAG AA：error `#c74330` / success `#287b38` / warn `#985d00`（浅档参考值）
- `body[data-ds-dark-theme]` 选择器拼错 → 深色档不回退
- 动态插件是内存态：进程重启后插件丢失，需用 `plugin/host.js` + `plugin/client.js`（minify 后）重新 define（台账历史在 `manifest/versions.json`）
- packageId 按进程分配、随重启重置：新进程 define 可能拿到与旧条目相同的 id（check-release 对 packageId 重复降级为警告）
- 审批被拒不要重复请求；技术失败读 `cordis_inspect_self` 诊断后修同一插件

## 当前状态

- 当前版本 v2.1.0（DSH 0.1.7 对齐：DSH 新增 `--dsw-alias-state-idle-primary`，L0 名单 13→14，4 套内置主题浅/深同步补值 + 基线升 0.1.7-rc.2 / cordis 4.0.4 + docs 全套同步。v2.0.3 主题消费面修复：6 类「改了却没效果」的问题 + 门禁第 12 节防回归。v2.0.2 移除启动期 console 日志；v2.0.1 修复常驻/npm 通道：__MDVR_PKG_ROOT__ 包目录资产解析 + Host inject webServer + 路由注册加固；v2.0.0 首个正式版 = 持久化 + 底子主题 + `~/.dsh/web-themes-xyy` + 四套内置主题）；内置主题 4 个；路线图见 docs/capabilities.md。
- **DSH 版本对齐（v2.0.2 补充，未升版本）**：`package.json` 新增 `dshCompatibility` 基线（DSH 0.1.6-alpha.2 / cordis 4.0.2），`@deepseek-ai/cordis` peerDep 收紧为 `^4.0.2`（与 DSH 0.1.6 随附版本及官方包一致），`check-release.js` 新增第 11 项门禁，`README.md` / `README.en.md` 新增「本项目版本 / 对齐的 DSH 版本」表格（受第 11.2 项核对）。本次仅动声明与门禁，**未改任何运行逻辑**，故四处 MANIFEST 版本号保持 v2.0.2 不变、无需重建产物。详见「DSH 版本对齐基线」章节。
- **主题消费面修复（v2.0.3）**：审计 4 套内置主题与 DSH 0.1.6 的消费层契约，修掉 6 类「改了却没效果」的问题——① 对话流间距 `gap` 反向叠加（改为 `--dsh-chat-flow-gap`）② §6 语法高亮整段死代码（改用 `--shiki-token-*` 映射）③ markdown 正文不跟随主题字体（覆盖 `--dsw-font-family` / `--ds-font-family-code`）④ 代码块语言标签选错元素 ⑤ 行内文件引用胶囊漏覆盖 ⑥ 两处失效文档引用 + `--mdvr-highlight-soft` 死变量标注。`check-release.js` 新增第 12 节（5 项）防回归，并在分析前剥 CSS 注释。详见「主题铁律」第 12 条与 `docs/variables.md` §2.1 / §五。⚠️ 本次只改**资产与声明**，未动插件运行逻辑；但因为资产走 `__MDVR_PKG_ROOT__`，**当前 GUI 仍是旧主题**，需重装该包或走用户主题通道才可见（见「常见坑」）。
- **兼容性已复验（2026-09-26，v2.1.0）**：本机 DSH 0.1.7-rc.2，门禁第 11 项三方比对全过（14 token 逐名一致 / 双槽位在 / 深色标记在 / cordis 4.0.4 落在 ^4.0.2 内），README 双表同步。上次端到端 RPC + occupants 实测仍是 2026-09-19（DSH 0.1.6-alpha.2：`themes.builtin.list` 4 套 / `themes.user.list` 3 套 / `themeAssets.get` total=2；`settings.section#mdvr-theme` 与 `tool.view.cordis#self` 均 `active: true`）——v2.1.0 的 define 后需重跑一次端到端再确认。
- 提交历史已重建为「每发布版本一个提交 + 顶部 docs 提交」（共 36 个）；旧历史备份在本地分支 `backup-pre-cleanup`，**勿推送**。
- README 双语维护（`README.md` 中文 + `README.en.md` 英文镜像，顶部互挂语言徽章）：公众版只展示「安装即用」（npm registry / github:），**勿回填**动态 define、`file:` 本地开发类内容（动态 define 流程只存在于 docs/development.md）；主题预览图 = `screenshots/*.jpg`（4 张，README 画廊引用）。
- 待决：`plugin/host.js` 的 FALLBACK_* 常量硬编码了本机目录（运行时兜底，功能正常；公开仓库可见，未定是否中性化）。