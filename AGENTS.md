# AGENTS.md — 项目记忆（dsh-markdown-xyy）

> 本文件是给未来 Agent 的项目约定备忘录。动手前先读这里。

## 项目是什么

DeepSeek Harness 上的动态 Cordis 插件（pluginId 前缀 `mdvr`）：**版本记录 + Markdown 对话主题排版**。
- Host 半：版本台账（`versions.note` / `versions.list` RPC，内存态）+ 主题资产/用户主题读写
- Client 半：主题系统（选择引擎 + 设置页 + 编辑器）+ 版本面板

## 🔒 主题铁律（最重要）

1. **主题必须是 CSS 文件（v1.2.0 起全部资产文件化，运行时由 Host 读取）**：
   - 内置主题：插件目录内 `plugin/assets/themes/*.css`（v1.6.0 起内聚于此，随 `plugin/` 打包即携带；v1.7.0 起仅保留 `strawberry-mocha.css`，lobeui-emphasis/inkpaper/qingci 已移除，历史在 git）
   - 共享资产：`plugin/assets/panel.css`（面板与设置页样式）/ `template.css`（青瓷演示模板，仅作新建回退）/ `themes/strawberry-mocha.css`（内置主题，兼作项目根探测哨兵之一）。排版骨架 `typography.css` 已随 v1.8.0 删除；**独立模板 `template-strawberry.css` 已随 v1.12.0 删除**（新建用户主题默认取内置主题内容，见铁律 5）
   - 用户主题：`$HOME/.dsh/web-themes/*.css`（插件专属目录，放 CSS 即新主题，**无需打包/升级插件**）
   - **`~/.dsh/web-themes/example.css` 是「完整参考主题」**（第三方用户手册）：头部警告区 + 13 token/15 变量全注释影响范围 + 全部可控元素规则 + 扩展示例 + 配色速查；`plugin/assets/template.css`（新建模板）与其同源完整版。改 example.css 前先读它。
   - **改文件即生效**：Host 每次经 `themes.builtin.list` / `themeAssets.get` / `themes.user.*` RPC 从文件读取；客户端在 apply 时缓存一次。
   - **⚠️ 消息通道单条上限 ~16KB（v1.2.3 分块解决，v1.3.0 全覆盖）**：页面↔宿主的 RPC 消息超过 ~16KB 会失败/静默截断——旧 `themeAssets.get` 单次返回 24KB → 设置面板错误占位（无样式）；`themes.user.save` 17KB → 文件写入被截断损坏。**所有大文本（主题/模板/资产）走分块协议**：`8000 字符/片`，get 侧 `{index} → {ok, index, total, chunk}` 循环拉取（client `fetchChunks` 校验 index/total 一致性），save 侧 client 上传 `{id, uploadId, index, total, chunk}`、host 按 uploadId 隔离缓冲、**分片全部到齐后**拼装并执行 Host 侧 CSS 校验再写盘（v1.3.0 事务化，杜绝缺片/并发混片）。**任何新的大内容 RPC 都必须分块**。
   - **CSS 语法校验（v1.2.3 client / v1.3.0 host 双端）**：保存前 `validateCss`（client 端即时反馈 + Host 写盘前强制，双端同逻辑）检测注释/字符串/花括号/圆括号闭合，错误**拒绝保存**并在编辑器状态栏显示具体原因；超过 100KB 拒绝。
   - **项目根探测（v1.2.1→v1.2.2）**：⚠️ `sandboxPolicy.workspaceRoot` = **DSH 主进程启动目录**，不一定是插件项目目录（本环境 = `/home/lab/xyygithub/dsh-xyy-ui`）！Host 用 `resolveProjectRoot(ctx)` **按内容探测**：`workspaceRoot` → 其父目录及一级子目录（兄弟项目）→ `FALLBACK_PROJECT_DIR`（`/home/lab/xyygithub/dsh-markdown-xyy`）兜底，以同时存在 `plugin/assets/panel.css` + `plugin/assets/themes/strawberry-mocha.css` 为准，首次解析后缓存。**⚠️ fs 服务的 `stat/readText/listDir/writeText` 都要求 `resolve()` 返回的句柄对象（{targetKey}），绝不能传字符串路径**（v1.2.1 就栽在这里，探测全 miss）。
   - 用户主题目录**不硬编码**：`shell 读 $HOME` → `workspaceRoot` 推导 → `FALLBACK_USER_THEMES_DIR` 三级解析（host.js `resolveUserThemesDir`）。
