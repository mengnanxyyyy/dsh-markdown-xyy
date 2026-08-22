# Velvet-Strawberry-Mocha-v2-native —— 变量化盘点与分层设计

> 以 `~/.dsh/web-themes/Velvet-Strawberry-Mocha-v2-native.css` 为参考的只读盘点（未改任何主题文件）。
> 目标：① 列出哪些值是"可分配成 CSS 变量"的；② 标注每类是否需要**浅/深成对**；③ 标出哪些是**用户自主可调**的旋钮。
> 日期：2026-08-22

## 一、变量分层（4 层总览）

| 层 | 内容 | 是否浅/深成对 | 用户可调 | 现状 |
|---|---|---|---|---|
| L0 平台 token | `--dsw-alias-*` 13 个 | ✅ 成对（body / body[data-ds-dark-theme]） | 否（平台固定名单，数量固定） | 已变量化 |
| L1 主题身份色 | `--mdvr-*` 色彩（accent/标题/文本/组件/列表）+ `--hl-*` 语法高亮 | ✅ 成对 | ✅ 是（主题个性） | 已变量化 |
| L2 排版/形状常量 | 字号、行高、段距、列表缩进、圆角、边框、阴影、间距 | ❌ 单值（不分浅深） | ✅ 是（密度/节奏/风格） | **多为硬编码 → 可变量化** |
| L3 功能旋钮 | `--mdvr-mm`（间距倍率）、密度、圆角风格等 | ❌ 单值 | ✅ 是（一键调风格） | 部分已存在 |

架构说明：L0/L1 由「浅 `body`、深 `body[data-ds-dark-theme]`」两组声明（当前文件 L21 与 L95 各一组）；L2/L3 是**单值常量**，放在 `:root` 或 `body` 声明一次即可，不随浅深变化。

---

## 二、L1 主题身份色（已变量化，浅/深成对）——现有清单

这些是"主干可调变量"。每个都要在浅色档和深色档各给一个值。

### 2.1 accent 系（5 个）——主题情绪核心

| 变量 | 浅色 | 深色 | 作用 |
|---|---|---|---|
| `--mdvr-accent` | #D93B68 | #FB7185 | 主强调（缎带、边条、按钮） |
| `--mdvr-accent-text` | #9F1239 | #FDA4AF | tint 面上的强调字 |
| `--mdvr-accent-soft` | #FBECF1 | #291D29 | 强调衬底（12%/14% tint） |
| `--mdvr-accent-faint` | #EBA4B8 | #6A3343 | 45% 预混（细线/滚动条） |
| `--mdvr-accent-fainter` | #F3CAD6 | #482633 | 30% 预混（更淡的线/分割） |

> **派生建议**：accent-soft/faint/fainter 可视为 accent 的"混合派生色"（tint 配方见 `docs/themes.md`），不一定需要手调。

### 2.2 标题梯度（6 个）——区分 H1~H6 的个性色

| 变量 | 浅色 | 深色 |
|---|---|---|
| `--mdvr-h1` | #BE185D | #FB7185 |
| `--mdvr-h2` | #9D174D | #F472B6 |
| `--mdvr-h3` | #6D28D9 | #CBA6F7 |
| `--mdvr-h4` | #B45309 | #FAB387 |
| `--mdvr-h5` | #047857 | #94E2D5 |
| `--mdvr-h6` | #6B5E65 | #9399B2 |

### 2.3 文本排印（9 个）

| 变量 | 浅色 | 深色 | 作用 |
|---|---|---|---|
| `--mdvr-strong` | #181114 | #ffb486 | 粗体 |
| `--mdvr-italic` | #9D174D | #F5C2E7 | 斜体 |
| `--mdvr-bold-italic` | #BE185D | #F472B6 | 粗斜体 |
| `--mdvr-link` | #0284C7 | #89DCEB | 链接 |
| `--mdvr-link-hover` | #BE185D | #F5C2E7 | 链接 hover |
| `--mdvr-highlight` | #9F1239 | #FDA4AF | 高亮字 |
| `--mdvr-highlight-soft` | #FDE8EF | #381E2B | 高亮衬底 |
| `--mdvr-subsup` | #6D28D9 | #CBA6F7 | 上下标/公式符号 |
| `--mdvr-del` | #9CA3AF | #6C7086 | 删除线 |

### 2.4 组件系（5 个）

| 变量 | 浅色 | 深色 | 作用 |
|---|---|---|---|
| `--mdvr-quote-border` | #D93B68 | #FB7185 | 引用左边条 |
| `--mdvr-quote-bg` | #FAF0F4 | #241D2B | 引用衬底 |
| `--mdvr-code-border` | #E8CCD6 | #4E3243 | 行内代码描边 |
| `--mdvr-table-head-bg` | #F7E4EC | #221E2C | 表头背景 |
| `--mdvr-table-head-text` | #881337 | #FDA4AF | 表头文字 |

