# 统一变量契约（Unified Variable Contract）—— v1.4.0

> 盘点对象：内置主题（v1.4~v1.6 期间的 lobeui-emphasis / inkpaper / qingci / **strawberry-mocha**；**v1.7.0 起仅保留 strawberry-mocha**）+ 新建模板（`plugin/assets/template.css`）+ 完整参考主题（`~/.dsh/web-themes/example.css`）+ 面板样式（`plugin/assets/panel.css`）。
> 触发点：v1.4.0 把第三方主题 Velvet-Strawberry-Mocha-v2-native-var.css 内置化为「草莓猛男粉」（`plugin/assets/themes/strawberry-mocha.css`）时，对全部主题/资产做了一次「哪些变量能统一」的检测与分类。
> 结论一句话：**L0 平台 token（13 个固定名单）+ L1 身份色核心契约（17 个）是曾并存的四套内置主题共用的统一变量集（v1.7.0 起由草莓猛男粉独占承载）；L1 扩展（标题/文本/列表/`--hl-*`）+ L2 排版/形状常量 + L3 旋钮是 strawberry-mocha 的完整化演示；panel.css 只消费核心契约里的 7 个变量（全部带默认回退）。**
> 日期：2026-08-22

---

## 一、变量分层总览（5 层）

| 层 | 内容 | 单值 / 浅深成对 | 是否全主题统一 | 现状 |
|---|---|---|---|---|
| **L0 平台 token** | `--dsw-alias-*`×12 + `--dsw-specific-sidebar-fill` | ✅ 成对（body / body[data-ds-dark-theme]） | ✅ 内置主题全量定义（固定名单不可增删；v1.7.0 起仅草莓猛男粉） | 已统一 |
| **L1 身份色 · 核心** | accent 系 5 + link/highlight 系 4 + quote/code/table 系 5 + 字体 2 + `--mdvr-mm` = **17 个** | ✅ 色彩成对；字体/mm 单值 | ✅ 内置主题 + template + example 全定义（唯一强制集；v1.7.0 起由草莓猛男粉承载） | 已统一 |
| **L1 身份色 · 扩展** | 标题梯度 h1~h6（6）、文本排印 strong/italic/bold-italic/subsup/del（5）、列表 bullet-l1/2/3 + checkbox-checked（4）、派生色 accent-rgb + inline-code/selection/check-mark（6） | 色彩成对；派生色 5 个当前单值 | ❌ 仅 strawberry-mocha 定义（可选扩展） | 新增 |
| **L1 语法高亮** | `--hl-keyword/string/number/property/function/comment`（6） | ✅ 成对 | ❌ 仅 strawberry-mocha 定义（可选扩展） | 新增 |
| **L2 排版/形状常量** | 行高/段距/字号/圆角/边框/内距/阴影/滚动条/焦点（40 个，`--mdvr-*` 单值） | ❌ 单值（`:root` 一次） | ❌ 仅 strawberry-mocha 定义（可选扩展） | 新增 |
| **L3 功能旋钮** | `--mdvr-mm`（间距倍率） | ❌ 单值 | ⚠️ 内置主题均定义但 **0 处消费**（休眠旋钮） | 待激活 |

> 统一变量名证据：inkpaper / qingci / template.css / example.css 的 `--mdvr-*` 名单与 lobeui-emphasis **完全一致**（16 个色彩常量 + sans + mono + mm），说明核心 17 个是事实上的跨主题契约。

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

- 名单固定（平台 Theme.listTokens），**不可新增**；内置主题均按此名单浅深各一组（v1.7.0 起仅草莓猛男粉）。
- strawberry-mocha 浅档语义色按文档 AA 实测值（error #C74330 / success #237834 / warn #965B00）；深档取 Catppuccin Mocha 对应色。

---

## 三、L1 身份色 · 核心契约（17 个）——全主题统一

> 完整契约 = **30 个变量**（13 L0 + 17 L1），磁盘上全部 6 个主题/模板文件**全量提供、无一缺席**；其中「面板最低兼容」只需 7 个 `--mdvr-*`（见 §八）。下表 17 个 = 14 身份色 + 2 字体 + 1 旋钮。