2. **`plugin/client.js` = `plugin/src/client.core.js` 的拷贝（构建产物，禁止手改）**。改逻辑只改 `plugin/src/client.core.js`，然后：
   ```bash
   node scripts/build-client.js   # 拷贝 + 资产完整性检查
   ```
   `scripts/extract-assets.js` 已移除（v1.2.0 一次性迁移工具，历史在 git）；v1.3.0 起排版骨架停用（第三方主题 = 主题 CSS + panelCss，产品 `._markdown_*` 兜底排版）；v1.8.0 已删除 typography.css，项目根探测哨兵改为 panel.css + themes/strawberry-mocha.css 并存。
3. **选择模型（v0.9.0 → v1.13.0）**：设置页顶部「系统自带」= 默认（`DEFAULT_SELECTION = 'system-native'`，插件零干预、深浅跟随系统）；**v1.13.0 起外观 ☀️/🌙/🖥️ 对任意选中主题可用**——内置/用户主题自带 `body`/`body[data-ds-dark-theme]` 两档即随切换生效，单档主题另一档保持原样；仅 `themeService` 缺失时按钮禁用。「系统自带」与主题卡片互斥单选。`demo.css` / `native.css` 已移除（历史在 git）。
4. **挂载机制与产品一致**：浅色写 `body { ... }`，深色写 `body[data-ds-dark-theme] { ... }`（产品用属性选择器，不用 `prefers-color-scheme`！我们的样式注入晚于产品样式表，同选择器后者胜出）。
5. **用户主题可编辑（v1.2.0），内置主题只读**：设置页用户主题卡片有「✏️ 编辑」，动作行有「🆕 新建用户主题」（**v1.12.0 起默认模板 = 内置主题 `strawberry-mocha`（猛男粉）内容本身**——不再维护独立模板资产，加载失败回退 `template.css` 青瓷版；编辑器 = 透明 textarea 叠彩色 pre 实时语法高亮（`highlightCss`）+「🧹 格式化」（`formatCss`）+「💾 保存」（`saveUserTheme` → Host `themes.user.save` RPC，沙箱放开到 `danger-full-access`））。内置主题卡片无编辑按钮。
6. 主题 CSS 内同时定义：13 个 `--dsw-alias-*`（全局配色）+ `--mdvr-*`（强调变量：accent 系 5 个、quote/code/table 系 5 个、link/highlight 系 4 个）。**不再调用 `theme.overrideTokens`**。
7. **panel.css 里的 `var(--mdvr-*)` 必须带默认回退值**（如 `var(--mdvr-accent, #5856d6)`），否则原生模式下插件自有 UI 样式失效。

## 📦 define 传输约定（重要）

- **每次 cordis_define 必须同时传 `code.host` + `code.client` 双半**（单包运行 = 单包双半，host-only 或 client-only 包都是废包）。
- **用 minify 产物传输**：单条消息有 ~26KB 转义字节上限，`plugin/host.js` + `plugin/client.js` 全文（~31KB raw）放不下。先跑：
  ```bash
  node scripts/minify.js plugin/host.js /tmp/host.min.js
  node scripts/minify.js plugin/client.js /tmp/client.min.js   # 可选 --strip-css-comments（模板内 CSS 注释）
  node --check /tmp/host.min.js && node --check /tmp/client.min.js
  ```
  minify 只删注释/折叠空白（保留换行，ASI 安全），并做 token 流等价断言；传输前务必确认两半都完整（用 `cordis_inspect_self` 核对 code.host / code.client 均存在且含 `return {` 结尾）。
