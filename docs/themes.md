# 主题系统说明（v1.2.0 资产文件化）

> 插件能控制的全部 CSS 收敛为「主题系统」：**每套主题 = `themes/` 下一个独立 CSS 文件**。
> v1.2.0 起全部资产文件化：内置主题 + 共享资产（排版骨架/面板样式/新建模板）由 **Host 运行时从文件读取**
> （`themes.builtin.list` / `themeAssets.get` RPC），**改文件即生效，无需升级插件**；客户端不再内联 CSS（`build-client.js` 仅拷贝源码）。
> v1.2.1 起项目根按内容探测（`resolveProjectRoot`：workspaceRoot → 兄弟目录 → 显式兜底，⚠️ workspaceRoot 是 DSH 启动目录而非必然的项目目录）。
> 项目约定见 `AGENTS.md`。

## 一、插件能控制什么 / 到什么程度

| 层 | 内容 | 控制范围 | 程度 |
| --- | --- | --- | --- |
| ① 全局 token | `--dsw-alias-*` 13 个（bg 三层/overlay/边框×2/品牌/文字×2/语义×3/侧栏） | 整个应用表面、文字、边框、语义色 | 浅/深双值，全量覆盖 |
| ② 强调变量 | `--mdvr-*`（accent 系 5 个 + highlight 系 2 个 + quote/code/table 系 5 个 + link 系 2 个） | 排版层的全部色彩细节 | 浅/深双值 |
| ③ 元素排版 | `plugin/assets/typography.css` 约 30 条规则：字体栈、字号、行高、间距、圆角、边框、阴影、动效、列表符号、表格、代码、引用、hr、kbd、img、mark | 所有 Markdown 元素的样式 | 规则级（`:where()` 零优先级） |
| ④ 面板 UI | `plugin/assets/panel.css` + 自绘组件（版本卡片 / 主题设置页 / 主题编辑器） | 插件自有 UI | 完全控制 |

### 明确做不到（平台限制）

1. **不改产品 DOM**：不能改类名、结构、属性；不能操作 `document.body`/`window`。
2. **零优先级**：`:where()` 意味着产品显式样式永远优先，我们只兜底"裸语义元素"。
3. **token 名单固定**：13 个 `--dsw-alias-*` 由平台 `Theme.listTokens` 决定，不可新增（新色只能走 `--mdvr-*` 自定义变量）。
4. **无持久化**：动态插件是内存态，设置页的选择在刷新/重启后恢复默认（`DEFAULT_SELECTION = 'system-native'` 决定默认值）。
5. **无 JS 组件进对话流**：只能注册平台预留的座位（run 卡片、设置页、侧栏动作等）。

## 二、主题文件格式（`themes/*.css`）

每个主题一个 CSS 文件，三段式结构（全部带注释）：

```css
/* 文件头注释：主题 id/名称/风格说明/色值来源 */

/* ① 浅色档：全局 token（13 个）+ 强调变量（--mdvr-*） */
body { ... }

/* ② 深色档：同 ① 的深色取值 */
body[data-ds-dark-theme] { ... }

/* ③ 元素级定制（可选）：追加在共享骨架之后，可覆盖/补充元素样式 */
:where(...) { ... }
```

要点：
- **挂载机制与产品一致**：浅色 `body`、深色 `body[data-ds-dark-theme]`（产品用属性选择器而非 `prefers-color-scheme`）。插件样式注入晚于产品样式表 → 同选择器后者胜出。
- 变量齐全性：`--mdvr-sans` / `--mdvr-mono` / `--mdvr-mm` 是排版常量；`--mdvr-link*` / `--mdvr-highlight*` 是公共约定（链接蓝 + 琥珀高亮）；`--mdvr-accent*` / `--mdvr-quote*` / `--mdvr-code-*` / `--mdvr-table-*` 是主题身份色。
- **共享骨架 `plugin/assets/typography.css` 只引用变量，不含写死色值** —— 主题切换 = 换变量，骨架不动。


## 三、选择模型（v0.9.0）

设置页「主题设置」分两组互斥单选：

1. **「系统自带」（默认，`DEFAULT_SELECTION = 'system-native'`）**：插件零干预（不注入 token/排版/变量），深浅跟随系统/外观偏好，☀️/🌙/🖥️ 三档可用（持久保存）。
2. **第三方主题（无深浅之分）**：选中后外观三档按钮变灰禁用（`disabled: !isSystem`），主题按当前生效档渲染自身色板；回到「系统自带」三档重新可用。默认行为 = 原生（插件不做任何主题动作）。

### 用户主题（v1.0.0+，动态添加；v1.2.0 起可在设置页内编辑）

- 目录：`$HOME/.dsh/web-themes/`（v1.1.0 起**系统动态解析**，不硬编码：shell 读 `$HOME` → `sandboxPolicy.workspaceRoot` 推导 → `FALLBACK_USER_THEMES_DIR` 回退，见 host.js `resolveUserThemesDir`）
- 添加方式三选一：
  1. 手动放入任意 `*.css`（三段式格式，参考 `$HOME/.dsh/web-themes/example.css` 或仓库 `themes/*.css`）→ 设置页「🔄 刷新用户主题」即生效，**无需打包/升级插件**；
  2. 设置页「🆕 新建用户主题」：以三段式模板起步（内容来自 `plugin/assets/template.css`，浅色档 / 深色档 / 元素定制注释），填文件名保存；
  3. 已有主题点卡片右上「✏️ 编辑」：改 CSS 后「💾 保存」写回原文件（Host `themes.user.save` RPC，沙箱放开到 `danger-full-access`）。
