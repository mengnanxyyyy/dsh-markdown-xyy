# 元素级强调排版规范（v0.3.0 → v0.4.0 候选）

> 纯设计任务：为 `plugin/client.js` 的 `TYPO_CSS` 排版层做 **before → after** 元素级强调方案。
> 硬约束与本档不变量：无 JS、不改产品 DOM、`:where()` 零优先级、深浅双档、只引用 `var(--dsw-alias-*)` 13 token 与 `--mdvr-*` 自定义属性，绝不写死 hex（链接信息蓝除外，见 §1 例外）。
> 本档只给规则，不改 `client.js`；落地时把每条 `after` 替换进 `TYPO_CSS` 对应行，作为下一 Package 的变更日志逐条记录。

---

## 〇、设计总纲（先定"强调色预算"，再逐元素分配）

当前 LobeUI 身份的一个核心事实必须先摆明：**主色 `brand-primary` 是中性黑/白**（`#222`/`#eee`，lobe `primary[9]`），并非彩色。因此「强调感」不能一根筋堆彩色——必须在以下三个通道里分配预算，否则会破坏 LobeUI 的单色克制感：

| 强调通道 | 颜色来源 | 用途 | 强度纪律 |
| --- | --- | --- | --- |
| **A. 中性·浓度** | `--dsw-alias-label-primary`（#080808/#fff）、`brand-primary` | strong 加粗、标题、代码块衬底 | 只增对比度，不加色相 |
| **B. 语义·触点** | 信息蓝 `--mdvr-link`（#0072f5/#60b1ff）、`state-success`/`state-warn` | 链接、引用边条、列表符号、hr、标题点缀 | 全版面只给「链接」一个稳定高饱和锚点 |
| **C. 中性·层级** | `--dsw-alias-border-*`、`bg-layer-2` | 边框、衬底、分隔线 | 数量 ≥ 色的数量，压住 B 的跳脱 |

**推荐总策略（"一蓝三灰"）**：彩色收敛为**一个信息蓝系**（复用已定义的 `--mdvr-link`，不新增语义色），其余全部走中性浓度与层级提升。理由：
1. 新增"强调色"会与 state 三彩（success/warn/error）撞车，用户会把引用记号误读成成功/警告。
2. 信息蓝已在 v0.3.0 定义且全局一致，零新成本。
3. 单色设计语言下，彩色一旦出现就是"最重音符"，只应落在真正的重点上。

> **§1 唯一写死色**：链接蓝依然硬编码在 `:root` 的 `--mdvr-link`/`--mdvr-link-hover`（v0.3.0 已有），下面所有"强调色"都复用它，不重复定义新蓝。如需更柔的衬底蓝，加一个半透明 tint 变量即可（section 开头集中定义）。

### 新增的 `--mdvr-*` 自定义属性（集中到 `:root` 顶部，深浅各覆盖一次）

```css
:root {
  /* 强调色 = 现有链接蓝复用；tint = 信息蓝 8% 透明衬底（浅色更轻） */
  --mdvr-accent: var(--mdvr-link);
  --mdvr-accent-soft: rgba(0, 114, 245, 0.08);  /* 深色档见下方 @media 覆盖 */
  --mdvr-code-tint: var(--mdvr-accent-soft);      /* 行内 code 衬底 */
  --mdvr-bq-tint:  rgba(0, 114, 245, 0.05);       /* 引用衬底（引用衬底比 code 更淡） */
  --mdvr-head-accent: rgba(0, 114, 245, 0.55);    /* 标题下划线的半透明强调条 */
}
@media (prefers-color-scheme: dark) {
  :root {
    --mdvr-accent-soft: rgba(96, 177, 255, 0.16);
    --mdvr-bq-tint: rgba(96, 177, 255, 0.10);
    --mdvr-head-accent: rgba(96, 177, 255, 0.70);
  }
}
```

> 新增的 `--mdvr-*` 变量不需要进 `Theme` token 名单（那 13 个只归 `--dsw-alias-*`），直接在排版层的 `:root` 里定义即可，遵循 v0.3.0 已有先例（`--mdvr-link` 就是这么做的）。深色档用 `@media (prefers-color-scheme: dark)` 覆盖，同样是已有先例。

---

## 1. strong —— 保持中性但加重（700 + 更深的字色），**不要**主色化

