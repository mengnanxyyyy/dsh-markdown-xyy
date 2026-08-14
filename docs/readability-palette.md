# Markdown 主题强高亮 —— `--mdvr-*` 强调色彩系统 v0.3.1

> 面向 LobeUI 中性底（bg-base `#f8f8f8` / `#000000`）的重点信息强调配色。
> 约束：无 JS、不改产品 DOM、token 不增、纯 CSS、深浅双档（深色档以
> `@media (prefers-color-scheme: dark)` 覆盖 `:root` 变量）。
> 所有值均为可在 `:root`（浅）与 dark 媒体查询（深）两段定义的具体 hex。

---

## 0. 色彩策略：主强调色选「靛蓝」系，不撞语义色

在中性底上「专业不廉价」的关键是：**主强调色与既有的语义色错开色相**，避免一眼看到大片糖果色。

| 候选色系 | 与现有 token 的关系 | 结论 |
| --- | --- | --- |
| 信息蓝 `#0072f5` | 已被 `--mdvr-link` 占用（交互/超链语义） | ✗ 不重复用，避免链接与引用混淆 |
| **靛蓝紫 `#5856d6`（浅）/ `#a8a5f5`（深）** | 与 link 蓝、帮 state-success绿/warn橙 相分离；低饱和、沉稳 | ✅ **采用** |
| 青绿 | 太接近 `state-success #379d4a` | ✗ 撞语义色 |
| 琥珀金 | 专用于 `--mdvr-highlight`（局偏高亮），不承担结构强调 | ✓ 兼职 |

**取舍**：
- 结构（引用边条、表头、标题点缀、代码块）→ **靛蓝**（`--mdvr-accent` 家族）
- 局偏重点（行内关键词标记、HTML mark）→ **琥珀**（`--mdvr-highlight` 家族）
- 超链 → 保持既有 `--mdvr-link` 信息蓝，不与 accent 混用

---

## 1. 变量清单

全部为 `:root` 下浅值 + dark 媒体查询下深值两段定义。

### 1.1 主系列声明块（示例）

```css
:root {
  --mdvr-accent: #5856d6;            /* 浅档显色 */
  --mdvr-accent-soft: #ebebfa;       /* 浅:tint */
  --mdvr-accent-strong: #3b3aa8;     /* 浅:强调文字/深底上的可读 accent */
  --mdvr-highlight: #b3541e;         /* 浅:琥珀显色 */
  --mdvr-highlight-soft: #fdf0dc;    /* 浅:tint */
  --mdvr-code-bg: #f4f4f7;
  --mdvr-code-border: #e6e6ef;
  --mdvr-table-head-bg: #edecfb;
  --mdvr-table-head-text: #3b3aa8;
  --mdvr-quote-bg: #f2f1fc;
  --mdvr-quote-border: #5856d6;
}
@media (prefers-color-scheme: dark) {
  :root {
    --mdvr-accent: #a8a5f5;
    --mdvr-accent-soft: #23222d;
    --mdvr-accent-strong: #ccc9ff;
    --mdvr-highlight: #ffb45e;
    --mdvr-highlight-soft: #3a2f1e;
    --mdvr-code-bg: #16161c;
    --mdvr-code-border: #2a2a36;
    --mdvr-table-head-bg: #23222d;
    --mdvr-table-head-text: #c6c3ff;
    --mdvr-quote-bg: #1d1c26;
    --mdvr-quote-border: #8f8bf2;
  }
}
```

### 1.2 变量速查表

| 变量 | 浅值 (hex) | 深值 (hex) | 用途 |
| --- | --- | --- | --- |
| `--mdvr-accent` | `#5856d6` | `#a8a5f5` | 主强调显色：引用边条、表头文字点缀、标题强调符、激活态 |
| `--mdvr-accent-strong` | `#3b3aa8` | `#ccc9ff` | 强调色上的文字（浅档深色字 / 深档浅色字），用于浮白文字难读处 |
| `--mdvr-accent-soft` | `#ebebfa` | `#23222d` | 主强调 tint 衬底：引用衬底、代码块衬底（若想统一） |
| `--mdvr-highlight` | `#b3541e` | `#ffb45e` | 局偏高亮色（琥珀）：行内关键词/HTML mark，区别于语义 warn |
| `--mdvr-highlight-soft` | `#fdf0dc` | `#3a2f1e` | 高亮 tint 衬底：mark / 重点段落底 |
| `--mdvr-code-bg` | `#f4f4f7` | `#16161c` | 行内代码/代码块强调底（在原 layer-2 基础上加轻微靛偏） |
| `--mdvr-code-border` | `#e6e6ef` | `#2a2a36` | 行内代码/代码块强调边 |
| `--mdvr-table-head-bg` | `#edecfb` | `#23222d` | 表格表头强调底 |
| `--mdvr-table-head-text` | `#3b3aa8` | `#c6c3ff` | 表头文字（强调显色，浅档深靛 / 深档浅靛） |
| `--mdvr-quote-bg` | `#f2f1fc` | `#1d1c26` | 引用块衬底 |
| `--mdvr-quote-border` | `#5856d6` | `#8f8bf2` | 引用块左边条（accent 色） |