- 编辑器能力（v1.2.0）：**实时语法高亮**（透明 textarea 叠彩色 pre：注释/字符串/选择器/变量/at 规则/颜色/数值/属性名分色，跟随主题变量配色）；「🧹 格式化」一键排版（补分号、花括号换行、2 空格缩进、注释保留）；「Tab」插入缩进；保存成功后若该主题正被使用则自动重新应用（修改即时生效）。
- **内置主题只读**：仓库 `themes/*.css` 的卡片无「编辑」按钮；但 v1.2.0 起内置主题与骨架/面板样式由 Host 从文件读取，**改 `themes/*.css` 或 `plugin/assets/*.css` 后刷新/重启插件即生效**（无需重新打包）。
- 选中后与内置第三方主题一样无深浅之分（外观三档灰置，回到「系统自带」恢复）

> `demo.css`（DSH 默认）与 `native.css`（原生）已随 v0.9.0 移除，由「系统自带」统一承担原生观感（历史版本在 git 中可查）。

## 四、内置主题

| 文件 | 名称 | 风格 |
| --- | --- | --- |
| `themes/lobeui-emphasis.css` | LobeUI 风格（强调） | LobeUI 中性灰阶 + 靛蓝强调系统 |
| `themes/inkpaper.css` | 墨纸 · InkPaper | 暖纸：米白纸底 + 墨褐 accent + 琥珀 highlight |
| `themes/qingci.css` | 青瓷 | 青绿灰阶 + 青瓷绿 accent + 12px 圆角釉感 |

## 四、demo.css 维护规则（铁律）

1. **覆盖全部可控面**：13 token + 全部 `--mdvr-*` 变量 + 每个可控元素一条规则。
2. **每条规则带注释**：说明控制哪个部分（如 `/* 行内代码：主题 tint 底 + 描边 + 强调字 */`）。
3. **随版本更新**：① token 出厂值变动时同步；② `TYPO_CSS` 骨架变动时同步 §C 元素目录。
4. demo 主题的 §C 值与骨架一致（重复声明无害），未来某元素要"恢复 DSH 原样"时把对应规则改回出厂值即可。

## 五、构建与切换机制

- **构建（v1.2.0 起）**：`node scripts/build-client.js` = 拷贝 `plugin/src/client.core.js` → `plugin/client.js` + 资产完整性检查。CSS 资产不再内联：Host 经 `themes.builtin.list` / `themeAssets.get` 从 `themes/*.css` 与 `plugin/assets/*.css` 读取（`sandboxPolicy.workspaceRoot` 定位）。
- **define 传输**：`node scripts/minify.js` 生成精简双半（仅删注释/折叠空白，token 流等价校验），一次传 host+client 双半。
- **切换（设置页/会话级）**：`applySelection(id)` 注入 `typography.css + 主题css + panel.css`（先 dispose 旧表）；默认选择 `DEFAULT_SELECTION = 'system-native'`（资产就绪后应用）。
- **卸载**：`ctx.effect` 持有样式表 disposer，stop/update/undefine 自动还原。

## 六、如何新增一个主题

1. 在 `themes/` 或 `$HOME/.dsh/web-themes/` 新建 `.css`（复制任意主题为模板，改头注释）。
2. 定 13 个 token 的浅/深值（浅档语义色参考 `docs/readability-a11y.md` 的 AA 值）。
3. 定 accent 系变量（tint 配方：`result = round(α·A + (1−α)·S)`，浅档 α=12%、深档 α=14%）。
4. 需要差异化元素时写 ③ 段扩展规则。
5. 在 `plugin/src/client.core.js` 的 `THEME_META` 加一行（显示名/描述/色板预览）——仅内置主题需要；用户主题自动出现在列表。
6. `node scripts/build-client.js` → 定义新 Package → update → 设置页验证。

## 七、完整参考主题（第三方用户手册）

- **`$HOME/.dsh/web-themes/example.css`** 是"完整参考主题"：涵盖全部可控面并逐条注释影响范围——
  ① 13 全局 token（官方语义注释）② 15 个 `--mdvr-*` 变量（每个标注影响哪些元素）③ 全部可控元素规则（标题/段落/列表/任务框/行内代码/代码块/引用/表格/分割线/链接/粗体/高亮/删除线/上下标/kbd/图片，`:where()` 零优先级覆盖骨架）④ 扩展示例（选区/滚动条/斑马纹/焦点轮廓）⑤ 头部警告区（挂载机制、零优先级、固定名单、无深浅之分、WCAG AA、生效方式）+ 尾部配色速查（tint 配方、AA 实测值）。
- **`plugin/assets/template.css`**（新建用户主题的起点模板）与 example.css 同源完整版，点「🆕 新建用户主题」即以此起步。
- 编写时警告要点：浅色 `body` / 深色 `body[data-ds-dark-theme]`（属性选择器，**非** `prefers-color-scheme`）；元素定制一律 `:where()`；`--dsw-alias-*` 固定 13 个不可新增；正文对比度 ≥4.5:1。
