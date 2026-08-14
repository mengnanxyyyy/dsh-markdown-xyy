# LobeUI CodeBlock / Markdown 竞品对比研究报告

> 研究对象：`lobehub/lobe-ui`（github.com/lobehub/lobe-ui，master 分支）
> 对比对象：`dsh-markdown-xyy` v0.1.0（纯 CSS 排版层，无 JS 高亮）
> 研究日期：research snapshot（master 9b7 对应 commit 17cc8a6）
> 说明：本文只报告从 LobeUI 源码中提取的事实与可直接落地的具体数值。

---

## 一、调研结论速览（重要发现）

### 关键发现 1：当前 LobeUI 已放弃「oneDark / oneLight 写死主题」，改为语义化「Lobe Theme」

任务描述中提到的 **oneDark/oneLight 双主题是较旧版本的做法**。当前 master 的实现在：

- `src/Highlighter/theme/lobe-theme.ts` — 只有一个自定义主题 `lobe-theme`，**type: 'dark'**，但所有颜色都用 antd 的语义 token（`cssVar.colorText`、`colorSuccess`、`colorInfo`、`colorWarning`、`geekblue10`、`volcano10`、`purple10` 等）引用。
- `src/Highlighter/const.ts` 的 `highlighterThemes`：默认 `lobe-theme`，其余来自 shiki 内置 `bundledThemes`（含 oneDark/oneLight 可选）。

**设计理由（从代码推断，事实）**：把高亮颜色绑定到 antd 语义 token，随应用深浅模式自动切换，避免维护两套硬编码主题。`editor.background` 直接用 `cssVar.colorBgContainer`（即代码块底色 = 应用容器底色，而非独立深色块）。

> 对本项目的意义：dsh-markdown-xyy 已有 `--dsw-alias-*` 双套 token（宣纸/玄夜），正适合模仿这个语义化思路 —— **不建议引入写死的 oneDark/oneLight 配色**。

### 关键发现 2：代码块的实际样式位置

代码块并不在独立的 `src/components/CodeBlock/*`（旧路径），当前拆成三层：

| 层 | 文件 | 职责 |
|---|---|---|
| 出口组件 | `src/mdx/mdxComponents/Pre.tsx` | 把 `CodeBlock` 分流到 Highlighter / Snippet / Mermaid / HtmlPreview |
| 代码块容器 | `src/Highlighter/Highlighter.tsx` + `style.ts` | 复制按钮、语言标签、变体、hover 交互 |
| 高亮渲染 | `src/Highlighter/SyntaxHighlighter/*` | shiki 高亮、行号/行内交互 |
| 排版基线 | `src/Markdown/markdown.style.ts` | 行内 code、表格、引用、列表、标题等 |

---

## 二、LobeUI 代码块细节要点（含来源文件）

### 2.1 代码块容器（`src/Highlighter/style.ts`）

- **根**：`position: relative; overflow: hidden; width: 100%; border-radius: ${cssVar.borderRadius}`（antd 默认 borderRadius = **6px**）。
- **底色（filled 变体）**：`background: ${cssVar.colorFillQuaternary}`（极浅的填充层）+ `lobeStaticStylish.variantFilledWithoutHover` = `background: ${cssVar.colorFillTertiary}`。**双层叠色**，最终底色偏 `colorFillTertiary`。
- **代码块字体**：`pre { height: 100%; font-size: 12px }`（即 **12px**，不随容器 em 缩放）。
- **代码背景覆盖**：`code { background: transparent !important }` —— 清除任何注入的背景，只保留容器底色。
- **变体**（`cva`）：
  - `filled`：上面底色 + border-radius 6px；
  - `outlined`：`border: 1px solid colorBorderSecondary; background: colorBgContainer`；
  - `borderless`：无边框无背景。
- **内边距（SyntaxHighlighter/style.ts）**：
  - `padding: 16px`（filled/outlined 变体统一 16px）；
  - `borderless` 变体 `padding: 0`。
