# LobeUI 字体与排版体系对照 —— Markdown 主题插件 v0.1.0 竞品设计研究

> 研究对象：`lobehub/lobe-ui`（master 分支，镜像哈希 `17cc8a62…`）
> 主要来源文件（GitHub 源目录）：
> - `src/styles/theme/token/base.ts` — 全局字体栈
> - `src/ThemeProvider/GlobalStyle/global.ts` — body 全局排版
> - `src/Markdown/style.ts` — **Markdown 排版核心 CSS**
> - `src/Markdown/markdown.style.ts` — chat/gfm/GFM alert / latex 变体
> - `src/Markdown/Typography.tsx` — Typography 组件的可调参数
> - `src/Markdown/components/CodeBlock.tsx` + `src/mdx/mdxComponents/Pre.tsx` + `src/Highlighter/style.ts` — 代码块
> - `src/Markdown/SyntaxMarkdown/style.ts` — 流式渲染动画
> 参考 URL：<https://github.com/lobehub/lobe-ui>、<https://lobehub.github.io/lobe-ui/>

---

## 一、LobeUI 字体 / 排版体系要点

### 1.1 全局字体栈（`src/styles/theme/token/base.ts`）

LobeUI 用三段拼接法构造字体栈，且全部**为字体单独引号包裹**：

```ts
const FONT_EN   = ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI Variable Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'];
const FONT_CN   = ['HarmonyOS Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans CJK SC'];
const FONT_CODE = ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Cascadia Code', 'Consolas', 'Liberation Mono'];
const FALLBACK      = ['ui-sans-serif', 'system-ui', 'sans-serif'];
const FALLBACK_CODE = ['monospace'];
const FONT_EMOJI    = ['Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'];
```

- `fontFamily` = `FONT_EN + FONT_CN + FALLBACK + FONT_EMOJI`
- `fontFamilyCode` = `FONT_CODE + FONT_CN + FALLBACK_CODE + FONT_EMOJI`

实际使用的正是任务描述中推断的栈，但有三点值得注意：英文优先面是 **Geist**（Lobe 自造字体，配 HarmonyOS Sans SC 做中文回退）；中文字体用了 `PingFang SC → Hiragino Sans GB → Microsoft YaHei UI → Source Han Sans SC → Noto Sans CJK SC`；等宽栈在传统 `SFMono-Regular/Menlo/Consolas/` 基础上加了 `Geist Mono / ui-monospace / SF Mono / Cascadia Code / Liberation Mono`，保底是 `monospace`。emoji 字体放在栈尾保证 🍭 等符号可渲染。

### 1.2 全局 body 排版（`src/ThemeProvider/GlobalStyle/global.ts`）

```css
body {
  font-family: var(fontFamily);       /* 栈尾即全局默认字体 */
  font-size: 14px;                     /* antd token.fontSize 默认 14 */
  line-height: 1;
  font-feature-settings: 'cv01','tnum','kern';
  font-variant-numeric: tabular-nums;
  font-optical-sizing: auto;
  font-kerning: normal;
  -webkit-font-smoothing: antialiased;
  text-wrap: pretty;
  text-size-adjust: 100%;
  text-rendering: optimizelegibility;
  overflow-wrap: anywhere;
}
code, kbd, samp, pre { font-family: fontFamilyCode !important; }
::selection { background: yellow9; color: #000; }
```

要点：全局确实设置了字体栈（body 级），且对 `code/kbd/samp/pre` **强制**使用等宽栈；正文 `line-height` 在 body 为 1，真正的行高由 Markdown 组件在其内部元素上重新声明（1.8）。

### 1.3 Markdown 排版核心（`src/Markdown/style.ts`）

这是对照我们实现最重要的文件。所有数值都由 CSS 自定义属性驱动，并可直接由组件 props 覆盖：

```css
--lobe-markdown-font-size: 16px;          /* Markdown 基线字号（body 的 14 之上被放大） */
--lobe-markdown-header-multiple: 1;
--lobe-markdown-margin-multiple: 2;       /* 间距节奏基准倍数 */
--lobe-markdown-line-height: 1.8;          /* 中文友好行高 */
--lobe-markdown-border-radius: borderRadiusLG(12);
--lobe-markdown-border-color: colorFillQuaternary;
```