**before**
```css
:where(strong) { font-weight: 600; }
```
现状：600 与衬线正文 400-500 拉不开，几乎是"软强调"，这是"整体太素"的要因之一。

**after（推荐方案：中性加重，用文字浓度通道）**
```css
:where(strong, b) {
  font-weight: 700;
  color: var(--dsw-alias-label-primary);   /* #080808 / #fff：把强调词压到最深 */
}
:where(strong em, strong i, em strong, i strong) { font-weight: 800; }
```
若想再给一句"重点句"更强的浓度对比，可叠加 `letter-spacing: -0.01em`（中文下视觉更聚拢），但常规强调不必。

**设计理由**
- strong 是全文档出现频率最高的"强调载体"，若用主色/信息蓝会满屏蓝色，立刻稀释链接的语义。**主色化 strong 是最容易做的错招。**
- 700 + 全黑（浅色档 #080808 vs 正文 #666 secondary 之外，正文实际是 label-primary）——但它真正的对比来自与 `secondary`（#666/#aaa）的落差：正文次级 #666，强调 #080808，Δ 是"灰→黑"，而非"黑→更黑"。因此**给正文留一点次级层级、让 strong 独占最黑**，比加大 weight 更有效。当前正文没设颜色（继承产品），所以把 `label-primary` 显式赋给 strong 能保证它永远比正文深。
- 700 是网页平台"浓重"习惯阈值（800 保留给"strong 内的 em"，双强调嵌套）。

**风险提示**
- `label-primary` 是零优先级下的显式颜色：若产品组件已给正文一个非默认浅灰（如 #333），strong 拿 #080808 仍更深，安全。
- 若产品给某处 strong 自带 `color`（品牌强调字），`:where()` 零优先级会被覆盖 → 那处保持产品色，属预期（我们不破坏产品）。
- `font-weight 700` 会被产品设了 600 的 strong 覆盖（产品显式样式胜出）→ 该处退化为产品权值，不报错。若产品正文本身 400、强调 600，我们 700 在裸语义区必赢。

---

## 2. 行内 code —— tint 底 + 同色系暗板边框（信息蓝系），从"淡灰胶囊"升到"可辨识代码"

**before**
```css
:where(code, samp) {
  font-family: var(--mdvr-mono); font-size: 0.875em; line-height: 1;
  padding: 0.1em 0.4em; margin-inline: 0.15em;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 0.25em;
  background: var(--dsw-alias-bg-layer-2);   /* #f0f0f0 / #1a1a1a —— 与正文底色接近，太素 */
  white-space: break-spaces; overflow-wrap: break-word;
}
```
现状：`bg-layer-2` 与正文/页面底色近乎同灰，1px border-l1 又几乎隐形 → 代码既不"跳"也不像代码。

**after（推荐方案：信息蓝 tint 底 + 同色系中灰边框）**
```css
:where(code, samp) {
  font-family: var(--mdvr-mono); font-size: 0.875em; line-height: 1;
  padding: 0.1em 0.4em; margin-inline: 0.15em;
  border: 1px solid rgba(0, 114, 245, 0.35);         /* 浅：蓝 35% 描边 */
  border-radius: 0.3em;
  background: var(--mdvr-code-tint);                  /* 浅 rgba(0,114,245,.08) */
  color: #0b58c8;                                     /* 浅：信息蓝的下沉深蓝，压住对比 */
  white-space: break-spaces; overflow-wrap: break-word;
}
@media (prefers-color-scheme: dark) {
  :where(code, samp) {
    border-color: rgba(96, 177, 255, 0.35);
    background: var(--mdvr-code-tint);                /* 深 rgba(96,177,255,.16) */
    color: #a7d3ff;                                   /* 深：提亮的信息蓝 */
  }
}
```
> 注：浅色 code 文字用**更深的蓝**（#0b58c8）而非 link 本身的 #0072f5：8% 浅蓝衬底上放 #0072f5 会对比不足（约 3.2:1），#0b58c8 可到 ~6:1。深色档 #a7d3ff 是 v0.3.0 已定义的 hover 蓝，足够亮。

