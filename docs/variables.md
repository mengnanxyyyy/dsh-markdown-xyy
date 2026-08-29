# 统一变量契约（Unified Variable Contract）

> 盘点对象：四个内置主题（`plugin/assets/themes/*.css`，同一契约 100% 对齐、仅配色不同）+ 完整参考主题（`plugin/assets/template.css`）+ 面板样式（`plugin/assets/panel.css`，仅消费、不定义）。
> 结论一句话：**L0 平台 token（13 个固定名单）+ L1 身份色核心契约（17 个）是全部主题共用的统一变量集；L1 扩展（标题/文本/列表/`--hl-*`）+ L2 排版/形状常量 + L3 旋钮是草莓猛男粉（参考实现）的完整化演示，四个内置主题均全量提供；panel.css 只消费核心契约里的 7 个变量（全部带默认回退）。**
> 主题文件的元素级消费方式见 `docs/themes.md`，整体架构见 `docs/architecture.md`。

---

## 一、变量分层总览（5 层）

| 层 | 内容 | 单值 / 浅深成对 | 是否全主题统一 | 现状 |
|---|---|---|---|---|
| **L0 平台 token** | `--dsw-alias-*`×12 + `--dsw-specific-sidebar-fill` | ✅ 成对（body / body[data-ds-dark-theme]） | ✅ 四个内置主题 + template.css 全量定义（固定名单不可增删） | 已统一 |
| **L1 身份色 · 核心** | accent 系 5 + link/highlight 系 4 + quote/code/table 系 5 + 字体 2 + `--mdvr-mm` = **17 个** | ✅ 色彩成对；字体/mm 单值 | ✅ 四个内置主题 + template.css 全定义（唯一强制集） | 已统一 |
| **L1 身份色 · 扩展** | 标题梯度 h1~h6（6）、文本排印 strong/italic/bold-italic/subsup/del（5）、列表 bullet-l1/2/3 + checkbox-checked（4）、派生色 accent-rgb + inline-code×2 + selection×2 + check-mark + shadow×3（9，拆浅深两档或单值） | 色彩成对；check-mark 单值 | ❌ 仅四个内置主题定义（可选扩展；template.css 不定义） | 已统一 |
| **L1 语法高亮** | `--hl-keyword/string/number/property/function/comment`（6） | ✅ 成对 | ❌ 仅四个内置主题定义 | 已统一 |
| **L2 排版/形状常量** | 行高/段距/字号/圆角/边框/内距/滚动条/焦点（38 个，`--mdvr-*` 单值；阴影 3 项拆浅深两档移入 ① ②） | ❌ 单值（`:root` 一次） | ❌ 仅四个内置主题定义 | 已统一 |
| **L3 功能旋钮** | `--mdvr-mm`（间距倍率） | ❌ 单值 | ⚠️ 四个内置主题均定义但 **0 处消费**（休眠旋钮） | 待激活 |

> 统一变量名证据：四个内置主题的 `--mdvr-*` / `--hl-*` / `--dsw-alias-*` 名单 0 差集（各 99 个同名变量，仅配色值不同），说明核心 17 个是事实上的跨主题契约。

---

## 二、L0 平台 token（13 个，浅深成对）——全主题统一

| 变量 | 语义 |
|---|---|
| `--dsw-alias-bg-base` / `bg-layer-1` / `bg-layer-2` / `bg-overlay` | 应用底色 / 抬升面 / 嵌套面 / 浮层面板 |
| `--dsw-alias-border-l1` / `border-l2` | 主边框 / 次边框 |
| `--dsw-alias-brand-primary` | 品牌主色 |
| `--dsw-alias-label-primary` / `label-secondary` | 主文字 / 次文字 |
| `--dsw-alias-state-error-primary` / `success-primary` / `warn-primary` | 错误 / 成功 / 警告语义色 |
| `--dsw-specific-sidebar-fill` | 侧栏底 |

- 名单固定（平台 Theme.listTokens），**不可新增**；所有主题均按此名单浅深各一组。
- strawberry-mocha 浅档语义色取值：error `#C74330` / success `#237834` / warn `#965B00`；深档取 Catppuccin Mocha 对应色（`#F38BA8` / `#A6E3A1` / `#F9E2AF`）。参考主题 template.css 的浅档 AA 建议值为 error `#c74330` / success `#287b38` / warn `#985d00`——两者出入见 §十「维护引用」。

