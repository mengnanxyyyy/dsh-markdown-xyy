# 主题系统说明（v0.6.0）

> 插件能控制的全部 CSS 收敛为「主题系统」：**每套主题 = `themes/` 下一个独立 CSS 文件**，
> 由构建脚本内联进插件（`node scripts/build-client.js`）。
> 项目约定见 `AGENTS.md`（铁律：主题必须 CSS 文件、demo.css 必须随版本同步）。

## 一、插件能控制什么 / 到什么程度

| 层 | 内容 | 控制范围 | 程度 |
| --- | --- | --- | --- |
| ① 全局 token | `--dsw-alias-*` 13 个（bg 三层/overlay/边框×2/品牌/文字×2/语义×3/侧栏） | 整个应用表面、文字、边框、语义色 | 浅/深双值，全量覆盖 |
| ② 强调变量 | `--mdvr-*`（accent 系 5 个 + highlight 系 2 个 + quote/code/table 系 5 个 + link 系 2 个） | 排版层的全部色彩细节 | 浅/深双值 |
| ③ 元素排版 | `TYPO_CSS` 约 30 条规则：字体栈、字号、行高、间距、圆角、边框、阴影、动效、列表符号、表格、代码、引用、hr、kbd、img、mark | 所有 Markdown 元素的样式 | 规则级（`:where()` 零优先级） |
| ④ 面板 UI | `PANEL_CSS` + 自绘组件（版本卡片 / 主题设置页） | 插件自有 UI | 完全控制 |

### 明确做不到（平台限制）

1. **不改产品 DOM**：不能改类名、结构、属性；不能操作 `document.body`/`window`。
2. **零优先级**：`:where()` 意味着产品显式样式永远优先，我们只兜底"裸语义元素"。
3. **token 名单固定**：13 个 `--dsw-alias-*` 由平台 `Theme.listTokens` 决定，不可新增（新色只能走 `--mdvr-*` 自定义变量）。
4. **无持久化**：动态插件是内存态，设置页的选择在刷新/重启后恢复默认（`ACTIVE_THEME` 配置项决定默认值）。
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
- **共享骨架 `TYPO_CSS` 只引用变量，不含写死色值** —— 主题切换 = 换变量，骨架不动。

## 三、内置主题

| 文件 | 名称 | 风格 |
| --- | --- | --- |
| `themes/demo.css` | DSH 默认 | **出厂观感**：13 token 取 DSH 出厂值（`dsh-client-ui-theme` 的 `--dsw-static-*`），强调色用品牌蓝 `#5686fe` 体系；§C 是全元素目录（每元素一条规则 + 注释说明控制哪部分） |
| `themes/lobeui-emphasis.css` | LobeUI 风格（强调） | LobeUI 中性灰阶 + 靛蓝强调系统（默认启用） |
| `themes/inkpaper.css` | 墨纸 · InkPaper | 暖纸：米白纸底 + 墨褐 accent + 琥珀 highlight |
| `themes/qingci.css` | 青瓷 | 青绿灰阶 + 青瓷绿 accent + 12px 圆角釉感 |

## 四、demo.css 维护规则（铁律）

1. **覆盖全部可控面**：13 token + 全部 `--mdvr-*` 变量 + 每个可控元素一条规则。
2. **每条规则带注释**：说明控制哪个部分（如 `/* 行内代码：主题 tint 底 + 描边 + 强调字 */`）。
3. **随版本更新**：① token 出厂值变动时同步；② `TYPO_CSS` 骨架变动时同步 §C 元素目录。
4. demo 主题的 §C 值与骨架一致（重复声明无害），未来某元素要"恢复 DSH 原样"时把对应规则改回出厂值即可。

## 五、构建与切换机制

- **构建**：`node scripts/build-client.js` → 读取 `themes/*.css`，JSON 转义后生成 `plugin/client.js` 的 `THEMES` 注册表（`THEMES` 禁止手改）。
- **切换（设置页/会话级）**：`activateTheme(id)` 注入 `TYPO_CSS + 主题css + PANEL_CSS`（先 dispose 旧表）；默认主题由 `ACTIVE_THEME` 决定。
- **卸载**：`ctx.effect` 持有样式表 disposer，stop/update/undefine 自动还原。

## 六、如何新增一个主题

1. 在 `themes/` 新建 `my-theme.css`（复制任意主题为模板，改头注释）。
2. 定 13 个 token 的浅/深值（浅档语义色参考 `docs/readability-a11y.md` 的 AA 值）。
3. 定 accent 系变量（tint 配方：`result = round(α·A + (1−α)·S)`，浅档 α=12%、深档 α=14%）。
4. 需要差异化元素时写 ③ 段扩展规则。
5. 在 `plugin/src/client.core.js` 的 `THEME_META` 加一行（显示名/描述/色板预览）。
6. `node scripts/build-client.js` → 定义新 Package → update → 设置页验证。