- **行间距**：shiki 的 `code { display:flex; flex-direction:column; gap: 4px }`，每行 `.line` 宽 `calc(100% + 32px)`、`margin-inline: -16px`、`padding-inline: 16px`（实现整行可选中与高亮的边框到边效果）。
- **复制按钮（actions）**：`position:absolute; top:8px; right:8px; opacity:0`，**hover 时才显现**；按钮 blockSize 28、icon 16。
- **语言标签（非 fullFeatured 的简易模式）**：`position:absolute; bottom:8px; right:8px; font-family: code; color: colorTextSecondary; opacity:0; background: colorFillQuaternary; backdrop-filter: blur(10px)`，**hover 显现**。

### 2.2 满功能模式工具栏（`src/Highlighter/FullFeatured.tsx` + `style.ts`）

- `headerRoot`：`cursor:pointer; position:relative; padding: 4px`（可点击折叠）。
- 语言标题 `.languageTitle`：默认 `opacity: 0.5; filter: grayscale(100%)`，hover 变 `opacity:1; grayscale(0)`；图标 18px、字体 13px。
- 折叠/展开：`bodyCollapsed { height:0; opacity:0 }` vs `bodyExpand`，过场 0.25s `motionEaseOut`。
- 语言切换：`allowChangeLanguage` 时显示 `<LangSelect>` 下拉；否则显示文件名/语言标签。

### 2.3 语法高亮主题（`src/Highlighter/theme/lobe-theme.ts`）

- `type: 'dark'`；`semanticHighlighting: true`；`editor.background = cssVar.colorBgContainer`。
- 语义映射（部分）：
  - `string` → `colorSuccess`；
  - `comment` → `colorTextQuaternary`（+ italic）；
  - `markup.heading` → `colorInfo`；
  - `markup.bold / markup.italic` → `colorWarning`（`volcano10`）+ 粗斜体；
  - `entity.name.function` / `support.function` → `geekblue10`；
  - `storage.type` → `purple10`；
  - 纯文本默认 → `colorText`。

### 2.4 行内 code（`src/Markdown/markdown.style.ts` → `code` 块）

```
code {
  /* 仅当内部无 span（未被高亮）时作为行内 code */
  &:not(:has(span)) {
    display: inline;
    margin-inline: 0.25em;
    padding-block: 0.1em;      /* 上下 0.1em */
    padding-inline: 0.4em;     /* 左右 0.4em */
    border: 1px solid var(--lobe-markdown-border-color);  /* = colorFillQuaternary */
    border-radius: 0.25em;     /* = 4px */
    font-family: FontFamilyCode;
    font-size: 0.875em;        /* = 14px @16px 基 */
    line-height: 1;
    overflow-wrap: break-word;
    white-space: break-spaces;
    background: cssVar.colorFillSecondary;
  }
}
```

### 2.5 行内短代码 / Snippet 组件（`src/Snippet/style.ts`）

单行短代码（CodeBlock 检测 `countLines<=1 && content.length<=32` 走 `PreSingleLine → Snippet`）：
- 容器高 **38px**、`padding-inline: 12px 8px`、`border-radius: cssVar.borderRadius`（6px）。
- pre 内 `display:flex; align-items:center; height:100%`。

---

## 三、LobeUI Markdown 组件静态样式要点（`src/Markdown/markdown.style.ts`）

根节点通过 4 个 CSS 变量控全局：

| 变量 | 默认值 | 含义 |
|---|---|---|
| `--lobe-markdown-font-size` | 16px | 基字号 |
| `--lobe-markdown-line-height` | 1.8 | 全局行高 |
| `--lobe-markdown-margin-multiple` | 2 | 外边距乘数 |
| `--lobe-markdown-border-radius` | `cssVar.borderRadiusLG`（= radius 外层） | 圆角 |
| `--lobe-markdown-border-color` | `cssVar.colorFillQuaternary` | 统一边框色 |

### 3.1 代码块 pre（markdown.style.ts）
`pre { font-size: calc(var(--lobe-markdown-font-size) * 0.85) }` → **0.85em**（13.6px @16）。