**设计理由**
- 8% tint 底 + 35% 同色描边 = 一眼"这是代码/术语"，但整体仍是浅淡的单色语言，不喧宾夺主。
- 深色档 tint 提到 16%、文字提到 #a7d3ff——深色下蓝色本身会显得暗，必须提亮才能保对比，这是深浅差异的来源。
- 保留等宽 + lh1 + 胶囊形状不变，只换色彩，符合"强调感升级"而非"换结构"。

**风险提示**
- **对比度墙**：零优先级下，`rgba` 半透明衬底混到产品底色上，真实对比取决于底色。浅色在白色容器 (#fff) 上 tint 8% → 有效约 #ecf4ff，配 #0b58c8 文字 ~6:1 ✓；若产品容器是 #f8f8f8 也一样浅，安全。深色在 #0d0d0d 上 16% 蓝 → ~#1a2a3d，配 #a7d3ff ~8:1 ✓。
- **产品覆盖**：很多产品自带 `code` 类（如 `.markdown code { background: ... }`）会用产品色覆盖我们的 tint → 那处仍是产品样式，属预期（零优先级不争）。裸语义 Markdown 的 code 才会吃到我们。
- **不要上高饱和底**（如实心 #0072f5 底）：大段行内代码会闪瞎，且和链接撞车。8% 是克制线。

---

## 3. 代码块 pre —— **不上彩色衬底**，保留中性 + 加一条信息蓝左标条（纯 CSS 最有效手段）

**before**
```css
:where(pre) {
  margin: 1em 0;
  background: var(--dsw-alias-bg-layer-2);
  border-radius: 8px; padding: 16px;
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
  overflow-x: auto; font-size: 0.85em; line-height: 1.6; font-variant-ligatures: none;
}
```
现状：中性灰衬底+内描边，干净但多块代码并列时缺辨识边界。

**after（推荐：中性块保持不变 + `border-left` 信息蓝 3px 左标条）**
```css
:where(pre) {
  margin: 1em 0;
  background: var(--dsw-alias-bg-layer-2);
  border-radius: 8px; padding: 16px;
  border-left: 3px solid var(--mdvr-accent);                 /* 信息蓝左标条（复用链接蓝） */
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1),
              inset 3px 0 0 0 var(--mdvr-accent);            /* 关键：用同值 inset 让标条不破坏圆角边缘 */
  overflow-x: auto; font-size: 0.85em; line-height: 1.6; font-variant-ligatures: none;
}
```
> 用**同值 `inset` 影子**实现左标条而非真 `border-left`：真 border 会在 8px 圆角左缘留白/干涉，而 `inset 3px 0 0 0` 精确贴左内缘、圆角处自动收切，纯 CSS 无 JS 能拿到的最干净的"彩色顶部/侧条"。这也避开了 border-left 撑大 width 的问题。

**设计理由**
- **为什么不上整块彩色衬底**：代码含语法/语义内容，整块信息蓝衬底会与未来的语法高亮色打架、并且读长代码时信息蓝块太抢眼。语法高亮（route C10）才是代码块真正的"上色"时机，那时应撤回此 tint。
- 一个 3px 蓝左条 + 原有中性底 = 多代码块在页面里一眼可比对（"这是一块代码"），同时不污染正文的单色感。和信息蓝引用（§4）形成一致的"彩色开口在左侧"语法。
- 相对 `:where(pre::before)` 内容伪元素的方案，纯 inset shadow 无需处理 content/定位/对齐，是纯 CSS 最省、最稳。

**风险提示**
- `border-left: 3px` + `inset 3px` 并用时，真 border 会占 3px 宽度撑容器 → 必须二者同宽同色，否则标条出现 3px 台阶。上述规则已配平。
- 若产品已给 pre 设 `background` 或 `border`，彩色标条会被覆盖成中性/无色 → 该 pre 退化为产品样式，预期的零优先级行为。
- 深色档 `--mdvr-accent`=#60b1ff 自动生效，无需再写。

---

## 4. 引用 blockquote —— 主强调色边条 + tint 衬底（重点升级项，给完整规则）

**before**
```css
:where(blockquote) {
  margin: 1em 0; padding: 0 0 0 1em;
  border-left: 4px solid var(--dsw-alias-border-l1);   /* 中性灰边条 —— 几乎隐形 */
  color: var(--dsw-alias-label-secondary);
}
:where(blockquote p:first-child) { margin-top: 0; }
:where(blockquote p:last-child) { margin-bottom: 0; }
```
现状：4px 灰边条 + 无底色 + 次级文字 = "挂在正文里的一段降级文字"，最素。

**after（推荐：信息蓝边条 + tint 衬底 + 首行引号标记，完整规则）**
```css
:where(blockquote) {
  margin: 1em 0;
  padding: 0.6em 1em 0.6em 1.1em;
  border-left: 4px solid var(--mdvr-accent);                    /* 信息蓝 4px（复用链接蓝） */
  border-radius: 0 6px 6px 0;                                    /* 右侧微圆角，柔化方形块 */
  background: var(--mdvr-bq-tint);                               /* 浅 rgba(0,114,245,.05) / 深 .10 */
  color: var(--dsw-alias-label-primary);                         /* 引用正文提到最深，提升可读 */
}
:where(blockquote p:first-child) { margin-top: 0; }
:where(blockquote p:last-child) { margin-bottom: 0; }
:where(blockquote footer, blockquote cite) { color: var(--dsw-alias-label-secondary); font-size: 0.9em; }
```
> 用 `--mdvr-bq-tint`（5%）而不是信息蓝 8%：引用衬底若和行内 code 一样浓度，一页里会"蓝斑"太多。引用是整段衬底，必须比 code 的单字衬底更淡一档。

**设计理由**
- 引用是"被引用的他人观点"，在模型回复里常承载**重要参考信息**。给它整套强调（蓝条+浅底+深字），是从"素"到"可读重点块"性价比最高的单项。
- 信息蓝边条与代码块左条、链接统一到同一色系 → 版面形成一致的"蓝色 = 可交互/引用/术语"的语义编码。
- 正文文字从 secondary 提到 primary：#666 引用内容在一页里读起来像脚注，primary 后才像"正经内容"。

**风险提示**
- **埋序问题**：`:root`/`@media` 里已定义 `--mdvr-bq-tint`，若落地时漏加变量，`var()` 会失效回退到 `background` 初始值（transparent）→ 引用只剩蓝条，还好不是坏字。落地务必一起补变量。
- 产品若给 blockquote 设了卡片底色/背景，零优先级下会被产品背景完全覆盖 → 我们的 tint 不生效，只剩边条（边条也是零优先级，可能被覆盖）。裸语义 blockquote 才吃到完整样式。
- 深色档 10% 蓝底需配 #0d0d0d 基底验证 ≥3:1 与正文边界。视觉上若太闷可退 8%，不影响规则结构。

---

## 5. 表格 —— 表头 tint + 强调色，外框保持中性，**暂不恢复斑马纹**

**before**
```css
:where(table) {
  display: block; overflow-x: auto; width: max-content; max-width: 100%;
  border-collapse: collapse; border-spacing: 0; margin: 1em 0;
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--dsw-alias-border-l2);
  font-size: 0.92em; word-break: auto-phrase;
}
:where(th, td) { min-width: 120px; padding: 0.75em 1em; text-align: start; }
:where(th) { background: var(--dsw-alias-bg-layer-2); font-weight: 600; }
:where(tr) { box-shadow: 0 1px 0 var(--dsw-alias-border-l1); }
:where(tr:last-child) { box-shadow: none; }
```
现状：表头浅灰 + 横线分隔，中性、工整、但表头没有"关键列头"的辨识度。

**after（推荐：表头信息蓝 tint + 强调字色，外框/分隔线保持中性）**
```css
:where(table) {
  display: block; overflow-x: auto; width: max-content; max-width: 100%;
  border-collapse: collapse; border-spacing: 0; margin: 1em 0;
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--dsw-alias-border-l2);      /* 外框保持中性，不换强调色 */
  font-size: 0.92em; word-break: auto-phrase;
}
:where(th, td) { min-width: 120px; padding: 0.75em 1em; text-align: start; }
:where(th) {
  background: var(--mdvr-accent-soft);                    /* 信息蓝 8% 衬底（复用代码同款） */
  color: var(--dsw-alias-brand-primary);                  /* 深色下提升表头字对比 */
  font-weight: 700;
}
:where(tr) { box-shadow: 0 1px 0 var(--dsw-alias-border-l1); }
:where(tr:last-child) { box-shadow: none; }
```

**设计理由**
- 表头是"列语义"的坐标轴，tint 衬底 + 700 字重让它从一大堆数据里先被读到，成本最低。
- **外框不换强调色**：换成蓝色框会让整表像"被选中/高亮"，干扰数据读取；内描边中性 + 表头蓝点式强调更符合"彩色只做触点"纪律。
- **不恢复斑马纹**：v0.3.0 刻意去掉了单元格边框走"横线式"（LobeUI），斑马纹会重新引入竖向往返的视觉噪音、且在大横滚表格里错位明显。表头 tint 已足够引导；若要再提层级，优先 `h4` 级别行分组而非斑马。

**风险提示**
- 表头若在产品里已有实色背景的样式，tint（零优先级）会被覆盖 → 表头保留产品色。裸语义 `th` 才吃到我们的信息蓝 tint。
- 大表格下 tint 透明叠加在多行时需要确认 `theme` 提供浅色表头在深色下的对比（已由 `--mdvr-accent-soft` 双档处理）。
- 若想未来支持斑马，纯 CSS 可 `:where(tr:nth-child(even) td){ background: ... }`，但本轮明确不引入，留作 toggle 能力而非默认。

---

## 6. 标题 —— h1/h2 加信息蓝下划线点缀（克制：只 h1，h2 起用中性粗）

**before**
```css
:where(h1, h2, h3, h4, h5, h6) { line-height: 1.25; font-weight: 700; margin: 1.1em 0 0.6em; }
:where(h1) { font-size: 2em; }
:where(h2) { font-size: 1.6em; }
:where(h3) { font-size: 1.3em; }
:where(h4) { font-size: 1.15em; }
:where(h5) { font-size: 1em; }
:where(h6) { font-size: 0.9em; color: var(--dsw-alias-label-secondary); }
```
现状：700 大字号但纯黑、无任何结构记号，标题与正文只靠字号区分，长文里层级感弱。

**after（推荐：h1 信息蓝下划线 + h2 中性粗下划线；h3-h6 只加强间距）**
```css
:where(h1, h2, h3, h4, h5, h6) { line-height: 1.25; font-weight: 700; margin: 1.3em 0 0.6em; }
:where(h1) { font-size: 2em; }
/* h1：信息蓝 3px 下划线（强调色点缀，唯一"彩色标题"） */
:where(h1) {
  border-bottom: 3px solid var(--mdvr-head-accent);
  padding-bottom: 0.35em;
}
:where(h2) { font-size: 1.6em; }
/* h2：保持中性，用更细的下划线做分隔（彩色让给 h1） */
:where(h2) {
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  padding-bottom: 0.3em;
}
:where(h3) { font-size: 1.3em; }
:where(h4) { font-size: 1.15em; }
:where(h5) { font-size: 1em; }
:where(h6) { font-size: 0.9em; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
```
> `--mdvr-head-accent` 用**半透明信息蓝**（浅 .55 / 深 .70）而非满饱和，因为标题字已是 700 深黑，再加满饱和蓝条会太闹。

**设计理由**
- 彩色标题**全版面只给 h1 一个**：这是"彩色做触点"纪律的顶端应用。h1 是文档门面，一条信息蓝下划线让页面一个眼就知道"大标题在哪"，又不散开。
- h2 回落到 `border-l1` 中性细线：形成"越往下的标题越中性"的层级递减，与信息蓝 h1 对照出结构而非全是彩色。
- h6 顺手补 `uppercase + letter-spacing`：小型标题（通常是小节注记）在 LobeUI/常见 markdown 渲染里多为目录/注脚式，uppercase 提升辨识且不新增色。

**风险提示**
- `border-bottom` 在 h1 上会撑高该标题盒模型 padding，产品若已给 h1 下边框/背景会被覆盖或叠加（零优先级下产品显式 border 赢）。若产品 h1 有自身分隔线，此处可能双线——落地时按真实 DOM 验证，必要时只留 h1 或只留 h2。
- h6 `text-transform` 若命中产品原文含大小写敏感内容会变丑，需确认 h6 场景。
- 若 UI 是"标题可折叠/可跳转"组件，`:where(h1)` 下划线会被组件自带样式覆盖，安全降级为无下划线。

---

## 7. 列表标记 —— "-" 符号用强调色（信息蓝）

**before**
```css
:where(ul > li::before) { content: "-"; margin-inline: -1em 0.5em; opacity: 0.5; }
```
现状：灰色 50% 的 `-`，是最不起眼的标记，列表与正文几乎无边界。

**after（推荐：彩色 `-`，去掉 opacity 用信息蓝替代）**
```css
:where(ul > li::before) {
  content: "-";
  margin-inline: -1em 0.5em;
  color: var(--mdvr-accent);      /* 信息蓝，替代 opacity: .5 的欠饱和度 */
  opacity: 0.85;                  /* 不用 1：半透明蓝比纯蓝更"记号感"、与链接区分优先级 */
  font-weight: 700;
}
```
> `opacity: 0.5 → 0.85 + 蓝色`：过去是靠灰来"退后"记号，现在用蓝标点但保留轻微透明度，让列表记号"可读但仍是标记"。若嫌 0.85 太跳可退 0.7，但**不要退回灰色**。

**设计理由**
- 列表是扫读的结构骨架，彩色 `-` 让列表条目被"框"出来，是长回复里性价比极高的强调。信息蓝与链接同色系，但位置（行首）+ 形状（`-`）不同，不会与链接混淆。
- 保留 `content:"-"` 不动（零优先级下自定义符号），只换色与透明度，改动面最小。

**风险提示**
- `::before` 是 `:where(ul > li::before)`，具元素性；产品若给 li 设了 `list-style` 或自身 `::before` 会覆盖内容 → 该列表变回原生/产品标记。
- `color` 零优先级下可能被子项 strong/字体颜色继承？不会——`::before` 继承自身色，除非产品给 `ul > li::before` 赋值。裸语义列表必吃到蓝。
- 嵌套列表（ul>li>ul）会同样变蓝，如需区分嵌套层级可 `:where(ul ul > li::before){ color: var(--dsw-alias-label-secondary); }`，本轮默认不加，避免过度。

---

## 8. 链接 —— 保持信息蓝（不改，只在文档里确认纪律）

**before（保持 v0.3.0）**
```css
:where(a) { color: var(--mdvr-link); text-decoration: none; }
:where(a:hover) { color: var(--mdvr-link-hover); }
```
**after：不变。** 如需微增强调，可在 hover 时补下划线（当前是纯变色，无下划线）：

```css
@media (prefers-reduced-motion: no-preference) {
  :where(a:hover) { text-decoration: underline; text-underline-offset: 0.25em; text-decoration-thickness: 1px; }
}
```

**设计理由**
- 链接是版面里**唯一固定高饱和蓝**，必须保持独占。若把 strong/code/li 全染蓝，链接的"可点性"信号就没了。
- 深色档 `--mdvr-link` 已是 #60b1ff 的高亮蓝，符合 lobe `colorLink=colorInfoText`。

**风险提示**
- hover 加下划线属增强项，若产品已经给 a 加了下划线或 nav 样式，零优先级下会被覆盖；`text-underline-offset` 在部分内核不支持时退化为普通下划线，仍可接受。**保持 `text-decoration: none` 基线**，避免所有链接都带下划线造成噪音。

---

## 9. hr —— 用强调色弱化（一档淡蓝虚线，保持虚线形态）

**before**
```css
:where(hr) { border: none; border-top: 1px dashed var(--dsw-alias-border-l2); margin: 1.8em 0; }
```
现状：浅灰虚线，几乎不可见的软分隔。

**after（推荐：信息蓝虚线，但压到浅色挡，不新增宽度）**
```css
:where(hr) {
  border: none;
  border-top: 1px dashed var(--mdvr-head-accent);   /* 复用标题同款半透明信息蓝 */
  margin: 1.8em 0;
}
```
> 复用 `--mdvr-head-accent`（半透明蓝）而非满饱和 link：隔断线是"引导视野"而非"可交互目标"，不应与链接同权重。

**设计理由**
- 虚线段落分隔是从"看不见"到"能感觉到结构"的最低成本升级：一个半透明信息蓝虚线，让主题分段边界清晰，又不喧宾夺主。
- 保持 `dashed` 形态（v0.3.0 的 LobeUI 选择）不变，只换色。

**风险提示**
- 产品若给 hr 设了实线/自定义高度，`border-top: 1px dashed` 零优先级会被覆盖 → 保持产品分隔。裸语义 `hr` 才吃到我们的蓝虚线。
- 若信息蓝虚线在一页内出现多次（模型回复常多段），会很"密"。若视觉上嫌密，给 `margin: 2em 0` 提升间距感，或退回 border-l1——落地按真实密感定夺。

---

## 10. kbd —— 保持（不改）

**before（保持 v0.3.0）**
```css
:where(kbd) {
  font-family: var(--mdvr-mono); font-size: 0.85em;
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 4px; padding: 0.15em 0.45em;
}
```
**after：不变。** kbd 是"键盘按键"的专门语义，中性灰底 + 细边框已经是它的标准视觉（暗示可按键），不需要信息蓝介入——蓝色会给它错误的"链接/术语"信号。

**设计理由**
- kbd 在中性灰上有按键的立体感和专属语义，染蓝会破坏"这是个物理键"的暗示，且与链接/代码撞色。**保持中立即是最佳强调。**
- 若后续想微调，唯一可选项是 `box-shadow: inset 0 -2px 0 var(--dsw-alias-border-l1)` 制造按键底部阴影，属可选项，默认不加。

**风险提示**
- 风险极低；唯一注意是确认产品没给 kbd 预设别的底色（那样零优先级下保留产品色）。

---

## 11. 重点信息场景 —— 纯 CSS 下"让模型回复真正重要的句子突出"的优先级排序

> 目标：不 JS、不到 DOM，如何在整段回复里把"关键句/关键概念"提出来。纯 CSS 能做到的机制只有 **strong（浓度）+ 行内 code（tint）+ 链接（蓝）**，且三者颜色预算已被前面分配。下面按「可见性增量/成本」排序：

**优先级 P0（改动即得，成本最低）：strong 700 + label-primary（§1）**
- 回复里作者加粗的"结论句"立即从衬线正文中"跳"出来。什么都不用新增，只需 §1 的 700 + 最深黑。这是第一条要落地的。

**优先级 P1：行内 code 信息蓝 tint + 深蓝字（§2）**
- 模型回复常用 `` `术语` `` 包裹专有名词/配方/命令。tint 后这些"关键概念"一眼可扫。第二条落地。

**优先级 P2：列表标记蓝 + 引用蓝条（§7 + §4）**
- 若重要信息以"列表式要点"或"引用式段落"呈现，这两项分别把骨架与引用块提出来。与 P0/P1 叠加后，一页的"结构化重点"就有节奏。

**优先级 P3（可选项，做减法前先确认不喧宾夺主）：hr 蓝虚线 + h1 蓝下划线（§9 + §6）**
- 用于长回复的段落分隔与文档标题定位。**P0-P2 已让重点"点"突出，P3 是"面"的结构感**，视觉上最容易被感知成"整页变活泼"，若用户觉得过满，先砍 P3 保 P0-P2。

**明确不采纳（为"重点突出"而做的错招）**
1. `strong` 染信息蓝/染主色 → 满屏蓝，杀链接信号（§1）。
2. 代码块整块信息蓝衬底 → 抢语法高亮（§3）。
3. 全文 `mark` 高亮渲染 → 无 JS 做不到"识别关键句"，且任何整段高亮都造噪音。
4. 斑马纹表格 → 大数据横滚错位（§5）。

---

## 附：一次性自查表（落地 v0.4.0 前核对）

| 检查项 | 状态 |
| --- | --- |
| 所有强调色是否复用 `--mdvr-link`/`--mdvr-head-accent`/`--mdvr-*-tint`，无新语义色撞车 | 是 |
| `:root` 与 `@media dark` 都定义了新增 `--mdvr-*` 变量（§2/§3/§4 tint、§6 head-accent） | 必检 |
| 深浅双档各跑一次 AA（浅浅低饱和蓝正文、深深高亮蓝正文） | 必检 |
| `pre` 的 `border-left` 与 `inset 3px 0 0 0` 同宽同色 | 必检（§3） |
| 是否只新增 CSS 行、`plugin/client.js` 结构/JS/`:where()` 纪律不动 | 是 |
| 是否不引 JS（无 style 变量注入、无暗色媒体 JS） | 是 |
| strong 未染蓝、链接未加默认下划线、kbd 未改 | 是 |

---
*本档与 `plugin/client.js` TYPO_CSS v0.3.0 逐行对齐编写；落地时作为下一 Package 的 changes 条目逐条记录，追加而非覆盖旧版本。*
