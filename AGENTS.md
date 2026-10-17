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
   - 用户主题：`<DSH_HOME>/web-themes-xyy/*.css`（默认 `~/.dsh/web-themes-xyy`；Windows 为 `%USERPROFILE%\.dsh\web-themes-xyy`，即 `C:\Users\<用户名>\.dsh\web-themes-xyy`）—— 放 CSS 即新主题，无需打包/升级插件
2. **改文件即生效**：Host 每次从文件读取（`themes.builtin.list` / `themes.builtin.get` / `themeAssets.get` / `themes.user.*`），客户端不内联 CSS。
3. **大文本分块协议**：RPC 单条消息上限约 16KB；所有大文本（主题/模板/资产）按 **8000 字符/片** 分块传输。get 侧 `{index, total, chunk}` 循环拉取（校验 index/total 一致）；save 侧按 uploadId 隔离缓冲，**分片全部到齐后** Host 再校验写盘（杜绝缺片/并发混片）。**任何新的大内容 RPC 都必须分块**。
4. **CSS 校验**：保存前 `validateCss`（client 端即时反馈 + Host 写盘前强制，双端同逻辑）检查注释/字符串/花括号/圆括号闭合，错误拒绝保存；超 100KB 拒绝。
5. **项目根探测**：⚠️ `sandboxPolicy.workspaceRoot` 是 DSH 主进程启动目录、不一定是插件项目目录。Host 用 `resolveProjectRoot` 按内容探测（常驻通道优先用包装器注入的 `__MDVR_PKG_ROOT__`；动态通道退化为 workspaceRoot → 父目录及一级子目录，**分隔符感知**，POSIX 与 Windows 盘符/UNC 都支持），以 `plugin/assets/panel.css` + `plugin/assets/themes/strawberry-mocha.css` 并存为哨兵，首次解析后缓存。**fs 服务的 stat/readText/listDir/writeText 必须传 `resolve()` 返回的句柄对象（{targetKey}），不能传字符串路径**。
6. **用户主题目录跨平台**（v2.1.3 起，取代旧"三级回退 + 硬编码"）：目录语义 = `<DSH_HOME>/web-themes-xyy`（默认 `~/.dsh/web-themes-xyy`）。`resolveUserThemesDir` 优先级：① 包装器注入 `__MDVR_DSH_HOME__`（`DSH_HOME` 环境变量，缺省 `os.homedir()/.dsh`）② shell 探测 `echo "$HOME"` → `echo "$USERPROFILE"` ③ workspaceRoot 推导（`/home/<u>`、`/Users/<u>`、`C:\Users\<u>`）④ 全失败返回 `null` 降级（**不再硬编码任何机器路径**）。⚠️ 旧代码用 `printf`/`mkdir -p` + `shell.run()`：PowerShell 不认、且 DSH 0.2.x 的 shell 服务根本没有 `run()`（须 `resolve()` + `execute().result()`）；目录创建已交给 `fs.writeText` 的原子写（内部 `mkdir(recursive)`），不需要 shell。
7. **挂载机制与产品一致**：浅色写 `body { ... }`，深色写 `body[data-ds-dark-theme] { ... }`（产品用属性选择器，不用 `prefers-color-scheme`）；样式注入晚于产品样式表，同选择器后者胜出。
8. **选择模型**：默认 `system-native`（插件零干预、深浅跟随系统）；内置/用户主题互斥单选；外观 ☀️/🌙/🖥️ 对任意选中主题可用（仅 `themeService` 缺失时禁用）。
9. **用户主题可编辑，内置主题只读**：编辑器 = 透明 textarea 叠彩色 pre 语法高亮 + 格式化 + 保存；「新建用户主题」（v1.17.0）**可选底子内置主题**（4 选 1，默认 `strawberry-mocha`），起步 = 底子主题 CSS 整体复制，无独立模板资产（template.css 已删）；内置主题只读。
10. 主题 CSS 内定义 14 个 `--dsw-alias-*` 全局 token（浅/深，v2.1.0 起 DSH 新增 idle）+ `--mdvr-*` 强调变量；**不再调用 `theme.overrideTokens`**；`panel.css` 里 `var(--mdvr-*)` 必须带默认回退值（如 `var(--mdvr-accent, #5856d6)`）。
11. **选择持久化（v1.16.0）**：选中主题写入浏览器 `localStorage`（键 `mdvr:theme:selection`），刷新/新开页面/重启自动恢复；启动恢复校验（内置/系统自带直用；用户主题先拉目录再校验，读取失败保留不覆盖、主题被删则清存储）；`applySelection` 成功即写入（`persist=false` 供启动恢复路径，避免回退值污染存储）；跨标签页经 `storage` 事件实时同步。外观模式不重复持久化（产品 `theme.setTheme` 自带）。存储不可用（隐私模式/沙箱）时静默回退会话级内存态。
12. **主题对产品的写入面只有四组（v2.0.2 核定，勿扩大）**：① L0 平台 token 14 个（v2.1.0 起 DSH 新增 idle）② 字体 token `--dsw-font-family` / `--ds-font-family-code` ③ 语法高亮 `--shiki-token-*` 9 个 ④ 对话流间距 `--dsh-chat-flow-gap`。清单与门禁项对应见 `docs/variables.md` §2.1。四条踩过的坑：
    - **代码着色只能经 `--shiki-token-*` 变量**：DSH 无 Prism/Highlight.js（全产物无 `hljs`/`token` 类名），走 Shiki css-variables 主题，token 色由内联 style 落地。**`.token.*` / `.hljs-*` 选择器永不命中**——v1.10.0–v2.0.2 整段规则都是死代码，v2.0.2 已删除。`--hl-*` 保留为调色单一真源，经 `--shiki-token-*: var(--hl-*)` 映射生效。已知取舍：Shiki 无 per-token 选择器，关键字加粗无法保留。
    - **markdown 字体必须覆盖 `--dsw-font-family` / `--ds-font-family-code`，且 v2.1.2 起必须写在 `body{}`**：产品的 markdown 字体 token 全部由这两个派生且 `var()` 在使用处解析；只在 `body` 设 `font-family` 没用（产品容器有 `font:` 简写、h1–h4 各有自己的 token）。⚠️ DSH 0.2.1 把这两者的组合移到 `body{}`（值 = 用户字体角色变量 `--dsh-font-family-text` / `--dsh-font-family-code` + 内置栈，0.2.0 时在 `:root`），直接声明恒压过 `:root` 继承值——所以主题必须同层级覆盖并把角色变量拼在前面：`var(--dsh-font-family-text, <主题字体栈>), <主题字体栈>`；否则主题字体与用户字体设置都落回产品默认栈（门禁 12.7 防回归）。另注意**没有** `--dsw-font-family-mono` 这个 token。
    - **对话流间距不能用 flex `gap`**：产品该列没有 `gap`，间距是兄弟元素 `margin-top: var(--dsh-chat-flow-gap,16px)`；`gap` 与 margin **叠加不折叠**，写 `gap:5px` 会把 16px 变成 21px（与收紧意图相反）。
    - **文件引用胶囊是 `<button>` 不是 `<a>`，且类名无下划线**：行内文件引用用 `[class*="fileMention"]` 定位（产品真实类名 `.fileMention`，CSS Modules `:local`，编译后带 hash；**不要**写成 `[class*="_fileMention_"]`——带下划线的子串在产品产物零命中，v2.0.2→v2.1.1 曾是死规则，门禁 12.6 防回归）。`data-ref-chip` 属性仅在部分情况存在，不可依赖。
    - **写注释也要当代码看**：门禁分析前会剥 CSS 注释（`stripCssComments`）——注释里提到 token 名/选择器不会被误判。改门禁时别退回"按行首猜注释"的做法。