### 2.5 列表 / 复选框（4 个）

| 变量 | 浅色 | 深色 | 作用 |
|---|---|---|---|
| `--mdvr-bullet-l1` | #BE185D | #FB7185 | 1 级符号色（同步 h1） |
| `--mdvr-bullet-l2` | #6D28D9 | #CBA6F7 | 2 级符号色（同步 h3） |
| `--mdvr-bullet-l3` | #047857 | #94E2D5 | 3 级符号色（同步 h5） |
| `--mdvr-checkbox-checked` | #D93B68 | #FB7185 | 勾选框选中色 |

### 2.6 语法高亮（6 个）`--hl-*`

| 变量 | 浅色 | 深色 | 作用 |
|---|---|---|---|
| `--hl-keyword` | #6D28D9 | #CBA6F7 | 关键字 |
| `--hl-string` | #237834 | #A6E3A1 | 字符串 |
| `--hl-number` | #0284C7 | #89DCEB | 数值/布尔 |
| `--hl-property` | #B45309 | #FAB387 | 属性/键 |
| `--hl-function` | #BE185D | #F472B6 | 函数 |
| `--hl-comment` | #8C7E87 | #6C7086 | 注释 |

### 2.7 字体栈（3 个，单值不分浅深）

`--mdvr-sans` / `--mdvr-mono` / `--mdvr-math-font` ——三个字体栈。

---

## 三、L2 排版/形状常量 —— 当前硬编码、**可变量化**（单值、用户可调）

这些目前是散落在规则里的**裸数字**，抽成变量后可统一"密度/节奏/圆角风格"。推荐加入 `:root`。

### 3.1 文本节奏（行高 / 段距 / 勒距）

| 建议变量 | 默认值 | 现用位置 | 作用 |
|---|---|---|---|
| `--mdvr-lineheight-body` | 1.6 | p L219 | 正文行高 |
| `--mdvr-lineheight-list` | 1.65 | li L555 | 列表行高 |
| `--mdvr-lineheight-heading` | 1.25 | h1-6 L204 | 标题行高 |
| `--mdvr-lineheight-code` | 1.45 | pre L398 | 代码行高 |
| `--mdvr-para-gap` | 0.45em | p L218 | 段落上下间距 |
| `--mdvr-heading-gap-top` | 1.7em | h L206 | 标题上间距 |
| `--mdvr-heading-gap-bottom` | 0.55em | h L207 | 标题下间距 |
| `--mdvr-heading-letterspacing` | -0.01em | h L208 | 标题字间距 |
| `--mdvr-para-letterspacing` | 0.01em | p L221 | 正文字间距 |

### 3.2 标题字号（6 个梯度，单值）

| 建议变量 | 默认 | 现用 |
|---|---|---|
| `--mdvr-h1-size` | 1.9em | L177 |
| `--mdvr-h2-size` | 1.45em | L182 |
| `--mdvr-h3-size` | 1.25em | L183 |
| `--mdvr-h4-size` | 1.1em | L184 |
| `--mdvr-h5-size` | 1.0em | L185 |
| `--mdvr-h6-size` | 0.88em | L186 |

### 3.3 列表缩进（单值）

| 建议变量 | 默认 | 现用 |
|---|---|---|
| `--mdvr-list-indent` | 1.6em | ul/ol L549 |
| `--mdvr-list-indent-nested` | 1.25em | li>ul/ol L565 |
| `--mdvr-li-gap` | 0.35em | li L554 |

### 3.4 圆角（风格开关）

| 建议变量 | 默认 | 现用 | 作用 |
|---|---|---|---|
| `--mdvr-radius-card` | 8px | 代码块/卡片 | 大圆角面 |
| `--mdvr-radius-chip` | 4.5px | 行内代码/kbd | 小圆角件 |
| `--mdvr-radius-table` | 10px | table L507 | 表格 |
| `--mdvr-radius-quote` | 0 10px 10px 0 | blockquote L711 | 引用 |
| `--mdvr-radius-check` | 4px | 复选框 L662 | 复选框 |

### 3.5 边框 / 描边

| 建议变量 | 默认 | 现用 |
|---|---|---|
| `--mdvr-border-code` | 1px | 代码块/表格 |
| `--mdvr-ribbon-code` | 3.5px | 代码块左缎带 L311 |
| `--mdvr-border-quote` | 4px | 引用左边条 |
| `--mdvr-border-underline-link` | 1.5px | 链接下划线 |

### 3.6 间距 / 内距

| 建议变量 | 默认 | 现用 |
|---|---|---|
| `--mdvr-pad-pre` | 8px 12px | pre L393 |
| `--mdvr-pad-code-inline` | 0.15em 0.38em | 行内代码 L463 |
| `--mdvr-pad-cell` | 0.68em 1em | th/td L515 |
| `--mdvr-pad-quote` | 0.6em 1.1em | blockquote L709 |
| `--mdvr-gap-block` | 0.8em | 代码块外距 |