| 组 | 变量 | 消费方 |
|---|---|---|
| accent 系 5 | `accent` / `accent-text` / `accent-soft` / `accent-faint` / `accent-fainter` | panel.css（accent×11、accent-faint×6、accent-text×2、accent-fainter×1，均带回退） |
| link 系 2 | `link` / `link-hover` | panel.css（link×1，带回退）；主题元素段（strawberry-mocha） |
| highlight 系 2 | `highlight` / `highlight-soft` | panel.css（highlight×3，带回退） |
| quote 系 2 | `quote-border` / `quote-bg` | 主题元素段（strawberry-mocha） |
| code/table 系 3 | `code-border` / `table-head-bg` / `table-head-text` | 主题元素段（strawberry-mocha） |
| 字体 2 | `sans` / `mono` | panel.css（mono×3，带回退）；主题元素段 |
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

## 四、L1 身份色 · 扩展（strawberry-mocha 专属，可选）

### 4.1 标题梯度（6，浅深成对）——区分 H1~H6 个性色

`--mdvr-h1` ～ `--mdvr-h6`：浅档 #BE185D/#9D174D/#6D28D9/#B45309/#047857/#6B5E65；深档 #FB7185/#F472B6/#CBA6F7/#FAB387/#94E2D5/#9399B2。

### 4.2 文本排印（5，浅深成对）

`--mdvr-strong`（粗体）/ `--mdvr-italic`（斜体）/ `--mdvr-bold-italic`（粗斜体）/ `--mdvr-subsup`（上下标与公式符号）/ `--mdvr-del`（删除线）。

### 4.3 列表与复选框（4，浅深成对）

`--mdvr-bullet-l1/l2/l3`（1/2/3 级符号色，**同步 h1/h3/h5**）、`--mdvr-checkbox-checked`（勾选色，同步 accent）。

### 4.4 派生/杂项（6，声明成对；其中 5 个当前两档同值）

| 变量 | 浅 | 深 | 说明 |
|---|---|---|---|
| `--mdvr-accent-rgb` | 217, 59, 104 | 251, 113, 133 | 唯一真成对，rgba() 光晕派生用 |
| `--mdvr-inline-code-bg` | #14121E | 同 | 行内代码底（浅档刻意深底亮字胶囊） |
| `--mdvr-inline-code-text` | #F472B6 | 同 | 行内代码字 |
| `--mdvr-selection-bg` / `selection-text` | rgba(203,166,247,.35) / #F5E0DC | 同 | 选区色 |
| `--mdvr-check-mark` | #FFFFFF | 同 | 复选框对勾 |

---

## 五、L1 语法高亮 `--hl-*`（6 个，浅深成对）——strawberry-mocha 专属

`keyword` / `string` / `number` / `property` / `function` / `comment` —— Prism / Highlight.js / Shiki 通用，元素段 7 条规则全量消费。

> ⚠️ 易混：panel.css 编辑器高亮层的 `.hl-com/.hl-str/.hl-num` 等是**类名**（消费 `--mdvr-highlight`/`--mdvr-accent` 等契约变量带回退），与 `--hl-*` 变量完全无关。

---

## 六、L2 排版/形状常量（40 个，`:root` 单值）——strawberry-mocha 专属

| 子组 | 变量（默认值） |
|---|---|
| 文本节奏 9 | `lineheight-body` 1.6 / `lineheight-list` 1.65 / `lineheight-heading` 1.25 / `lineheight-code` 1.45 / `para-gap` 0.45em / `para-letterspacing` 0.01em / `heading-gap-top` 1.7em / `heading-gap-bottom` 0.55em / `heading-letterspacing` -0.01em |
| 标题字号 6 | `h1-size` 1.9em ～ `h6-size` 0.88em |
| 列表 5 | `list-gap` 0.8em / `li-gap` 0.35em / `mark-font-size` 0.95em / `list-pad` 1.6em / `list-pad-nested` 1.2em（v1.9.0 顶层/嵌套缩进 token 化；v1.8.0 曾移除嵌套 token、回归原生，v1.9.0 恢复为显式层级增量） |
| 圆角 4 | `radius-card` 8px / `radius-chip` 4.5px / `radius-table` 10px / `radius-check` 4px |
| 边框/内距/字号 10 | `border-code` 1px / `ribbon-code` 3.5px / `border-quote` 4px / `gap-block` 0.8em / `pad-pre` 8px 12px / `pad-code-inline` 0.15em 0.38em / `pad-cell` 0.68em 1em / `pad-quote` 0.6em 1.1em / `code-size` 0.85em / `table-size` 0.9em |
| 阴影 3 | `shadow-code-inline` / `shadow-kbd` / `shadow-img-drop`（⚠️ 值内嵌黑色 rgba，不分浅深——深档立体感偏弱，未来可拆档） |
| 滚动条/焦点/上下标 4 | `scrollbar-size` 6px / `focus-width` 2px / `focus-offset` 3px / `supsub-size` 0.76em |