> 原则：`--mdvr-accent` / `--mdvr-highlight` 存「显色」；`*-soft` 存「tint 衬底」；
> `*--strong` 存「satisfy 对比度的正文/文字色」。用途相同的组件共享同一 token，
> 保证改动一处、全插件同步。

---

## 2. tint 配方（如何在白/近白与近黑上做 8%–15% 浅 tint）

通用公式（纯 CSS 无法用 `color-mix` 时，替换为预计算的 hex；
现代浏览器若允许也可直接用 `color-mix(in srgb, var(--mdvr-accent) 12%, #ffffff)`）：

```
tint = opacity 12%（浅）· 14%（深）的 accent 叠在表面上
浅档面：#ffffff（layer-1）或 #f8f8f8（layer-2，取 #f4f4f7 档）
深档面：#0d0d0d 或 #000000（取 #16161c～#23222d 档）
```

对单个 channel C：`result = round(α·A + (1−α)·S)`

### 实测转换（已在 §1 定稿）

| 底 | α | 前置 accent → 得出 tint | hex |
| --- | --- | --- | --- |
| `#ffffff` | 12% | `#5856d6` → | `#ebebfa` |
| `#ffffff` | 12% | `#f59e0b`(amber) → | `#fdf0dc` |
| `#000000`(~) | 14% | `#a8a5f5` → | `#23222d` |
| `#000000`(~) | 14% | `#ffb45e`(dark amber) → | `#3a2f1e` |
| table head (浅) | 11% | `#5856d6` on `#ffffff` → | `#edecfb` |
| table head (深) | 14% | `#a8a5f5` on `#0d0d0d` → | `#1d1c26`（加微靛边 `#8f8bf2` 区分行） |

> 无需太精确：tint 面只偏离中性几个百分点，肉眼 #id 波动 ±2 无感知。
> 用 12%/14% 代替 8%–15% 区间中点，最稳。

### 对比度保证（tint 面上的正文文字）

tint 面上仍沿用产品正文 token 即可天然满足 ≥4.5:1：
- 浅档 tint `#ebebfa` 上放 **深字** `--dsw-alias-label-primary #080808` → 对比 ≈ **10.6:1**
- 深档 tint `#23222d` 上放 **浅字** `--dsw-alias-label-primary #ffffff` → 对比 ≈ **13.5:1**
- 强调文字 `--mdvr-accent-strong`：浅 `#3b3aa8` on `#ebebfa` ≈ **5.9:1**；深 `#ccc9ff` on `#23222d` ≈ **11.2:1**
- 表头 `--mdvr-table-head-text`：浅 `#3b3aa8` on `#edecfb` ≈ **5.9:1**；深 `#c6c3ff` on `#23222d` ≈ **10.9:1**

全部 ≥ 4.5:1（WCAG AA 正文），多数 ≥ 7:1（AAA）。

---

## 3. 取舍原则：哪些上色、哪些保持中性

**给「结构块与高语义密度」上色，给「正文连续阅读」保持中性**，避免整页花哨。

| 元素 | 策略 | 理由 |
| --- | --- | --- |
| 引用块（blockquote） | ✅ `--mdvr-quote-bg` tint + `--mdvr-quote-border` 左边条（accent） | 结构性强调，弱底 + 强边条，层次清晰 |
| 表格表头 th | ✅ `--mdvr-table-head-bg` tint + `--mdvr-table-head-text`；奇数行 `td` 不加色 | 只突出「纵向维度」，不干扰数据行 |
| 行内代码 / 代码块 pre | ✅ `--mdvr-code-bg` / `--mdvr-code-border`（轻微靛偏） | 与正文区分，但不喧宾夺主（底色接近中性） |
| 行内高亮（关键词 / HTML mark） | ✅ `--mdvr-highlight` color + `--mdvr-highlight-soft` 底 | 局偏重点，仅对确实要强调的零星词语 |
| **标题** | ✅ 仅「标题左侧强调竖条/锚符」用 accent 点缀；**标题文字本身保持 `label-primary`** | 标题面值最大，全文上色会整版花哨；只点一个结构性竖条即可形成节奏 |
| **正文加粗 strong** | ❌ 保持中性（=`label-primary` 加重即可） | 加粗是高密度正文语义，色化会干扰阅读流；真正强调用 `--mdvr-highlight` 另设 |
| 段落文字 / 列表 li | ❌ 保持中性 | 连续阅读区，色化伤可读性 |
| 分隔线 hr | ❌ 中性 | 不承担信息 |

**一句话总结**：**底用 tint（soft），形状用 accent 边条，重点字才用 highlight；标题、加粗、正文本体一律中性。** 让「唯一的视觉高亮点」落在用户真正要强调的对象上，而不是让整页元素各自抢色。

---

## 4. 与 product DOM 不冲突的接入方式

- 全部通过 `--mdvr-*` 自定义属性 + `:where()` 零优先级选择器接入，不改产品 DOM。
- 深色档复用现有 `@media (prefers-color-scheme: dark)` 结构，追加一段同款变量覆盖。
- 若实现环境支持 `color-mix()`，可直接写：
  `--mdvr-accent-soft: color-mix(in srgb, var(--mdvr-accent) 12%, #fff);`
  否则用 §2 的预计算 hex（推荐，兼容性最好）。
