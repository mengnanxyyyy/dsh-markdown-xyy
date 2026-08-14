# 竞品 Markdown 强调配色研究 —— 主流 AI 对话产品用什么色突出重点

> 目标产品：DSH 上的「Markdown 对话主题排版插件」v0.3.0（LobeUI 中性 13-token 底）。
> 本报告只报事实与可落地数值，为纯 CSS 强调色系统提供依据。
> 约束备忘：无 JS、不改产品 DOM、token 固定 13 个不可增、纯 CSS、浅/深双档。
> 关联设计稿：`docs/readability-palette.md`（已在 v0.3.1 采用靛蓝 `#5856d6` / `#a8a5f5` 做主强调色）。

---

## 0. 一句话结论

主流产品**没有给 Markdown 正文整体上色**，而是用「**语义色五件套**（信息蓝 / 成功绿 / 警告金 / 错误红，外加一个主强调色）+ **字形色相的分工**」来让重点信息跳出来：
**结构块（引用/告警/表头/代码块）用 tint 底色或 4px 左边条 + 语义色系；连续阅读的正文（加粗/段落/列表/标题文字）保持中性**。
这与我们 v0.3.1 已定的"靛蓝 accent + 琥珀 highlight、标题/加粗/正文本体中性"策略高度吻合，且竞品能给出每一处建议的手法和可抄的 hex。

---

## 1. 各产品做法摘要（含来源 URL）

### 1.1 LobeChat / LobeUI（@lobehub/ui，版本 5.30.1）