> 设计意图：L2 全部进 `:root` 单值，供 `calc(var(--mdvr-mm) * …)` 之类派生；用户只调 L3 旋钮即可整体调密度/圆角（当前 mm 尚未被引用，属「休眠旋钮」）。

---

## 七、L3 功能旋钮 + 字体栈

| 变量 | 值 | 状态 |
|---|---|---|
| `--mdvr-mm` | 2 | 内置主题均有定义（曾 4 套、v1.7.0 起仅草莓猛男粉），**0 消费**——已规划为全局间距倍率（如 `margin: calc(0.45em * var(--mdvr-mm))`），待某版本激活 |
| `--mdvr-sans` / `--mdvr-mono` / `--mdvr-math-font` | Geist+中文栈 / JetBrains Mono 栈 / KaTeX 数学栈 | sans/mono 属核心契约；math-font 仅 strawberry-mocha |

---

## 八、panel.css 消费面（跨主题最低兼容契约）

- **消费的 `--mdvr-*`（全部带默认回退，铁律）**：`accent`（11 处，回退 #5856d6）、`accent-faint`（6，回退 #b4b3ed）、`highlight`（3，回退 #b3541e）、`mono`（3，回退 ui-monospace…）、`accent-text`（2，回退 #3a3a4e）、`link`（1，回退 #005ae0）、`accent-fainter`（1，回退 #cdccf3）。
- **消费的 `--dsw-alias-*`**：`bg-layer-1/2`、`border-l1`、`label-primary/secondary`、`state-error-primary`。
- **推论**：① 面板最低兼容 = 7 个 `--mdvr-*`（accent / accent-faint / accent-fainter / accent-text / highlight / link / mono）——主题只要定义这 7 个，插件面板就自带该主题配色；② 完整契约 30 个全量提供时（v1.4~v1.6 曾 4 套、v1.7.0 起仅草莓猛男粉），从配色到排版与面板全链路统一。`strawberry-mocha` 浅档 accent=#D93B68、深档=#FB7185，面板自动换粉——panel 无需任何改动。

---

## 九、「能否统一」的判断规则（盘点方法论，供后续主题复用）

1. **L0 名单固定**：13 个 platform token 不能增减，只能统一"每套主题都定义且浅深成对"。
2. **核心 17 个 = 统一变量**：accent/highlight/link/quote/code/table 系 + sans/mono/mm——**同名同义同消费方**，任何主题缺一个都会造成面板/元素回退不一致。
3. **扩展变量不强制统一**：`--mdvr-h1..h6`、`--hl-*`、L2 常量只属于「带 ③ 元素段的全量主题」；纯色主题可完全不定义（现有 3 套就是例子）。
4. **同值不重排档**：两档同值的派生色（inline-code/selection/check-mark）建议放 `:root` 单值、仅 `accent-rgb` 真成对留 body 两档——strawberry-mocha 已按此落地。
5. **命名冲突检查**：全仓 grep `--mdvr-*` / `--hl-*` / `--dsw-alias-*` 应无同名不同义；本盘点未发现同名不同值。

---

## 十、维护引用（改变量名/值要动的地方）

- 改核心 17 个变量之一：`panel.css` 回退值 → 内置主题 + `template.css` + `example.css`（参考主题）→ strawberry-mocha 元素段。
- 改 strawberry-mocha 专属变量：仅 `plugin/assets/themes/strawberry-mocha.css` + 本文档 §四~§六。
- 新增 `--dsw-alias-*`：❌ 不允许（平台名单固定）。
- 版本台账：`manifest/versions.json` v1.4.0 条目已登记本契约。

> 关联文档：`docs/themes.md`（能力边界/主题格式）、`docs/diagnosis-velvet-native-leak.md`（元素段整改依据）、`docs/variables-velvet-native.md`（源主题变量化盘点，被本文档 §四~§六 吸收）。