- 历史废包 pkg-11 ~ pkg-16（host-only / client-only / 残缺包）不可删除，忽略即可。

## 能力边界（详见 docs/themes.md）

- 能控制：① 全局 13 token（浅/深）② `--mdvr-*` 强调变量 ③ 元素排版（v1.3.0 起：产品 `._markdown_*` 兜底 + 主题 ③ 段 `:where()` 增量覆盖；排版骨架 typography.css 已随 v1.8.0 删除）④ 面板 UI（panel.css）
- 不能：改产品 DOM、token 名单固定 13 个、`:where()` 零优先级（产品显式样式优先）、无持久化（内存态，刷新恢复 `DEFAULT_SELECTION`）

## 标准迭代流程（每次版本）

1. 决定版本号（semver），更新 `plugin/host.js` + `plugin/src/client.core.js` 的 `MANIFEST`（双份一致）
2. 改 `plugin/assets/themes/*.css` 或 `plugin/assets/*.css` 或逻辑 → `node scripts/build-client.js`
3. `manifest/versions.json` 顶部插入条目（packageId 留空）
4. minify 双半 → `cordis_define`（kind: existing，pluginId 用当前实例；**双半一次传完**）→ 拿到新 packageId → `cordis_inspect_self` 核对双半完整
5. `cordis_run`（update）→ 可能需用户审批 → 通过后验证
6. 回填 packageId → 更新 README/capabilities → `git commit` + `git tag vX.Y.Z`

## 常见坑

- **define 漏传 host 或 client**：先 inspect 确认双半都在再 run（本会话踩过 5 次）
- 传输超长被截断：单条消息约 26KB 转义字节上限（经验值；v1.2.5 的 29.1KB 实测可传，v1.3.0 约 33.3KB 需实测验证）——超长会静默截断成残缺包。若 define 后 `cordis_inspect_self` 发现双半残缺：优先精简 MANIFEST/渲染 helper 压缩体积，或确认通道上限后重试；永远用 minify 产物
- 浅档语义色要过 WCAG AA（参考 `docs/readability-a11y.md` 的实测值：error #c74330 / success #287b38 / warn #985d00）
- `body[data-ds-dark-theme]` 选择器拼错 → 深色档不回退
- 动态插件是内存态：进程重启后插件丢失，需用当前 `plugin/host.js` + `plugin/client.js`（minify 后）重新 define（台账历史在 `manifest/versions.json`）
- **packageId 按进程分配、随重启重置**：新进程 define 可能拿到与旧进程条目相同的 id（v1.4.0 与 v1.2.0 同得 pkg-17）。`versions.json` 如实回填即可；`check-release` 第 9 项对 v1.0.0+ 条目 packageId 重复**一律降级为警告提示**（无法机械区分"误抄"与"跨进程合法复用"）
- 审批被拒不要重复请求；技术失败读 `cordis_inspect_self` 诊断后修同一插件

## 当前状态（2026-08-23）