| 元素 | LobeUI 实际样式 |
|------|----------------|
| 根 | `font-size:16px; line-height:1.8; overflow-wrap:break-word; padding-inline:1px` |
| h1 | `font-size:16*(1+1.5*1)=40px`（2.5em）；`font-weight:bold`；`line-height:1.25` |
| h2 | `32px`（2em） |
| h3 | `24px`（1.5em） |
| h4 | `20px`（1.25em） |
| h5/h6 | `16px`（1em，与正文同号） |
| 标题 margin | `margin-block: max(headerMultiple*marginMultiple*0.4em, fontSize)` = `max(0.8em, 1em)` = **1em** |
| h1 下边框 | 无（LobeUI 标题不带下边框） |
| p | `margin-block:4px`；非首位 `margin-block-start:1em`；非末位 `margin-block-end:1em`；`line-height:1.8; letter-spacing:0.02em` |
| ul/ol | `margin-block:1em; margin-inline-start:1em; padding-inline-start:0; list-style-position:outside`；`>li{margin-inline-start:1em}`；`>ul/ol{margin-block:0}` |
| ul | `list-style-type:none` + 自定义 `-` 破折号标记（opacity .5） |
| ol | `list-style:auto` |
| li | `margin-block:~0.66em`；`p:first-child{display:inline}` |
| inline code | `font-family:fontFamilyCode; font-size:0.875em; line-height:1; margin-inline:.25em; padding-block:.1em; padding-inline:.4em; border:1px border-color; border-radius:.25em; background:colorFillSecondary; white-space:break-spaces` |
| pre | `font-size:0.85em`（容器内 block 排版由 Highlighter/Pre 组件负责） |
| blockquote | `margin-block:1em; margin-inline:0; padding-inline:1em; border-inline-start:4px solid colorBorder; color:colorTextSecondary`（无背景、无圆角） |
| strong | `font-weight:600` |
| hr | `margin-block:3em; border:1px dashed; border-block-start/inline:none`（**虚线**） |
| table | `display:block; width:max-content; max-width:100%; margin-block:1em; border-radius:8px; box-shadow:0 0 0 1px colorBorderSecondary; text-align:start; word-break:auto-phrase` |
| th/td | `min-width:120px; padding-block:.75em; padding-inline:1em`；thead 底色 `colorFillQuaternary`；tr `box-shadow:0 1px 0`（**无单元格边框，用外框+横向细线**） |
| img/video | `max-width:100%; border-radius:8px; box-shadow:0 0 0 1px border-color` |
| details | `padding:.75em 1em; background:colorFillTertiary; box-shadow:0 0 0 1px border-color` |
| sup/sub | `font-size:.75em`，偏移 `.25em` |
| del | 删除线 + `colorTextDescription` |
| a | `color:colorInfoText`；hover `colorInfoHover`（无下划线逻辑，靠颜色反馈） |

**间距节奏逻辑**：所有块级元素的 margin 都是 `marginMultiple(=2) × k` 的倍数（如 p/标题/列表/引用/表格 = 1em，hr = 3em，li = 0.66em）。这套「倍数制」是实现首尾去空的干净段落节奏的关键——`p{ &:not(:last-child){ margin-block-end:1em } }` 让相邻段落之间正好 1em，首元素顶部 0、末元素底部 0。

### 1.4 变体（`src/Markdown/markdown.style.ts`）

- `chat`：`ol/ul > li::marker` 改用次要文字色。
- `gfm`：内建 `.markdown-alert-note/tip/important/warning/caution` 五色条（4px 左border + 标题图标），脚注 `.footnotes`（`#8b949e`，`font-size:smaller`），`code.color-preview` 圆形色块。
- `root`：`position:relative; overflow:hidden; max-width:100%`。

### 1.5 代码块（`CodeBlock.tsx` + `Pre.tsx` + `Highlighter/style.ts`）

- 块容器：`overflow:hidden; margin-block:1em; border-radius:12px; box-shadow:0 0 0 1px border-color inset`（无独立 border，用 inset 外框）。
- 单行短代码走 `Snippet` 组件（inline 药丸）；多行走 Highlighter。
- Highlighter：`border-radius:8px`、`background:colorFillQuaternary`，工具栏 `.languageTitle`/`.panel-actions` 默认透明、hover 显现；底部角落语言标签（`blur` 玻璃拟态 + 等宽字体）。
- 渲染层正常用字体 `fontFamilyCode`，关闭连字 `liga 0 / calt 0`（见 global.ts）。