---

## 三、L1 身份色 · 核心契约（17 个）——全主题统一

> 完整契约 = **30 个变量**（13 L0 + 17 L1），四个内置主题与 template.css **全量提供、无一缺席**；其中「面板最低兼容」只需 7 个 `--mdvr-*`（见 §八）。下表 17 个 = 14 身份色 + 2 字体 + 1 旋钮。

| 组 | 变量 | 消费方 |
|---|---|---|
| accent 系 5 | `accent` / `accent-text` / `accent-soft` / `accent-faint` / `accent-fainter` | panel.css（accent×11、accent-faint×6、accent-text×2、accent-fainter×1，均带回退）；主题 ③ 元素段 |
| link 系 2 | `link` / `link-hover` | panel.css（link×1，带回退）；主题 ③ 元素段 |
| highlight 系 2 | `highlight` / `highlight-soft` | panel.css（highlight×3，带回退）；主题 ③ 元素段 |
| quote 系 2 | `quote-border` / `quote-bg` | 主题 ③ 元素段 |
| code/table 系 3 | `code-border` / `table-head-bg` / `table-head-text` | 主题 ③ 元素段 |
| 字体 2 | `sans` / `mono` | panel.css（mono×3，带回退）；主题 ③ 元素段 |
| 旋钮 1 | `mm` | ⚠️ 暂无消费（休眠旋钮，见 §七） |

```css
/* 核心契约的最小定义（色彩浅深成对在 body / body[data-ds-dark-theme]）；字体与 mm 单值在 :root */
--mdvr-sans: …;  --mdvr-mono: …;  --mdvr-mm: 2;
--mdvr-link: …;  --mdvr-link-hover: …;
--mdvr-highlight: …;  --mdvr-highlight-soft: …;
--mdvr-accent: …;  --mdvr-accent-text: …;  --mdvr-accent-soft: …;
--mdvr-accent-faint: …;  --mdvr-accent-fainter: …;
--mdvr-quote-border: …;  --mdvr-quote-bg: …;
--mdvr-code-border: …;  --mdvr-table-head-bg: …;  --mdvr-table-head-text: …;
```

---

## 四、L1 身份色 · 扩展（四个内置主题全量定义，可选）

### 4.1 标题梯度（6，浅深成对）——区分 H1~H6 个性色

`--mdvr-h1` ～ `--mdvr-h6`：浅档 `#BE185D` / `#9D174D` / `#6D28D9` / `#B45309` / `#047857` / `#6B5E65`；深档 `#FB7185` / `#F472B6` / `#CBA6F7` / `#FAB387` / `#94E2D5` / `#9399B2`。

### 4.2 文本排印（5，浅深成对）

`--mdvr-strong`（粗体）/ `--mdvr-italic`（斜体）/ `--mdvr-bold-italic`（粗斜体）/ `--mdvr-subsup`（上下标与公式符号）/ `--mdvr-del`（删除线）。

### 4.3 列表与复选框（4，浅深成对）

`--mdvr-bullet-l1/l2/l3`（1/2/3 级符号色，**同步 h1/h3/h5**）、`--mdvr-checkbox-checked`（勾选色，同步 accent）。

### 4.4 派生/杂项（9；色彩成对写 ① ② 两档，check-mark 留 `:root` 单值）

| 变量 | 浅 | 深 | 说明 |
|---|---|---|---|
| `--mdvr-accent-rgb` | 217, 59, 104 | 251, 113, 133 | 真成对，rgba() 光晕派生用 |
| `--mdvr-inline-code-bg` | #F4E8EE | #14121E | 行内代码底（浅=燕麦粉底、深=墨夜紫签名） |
| `--mdvr-inline-code-text` | #9F1239 | #F472B6 | 行内代码字（浅=深草莓字配浅底） |
| `--mdvr-selection-bg` | rgba(203,166,247,.35) | 同 bg | 选区底（半透明丁香紫） |
| `--mdvr-selection-text` | #6D28D9 | #F5E0DC | 选区字（浅=深丁香紫 AA≈4.6:1） |
| `--mdvr-check-mark` | #FFFFFF 单值 | 同 | 复选框对勾（两档成立，留 `:root` 单值） |
| `--mdvr-shadow-code-inline` | 0 1px 2px rgba(203,166,247,.35) | 0 1px 2px rgba(0,0,0,.45) | 行内代码阴影（浅=紫 tint / 深=黑 0.45） |
| `--mdvr-shadow-kbd` | 0 2px 4px rgba(203,166,247,.3) | 0 2px 4px rgba(0,0,0,.45) | kbd 阴影 |
| `--mdvr-shadow-img-drop` | 0 8px 20px rgba(203,166,247,.25) | 0 8px 20px rgba(0,0,0,.45) | 图片投影（深档加深） |