- 最新版本：v1.13.2（内置主题卡样式修正：与用户主题同构——色板 + 名称、去掉描述行，撤销 v1.13.1 纯名称卡；系统自带并入内置栏并保留 DSH 出厂色板）
- v1.13.1（历史归档，tag 在 v1.13.1）：系统自带并入「内置主题」栏（曾误为纯名称卡，v1.13.2 修正）
- v1.13.0（历史归档，tag 在 v1.13.0）：设置页统一（内置/用户主题卡片同构）+ 外观 ☀️/🌙/🖥️ 对任意主题可用（自带浅深两档即跟随切换）；清理「无深浅之分·按钮禁用」旧说法
- v1.12.0（历史归档，tag 在 v1.12.0）：模板瘦身——删除 template-strawberry.css，「🆕 新建用户主题」默认取内置主题猛男粉内容（newThemeStarter 从 builtinThemes 取 CSS）
- v1.11.0（历史归档，tag 在 v1.11.0）：深浅模式整改——单值拆档（inline-code/selection/shadow 7 变量移入两档 body 成对定义）、选区白字浅档修复、阴影浅紫 tint/深黑 0.45、docs/unified-variables.md 分层账更新
- v1.10.0（历史归档，tag 在 v1.10.0）：三层作用域体系——0 全站=body 字体/基色变量共享；1 元素规则全 markdown 限定 `[class*="_markdown_"]`（36 条收口）；2 selection/滚动条/焦点环保持全局签名；删 body>pre 死规则、pre 拆双规格、272 前缀化
- v1.9.0（历史归档，tag 在 v1.9.0）：列表规则全面 markdown 限定 + padding-left 统一 token（`--mdvr-list-pad` 1.6em / `--mdvr-list-pad-nested` 1.2em）
- v1.8.0（历史归档，tag 在 v1.8.0）：删除排版骨架文件 `plugin/assets/typography.css`；项目根探测哨兵改为 panel.css + themes/strawberry-mocha.css 双文件，`themeAssets.get` 白名单去掉 typography
- v1.7.0（历史归档，tag 在 17315bb）：内置主题精简，仅保留全变量化完整主题「草莓猛男粉」（lobeui/inkpaper/qingci 移除，历史在 git）
- v1.6.0（历史归档，tag 在 93801f6）：内置主题目录内聚 `plugin/assets/themes/*.css`（随 `plugin/` 打包即携带；Host 优先读 assets、旧 `themes/` 兼容回退）
- v1.5.0（历史归档，tag 在 c13cdf2）：新增模板资产 `plugin/assets/template-strawberry.css`（新建用户主题默认模板）+ 修复内置主题列表 ~16KB 通道截断（改分块拉取）
- v1.4.0（历史归档，tag 在 1e7bab9）：新增内置主题「草莓猛男粉」`plugin/assets/themes/strawberry-mocha.css`——第三方 Velvet-Strawberry-Mocha-v2-native-var 内置化，全量 `--mdvr-*` 身份色 + `--hl-*` 语法高亮 + L2/L3 排版常量；元素段按 `docs/diagnosis-velvet-native-leak.md` 整改；统一变量契约盘点 `docs/unified-variables.md`
- 选择：`system-native`（系统自带，默认）/ 内置 `strawberry-mocha`（草莓猛男粉，v1.7.0 起唯一内置）/ 用户主题 `user:<id>`
- 内置主题变量分层（v1.4.0 统一契约）：L0 平台 token（13 固定）→ L1 身份色（`--mdvr-*`/`--hl-*` 浅深成对，两档 body）→ L2 排版/形状常量 + L3 功能旋钮 + 字体栈（`:root` 单值）。`strawberry-mocha` 是唯一内置主题，带完整 ③ 元素段（近 80 条规则、全量消费变量）；其余曾内置的 lobeui/inkpaper/qingci（早期纯配色）已移除
- 设置页：设置 → 主题设置（外观模式=持久，选择=会话级，刷新恢复 `DEFAULT_SELECTION`；用户主题区有刷新按钮 + 新建按钮 + 每卡编辑按钮；资产异步加载，就绪前显示占位；刷新失败有错误提示）
- 注意：外观三档切换使用产品 `ctx.get('theme')` 的 `getTheme()/setTheme()`（可选服务，缺失时按钮禁用）；主题自身仍不调用 `overrideTokens`；用户主题目录由 `resolveUserThemesDir` 动态解析（shell `$HOME` → workspaceRoot 推导 → 回退 `/home/lab/.dsh/web-themes`）
- 路线图：gfm alert / 选择持久化 / 台账落盘