---

## 二、逐项对比表（我们的实现 → LobeUI → 结论）

| 维度 | 我们 v0.1.0 | LobeUI | 高下 |
|------|------------|--------|------|
| **全局字体栈** | 未设置，用产品默认 | body 级 `fontFamily`（Geist…) + `code/pre/kbd` 强制 `fontFamilyCode` | LobeUI 优：应补 |
| **等宽栈** | `ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace` | `Geist Mono, ui-monospace, SFMono-Regular, SF Mono, Menlo, Cascadia Code, Consolas, Liberation Mono, monospace` | 我们的缺 `SF Mono/Cascadia/Liberation`，且有保底 `monospace` 之外多了一个非标准项 |
| **inline code 字号** | `0.88em` | `0.875em` | LobeUI 0.875em（≈7/8）更规整 |
| **inline code 边框** | 无边框，纯 layer-2 底 | `1px` 边框 + `colorFillSecondary` 底 | LobeUI 优：边框使内联代码更清晰 |
| **inline code padding** | `0.15em 0.4em` | `0.1em 0.4em`(块) `0.25em`(行内 margin) | 基本一致，可采行内 margin |
| **pre 字号** | `0.86em` | `0.85em` | 接近 |
| **pre 容器** | `bg layer-1 + 1px border + radius 8px + padding .9em 1.1em + overflow-x:auto` | 组件式：`bg colorFillQuaternary + radius 12px + inset 外框`，无内边距 | LobeUI 优：圆角更大(12)、用外框更干净 |
| **正文行高** | `1.75` | `1.8`（中文友好）+ 段间 `letter-spacing:.02em` | LobeUI 优：1.8 更适合中文，且字距微调 |
| **h1-h6 字号** | 1.5/1.3/1.15/1.05 em | 2.5/2/1.5/1.25/1 em（基于16px） | LobeUI 阶梯更舒展、区分度更大 |
| **标题字重** | `600` | `bold`(700) | LobeUI 优：Medium 以下标题在长正文容易"糊"，700 更稳 |
| **标题行高** | `1.35` | `1.25` | LobeUI 优：大标题更紧致 |
| **标题 margin** | `1.4em 0 0.6em` | `block: 1em`（`max(0.8em,fontSize)`） | 我们纵向余量更多；LobeUI 用"首尾去空+恰好1em"节奏 |
| **h1 下边框** | 有 `1px` 下边框 | 无 | 产品口味；LobeUI 更克制 |
| **p margin** | `0.6em 0` | `4px` 基值 + 非首/末 `1em` | LobeUI 优：首尾去空的节奏更专业 |
| **ul/ol 缩进** | `padding-left:1.6em` | `margin-inline-start:1em + padding-inline-start:0` + 层级 `>li{...1em}` | LobeUI 优：列表标记随文章流更自然 |
| **li margin** | `0.25em` | `0.66em` | LobeUI 更透气（但也更分散） |
| **ul 符号** | 浏览器默认 | 自定义 `-` 破折号（opacity .5） | LobeUI 更精致 |
| **blockquote** | `3px` 品牌色 + layer-1 底 + 半径 `0 8px 8px 0` | `4px` 普通色 + **无背景** + 次要色文字 | 我们更有质感；LobeUI 更克制。可选方案 |
| **hr** | 实线 1px | `1px dashed` + 上下 3em | LobeUI：虚线更轻盈 |
| **table** | 单元格全 `1px` 边框 + 偶数行底色 | 外框+横向细线，`th/td padding:.75em 1em/min-width:120px` | LobeUI 优：更现代，减少视觉噪音 |
| **表格 cell padding** | `0.45em 0.8em` | `0.75em 1em` | LobeUI 更宽松友好 |
| **strong** | `650` | `600` | 接近；LobeUI 用标准 600 |
| **链接** | 品牌色、无下划线、hover 下划线 | `colorInfoText` 颜色切换、无下划线 | 我们的 hover 下划线模式更传统清晰 |

---

## 三、改动建议清单（可落地）

### A. 字体栈（强烈建议）
1. **补全局字体栈**：在排版层根上为产品内部 Markdown 作用域声明 LobeUI 的 sans 栈与等宽栈（用 `:where()` 包裹避免破坏产品默认字体）。中文栈推荐 LobeUI 的
   `'HarmonyOS Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei UI','Microsoft YaHei','Source Han Sans SC','Noto Sans CJK SC'`；
   无 HarmonyOS 时可简化为 `PingFang SC, 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`。
