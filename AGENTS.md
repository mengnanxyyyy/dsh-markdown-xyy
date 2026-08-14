# AGENTS.md — 项目记忆（dsh-markdown-xyy）

> 本文件是给未来 Agent 的项目约定备忘录。动手前先读这里。

## 项目是什么

DeepSeek Harness 上的动态 Cordis 插件（pluginId 前缀 `mdvr`）：**版本记录 + Markdown 对话主题排版**。
- Host 半：版本台账（`versions.note` / `versions.list` RPC，内存态）
- Client 半：主题系统（`themes/*.css`）+ 共享排版骨架 + 版本面板 + 设置页「主题设置」

## 🔒 主题铁律（最重要）

1. **主题必须是 CSS 文件**，放在 `themes/`，每主题一个文件（`demo.css` / `lobeui-emphasis.css` / `inkpaper.css` / `qingci.css`）。
2. **`plugin/client.js` 的 `THEMES` 是构建产物，禁止手改**。改主题只改 `themes/*.css`，改逻辑只改 `plugin/src/client.core.js`，然后运行：
   ```bash
   node scripts/build-client.js
   ```
3. **`themes/demo.css` = DSH 默认主题**：
   - 必须覆盖**所有可控元素和样式**（13 token + 全部 `--mdvr-*` + 每个元素一条规则），每条带注释说明控制哪个部分
   - **每次版本更新必须同步 demo.css**：① 13 token 取 DSH 出厂值（来源 `dsh-client-ui-theme/lib/styles/design-platform.css` 的 `--dsw-static-*`）；② §C 元素目录必须与 `client.core.js` 的 `TYPO_CSS` 逐条对应
4. **挂载机制与产品一致**：浅色写 `body { ... }`，深色写 `body[data-ds-dark-theme] { ... }`（产品用属性选择器，不用 `prefers-color-scheme`！我们的样式注入晚于产品样式表，同选择器后者胜出）。
5. 主题 CSS 内同时定义：13 个 `--dsw-alias-*`（全局配色）+ `--mdvr-*`（强调变量：accent 系 5 个、quote/code/table 系 5 个、link/highlight 系 4 个）。**不再调用 `theme.overrideTokens`**。

## 能力边界（详见 docs/themes.md）

- 能控制：① 全局 13 token（浅/深）② `--mdvr-*` 强调变量 ③ 元素排版（TYPO_CSS 约 30 条）④ 面板 UI
- 不能：改产品 DOM、token 名单固定 13 个、`:where()` 零优先级（产品显式样式优先）、无持久化（内存态，`ACTIVE_THEME` 决定默认）

## 标准迭代流程（每次版本）

1. 决定版本号（semver），更新 `plugin/host.js` + `plugin/src/client.core.js` 的 `MANIFEST`（双份一致）
2. 改 `themes/*.css`（含 demo.css 同步）→ `node scripts/build-client.js`
3. `manifest/versions.json` 顶部插入条目（packageId 留空）
4. `cordis_define`（kind: existing，pluginId 用当前实例）→ 拿到新 packageId
5. `cordis_run`（update）→ 可能需用户审批 → 通过后验证
6. 回填 packageId → 更新 README/capabilities → `git commit` + `git tag vX.Y.Z`

## 常见坑

- `THEMES` 手改会被构建覆盖；改完 css 忘了 build 会导致 define 的代码与文件不一致
- 浅档语义色要过 WCAG AA（参考 `docs/readability-a11y.md` 的实测值：error #c74330 / success #287b38 / warn #985d00）
- `body[data-ds-dark-theme]` 选择器拼错 → 深色档不回退
- 动态插件是内存态：进程重启后插件丢失，需用当前 `plugin/host.js` + `plugin/client.js` 重新 define（台账历史在 `manifest/versions.json`）
- 审批被拒不要重复请求；技术失败读 `cordis_inspect_self` 诊断后修同一插件

## 当前状态（2026-08-14）

- 最新版本：v0.6.0（主题 CSS 文件化 + demo.css + AGENTS.md）
- 主题：`demo`（DSH 默认）/ `lobeui-emphasis`（默认启用）/ `inkpaper` / `qingci`
- 设置页：设置 → 主题设置（会话级切换，刷新恢复 `ACTIVE_THEME`）
- 路线图：v0.6.0+ 语法高亮 / gfm alert / 主题选择持久化 / 台账落盘