### 3.2 表格 table
```
table {
  display: block;                /* 块级，横向溢出滚动 */
  overflow: auto hidden;
  border-spacing: 0;
  border-collapse: collapse;
  width: max-content;
  max-width: 100%;
  margin-block: calc(var(--lobe-markdown-margin-multiple) * 0.5em);  /* = 1em */
  border-radius: calc(var(--lobe-markdown-border-radius) * 1px);
  box-shadow: 0 0 0 1px ${cssVar.colorBorderSecondary};   /* 用阴影画外框，不用 border */
  word-break: auto-phrase;
  overflow-wrap: break-word;
}
thead { background: ${cssVar.colorFillQuaternary}; }
tr   { box-shadow: 0 1px 0 ${cssVar.colorBorderSecondary}; }  /* 行间分隔用 box-shadow */
th, td { min-width: 120px; padding-block: 0.75em; padding-inline: 1em; text-align: start; }
```

### 3.3 引用 blockquote（markdown.style.ts）
```
blockquote {
  margin-block: calc(var(--lobe-markdown-margin-multiple) * 0.5em);  /* = 1em */
  margin-inline: 0;
  padding-block: 0;
  padding-inline: 1em;
  border-inline-start: solid 4px ${cssVar.colorBorder};
  color: cssVar.colorTextSecondary;
}
```
注意：LobeUI 引用**只用左边 4px 竖线 + 次级文本色，无背景块**。

### 3.4 列表 list（markdown.style.ts）
- `li { margin-block: calc(marginMultiple*0.33em) }`（≈0.66em），且 `li p:first-child { display:inline }`（消除段落首尾空隙）。
- `ul, ol`：`margin-block: 0.5em; margin-inline-start: 1em; padding-inline-start: 0; list-style-position: outside`。
- `ul` **默认去掉原生圆点**，用 `::before { content:'-'; margin-inline: -1em 0.5em; opacity:0.5 }` 显示自定义横线（`-`）作为列表标记。
- 任务列表 `.task-list-item`：`::before` 隐藏，`input[type=checkbox] { margin: 0 -1.6em 0.25em 0.2em }`。

### 3.5 标题 header（markdown.style.ts）
- 全部标题：`margin-block: max(headerMultiple*marginMultiple*0.4em, font-size)`；`font-weight: bold; line-height: 1.25`。
- 相对字号（取决于自己写的 headerMultiple）：
  - h1 = `font-size * (1 + 1.5 * mult)`
  - h2 = `font-size * (1 + mult)`
  - h3 = `font-size * (1 + 0.5 * mult)`
  - h4 = `font-size * (1 + 0.25 * mult)`
  - h5/h6 = `font-size * 1`
- **h1 没有下划线边框**（与我们的实现不同，我们把 h1 加了 border-bottom）。

### 3.6 段落 / 分割线 / 强调
- `p`：`margin-block: 4px`；首尾用 `margin-block-start/end: 0.5em`；`letter-spacing: 0.02em`。
- `strong`：`font-weight: 600`。
- `hr`：`border-style: dashed; border-width: 1px`（**虚线**！），`margin-block: 1.5em`，去 top/inline 边框。
- `a`：`color: colorInfoText; hover → colorInfoHover`（不用下划线）。
- `sup/sub`：`font-size: 0.75em`，`inset-block-start/bottom: -0.25em`。
- 注释引用 `.footnotes`：`font-size: smaller; color: #8b949e`。

---

## 四、逐项对比表（我们 v0.1.0 vs LobeUI）