2. **替换等宽栈**为 LobeUI 形式（去掉非标准 `"JetBrains Mono"` 前导位置，补 `SF Mono / Cascadia Code / Liberation Mono`）：
   `Geist Mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace`。
   保留你的 `JetBrains Mono` 可放 `ui-monospace` 后即可。

### B. 正文与行高
3. 正文 `line-height 1.75 → 1.8`，并给 `p` 加 `letter-spacing: 0.02em`（帮助中文断行与可读性）。
4. `p` margin 改为“首尾去空 + 段间 1em”节奏，代替统一的 `0.6em 0`：
   ```css
   :where(p){ margin-block:4px; line-height:1.8; letter-spacing:.02em; }
   :where(p:not(:first-child)){ margin-block-start:1em; }
   :where(p:not(:last-child)){ margin-block-end:1em; }
   ```

### C. 标题
5. 字号阶梯改舒展一点的梯度（可增量采纳）：保留纵向余量但可减为 `block: 1em`。LobeUI 建议值（相对你现有的：
   `h1:2em&nbsp;(而非1.5em)`、`h2:1.6em`、`h3:1.3em`、`h4:1.15em`）——若要与正文 16px 挂钩可完全照搬 `2.5/2/1.5/1.25/1 em`。
6. 标题 `line-height 1.35 → 1.25`；`font-weight 600 → 700`（如想更克制可保持 600，但 LobeUI 用 bold）。
7. `h1` 下边框若保留（产品签名），建议从 `border-bottom` 改为 `box-shadow:0 1px 0 border-l1` 或保留现状；LobeUI 无此细节。

### D. 内联代码
8. inline code 字号 `0.88em → 0.875em`；补 `border:1px solid var(--dsw-alias-border-l1)`，背景可保持 layer-2；`line-height:1`；加 `white-space:break-spaces`。
9. inline code 加左右外边距 `margin-inline:.25em`（让与相邻中文有呼吸）。

### E. 代码块
10. 块圆角 `8px → 12px`（LobeUI borderRadiusLG）；背景用 layer-1 或更深的 layer-2；`border:1px solid` 可改为 `box-shadow:inset 0 0 0 1px border-l1`（更干净）。
11. pre 字号 `0.86em → 0.85em`；`pre code` `line-height` 保持 1.6 或按 LobeUI 语义提一点，且关闭连字 `font-variant-ligatures:none`。

### F. 引用 / 分割线
12. blockquote：可保留我们的“品牌色 + layer-1 底 + 右圆角”签名（质感更好）；若要贴近 LobeUI：`border-inline-start:4px solid border-l1`、无背景、加次要文字色。建议至少把左边条从 `3px → 4px`。
13. `hr` 线型 `实线 → dashed`，上下间距 `1.4em → 1.5em~1.8em`。

### G. 表格
14. th/td `padding 0.45em 0.8em → 0.75em 1em`；加 `min-width:120px`；`table` 加 `border-radius:8px` 与 `box-shadow:0 0 0 1px border-l1`，**去掉单元格全部 1px 边框**，改 thead 底色 + 横向行间线（更现代、减少视觉噪音）。
15. 表格与块级元素统一走“倍数间距节奏”（p/标题/列表/引用/表格都与正文行高对齐）。

### H. 其它
16. strong `650 → 600`（与 LobeUI 一致，字体 650 支持不稳定）。
17. 链接：建议保留品牌色 + hover 下划线（业务上更清晰），这比 LobeUI 纯颜色反馈更适合对话产品；无需改动。

---

## 四、最终判断

- **最该改**：全局字体栈（含等宽）缺失 → 补；正文行高 1.75→1.8；段落首尾去空节奏；表格从"全边框"改"外框+底纹"。
- **产品签名可保留**：h1 下边框、blockquote 品牌色衬底、链接下划线、code 的 JetBrains Mono 偏好。
- **单一最大加分项**：把大块间距改为「marginMultiple 倍数制」——这是 LobeUI 排版节奏干净、首尾无多余空隙的根本原因，我们的 `0.6em/0.25em/1.4em` 混合手填值缺这套内在秩序，建议引入 `--md-margin-multiple:2` 自定义属性统一驱动。
