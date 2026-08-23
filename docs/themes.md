# 主题系统说明（v1.2.0 资产文件化）

> 插件能控制的全部 CSS 收敛为「主题系统」：**每套主题 = 内置目录 `plugin/assets/themes/` 下一个独立 CSS 文件**（v1.6.0 起内聚到插件目录内、随 `plugin/` 打包携带；旧仓库根 `themes/` 兼容回退）。
> v1.2.0 起全部资产文件化：内置主题 + 共享资产（排版骨架/面板样式/新建模板）由 **Host 运行时从文件读取**
> （`themes.builtin.list` / `themeAssets.get` RPC，v1.3.0 起全部资产统一走分块协议），**改文件即生效，无需升级插件**；客户端不再内联 CSS（`build-client.js` 仅拷贝源码）。
> v1.2.1 起项目根按内容探测（`resolveProjectRoot`：workspaceRoot → 兄弟目录 → 显式兜底，⚠️ workspaceRoot 是 DSH 启动目录而非必然的项目目录）。
> 项目约定见 `AGENTS.md`。

## 一、插件能控制什么 / 到什么程度

| 层 | 内容 | 控制范围 | 程度 |
| --- | --- | --- | --- |
| ① 全局 token | `--dsw-alias-*` 13 个（bg 三层/overlay/边框×2/品牌/文字×2/语义×3/侧栏） | 整个应用表面、文字、边框、语义色 | 浅/深双值，全量覆盖 |
| ② 强调变量 | `--mdvr-*`（accent 系 5 个 + highlight 系 2 个 + quote/code/table 系 5 个 + link 系 2 个） | 排版层的全部色彩细节 | 浅/深双值 |
| ③ 元素排版 | v1.3.0 起排版骨架停用、v1.8.0 删除 `typography.css`：对话排版由产品 `._markdown_*` 规则兜底，主题通过自身 ③ 段（`:where()` 零优先级 + 按需 `!important`）增量覆盖 | 所有 Markdown 元素的样式 | 主题 ③ 段（规则级） |
| ④ 面板 UI | `plugin/assets/panel.css` + 自绘组件（版本卡片 / 主题设置页 / 主题编辑器） | 插件自有 UI | 完全控制 |

> ⚠️ **浅色分界色注意（v1.11.x 约定）**：浅色档边框/分层底色 vs 背景的对比是灰阶差显示器的重灾区——WCAG 1.4.11 非文本要求 ≥3:1，粉调审美受约束时至少 ≥2:1 肉眼可辨。实测猛男粉浅档 border-l1/l2 与底仅 1.3~1.7:1，属典型「看不清」区。调整优先级：先改主题专属 `--mdvr-code-border` 等，再谨慎动 L0 `--dsw-alias-border-*`（会波及整个产品 UI）。

### 明确做不到（平台限制）

1. **不改产品 DOM**：不能改类名、结构、属性；不能操作 `document.body`/`window`。
2. **零优先级**：`:where()` 意味着产品显式样式永远优先，我们只兜底"裸语义元素"。
3. **token 名单固定**：13 个 `--dsw-alias-*` 由平台 `Theme.listTokens` 决定，不可新增（新色只能走 `--mdvr-*` 自定义变量）。
4. **无持久化**：动态插件是内存态，设置页的选择在刷新/重启后恢复默认（`DEFAULT_SELECTION = 'system-native'` 决定默认值）。
5. **无 JS 组件进对话流**：只能注册平台预留的座位（run 卡片、设置页、侧栏动作等）。

## 二、主题文件格式（`plugin/assets/themes/*.css`）

每个主题一个 CSS 文件，三段式结构（全部带注释）：

```css
/* 文件头注释：主题 id/名称/风格说明/色值来源 */

/* ① 浅色档：全局 token（13 个）+ 强调变量（--mdvr-*） */
body { ... }

/* ② 深色档：同 ① 的深色取值 */
body[data-ds-dark-theme] { ... }

/* ③ 元素级定制（可选）：追加在主题① ② 之后，覆盖产品兜底/补充元素样式（草莓猛男粉即全量参考） */
:where(...) { ... }
```