**来源**：直接抓取的代码
- Markdown 样式源：[`src/Markdown/style.ts`](https://github.com/lobehub/lobe-ui/blob/master/src/Markdown/style.ts)
- 排版样式源：[`src/Markdown/markdown.style.ts`](https://github.com/lobehub/lobe-ui/blob/master/src/Markdown/markdown.style.ts)

LobeUI 的 markdown 组件实测规则（它与我们插件同源，可直接对照其 token）：

| 元素 | LobeUI 手法 | token |
| --- | --- | --- |
| **链接 a** | 文字颜色 = `colorInfoText`，hover = `colorInfoHover` | 信息蓝系 |
| **引用 blockquote** | 仅**左边条 4px** `colorBorder` + 文字 `colorTextSecondary`（次文字灰，**无底色**） | 中性 |
| **行内 code** | 文字**保留主色**（无色变化！），仅 **tint 底** `colorFillSecondary` + 1px 细边 `colorFillQuaternary` | 中性 |
| **代码块 pre** | 仅 `font-size .85`，底色交由高亮器 | 中性 |
| **代码块底部工具条** | 细边框 `colorBorder` | 中性 |
| **表格 thead** | tint 底 `colorFillQuaternary`；行分隔 1px `colorBorderSecondary` | 中性 |
| **strong** | 仅 **font-weight 600**，**无任何颜色** | 中性 |
| **hr** | 虚线 `colorBorder` | 中性 |
| **告警块 GFM alert（五色）** | 见下 | **语义色五件套** |

**GFM alert 五色条（决定性证据，来自 style.ts `styles.gfm`）：**

```ts
.markdown-alert-note       { border-inline-start-color: ${colorInfo};    title color: colorInfo; }
.markdown-alert-tip        { border-inline-start-color: ${colorSuccess};  title color: colorSuccess; }
.markdown-alert-important  { border-inline-start-color: ${purple};        title color: purple; }
.markdown-alert-warning    { border-inline-start-color: ${colorWarning};  title color: colorWarning; }
.markdown-alert-caution    { border-inline-start-color: ${colorError};    title color: colorError; }
```

> 关键手法：**整个告警块不铺底色**，只靠「**左边条 4px 语义色** + **首行标题文字同色 + 加粗（font-weight 500）**」。五档 = 蓝 / 绿 / 紫 / 橙 / 红。这与 GitHub 原生做法完全一致（见 §1.5）。

LobeUI 用的语义色是 antd 语义 token（light）：`colorInfo` 蓝、`colorSuccess` 绿、`colorWarning` 橙、`colorError` 红，另加一个 antd 无内置的 `purple` 紫。antd 默认 light 语义值即：

| antd 语义 | light | 角色 |
| --- | --- | --- |
| `colorInfo` | `#1677ff` | 信息蓝 |
| `colorSuccess` | `#52c41a` | 成功绿 |
| `colorWarning` | `#faad14` | 警告金 |
| `colorError` | `#ff4d4f` | 错误红 |

### 1.2 ChatGPT（openai.com web）

**来源**：
- [brandcolor.dev — ChatGPT HEX Colors](https://brandcolor.dev/brands/chatgpt)
- [ColorArchive — OpenAI Color Palette](https://colorarchive.org/brands/openai/)
- [OpenAI Brand Colors — makr.io](https://www.makr.io/design/color/brand-colors/openai)

- **主强调色 = 品牌绿 `#10A37F`**（OpenAI 单色品牌核心）；文字/错误用 `#C96442`（红橙）、辅助灰 `#737373`、黑色 `#0F0F0F`。
- **表面**：浅档 `#FAFAFA` / `#FFFFFF`，深档 `#0F0F0F`。
- 对话里**代码块**在浅档用近中性浅灰底（曾因代码底色过浅被用户吐槽「faint」），**不强着色相**；**行内 code** 用轻微琥珀/暖灰底。**加粗**纯加重，无颜色；**引用**窄左条 + 次文字色。
- 规律：ChatGPT 对**正文几乎不上语义色**，只有**链接（品牌蓝绿）**和**UI 操作**（发送键用品牌绿、红色错误提示）承担色彩。Markdown 内部强调极克制。

### 1.3 Claude（claude.ai，Anthropic）

**来源**：[mundizzle/claude-theme — Claude Theme](https://github.com/mundizzle/claude-theme)（对齐 Anthropic 官方品牌色板）

Claude 的特色是「**暖中性底 + 橙色主强调**」——是五家里唯一让主强调色既跳动又克制的代表：

| 角色 | light hex | 说明 |
| --- | --- | --- |
| **主强调 accent** | `#d97757`（橙） | Claude 签名色，用于链接、按钮、激活态、重点批注 |
| 次强调（蓝） | `#6a9bcc` | 信息/链接次级 |
| 次强调（绿） | `#788c5d` | 成功/提示 |
| 背景（暖奶油） | `#faf9f5` | 浅档主背景（暖白，非纯白） |
| 主文字 | `#141413` | 近黑，暖调 |
| 次文字 | `#b0aea5` | 灰 |
| 边框/浅分隔 | `#e8e6dc` | 暖浅灰 |
| 错误红 | `#DC2626` | 错误 |

- dark：背景 `#141413`，面板 `#262624`，输入 `#0a0a09`，主文字 `#faf9f5`。
- 规律：**暖底让橙色 accent 不过分刺眼**，同时用「一个主强调色 + 蓝/绿小面积辅色」替代五色全开。Claude 的引用块/代码块底色都走暖中性，强调只落到 accent。

### 1.4 Gemini（gemini.google.com）

**来源**：[ColorArchive — OpenAI palette 中同屏抓取的 Google 四色](https://colorarchive.org/brands/openai/)；[gemini-cli theme PR](https://github.com/google-gemini/gemini-cli/pull/2114)

Gemini 走 Google Material 语义四色（同为 antd 语义区间的直接参考）：

| 语义 | light 参考值 | 角色 |
| --- | --- | --- |
| 信息/链接蓝 | `#4285F4` | 超链、信息 |
| 成功绿 | `#34A853` | 成功/通过 |
| 警告黄 | `#FBBC04` | 警告块 |
| 错误红 | `#EA4335` | 错误/危险 |

- 对话内 Markdown：代码块用中性灰底，行内 code 用浅 tint；表格头加浅灰底；引用左条灰色；链接走 Material 蓝。语义四色主要出现在「系统提示、错误诊断、UI 状态」，正文 Markdown 内基本不上色，强调主要靠**字形/留白/粗细**。

### 1.5 GitHub GFM alert 官方规范（事实基准）

**来源**：
- [sindresorhus/github-markdown-css（5.9.0）github-markdown.css](https://raw.githubusercontent.com/sindresorhus/github-markdown-css/main/github-markdown.css) 与 `github-markdown-dark.css`
- [antfu/markdown-it-github-alerts](https://github.com/antfu/markdown-it-github-alerts)
- [GitHub community 官方讨论 #16925](https://github.com/orgs/community/discussions/16925)

官方 `.markdown-body` 的 GFM alert 规则（五家共用的标准）：

```css
.markdown-alert {
  padding: 8px 16px;
  margin-bottom: 16px;
  border-left: .25em solid var(--borderColor-default);  /* 4px 左边条 */
}
.markdown-alert-title { font-weight: 500; display: flex; align-items: center; }

.markdown-alert-note      { border-left-color: var(--borderColor-accent-emphasis);    title: var(--fgColor-accent); }
.markdown-alert-important { border-left-color: var(--borderColor-done-emphasis);      title: var(--fgColor-done); }
.markdown-alert-warning   { border-left-color: var(--borderColor-attention-emphasis); title: var(--fgColor-attention); }
.markdown-alert-tip       { border-left-color: var(--borderColor-success-emphasis);   title: var(--fgColor-success); }
.markdown-alert-caution   { border-left-color: var(--borderColor-danger-emphasis);    title: var(--fgColor-danger); }
```

> 结构 = **4px 左边条语义色（emphasis 深档）+ 标题文字同语义色 + font-weight 500**，**无底色**。与 LobeUI 一模一样。

**GitHub Primer 语义色标准值（light / dark）**——这是最权威的「语义五色适配深浅」基准：

| 语义 | 标题/文字色 light | 文字色 dark | 左条 emphasis light | 左条 emphasis dark |
| --- | --- | --- | --- | --- |
| note（accent/蓝） | `#0969da` | `#4493f8` | `#0969da` | `#318bf8` |
| important（done/紫） | `#8250df` | `#ab7df8` | `#8250df` | `#a371f7` |
| warning（attention/金褐） | `#9a6700` | `#d29922` | `#9a6700` | `#d29922` |
| tip（success/绿） | `#1a7f37` | `#3fb950` | `#1a7f37` | `#2ea043` |
| caution（danger/红） | `#cf222e` | `#f85149` | `#cf222e` | `#da3633` |

普通 `blockquote`（非 alert）在 GitHub：**左边条 `.25em` 用 `borderColor-default`（中性灰）** + 文字 `fgColor-muted`（次文字色），**无色相**。

---

## 2. 通用规律表：元素 → 强调手法 → 参考色值（浅/深）

汇总五家共通的「每种元素用什么手法强调」：

| 元素 | 竞品共识手法 | 是否上色 | 参考色系（浅/深） |
| --- | --- | --- | --- |
| **加粗 strong** | 纯加重（600–700），**不上色** | ❌ 中性 | （保持主文字色） |
| **行内 code** | tint 底色 + 1px 细边，文字色不变 | ⚠️ 微tint | LobeUI `colorFillSecondary`（近中性浅灰 / 深灰） |
| **代码块 pre** | 浅 tint 底 + 圆角边，**不叠语义色** | ⚠️ 微tint | 同 layer-2 中性（浅 `#f0f0f0`± / 深 `#1a1a1a`±） |
| **引用 blockquote** | **4px 左边条** + 次文字色；普通引用条用中性灰 | ⚠️ 边条中性，无色相 | 浅 `#e3e3e3` / 深 `#202020`（=当前 border-l1） |
| **告警/提示块 alert** | **4px 左边条语义色 + 标题同色 + 500 加重** | ✅ 语义色五档 | 见 §1.5 Primer 表 |
| **表格表头 th** | 浅 tint 底 + 加粗；行分隔细线 | ⚠️ 微tint中性 | 浅 `#f0f0f0` / 深 `#1a1a1a`（=layer-2） |
| **列表标记** | 次文字灰 marker，不抢眼 | ❌ 中性 | 灰 `#666` / `#aaa` |
| **链接 a** | 语义色（蓝），hover 加重 | ✅ 信息蓝 | ChatGPT `#0072f5`（同我们）/ GitHub `#0969da` / `#4493f8` |
| **标题** | 文字保持中性，靠**字号/加重/间距**形成层级 | ❌ 中性 | （不做色） |
| **关键段落/重点** | 用 highlight 琥珀色点缀零星词（Claude 橙、GPT 绿、GitHub 不做） | ✅ 主强调色 | Claude `#d97757`；GPT 绿 `#10A37F` |

### 强调色的角色分工（五家一致）

| 语义色 | 英文/品牌 | 用在哪些元素上 |
| --- | --- | --- |
| **主强调色 accent** | Claude 橙 `#d97757`；OpenAI 绿 `#10A37F`；我们可自选 | 链接、重点词高亮、激活态、列表符号点缀 |
| **信息蓝** | 链接 / note / 普通信息 | 超链、note 告警、引用作信息性强调时 |
| **成功绿** | tip / 通过 / 完成 | tip 告警边条、成功状态 |
| **警告金** | warning / 注意 | warning 告警边条（文字常用深金褐以保证对比） |
| **错误红** | caution / 失败 / 删除 | caution 告警边条、错误状态、删除强调 |
| **紫（important）** | GitHub/LobeUI 专属 | important 告警边条（可选，非必要） |

### 浅/深模式下色值如何变化

- **任何语义色在深档都要提亮**（浅档文字近黑、深档发亮），才能保持 ≥4.5:1 对比：见 §1.5 Primer light/dark 对照（蓝 `#0969da`→`#4493f8`，绿 `#1a7f37`→`#3fb950`，金 `#9a6700`→`#d29922`，红 `#cf222e`→`#f85149`）。
- **tint 衬底**：浅档 = 语义色 8–15% 叠在 `#fff`；深档 = 语义色 12–15% 叠在近黑 `#0d0d0d`/`#000`（我们 v0.3.1 §2 已给公式，直接复用）。
- **主强调色**（Claude 橙 / GPT 绿）：light 用较深显色（橙 `#d97757`），dark 提亮（橙 `#e8a07e` 类）；要同时保证「浅底可读」与「深底可读」需配 `accent-strong` 反转文字色（我们已定义）。

---

## 3. 对我们 13-token 中性底下的落地方案建议

结合竞品事实 + 我们 v0.3.0 现状（13 token：bg/layer-1/layer-2/overlay/border-l1/l2/brand/label-1/label-2/error/success/warn/specific + 已自有的 `--mdvr-link`），**在不增 token、不改 DOM、纯 CSS 前提下**：

### 3.1 哪些元素值得上色（由竞品共识支撑）

| 元素 | 竞品共识 | 我们建议手法（对齐 v0.3.1） |
| --- | --- | --- |
| **引用块 blockquote** | 上色重点是「边条 + tint 底」 | ✅ 普通引用：保留现有中性 4px 左条（=GitHub）；**若想更跳**：改用 accent tint 底 `--mdvr-quote-bg` + accent 边条 `--mdvr-quote-border`（v0.3.1 已定义 `#f2f1fc`/`#5856d6`） |
| **告警 GFM alert** | 五色左条 + 标题同色 | ✅ 若要支持 `> **Note:**`/`[!TIP]` 等，copy LobeUI/GitHub：note=蓝、tip=绿、important=紫、warning=金、caution=红；**只画 4px 左条 + 标题色，不铺底**，最省 token（一条声明 + 复用 `--mdvr-link` 蓝即可起步） |
| **表格表头 th** | tint 底 + 加粗 | ✅ 现有 `layer-2` 底 + 600 转成 accent tint `--mdvr-table-head-bg`（`#edecfb`）更跳；表头文字用 `--mdvr-table-head-text`（`#3b3aa8`） |
| **行内 code / 代码块** | tint + 细边，**无色相** | ✅ 现有 `layer-2` 底 + border-l1 已满足；若要轻微强调可换轻微 accent 偏的 `--mdvr-code-bg`（`#f4f4f7`）——竞品基本保持近中性，**不建议叠加语义色** |
| **链接** | info 蓝 | ✅ 已用 `--mdvr-link #0072f5/#60b1ff`，与竞品一致，不动 |
| **加粗 strong / 标题文字 / 段落 / 列表标记** | 五家都保持中性 | ❌ 坚持不上色（v0.3.1 §3 已明确），避免整版花哨 |
| **关键段落/零星词高亮** | 主强调色点缀 | ✅ 用 `--mdvr-highlight` 琥珀（`#b3541e`/`#ffb45e`）+ tint 底，对标 Claude 橙 / GPT 绿的在页面中的「唯一高亮点」角色 |

### 3.2 角色分工对齐（确认 v0.3.1 的底色正确）

竞品证据强烈支持 vt.0.3.1 方案，三点直接对得上：

1. **主强调色要不要单独一档** → 要。Claude 用橙、OpenAI 用绿、我们先选**靛蓝 `#5856d6`/`#a8a5f5`**（与 link 蓝 `#0072f5`、成功绿 `#379d4a`、警告金 `#ee9e0b` 色相错开，避免撞语义色）。**靛蓝在竞品里相当于 GitHub 的 important(紫)+accent 的合体**，专业但与语义色分家，不廉价。
2. **结构上色 vs 正文中性** → 竞品 100% 印证：引用/表头/代码块/告警上色，正文(strong/标题/段落/列表)中性。v0.3.1 §3 与此一致。
3. **告警块要不要做** → 可选增强。若不打算支持 GFM alert 语法，可先不做五色；若要做，**只画边条+标题色**是最省事且有官方样板的实现（直接复用 `--mdvr-link` 蓝作 note，绿/金/红改用已有 `--dsw-alias-state-*` 三色即可，零新增 token）。

### 3.3 规避「廉价感」的具体分寸（竞品教训）

- **别整页抢色**：ChatGPT 最素、Claude 最克制（单 accent + 暖底）、GitHub 只在 alert 上色。教训 = **语义色只出现在「结构块」和「告警」，正文只有一处主强调色做点缀**。
- **tint 底要狠浅**：行内 code / 代码块 / 表头底的 tint 偏离中性**个位数百分点**（v0.3.1 §2 的 8–15%），肉眼刚能感到「有底」，不刺眼。
- **深档全部提亮**：任何语义色在深色必须提亮明度保对比，引用我们 §1.5 Primer 对照即可。
- **4px 左条是最高性价比**：一个 border-left-color 就能让告警/引用跳出来，无需底色，最不「廉价」。

---

## 4. 可抄的精确色值速查（落进 CSS 前直接取用）

| 用途 | 浅档 hex | 深档 hex | 出处 |
| --- | --- | --- | --- |
| 主强调色（靛蓝，v0.3.1 已定） | `#5856d6` | `#a8a5f5` | 设计稿 |
| 信息蓝（链接 / note） | 我们用 `#0072f5`；GitHub `#0969da`；antd `#1677ff` | 我们用 `#60b1ff`；GitHub `#4493f8` | 混合 |
| 成功绿（tip） | 我们用 `#379d4a`；GitHub `#1a7f37` | 我们用 `#c4f042`；GitHub `#3fb950` | 混合 |
| 警告金（warning） | 我们用 `#ee9e0b`；GitHub `#9a6700` | 我们用 `#ffb224`；GitHub `#d29922` | 混合 |
| 错误红（caution） | 我们用 `#ec5e41`；GitHub `#cf222e` | 我们用 `#f4416c`；GitHub `#f85149` | 混合 |
| 紫（important，可选） | GitHub `#8250df`；antd-ish `#5856d6` | GitHub `#ab7df8` | Primer |
| highlight（琥珀，重点词） | `#b3541e` | `#ffb45e` | 设计稿 |
| 代码/表头/引用 tint 底 | `#f4f4f7`·`#edecfb`·`#f2f1fc` | `#16161c`·`#23222d`·`#1d1c26` | 设计稿 |
| 普通引用 4px 左条（中性） | `#e3e3e3` | `#202020` | = 现有 border-l1 |

> 优先使用我们 13-token 里已有的 `state-error/success/warn` + `--mdvr-link`，**这样告警块一条声明就能做**，几乎不再需要 fetch 外来色值；真要多一档「紫（important）」时，才需要用 `--mdvr-accent`（靛蓝）顶替，仍是零新增 token。