## 构建约定

- `plugin/client.js` = `plugin/src/client.core.js` 的拷贝（构建产物，禁止手改）；改逻辑只改 `plugin/src/client.core.js`，然后运行 `node scripts/build-client.js`。
- **常驻安装通道（与动态 define 并存）**：`node scripts/build-installed.js` 从同一份源码生成 `lib/index.mjs`（Host 半 ESM 包入口）+ `client/client.js`（`__ModuleLoader__` 注册）；安装进 profile：`dsh plugin --profile web add dsh-markdown-xyy`（npm registry，已发布），卸载 `remove`；发新版走 npm 发布（`package.json` 的 `prepack` 钩子自动重建常驻双半 + 跑门禁）。通道差异只在 host.js 的 `registerRpc`（有 harness 走 harness.handle，无 harness 走 `ctx.get('webServer')` HTTP 路由 `/mdvr/api/*`）与 client 包装器内的 host/styles 桥。**改 host.js / client.core.js 后两个通道的产物都要重新生成**（build-client.js + build-installed.js）。
- 发布门禁：`node scripts/check-release.js`（MANIFEST 一致性 / 语法 / 资产存在 / CSS 契约 / packageId 唯一 / 常驻双半语法 / **DSH 兼容基线** / **跨平台与 Desktop 兼容契约（第 13 节）**）。第 13 节守护：URL→路径必须 `fileURLToPath`、用户主题目录走注入的 `__MDVR_DSH_HOME__`、shell 只用 `resolve()/execute().result()`、禁 POSIX 硬编码与 `printf`/`mkdir -p`、Windows 保留设备名守卫、诊断日志用 `os.tmpdir()`。详见 `docs/platform.md`。

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