要点：
- **挂载机制与产品一致**：浅色 `body`、深色 `body[data-ds-dark-theme]`（产品用属性选择器而非 `prefers-color-scheme`）。插件样式注入晚于产品样式表 → 同选择器后者胜出。
- 变量齐全性：`--mdvr-sans` / `--mdvr-mono` / `--mdvr-mm` 是排版常量；`--mdvr-link*` / `--mdvr-highlight*` 是公共约定（链接蓝 + 琥珀高亮）；`--mdvr-accent*` / `--mdvr-quote*` / `--mdvr-code-*` / `--mdvr-table-*` 是主题身份色。
- **排版兜底（v1.3.0+，v1.8.0 已删骨架文件）**：对话 Markdown 排版由产品 `._markdown_*` 规则兜底，主题只在自己 ③ 段做增量覆盖（变量契约见 `docs/unified-variables.md`）。
- **变量分层（v1.4.0 起统一契约，见 `docs/unified-variables.md`）**：L0 平台 token（13 个固定名单）→ L1 身份色（`--mdvr-*` 与 `--hl-*`，浅/深成对，写在 ① ② 两档）→ L2 排版/形状常量（行高/字号/圆角/内距等，单值）→ L3 功能旋钮（`--mdvr-mm` 等）→ 字体栈（单值）。L2/L3/字体放 `:root` 声明一次，不再在 body 两档重复。
- 参考实现：`plugin/assets/themes/strawberry-mocha.css` 是内置主题（v1.7.0 起唯一），带**完整 ③ 元素段**（近 80 条规则、全量消费 `--mdvr-*`/`--hl-*`）；早期纯配色主题（lobeui/inkpaper/qingci）已在 v1.7.0 移除。


## 三、选择模型（v0.9.0）

设置页「主题设置」分两组互斥单选：

1. **「系统自带」（默认，`DEFAULT_SELECTION = 'system-native'`）**：插件零干预（不注入 token/排版/变量），深浅跟随系统/外观偏好，☀️/🌙/🖥️ 三档可用（持久保存）。
2. **内置 / 用户主题（v1.13.0 起深浅跟随外观三档）**：☀️/🌙/🖥️ 按钮对任意选中主题可用——主题 CSS 自带 `body`（浅）与 `body[data-ds-dark-theme]`（深）两档即随切换生效；只写单档的主题在另一档保持原样。默认行为 = 原生（插件不做任何主题动作）。

### 用户主题（v1.0.0+，动态添加；v1.2.0 起可在设置页内编辑）

- 目录：`$HOME/.dsh/web-themes/`（v1.1.0 起**系统动态解析**，不硬编码：shell 读 `$HOME` → `sandboxPolicy.workspaceRoot` 推导 → `FALLBACK_USER_THEMES_DIR` 回退，见 host.js `resolveUserThemesDir`）
- 添加方式三选一：
  1. 手动放入任意 `*.css`（三段式格式，参考 `$HOME/.dsh/web-themes/example.css` 或仓库 `plugin/assets/themes/*.css`）→ 设置页「🔄 刷新用户主题」即生效，**无需打包/升级插件**；
  2. 设置页「🆕 新建用户主题」：**v1.12.0 起默认以内置主题 `strawberry-mocha`（猛男粉）内容起步**（即 `plugin/assets/themes/strawberry-mocha.css` 全文；独立模板资产已删除，加载失败回退 `plugin/assets/template.css` 青瓷演示版），浅色档 / 深色档 / 元素定制全注释，填文件名保存；
  3. 已有主题点卡片右上「✏️ 编辑」：改 CSS 后「💾 保存」写回原文件（Host `themes.user.save` RPC，沙箱放开到 `danger-full-access`）。
- 编辑器能力（v1.2.0）：**实时语法高亮**（透明 textarea 叠彩色 pre：注释/字符串/选择器/变量/at 规则/颜色/数值/属性名分色，跟随主题变量配色）；「🧹 格式化」一键排版（补分号、花括号换行、2 空格缩进、注释保留）；「Tab」插入缩进；保存成功后若该主题正被使用则自动重新应用（修改即时生效）。
- **内置主题只读**：仓库 `plugin/assets/themes/*.css` 的卡片无「编辑」按钮；但 v1.2.0 起内置主题与面板样式由 Host 从文件读取，**改 `plugin/assets/themes/*.css` 或 `plugin/assets/*.css` 后刷新/重启插件即生效**（无需重新打包）。
- 选中后外观三档同样可用：主题内容自带浅深两档即跟随切换（v1.13.0 起）