| 项 | 我们 v0.1.0 | LobeUI（源码事实） | 差异/结论 |
|---|---|---|---|
| 行内 code 字号 | 0.88em | 0.875em | 基本一致，可对齐到 0.875em |
| 行内 code 内边距 | 0.15em 0.4em | padding-block 0.1em / padding-inline 0.4em | 上下略厚，可对齐 0.1em 0.4em |
| 行内 code 背景 | bg-layer-2 | colorFillSecondary（显偏内层） | 用次填充层，一致 |
| 行内 code 边框 | **无** | 1px solid colorFillQuaternary | **我们缺边框**，建议加 |
| 行内 code 圆角 | 4px | 0.25em(4px) | 一致 |
| 行内 code 行高 | 继承 | 1（line-height: 1）| 可加 `line-height: 1` |
| 代码块 pre 背景 | bg-layer-1 (+1px 边框) | colorFillTertiary（无边框，靠容器） | 我们底色更重；LobeUI 用更浅的 fillTertiary |
| 代码块 pre 边框 | 1px solid border-l1 | 无（用内阴影/容器圆角） | 建议去掉重边框换浅 border 或阴影 |
| 代码块圆角 | 8px | borderRadius(6px) | 可对齐 6px |
| 代码块 padding | 0.9em 1.1em | **16px**（固定） | 我们相对值差距大，建议 16px |
| pre 内字号 | 0.86em | 0.85em + pre 内固定 12px | 可对齐 0.85em |
| pre 内 line-height | 1.6 | 未单独设，shiki 行 gap 4px | 我们保留 1.6 亦可 |
| 行号 | 无 | 无（shiki 需插件） | 纯 CSS 难实现，跳过 |
| 复制按钮 | 无 | 右上 hover 浮现 | 无 JS 无法做，跳过 |
| 语言标签 | 无 | 右下 hover 浮现 | 无 JS 无法做，跳过 |
| 折叠/展开 | 无 | header 点击折叠 | 无 JS 无法做，跳过 |
| 语法高亮 | 无 | shiki + lobe-theme 语义色 | 纯 CSS 无法做 |
| 表格宽度 | width:100% | display:block; width:max-content | **建议改 LobeUI 方式**（横向滚动） |
| 表格分隔 | th/td 1px border | box-shadow 画外框 + 行间 1px | 更现代，可参考 |
| 表格 cell padding | 0.45em 0.8em | 0.75em 1em | 建议对齐 |
| 表格 min-width | 无 | 120px | 建议加 |
| thead 背景 | bg-layer-1 | colorFillQuaternary | 一致思路 |
| 引用底色 | bg-layer-1 整块+左边线 | 仅左边 4px 竖线+次级色，无底色 | **风格分歧**，见建议 |
| 引用左边线 | 3px | 4px | 可对齐 4px |
| 列表标记 | 原生圆点 | ul 去圆点用 `-` 前缀 | 中文排版可自选 |
| 标题 h1 | 加 border-bottom | 无下划线 | 风格可选 |
| 分割线 hr | 实线 | **虚线** | 可参考虚线 |
| 列表/段落外边距 | 0.6em | 0.5em * mult | 可对齐 |

---

## 五、改动建议清单（可落地数值）

### A. 行内 code（推荐全改）

我们（before → after 对齐 LobeUI）：
```
# before
:where(code) {
  font-size: 0.88em;
  background: var(--dsw-alias-bg-layer-2);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}
# after（对齐）
:where(code) {
  font-size: 0.875em;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1);   /* 新增，模拟 LobeUI colorFillQuaternary 框 */
  padding: 0.1em 0.4em;                            /* 上下收窄 */
  border-radius: 4px;
  line-height: 1;                                  /* 新增 */
  white-space: break-spaces;
  overflow-wrap: break-word;
}
```

### B. 代码块 pre（推荐对齐）

我们（before → after）：
```
# before
:where(pre) {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  padding: 0.9em 1.1em;
  overflow-x: auto;
}
:where(pre code) { background: transparent; padding: 0; font-size: 0.86em; line-height: 1.6; }

# after（对齐 LobeUI：更浅 bg、更小圆角、固定 padding、无重边框）
:where(pre) {
  background: var(--dsw-alias-bg-layer-2);   /* 相对 layer-1 更浅（对齐 colorFillTertiary 思路） */
  border: 1px solid var(--dsw-alias-border-l1);   /* 保持极轻描边避免与页面粘连，可降透明度 */
  border-radius: 6px;                              /* 8 → 6 */
  padding: 16px;                                   /* 固定 16px */
  overflow-x: auto;
}
:where(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.85em;                             /* 0.86 → 0.85 */
  line-height: 1.6;
}
```

> 取舍说明：LobeUI 在容器层做 6px 圆角 + 浅 fillTertiary 底色 + 无边框，靠内阴影/容器与页面分离。纯 CSS 我们保留一层轻边框更稳妥；若界面允许，可改用 `box-shadow: 0 0 0 1px var(--dsw-alias-border-l1)` 替代 border 实现更贴近的效果。

### C. 表格（推荐采纳 LobeUI 方式）