### 3.7 阴影（可变量化）

| 建议变量 | 默认 | 作用 |
|---|---|---|
| `--mdvr-shadow-code` | 0 1px 2px rgba(0,0,0,.25) | 行内代码 |
| `--mdvr-shadow-img` | 0 8px 20px rgba(0,0,0,.2) | 图片 |
| `--mdvr-shadow-glow` | 0 0 6px rgba(accent,.4) | 光晕（见 §5.2） |

### 3.8 滚动条 / 焦点环 / 上下标

| 建议变量 | 默认 | 现用 |
|---|---|---|
| `--mdvr-scrollbar-size` | 6px | L759 |
| `--mdvr-focus-width` | 2px | L769 |
| `--mdvr-focus-offset` | 3px | L770 |
| `--mdvr-supsub-size` | 0.76em | L250 |
| `--mdvr-mark-font-size` | 0.95em | ::marker L609 |

---

## 四、当前"硬编码色值"——最该改成变量（浅/深成对）

权重最高（这些是**写死的色值**，不随浅深、也不随换主题变，是"违和/出错"高发点）：

| 位置 | 现值 | 推荐变量 | 是否浅深成对 | 建议 |
|---|---|---|---|---|
| 行内代码底/字 L469-470 | `#14121E / #F472B6 !important` | `--mdvr-inline-code-bg` / `--mdvr-inline-code-text` | ✅ 成对 | 当前深色底硬写在浅色档也生效，必须拆成浅深两档 |
| 复选框对勾 L691-692 | `#FFFFFF` | `--mdvr-check-mark` | 通常单值（白），可成对 | 深色 accent 上白勾；若改浅底需换深勾 |
| 选区 L754-755 | `rgba(203,166,247,.35) / #F5E0DC` | `--mdvr-selection-bg` / `--mdvr-selection-text` | ✅ 成对 | 选区是浅/深差异明显 |
| 多处 accent 光晕 gray box-shadow | `rgba(251,113,133,…)`（L331/383/384/534/675/676/683） | 见 §5.2 派生 | ✅ 由 accent 派生 | 用 `--mdvr-accent-rgb` 派生，避免换主题后仍粉 |

---

## 五、派生变量（建议自动计算，不开放给用户手调，减少出错）

| 派生变量 | 由谁派生 | 用途 |
|---|---|---|
| `--mdvr-accent-rgb` | accent 的 R,G,B 三元组 | 让 `rgba(251,113,133,a)` 变成 `rgba(var(--mdvr-accent-rgb),a)`，换 accent 光晕自动跟随 |
| `--mdvr-bullet-l1/2/3` | 同步 h1/h3/h5 | 列表符号色跟随标题色（当前手抄，易不同步） |
| `--mdvr-accent-soft/faint/fainter` | accent 按 tint 配方 | 33/45/60 档淡色 |

---

## 六、L3 功能旋钮（用户“自主可调”最该暴露的接口）

| 旋钮 | 变量（建议） | 默认 | 作用 |
|---|---|---|---|
| 间距倍率 | `--mdvr-mm` | 2（已定义，尚未被规则引用，属"休眠旋钮"） | 全局密度放大/缩小 |
| 整体密度 | `--mdvr-density`（派生 §3 的 gap/pad） | 1 | 紧凑↔宽松一键切 |
| 圆角风格 | `--mdvr-radius-*` 统一由 `--mdvr-radius-scale` 驱动 | 1 | 圆润↔硬朗 |
| 列表风格 | 已由 native 修正锁死为「原生符号+着色」 | — | 不再有伪元素图形开关 |
| 简洁行高 | `--mdvr-lineheight-body` | 1.6 | 阅读节奏 |

> 设计建议：把 L3 作为"顶层旋钮"，通过 `calc()` 驱动 L2 各常量（如 `gap = var(--mdvr-density) * 1em`），用户只调几个旋钮即可控制整体风格，不必逐项改常量。

---

## 七、结论速览

- **已变量化（直接可调，浅深成对）**：35 个色彩（accent 5 / 标题 6 / 文本 9 / 组件 5 / 列表 4 / 语法 6）+ 3 字体 + 13 平台 token。
- **可新增变量（当前硬编码）**：§四 的 7 处硬编码色值（优先）+ §三 的 ~20 个排版/形状常量。
- **浅深成对**：L1 色彩与 §四 硬编码色；**单值**：字体、排版常量、形状常量、功能旋钮。
- **自主可调**：L1 色彩（主题个性）、L2 节奏/密度/圆角（阅读偏好）、L3 旋钮（一键风格）。

> 本盘点为只读分析，未创建/修改任何主题文件。