> `demo.css`（DSH 默认）与 `native.css`（原生）已随 v0.9.0 移除，由「系统自带」统一承担原生观感（历史版本在 git 中可查）。

## 四、内置主题

| 文件 | 名称 | 风格 |
| --- | --- | --- |
| `plugin/assets/themes/strawberry-mocha.css` | 草莓猛男粉 | 丝绒草莓甜点 × Catppuccin Mocha 暗夜：原生列表符号 + 全量 `--mdvr-*` 身份色 + `--hl-*` 语法高亮 + L2/L3 排版常量（全变量化参考实现，变量分层见 `docs/unified-variables.md`） |

> v1.7.0 起内置主题仅保留草莓猛男粉；早期纯配色主题 lobeui-emphasis / inkpaper / qingci 已移除（历史在 git）。

## 四、构建与切换机制

- **构建（v1.2.0 起）**：`node scripts/build-client.js` = 拷贝 `plugin/src/client.core.js` → `plugin/client.js` + 资产完整性检查。CSS 资产不再内联：Host 经 `themes.builtin.list` / `themeAssets.get` 从 `plugin/assets/themes/*.css` 与 `plugin/assets/*.css` 读取（`sandboxPolicy.workspaceRoot` 定位）。
- **define 传输**：`node scripts/minify.js` 生成精简双半（仅删注释/折叠空白，token 流等价校验），一次传 host+client 双半。
- **发布门禁**：`node scripts/check-release.js` 自动核对 MANIFEST 一致性、构建产物、CSS 契约与 packageId 唯一性。
- **注入（v1.3.0+）**：`主题css + panel.css`（排版骨架已删，产品 `._markdown_*` 规则兜底排版），`applySelection(id)` 原子切换（先构建新样式成功后再卸载旧样式）。
- **卸载**：`ctx.effect` 持有样式表 disposer，stop/update/undefine 自动还原。

## 五、如何新增一个主题

1. 在 `plugin/assets/themes/` 或 `$HOME/.dsh/web-themes/` 新建 `.css`（复制任意主题为模板，改头注释）。
2. 定 13 个 token 的浅/深值（浅档语义色参考 `docs/readability-a11y.md` 的 AA 值）。
3. 定 accent 系变量（tint 配方：`result = round(α·A + (1−α)·S)`，浅档 α=12%、深档 α=14%）。
4. 需要差异化元素时写 ③ 段扩展规则。
5. 在 `plugin/src/client.core.js` 的 `THEME_META` 加一行（显示名/描述/色板预览）——仅内置主题需要；用户主题自动出现在列表。
6. `node scripts/build-client.js` → 定义新 Package → update → 设置页验证。

## 六、完整参考主题（第三方用户手册）

- **`$HOME/.dsh/web-themes/example.css`** 是"完整参考主题"：涵盖全部可控面并逐条注释影响范围——
  ① 13 全局 token（官方语义注释）② 15 个 `--mdvr-*` 变量（每个标注影响哪些元素）③ 全部可控元素规则（标题/段落/列表/任务框/行内代码/代码块/引用/表格/分割线/链接/粗体/高亮/删除线/上下标/kbd/图片，`:where()` 零优先级覆盖产品兜底）④ 扩展示例（选区/滚动条/斑马纹/焦点轮廓）⑤ 头部警告区（挂载机制、零优先级、固定名单、无深浅之分、WCAG AA、生效方式）+ 尾部配色速查（tint 配方、AA 实测值）。
- **「🆕 新建用户主题」起点（v1.12.0 起）= 内置主题 `plugin/assets/themes/strawberry-mocha.css`（猛男粉）内容本身**——独立模板资产 `plugin/assets/template-strawberry.css` 已随 v1.12.0 删除，不再双维护；加载失败回退 `plugin/assets/template.css`。`template.css` 与 example.css 同源完整版（青瓷演示），保留作回退。
- 编写时警告要点：浅色 `body` / 深色 `body[data-ds-dark-theme]`（属性选择器，**非** `prefers-color-scheme`）；元素定制一律 `:where()`；`--dsw-alias-*` 固定 13 个不可新增；正文对比度 ≥4.5:1。