- **基线声明**：`package.json` 的 `dshCompatibility`（**独立顶层字段**）。⚠️ 不要塞进 `dsh` 字段——那是 DSH 自身的 `bundle` / `client` 登记位，被 profile boot 与 patch 机制消费，塞额外键有被误读的风险。当前基线 **DSH 0.2.1-rc.1**（复验 2026-10-17），随附 **cordis 4.0.5**。
- **门禁第 11 项**（`check-release.js`）做三方比对「声明基线 ↔ 本机 DSH 运行时权威源 ↔ 4 套内置主题 CSS」：
  - `themeTokens`（14 个）↔ DSH `dsh-client-ui-theme` 产物里的冻结数组 `BUILTIN_INSPECT_TOKENS`（即客户端 `Theme.listTokens` 的源）↔ 各主题 CSS 实际定义名单；
  - `slots`（`settings.section` / `tool.view.cordis`）↔ DSH 对应 `.d.ts` 契约文件；
  - `darkAttribute`（`data-ds-dark-theme`）↔ DSH 主题产物是否仍按该属性切深色档；
  - `cordis` ↔ DSH bundling 的 `@deepseek-ai/cordis` 是否仍落在 `peerDependencies` 声明的范围内（第 11.6 项）。**这条防的是 DSH 换 cordis 大版而插件声明静默脱节**——npm 不会在此处校验 peer 范围。范围匹配由门禁内置的极简 `satisfiesRange`（仅支持 `^X.Y.Z` 与精确版本）完成，**不引 semver 依赖**；解析不出范围时降级为警告，不假装通过。
  - `engines.dsh`（v2.1.2 起，第 11.7 项）：**DSH 0.2.1 起安装与 profile 启动会强制校验插件声明的 DSH 版本范围**——有 `engines.dsh` 则**只看它**、忽略 `@deepseek-ai/dsh*` peer；缺失才回退 peer 检查（本项目没有 DSH peer，所以这是唯一兼容声明面）。官方用 semver `includePrerelease: true` 判定，不满足时需按「精确插件版本 + 精确 DSH 版本」申请豁免（`dsh plugin ... allow-version`）。当前声明 `>=0.1.6-alpha.2 <0.3.0-0`：下界 = 首次实测版本，上界用 `<0.3.0-0` 哨兵挡住下一大版本**含预发布**（写成 `<0.3.0` 会放行 `0.3.0-rc.1`）。门禁要求范围覆盖 `verifiedAgainst` 且不匹配 `${major+1}.0.0-rc.1`。范围解析由门禁内置 `satisfiesDshRange`（支持空白分隔的 `>=` / `>` / `<=` / `<` / `=`，不引 semver 依赖）完成。