> inline-code / selection / shadow 三类光影变量以成对声明形式拆入 ① ② 两档（浅档观感/对比度要求与深档不同），变量名不变、消费方零改动。

---

## 五、L1 语法高亮 `--hl-*`（6 个，浅深成对）——内置主题全量定义

`keyword` / `string` / `number` / `property` / `function` / `comment` —— Prism / Highlight.js / Shiki 通用，主题 ③ 元素段按各库类名消费（`.token.*` / `.hljs-*`），另有 operator/punctuation 规则引用 `--dsw-alias-label-secondary`。

> ⚠️ 易混：panel.css 编辑器高亮层的 `.hl-com/.hl-str/.hl-num` 等是**类名**（消费 `--mdvr-highlight` / `--mdvr-accent` 等契约变量带回退），与 `--hl-*` 变量完全无关。

---

## 六、L2 排版/形状常量（38 个，`:root` 单值）——内置主题全量定义

> `:root` 单值区共声明 **43 个变量**：其中纯 L2 排版/形状常量 38 个；其余 5 个为 L3 旋钮 `--mdvr-mm`、字体栈 `sans`/`mono`/`math-font`、两档同值纯色 `check-mark`。阴影 3 项（code-inline/kbd/img-drop）因深浅取值不同已拆入 ① ② 两档（见 §4.4），不再属于 `:root` 单值。

| 子组 | 变量（默认值） |
|---|---|
| 文本节奏 9 | `lineheight-body` 1.6 / `lineheight-list` 1.65 / `lineheight-heading` 1.25 / `lineheight-code` 1.45 / `para-gap` 0.45em / `para-letterspacing` 0.01em / `heading-gap-top` 1.7em / `heading-gap-bottom` 0.55em / `heading-letterspacing` -0.01em |
| 标题字号 6 | `h1-size` 1.9em / `h2-size` 1.45em / `h3-size` 1.25em / `h4-size` 1.1em / `h5-size` 1.0em / `h6-size` 0.88em |
| 列表 5 | `list-gap` 0.8em / `li-gap` 0.35em / `mark-font-size` 0.95em / `list-pad` 1.6em / `list-pad-nested` 1.2em |
| 圆角 4 | `radius-card` 8px / `radius-chip` 4.5px / `radius-table` 10px / `radius-check` 4px |
| 边框/内距/字号 10 | `border-code` 1px / `ribbon-code` 3.5px / `border-quote` 4px / `gap-block` 0.8em / `pad-pre` 8px 12px / `pad-code-inline` 0.15em 0.38em / `pad-cell` 0.68em 1em / `pad-quote` 0.6em 1.1em / `code-size` 0.85em / `table-size` 0.9em |
| 滚动条/焦点/上下标 4 | `scrollbar-size` 6px / `focus-width` 2px / `focus-offset` 3px / `supsub-size` 0.76em |

> 设计意图：L2 全部进 `:root` 单值，供 `calc(var(--mdvr-mm) * …)` 之类派生；用户只调 L3 旋钮即可整体调密度/圆角（当前 mm 尚未被引用，属「休眠旋钮」）。

---

## 七、L3 功能旋钮 + 字体栈

| 变量 | 值 | 状态 |
|---|---|---|
| `--mdvr-mm` | 2 | 四个内置主题均定义，**0 消费**——已规划为全局间距倍率（如 `margin: calc(0.45em * var(--mdvr-mm))`），待激活 |
| `--mdvr-sans` / `--mdvr-mono` | Geist+中文栈 / JetBrains Mono 栈 | sans/mono 属核心契约（L1） |
| `--mdvr-math-font` | KaTeX 数学栈 | 仅内置主题定义（扩展） |