```
:where(table) {
  display: block;                                  /* 横向滚动，替代 width:100% 压扁 */
  overflow-x: auto;
  width: max-content;
  max-width: 100%;
  margin: 0.8em 0;
  border-collapse: collapse;
  border-spacing: 0;
  font-size: 0.92em;
  border-radius: 6px;
}
:where(th, td) {
  border: 1px solid var(--dsw-alias-border-l1);
  padding: 0.75em 1em;                             /* 0.45em 0.8em → 0.75em 1em */
  text-align: left;
  min-width: 120px;                                /* 新增 */
}
:where(th) { background: var(--dsw-alias-bg-layer-1); font-weight: 600; }
:where(tr:nth-child(even) td) { background: var(--dsw-alias-bg-layer-1); }
```

### D. 引用（风格二选一）

- **方案 1（贴近 LobeUI，极简）**：去掉整块底色，仅保留 4px 左边线 + 次级色。
```
:where(blockquote) {
  margin: 1em 0;
  padding: 0;
  padding-left: 1em;
  border-left: 4px solid var(--dsw-alias-brand-primary);   /* 3→4 */
  color: var(--dsw-alias-label-secondary);
  background: transparent;                                 /* 去掉原整块底色 */
}
```
- **方案 2（保留我们的东方式卡片感，仅微调）**：
```
:where(blockquote) {
  margin: 0.8em 0;
  padding: 0.5em 1em;
  border-left: 4px solid var(--dsw-alias-brand-primary);   /* 3→4 */
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  border-radius: 0 6px 6px 0;                              /* 8→6 与 code 圆角统一 */
}
```
> 建议：作为「宣纸/玄夜」中国风主题，方案 2 更契合品牌，删掉重圆角统一为 6px。

### E. 列表 / 标题 / 分割线（小优化，可选）

- 列表：起用 `:where(ul) { list-style-type: none }` + `::before content: '—'`（中文主题用长横线更贴合，LobeUI 用 `-`）；`li p:first-child { display:inline }` 可消除列表段落空隙。
- 分割线：`hr` 改虚线（对齐 LobeUI）：`border-top: 1px dashed var(--dsw-alias-border-l1)`。
- 段距统一：`p` 用 `margin: 0.5em 0` + `letter-spacing: 0.02em`。
- strong：`font-weight: 600`（我们 650，可保持，650 对中文加粗更明显）。

### F. 不可落地的部分（如实说明）

以下依赖 JS/运行时（shiki DOM / copy API / click 事件），**纯 CSS 排版层无法实现**，只能作为 v0.2.0+ 引入 JS 高亮插件时的路线图参考：
- 语法高亮（shiki + 语义 lobe-theme 配色）
- 右上角 hover 浮现的复制按钮
- 右下角 hover 浮现的语言标签
- 头部可点击折叠/展开
- 语言切换下拉
- 行号 / 高亮行 / diff / highlighted-word
- 表格右上角 "Copy table" 按钮（把表转成 Markdown）

---

## 六、来源文件速查（URL）

| 内容 | 路径（lobehub/lobe-ui master，raw 前缀 `https://raw.githubusercontent.com/lobehub/lobe-ui/master/`） |
|---|---|
| 代码块出口 | `src/mdx/mdxComponents/Pre.tsx` |
| 代码块容器样式 | `src/Highlighter/style.ts` |
| 高亮渲染/行距 | `src/Highlighter/SyntaxHighlighter/style.ts` |
| 满功能工具栏 | `src/Highlighter/FullFeatured.tsx` |
| 高亮主题（语义色） | `src/Highlighter/theme/lobe-theme.ts` |
| 语言名/回退 | `src/Highlighter/const.ts` |
| Markdown 全部静态样式 | `src/Markdown/markdown.style.ts`（行内 code/表格/引用/列表/标题/hr） |
| 行内短代码 | `src/Snippet/style.ts` |
| Markdown 表格组件 | `src/Markdown/components/MarkdownTable/index.tsx` |
| 变体基础样式 | `src/styles/theme/customStylishStatic.ts`（variantFilled/Outlined/Borderless） |
| 文档页 | https://lobehub.github.io/lobe-ui/ （CodeBlock / Markdown 组件用例） |
| 目录 API | `https://api.github.com/repos/lobehub/lobe-ui/git/trees/master?recursive=1` |