- **README 版本表**：`README.md` 的「版本与兼容性」与 `README.en.md` 的「Versions & compatibility」各含一张 `| 本项目版本 | 对齐的 DSH 版本 |` 表格。⚠️ 这是**新增的版本同步点**（连同四处 MANIFEST → 共 6 处），门禁第 11.2 项会核对它是否等于 `package.json` 的 `version` 与 `dshCompatibility.verifiedAgainst`——改版本号时别忘了这两张表，改标题文字也要同步改门禁里的锚点字符串（`extractReadmeVersions` 按标题定位）。
- **判定取向**：名单不一致 / 槽位消失 / 深色标记消失 / cordis 越出 peer 范围 / `engines.dsh` 不覆盖基线或放行下一大版本 = **fail**（精确漂移信号）；本机未装 DSH、基线版本号过期（DSH 或 cordis 记录与实测不同但仍在范围内）、DSH 内部结构变化导致解析失败、`engines.dsh` 范围无法被门禁极简解析器解析 = **warn**（环境差异，不拦离线贡献者与 git 安装）。
- **动态客户端 ctx 门禁（已核，勿踩）**：DSH 动态沙箱里 `ctx.get(name)` 是**可选查询、无需声明**，而直接 `ctx.<服务名>` 访问**必须**在插件返回对象的 `inject` 里声明，否则被 Guard 拒绝。本项目**全量使用 `ctx.get(...)`**，因此 `dsh.client.inject: []` 正确且完整；若哪天改成直接访问，必须同步补 `inject`。另：`slots` 由静态外壳模块 `dsh-client-ui-slots` 提供（该包无 `dsh.client`），天然先于所有动态插件，无需 inject。
- **`dsh.client.external` 无需声明**：外壳有冻结的 `PLATFORM_MODULES` 基座（React / Cordis / 静态 UI 库），`external` **只用于追加基座之外的模块请求**。本项目客户端半只 `require('react')`（在基座内），故留空；官方仅用 React 的包同样不声明。
- **门禁不假装覆盖**：`hostServices`（fs/shell/sandboxPolicy/webServer）与 `clientServices`（theme）的方法签名**无法从文件静态判定**，列为 `manualCoverage`——DSH 升版后需人工经 `cordis_inspect_query`（Host/Client `Service.listService`）复验，再更新基线。
- **DSH 升版后的标准动作**：① 用 `cordis_inspect` 复验 host/client 服务签名（⚠️ 无活页面时 `cordis_inspect_query` 会快速失败，先开 web 页面）② 拉新旧两版 tarball 做契约面 diff（token 数组 / 槽位 `.d.ts` / 深色标记 / cordis / 字体与对话流等主题消费面模型 / `engines.dsh` 机制）③ 跑门禁看第 11、12 项是否报警 ④ 更新 `dshCompatibility.verifiedAgainst` / `verifiedDate` / `cordis` 并按需调整 `engines.dsh`（必须覆盖基线、挡住下一大版本）⑤ 若 DSH 改了 token / 槽位 / 字体或对话流消费模型，先改主题 CSS 与插件注册，再更新声明。
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
- **Windows / Desktop 路径（v2.1.3 修过，勿回退）**：`new URL(...).pathname` 在 Windows 给出 `/C:/...` 且不解码 `%20`/中文 → 包内资产全读不到；shell 服务在 DSH 0.2.x **没有 `run()`**（旧代码的 `shellSvc.run` 分支一直静默抛错，只是被 workspaceRoot 推导掩盖）；Windows 执行器是 PowerShell，`printf`/`mkdir -p` 不存在；`/tmp` 不存在。改动 `scripts/build-installed.js` / `host.js` 的路径或 shell 逻辑后务必跑门禁第 13 节，并在 Windows/Desktop 实机按 `docs/platform.md` 的验证清单复验（本机 WSL2 只能验 POSIX 分支）。
- **首装打开设置页看到「读取用户主题失败」但能正常新建/编辑（v2.1.4 修过）**：`<DSH_HOME>/web-themes-xyy` 还没创建时 `listDir` 抛 ENOENT 被误判为读取失败；已改为 `stat` 先行返回空列表，并加客户端退避重试。若再看到该提示，先点「刷新」看控制台打印的具体 `reason`（真正的权限/IO 错误才应出现）。
- **npm publish 打印成功 ≠ registry 立即可见（v2.1.4/2.1.5 实测踩到）**：CLI 输出 `+ pkg@ver` 且 exit 0 后，packument / tarball 可能还有 **数分钟**处理/传播窗口；窗口内重发同版本会 409 `Cannot publish over previously staged version` 且 `npm stage list` 为空（npm/cli#9889 现象），**但这不等于永久卡死**——本次 2.1.4/2.1.5 最终都上架。判断标准：轮询 `curl -H "Cache-Control: no-cache" https://registry.npmjs.org/<pkg>` 看 versions/dist-tags、并 curl 版本 tarball 是否 200，**至少等 5 分钟**再决定 bump；同内容重发尽量别急着涨版本号（本机 token 是 bypass-2FA 粒度 token，npm 正收紧直接发布，见 AGENTS 上方事故条）。
- define 漏传 host 或 client → 先 `cordis_inspect_self` 确认双半完整再 run
- 消息超长静默截断成残缺包（约 26KB 转义上限）→ 用 minify 产物；define 后 inspect 核对
- 浅档语义色要过 WCAG AA：error `#c74330` / success `#287b38` / warn `#985d00`（浅档参考值）
- `body[data-ds-dark-theme]` 选择器拼错 → 深色档不回退
- 动态插件是内存态：进程重启后插件丢失，需用 `plugin/host.js` + `plugin/client.js`（minify 后）重新 define（台账历史在 `manifest/versions.json`）
- packageId 按进程分配、随重启重置：新进程 define 可能拿到与旧条目相同的 id（check-release 对 packageId 重复降级为警告）
- 审批被拒不要重复请求；技术失败读 `cordis_inspect_self` 诊断后修同一插件