---

## 八、panel.css 消费面（跨主题最低兼容契约）

- **消费的 `--mdvr-*`（7 个，全部带默认回退，铁律）**：`accent`（11 处，回退 `#5856d6`）、`accent-faint`（6，回退 `#b4b3ed`）、`accent-fainter`（1，回退 `#cdccf3`）、`accent-text`（2，回退 `#3a3a4e`）、`highlight`（3，回退 `#b3541e`）、`link`（1，回退 `#005ae0`）、`mono`（3，回退 ui-monospace 栈）。
- **消费的 `--dsw-alias-*`**：`bg-layer-1/2`、`border-l1`、`label-primary/secondary`、`state-error-primary`。
- **推论**：① 面板最低兼容 = 7 个 `--mdvr-*`——主题只要定义这 7 个，插件面板就自带该主题配色；② 完整契约 30 个全量提供时（四个内置主题 + template.css 均如此），从配色到排版与面板全链路统一。`strawberry-mocha` 浅档 accent=`#D93B68`、深档=`#FB7185`，面板自动换粉——panel 无需任何改动。

---

## 九、「能否统一」的判断规则（盘点方法论，供后续主题复用）

1. **L0 名单固定**：13 个 platform token 不能增减，只能统一「每套主题都定义且浅深成对」。
2. **核心 17 个 = 统一变量**：accent/highlight/link/quote/code/table 系 + sans/mono/mm——同名同义同消费方，任何主题缺一个都会造成面板/元素回退不一致。
3. **扩展变量不强制统一**：`--mdvr-h1..h6`、`--hl-*`、L2 常量只属于「带 ③ 元素段的全量主题」；纯色主题可完全不定义（四个内置主题均带全量 ③ 段，因此实际全量提供）。
4. **同值不重排档**：两档同值的纯色派生色（如 check-mark）放 `:root` 单值即可；一旦某档需要不同值（inline-code/selection/shadow 即此类：浅档观感/对比度要求迫使拆档）→ 移入 body 两档定义，变量名不变、引用零改动。
5. **命名冲突检查**：全仓 grep `--mdvr-*` / `--hl-*` / `--dsw-alias-*` 应无同名不同义；四个内置主题与 template.css 之间未发现同名不同值。

---

## 十、维护引用（改变量名/值要动的地方）

- 改核心 17 个变量之一：`panel.css` 回退值 → 四个内置主题 + `template.css`（参考主题）→ 主题 ③ 元素段。
- 改内置主题专属变量：仅 `plugin/assets/themes/*.css` + 本文档 §四~§六。
- 新增 `--dsw-alias-*`：❌ 不允许（平台名单固定）。
- 版本台账：`manifest/versions.json` 按版本登记契约演变；新增主题需过 `scripts/check-release.js` 门禁（CSS 结构 + 浅深双档挂载 + panel fallback）。

### 与代码核对后的出入说明（以代码为准）

1. **L2 数量**：早期文档称「43 个 L2 常量」；按代码核对，`:root` 单值区共 43 个**声明**，其中纯 L2 排版/形状常量实为 **38 个**（其余为 L3 旋钮 mm、字体栈 sans/mono/math-font、两档同值 check-mark），阴影 3 项已拆入浅深两档。本文按代码口径。
2. **浅档语义色**：参考主题 template.css 的建议 AA 值为 error `#c74330` / success `#287b38` / warn `#985d00`；`strawberry-mocha` 实际取值 success `#237834` / warn `#965B00`（error `#C74330` 一致）。两者都是可比对数值——新配色建议按 AA 建议值（见 `docs/themes.md`），若调整内置主题默认值需同步主题文件与本文。
3. **变量总数**：四个内置主题各 **99 个同名变量**（`:root` 43 + 浅深两档各 56，浅深同集、跨主题 0 差集），与「99 变量名单」的说法一致。

> 关联文档：`docs/themes.md`（能力边界 / 主题文件格式 / 新增主题步骤）、`docs/architecture.md`（整体架构与职责边界）。