## 当前状态

- 当前版本 v2.1.5（内容与 v2.1.4 完全一致，仅因 npm registry 把 2.1.4 误置为 staged 无法发布而提升 patch 重发，详见「npm staged 事故」条；v2.1.3 为跨平台 / Desktop 兼容修复；v2.1.2 为 DSH 0.2.1-rc.1 版本对齐：新增 `engines.dsh` 兼容声明（DSH 0.2.1 起安装/启动强制校验，有则只看它、忽略 DSH peer）、cordis 基线 4.0.4→4.0.5、14 token / 双槽位 / 深色标记 / 对话流间距模型均未变；修复 0.2.1 字体模型变化导致主题字体失效——产品改在 `body{}` 组合用户字体角色变量 `--dsh-font-family-text/-code`，直接声明压过 `:root`，故 4 套主题字体 token 从 `:root` 迁入首个 `body{}` 并拼上角色变量（用户字体优先、主题字体兜底，0.2.0 向后兼容）；门禁新增 11.7（engines.dsh）/ 12.7（字体 body 组合）。v2.1.1 修复文件引用胶囊死锚点：`[class*="_fileMention_"]` 带下划线在产品产物零命中，v2.0.2 起静默失效；改为 `[class*="fileMention"]` 命中产品真实类名 `.fileMention`，门禁第 12 节新增 12.6 项防回归。v2.1.0 DSH 0.1.7 对齐：DSH 新增 `--dsw-alias-state-idle-primary`，L0 名单 13→14，4 套内置主题浅/深同步补值 + 基线升 0.1.7-rc.2 / cordis 4.0.4 + docs 全套同步。v2.0.3 主题消费面修复：6 类「改了却没效果」的问题 + 门禁第 12 节防回归。v2.0.2 移除启动期 console 日志；v2.0.1 修复常驻/npm 通道：__MDVR_PKG_ROOT__ 包目录资产解析 + Host inject webServer + 路由注册加固；v2.0.0 首个正式版 = 持久化 + 底子主题 + `~/.dsh/web-themes-xyy` + 四套内置主题）；内置主题 4 个；路线图见 docs/capabilities.md。
- **跨平台 / Desktop 兼容修复（v2.1.3，2026-10-17）**：面向 Windows 原生 + DSH Desktop（Electron 壳）。修 P0–P4 五类真缺陷：① `__MDVR_PKG_ROOT__` 用 `URL.pathname`（Windows 得 `/C:/...`、空格/中文保留 `%xx`）→ 改 `resolve(fileURLToPath(...))`，并注入 `__MDVR_HOME__` / `__MDVR_DSH_HOME__` / `__MDVR_TMP__`；② `resolveUserThemesDir` 依赖 `printf %s "$HOME"` + `shell.run()`（**DSH 0.2.x shell 服务根本没有 `run()`，该分支一直静默失效**）+ `/home/` 启发式 + `FALLBACK_*` 硬编码 → 改为 注入 DSH home → `echo "$HOME"`/`$USERPROFILE`（`execute().result()`）→ 分隔符感知的 workspaceRoot 推导 → `null` 降级；③ 保存时 `mkdir -p`（PowerShell 无此命令）删除，改由 `fs.writeText` 原子写内部建目录；④ 主题 id 增加 Windows 保留设备名拦截（Host `isValidThemeId` + Client 同规则可读提示）；⑤ 诊断日志 `/tmp` → `os.tmpdir()`。`scripts/check-release.js` 新增**第 13 节**（9 项静态契约）防回归；`docs/platform.md` 记录引用链路/支持矩阵/验证清单；README 双版补 Desktop 安装说明。**产物已重建（plugin/client.js + lib/index.mjs + client/client.js），门禁全绿（9 条既有警告不变）；已 push GitHub main（代码提交 138a026，v2.1.3 版本提升为其后一次提交），未打 tag、未 npm publish。**
- **首装用户主题误报修复（v2.1.4，2026-10-17）**：`themes.user.list` 在 `<DSH_HOME>/web-themes-xyy` 尚未创建时（首次安装、还没保存过任何用户主题）必须按「0 个主题」返回 `{ok:true,themes:[]}`——`fs.stat` 对不存在目标返回 `undefined`（不抛错），旧实现直接 `listDir` 抛 ENOENT 被外层 catch 成 `ok:false`，客户端于是显示「读取用户主题失败（目录不可读或 RPC 异常），当前显示上次结果」，看起来像装坏了，实际功能正常。客户端另做两件事：① 首次加载 / 安装后热重载 / Web 刚启动窗口内的 RPC 瞬时失败按 300ms、900ms 退避重试，最终失败才告警并把 具体 `reason` 打到控制台；② 保存后刷新成功会清掉残留错误提示。门禁第 13 节新增 13.8（list 处理器必须 `stat` 先行且有空列表分支）与 13.9（设置页显示 Host 返回的真实绝对路径，Windows 盘符 / 自定义 `DSH_HOME` 准确，未知时按 `%USERPROFILE%` 兜底）防回归；单测覆盖「目录不存在 → 空列表 / 目录存在 → 只列 *.css / 真实 EACCES → 仍报错」三分支。**已 push GitHub main（提交 edbede1）并打 tag v2.1.4；npm 2.1.4 发布时 CLI 立即报成功但 registry 有约 4–5 分钟处理/传播窗口（期间 packument 还是 2.1.1、tarball 404、重发报 409，详见 v2.1.5 条），最终正常上架（packument 时间 12:21:01Z，tarball 数分钟后 200），tag 保留。**
- **npm 发布延迟窗口 + v2.1.5 重发（2026-10-17，最终两版都上架）**：`npm publish`（npm 11.19.0，`--registry=https://registry.npmjs.org/`，账号 token 是 **bypass-2FA 粒度 token**）打印 `+ dsh-markdown-xyy@2.1.4` 且 **exit 0**，但 registry 不是即时可见——前 ~4 分钟 packument 仍 `dist-tags.latest=2.1.1`、versions 无 2.1.4、tarball 404；处理窗口内再次 publish 同版本返回 `409 Cannot publish over previously staged version`，且 `npm stage list` / `/-/stage` 均为空（没有 stage-id 可 approve/reject），现象与 npm/cli#9889 一致。当时据此判断为「2.1.4 永久 wedged」，遂 bump 到 **2.1.5** 重发（内容零改动，版本号/双 MANIFEST/台账/README 双表同步，tag v2.1.4 一度删除改挂 v2.1.5）。**事后确认两个版本最终都成功上架**：2.1.4 元数据 12:21:01Z、2.1.5 元数据 12:21:06Z，tarball 在 ~12:26Z 已 200，`dist-tags.latest=2.1.5`，实测 `npm i dsh-markdown-xyy@2.1.5` 装出 24 文件、lib/client/4 套主题齐全、ESM 入口可加载；**GitHub tag v2.1.4（edbede1）已恢复**，与 v2.1.5（ce2c104）并存。教训：① npm publish 的「成功」只代表请求被接受，registry 传播/处理可能滞后数分钟，**必须轮询 packument + tarball 至少 5 分钟**再判定失败；② 不要在处理窗口内重发同版本（409）或立刻 bump（会白涨版本号）；③ bypass-2FA 粒度 token 正被 npm 收紧（[changelog](https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens/)，2027 起直接发布将只降级为 staging），自动化发布建议迁 trusted publishing（OIDC）或 staged + 交互式 2FA 审批。
- **DSH 版本对齐（v2.0.2 补充，未升版本）**：`package.json` 新增 `dshCompatibility` 基线（DSH 0.1.6-alpha.2 / cordis 4.0.2），`@deepseek-ai/cordis` peerDep 收紧为 `^4.0.2`（与 DSH 0.1.6 随附版本及官方包一致），`check-release.js` 新增第 11 项门禁，`README.md` / `README.en.md` 新增「本项目版本 / 对齐的 DSH 版本」表格（受第 11.2 项核对）。本次仅动声明与门禁，**未改任何运行逻辑**，故四处 MANIFEST 版本号保持 v2.0.2 不变、无需重建产物。详见「DSH 版本对齐基线」章节。
- **主题消费面修复（v2.0.3）**：审计 4 套内置主题与 DSH 0.1.6 的消费层契约，修掉 6 类「改了却没效果」的问题——① 对话流间距 `gap` 反向叠加（改为 `--dsh-chat-flow-gap`）② §6 语法高亮整段死代码（改用 `--shiki-token-*` 映射）③ markdown 正文不跟随主题字体（覆盖 `--dsw-font-family` / `--ds-font-family-code`）④ 代码块语言标签选错元素 ⑤ 行内文件引用胶囊漏覆盖 ⑥ 两处失效文档引用 + `--mdvr-highlight-soft` 死变量标注。`check-release.js` 新增第 12 节（5 项）防回归，并在分析前剥 CSS 注释。详见「主题铁律」第 12 条与 `docs/variables.md` §2.1 / §五。⚠️ 本次只改**资产与声明**，未动插件运行逻辑；但因为资产走 `__MDVR_PKG_ROOT__`，**当前 GUI 仍是旧主题**，需重装该包或走用户主题通道才可见（见「常见坑」）。
- **兼容性已复验（2026-09-26，v2.1.0）**：本机 DSH 0.1.7-rc.2，门禁第 11 项三方比对全过（14 token 逐名一致 / 双槽位在 / 深色标记在 / cordis 4.0.4 落在 ^4.0.2 内），README 双表同步。上次端到端 RPC + occupants 实测仍是 2026-09-19（DSH 0.1.6-alpha.2：`themes.builtin.list` 4 套 / `themes.user.list` 3 套 / `themeAssets.get` total=2；`settings.section#mdvr-theme` 与 `tool.view.cordis#self` 均 `active: true`）——v2.1.0 的 define 后需重跑一次端到端再确认。
- 提交历史已重建为「每发布版本一个提交 + 顶部 docs 提交」（共 36 个）；旧历史备份在本地分支 `backup-pre-cleanup`，**勿推送**。
- README 双语维护（`README.md` 中文 + `README.en.md` 英文镜像，顶部互挂语言徽章）：公众版只展示「安装即用」（npm registry / github:），**勿回填**动态 define、`file:` 本地开发类内容（动态 define 流程只存在于 docs/development.md）；主题预览图 = `screenshots/*.jpg`（4 张，README 画廊引用）。**勿写内部实现/门禁说明**（2026-09-27 用户明示）：像「基线声明见 `package.json` 的 `dshCompatibility`／`check-release.js` 第 11 项做三方比对／契约漂移会让门禁失败」这类段落属维护者细节，**只放 `docs/` 或本文件**，README 只留版本表本身（表格是门禁 11.2 的锚点，标题与表格必须保留）。
- **DSH 0.2.1-rc.1 对齐完成（复验 2026-10-17）**：上游 0.2.1-rc.1 = npm `next` / GitHub pre-release（发布 2026-10-17 03:17Z），对比本机与 npm `latest` 的 0.2.0-rc.2。**契约面复验结果**：① 14 个 L0 token **逐名同序一致**；② `settings.section` / `tool.view.cordis` 槽位 `.d.ts` **字节全等**；③ 深色标记仍为 `data-ds-dark-theme`（主题产物出现次数一致）；④ `--dsh-chat-flow-gap` 多档模型（12/16/6px + `data-chat-flow-kind`）与 0.2.0-rc.2 完全一致；⑤ host 服务：`dsh-fs` / `dsh-shell` / `dsh-sandbox-policy` 的 `types` 零变化，`dsh-host-webserver` 仅 Config 增 TLS / host 收敛为具体地址、`register(route)` 签名未变；⑥ client `theme` 服务：`getTheme()` 仍在（我们只读 `snapshot.preference`），`setFontSize` 变 `(role, px)` 但我们不调用。**新增/变化面**：① `engines.dsh` 强制校验（见上）；② 字体模型（见主题铁律 12）；③ cordis 4.0.4→4.0.5（`^4.0.2` 仍满足，仅更新基线记录）；④ `WebBootGraph.release` / 新扩展槽 / `engines` 解析器属产品新增面，本项目不消费。**验证方式**：静态 tarball 逐文件 diff（本机运行时仍 0.2.0-rc.2，**未做 0.2.1 端到端**；本地升到 0.2.1 后按「升版后标准动作」补跑）。
- **DSH 0.2.0-rc.2 对齐完成（复验 2026-10-01）**：本机与 npm `latest`/`next` 均为 0.2.0-rc.2（npm 发布 2026-09-29，rc.1 = 09-28；⚠️ 早前误记 09-27 已改正）。`dshCompatibility.verifiedAgainst` / `verifiedDate` 与 README 双表已同步，`cordis` 仍 4.0.4。**7 个契约面全部未变**（两路独立验证：本会话拉两版 tarball 逐文件 diff + subagent 走官方 release 与同源 diff，结论一致；槽位 `.d.ts`、`dsh-package-manifest` 的 `types.d.ts`、`dsh-client-modules`、`dsh-client-ui-settings`、服务提供方包除 package.json 外**字节全等**）。官方 release notes：https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.0-rc.1
  - ⚠️ **本版唯一与我们相关的运行时变化 = `--dsh-chat-flow-gap` 模型重构**：产品默认 fallback **16px → 6px**，并改成多档（`.EvIC1a_running` 12px / response 组 16px / 空行 16px / `.O_Ebla_body` 6px），新增 `data-chat-flow-kind=turn-process|turn-trigger` 分类。我们的 `[data-chat-flow]{--dsh-chat-flow-gap:5px!important}` 挂在**列容器**靠继承生效，而产品现在**直接**声明在 `.EvIC1a_flowItem` 变体上（直接声明恒胜继承，`!important` 只在同元素上比较）→ 那些节点可能已回到产品值、节奏混档；且 `/* 产品默认 16px */` 等注释**已过期**。**待办：GUI 实测后决定删 override / 逐档覆盖**，门禁 12.3 目前只查「用没用旋钮」查不出这类语义漂移。
  - 其他：字号步进 12–17 → **10–22**（我们不调 `setFontSize`，无影响）；平台新增一批**非 listTokens** 的 alias token（`switch-thumb` / `turn-trigger-*` / `label-shimmer` / `menu-group-header-fill` / `bg-document-selection` 等，产品自给默认值，我们不写、门禁不比对）；插件管理器改「升级需 reinstall」引导；CLI 新增 `--profile desktop` 分支（**web 路径未动**）。
  - ⚠️ **复验工具变了**：`cordis_inspect_query` 现在带超时 + 无活页面快速失败（`clientInspectTimeoutMs` / `gateway.hasLiveClient()`）——跑「升版后标准动作 ①」时需先开活的 web 页面，否则直接 fail 而非挂起。
