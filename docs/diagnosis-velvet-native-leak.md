# 诊断报告：Velvet-Strawberry-Mocha-v2 主题对原生界面排版的影响

> **性质**：只读诊断。本报告**未修改**任何主题 / 插件 / 产品文件，仅新增本报告文件。
> **对象**：用户主题 `~/.dsh/web-themes/Velvet-Strawberry-Mocha-v2.css`（810 行）+ 共享骨架 `plugin/assets/typography.css` + 面板样式 `plugin/assets/panel.css`
> **主诉**：插件/主题会往原生（产品）项目里"多一些符号"、影响原生排版。
> **产出方式**：3 个 subagent 分工诊断 + 1 个复核 subagent 独立逐条核对（A~J 全量 + 6 条遗漏补充）。
> **日期**：2026-08-22

---

## 0. 结论摘要（TL;DR）

1. **机制根因**：插件把「排版骨架 + 主题 CSS + 面板 CSS」拼接成一段字符串，经 `styles.insert()` **全局**挂进页面 `<head>`，**没有任何 markdown 内容容器作用域**（`client.core.js` `applySelection`，L251-268）。
2. **自保承诺被绕过**：项目设计文档（`docs/themes.md`）承诺 `:where()` 零优先级 = "产品显式样式永远优先，只兜底裸语义元素"。但 Velvet 主题大面积使用 `!important`（**242 次 `!important` 声明，归并为 62 条带 `!important` 的规则块**）——`!important` 把声明优先级提到最高，无论选择器是不是 `:where()`，都能**盖过产品的普通样式**。这是污染原生排版的直接机制。
3. **"多一些符号"的直接来源**（按严重度）：
   - 🔴 骨架 `typography.css:21` 给**整站每个 `<ul><li>`** 前面注入一个「-」破折号；
   - 🔴 主题把**全站所有 checkbox** 重绘成 15px 草莓粉方块 + 白色对勾（`appearance:none !important`）；
   - 🔴 主题对 **KaTeX / MathJax** 相关类全站子树 `!important` 强制；
   - 🟠 主题用伪元素给整站无序列表画圆点 / 圆环 / 菱形，并与 `::marker` 着色叠加竞争；
4. **排版被强制改排**：整站 `h1~h6 / p / ul / ol / li / table / th / td / pre / code / strong / em / sup / sub / ::selection / scrollbar / focus 环` 都被覆盖（多数带 `!important`）。
5. **产品类名"半真实半猜测"**：`md-code-block` 在 DSH 产物中是**真实产品类名**（会真正命中产品代码块 DOM）；但 `.dsw-code-block` / `.markdown-body` / `.markdown-it-code-block` / `.code-copy-btn` 在产品中**无定义**（属作者臆测）。另有裸 `pre`、`body > pre` 兜底继续泄漏。

**一句话**：问题不在"主题好不好看"，而在**注入无作用域 + `!important` 绕过零优先级**这两个架构缺陷；符号越界是它最直观的表现。

---

## 1. 注入机制（根因链）

```
applySelection(ctx, id)                        ← client.core.js L251
  css = typographyCss + '\n' + 主题css + '\n' + panelCss    ← L257/260
  styles.insert(css)                           ← L263，全局挂载 <head>，无作用域
```

- 选择器全部是**裸元素 / 裸类**（`ul`、`li`、`p`、`table`、`input[type=checkbox]`、`pre`…），**没有限定到 markdown 渲染容器**。
- 产品样式与插件样式同在 `<head>`，同优先级下靠注入顺序后者胜出；但**产品显式样式是普通优先级，主题里 `!important` 直接压过**。
- `:where()` 只把选择器特异性归零，**不降低 `!important` 的权重**——两者正交。文档只承诺了前者，实际被后者击穿。

---

## 2. 符号注入审计（"多一些符号"）

### 2.1 全站无序列表前插「-」破折号 —— 🔴 高
- `typography.css:21`：`:where(ul > li::before) { content: "-"; margin-inline: -1em 0.5em; color: var(--mdvr-accent); opacity: 0.85; }`
- **注入符号**：字符 `-`（伪元素文本注入），带 accent 色 + 0.85 透明度。
- **全局越界**：是。配合 `typography.css:20 :where(ul){ list-style-type:none }` 把原生圆点也去掉——原生产品里凡是 `<ul><li>` 渲染的菜单、设置分组、下拉列表、通知列表，每项前面都会多出一个「-」。**这是用户主诉「多一些符号」的头号来源。**

### 2.2 全站 checkbox 重绘 + 白色对勾 —— 🔴 高
- 主题 `L694-709` `:where(input[type="checkbox"]){ appearance:none !important; -webkit-appearance:none !important; width:15px !important; ... }`；`L719-723 :checked` 草莓粉底；`L726-733 :checked::after` 用两个白色 border 画对勾（`rotate(-45deg)`）。
- **全局越界**：是，`input[type="checkbox"]` 无容器限定。原生产品所有 checkbox（设置开关 / 筛选勾选 / 表格选择列）被强制重绘；`appearance:none !important` 剥夺原生控件外观；对勾纯白，浅底时不可见。

### 2.3 全站无序列表伪元素图形（三阶）—— 🟠 中–高
- 主题 `L568 / 581 / 595`：`:where(ul:not(.contains-task-list) > li)::before { content:""; ... }` 分别画 **6px 草莓粉实心圆点（微光）/ 5px 丁香紫空心圆环 / 5px 抹茶绿菱形**，`position:absolute; left:-1.1em`。
- **全局越界**：是。原生无序列菜单每项前被强塞彩色几何图形，可能覆盖原生标记 / 图标 / 叠字。

### 2.4 全站 ::marker 着色 —— 🟠 中
- 主题 `L638-676` 六条 `:where(ul/ol > li…)::marker { color: … !important }`（无序 3 级 + 有序 3 级，有序还 mono + 700）。
- 不新增字形，但强制改色改字体；与 2.3 的 `list-style:none` + 伪元素圆点打架，越界元素上出现「假圆点 + 假 marker」混杂。

### 2.5 审计通过项
- `panel.css`：全部选择器以 `.mdvr-*` 自包含前缀限定（含 `:focus-visible` 也只挂 `.mdvr-*` 元素），**无符号注入、无越界**。

| # | 规则位置 | 注入符号 | 全局越界 | 严重度 | 波及的原生元素 |
|---|---------|---------|---------|--------|---------------|
| 1 | typography.css:21 | 「-」破折号（文本） | ✅ | 🔴 高 | 全站所有 `<ul>` 菜单/列表每项 |
| 2 | 主题 L694-733 | 白色对勾（border 图形） | ✅ | 🔴 高 | 原生 checkbox 开关/筛选/选择列 |
| 3 | 主题 L568/581/595 | 实心圆/空心环/菱形 | ✅ | 🟠 中–高 | 原生无序列菜单标记位 |
| 4 | 主题 L638–676 | 无新字形，强制改色/字体 | ✅ | 🟠 中 | 原生有序/无序列表序号外观 |

---

## 3. 优先级越界审计（!important 规则清单）

### 3.1 统计（精确口径，复核确认）
- **`!important` 声明总出现次数 = 242**（全部为真实 CSS，0 处在注释里）。
- **含 `!important` 的规则块 = 62 条**。⚠️ 注意：242 是"声明行/出现次数"，62 是"规则条数"——一条规则 `{...}` 内可含多个 `!important`（如 h1-h6 一条规则内就有 4 个）。**不要混淆二者。**
- 主题总规则约 82 条 `:where(...)` —— 即一半以上元素规则都带 `!important`，零优先级设计形同虚设。

### 3.2 逐组清单（全部全局；标注每条是否带 `!important`）

| 选择器（行号） | 强制内容 | 带!imp | 波及原生元素 | 严重度 |
|---|---|---|---|---|
| `:where(h1..h6)`（L165-181 + L198-204 强版） | margin 1.7em/0.55em、line-height、weight `!important`；h1~h6 各自配色（--mdvr-h1..h6）+ h1 下边框 | ✅ | 整站所有标题，颜色/间距全改 | 🔴 高 |
| `:where(h1..h6) + :where(p,ul,ol,blockquote,div)`（L207-209） | `margin-top:0.2em !important`（相邻兄弟组合） | ✅ | 标题后的任意块级元素间距被锁死 | 🟠 中–高 |
| `:where(p)`（L184 弱版 + L212-217 强版） | `margin:0.45em 0 !important; line-height:1.6 !important` | ✅ | 整站所有段落 | 🟠 中 |
| `:where(strong,b)`（L220-224） | 强制颜色 --mdvr-strong + 700 | ✅ | 原生按钮/标签里的 strong/b 变色 | 🟠 中 |
| `:where(em,i)`（L225-229）/ `strong em`（L230-235） | 强制颜色 + italic + padding | ✅ | 原生斜体文本变色 | 🟠 中 |
| `:where(del,s)`（L236-240） | 强制删除线颜色 --mdvr-accent | ✅ | 原生删除线文本 | 🟠 中 |
| `:where(sup,sub)`（L244-255） | `font-family:var(--mdvr-mono) !important; font-weight:700 !important; line-height:0 !important` | ✅ | **原生所有上/下标**（脚注标记、徽标数字）变等宽粗体，`line-height:0` 可能破行 | 🔴 高 |
| `:where(var)`（L257-263） | math 字体 + `color:... !important` | ✅ | 原生 `<var>` | 🟠 中 |
| `.katex/.MathJax/.math-inline/span.math`（L265-295） | `display:flex !important` 居中、背景/边框/内边距/外边距全 `!important`；`L291-295` 对**所有子树**强制透明化 | ✅ | 产品任意公式渲染（KaTeX/MathJax，含 `mjx-container[display="true"]`）被整块重排压扁 | 🔴 高 |
| `.token.*/.hljs-*`（L422-444） | 语法高亮 token 全站 `!important` 换色 | ✅ | 产品任意用这些类名的代码高亮被强制换色 | 🟠 中–高 |
| `.dsw-code-block/.md-code-block/...`（L302-380） | 头部压扁 28px、复制按钮 18px 等 `!important` | ✅ | 产品代码块头部/按钮（`md-code-block` 是**真实类名**会命中；`.dsw-code-block` 等臆测） | 🟠 中–高 |
| `:where(pre)`（L383-396）与 `pre code`（L408-417） | 背景透明、padding 8px 12px、`white-space:pre !important` | ✅ | **整站所有 pre**（含非 markdown 场景） | 🔴 高 |
| `:where(body > pre, .markdown-body > pre)`（L399-406） | 兜底重排 | ✅ | 整站 body 直属 pre | 🟠 中 |
| `:where(code:not(pre code), samp)`（L448-471） | **硬编码** `background:#14121E !important; color:#F472B6 !important`（不随浅/深档变量） | ✅ | 整站所有行内代码 chip | 🔴 高 |
| `:where(kbd)`（L473-490） | mono + 胶囊样式 | ✅ | 原生 kbd | 🟢 低 |
| `:where(table)`（L496-507）/ `th,td`（509-514）/ `th`（516-522）/ `tr`（524-530） | 卡片化表格：`display:table !important; width:100% !important; border-radius` 等 | ✅ | **整站所有 table**（含非 markdown 的 UI 表格） | 🔴 高 |
| `:where(ul, ol)`（L537 与 L613 两处，值冲突）+ `li`（543,619）+ `li>ul/ol`（554,629） | `padding-left:1.4em / 2.0em !important`（后写 2.0em 覆盖）、margin 强制 | ✅ | 整站所有列表缩进/间距 | 🔴 高 |
| `ul:not(.contains-task-list)`（L562-565） | `list-style:none !important; padding-left:1.2em !important` | ✅ | 原生无序列（非任务列表）圆点全没 | 🟠 中 |
| `ul/ol > li::marker`（L638-676） | 强制改色/字体 | ✅ | 原生列表序号外观 | 🟠 中 |
| `li.task-list-item`（L682-686）/ `ul.contains-task-list`（L689-691） | `display:flex !important`、padding 补偿 | ✅ | 原生含 checkbox 的列表项 | 🟠 中 |
| `input[type=checkbox]`（L694-733） | 15px 方块重绘 + 白对勾（见 2.2） | ✅ | **整站所有 checkbox** | 🔴 高 |
| `li:has(input[type=checkbox]:checked)`（L736-739） | 强制降级色 | ✅ | 原生已勾选列表项 | 🟢 低 |
| `::selection`（L792-795） | 全站选区改紫底粉字 | ✅（且是**裸全局伪元素，连 `:where()` 都没包**，越界更强） | 整站文本选区 | 🟠 中 |
| `::-webkit-scrollbar`（L797-804） | 滚动条改 6px + accent 色 thumb | ❌（无 !important，但滚动条极少被产品显式设置，生效面大） | **整站所有滚动条**（消息流/侧栏/表格） | 🟠 中–高 |
| `a:focus-visible, input:focus-visible`（L807-810） | 焦点环改草莓粉 outline | ❌（**无 !important**，仅 `:where()` 全局） | 整站焦点环（产品显式样式可压回） | 🟠 中 |
| `:where(a)`（L769-778）/ `:where(hr)`（L763-768）/ `:where(blockquote)`（L746-760）/ `:where(img)`（L781-785） | 链接下划线、渐变分割线、引用卡、图片圆角阴影 | ❌（非 !important，产品可压回；但仍全站生效） | 原生 a/hr/blockquote/img | 🟢 中 |
| `body { --dsw-alias-* }`（13 token）与 `--mdvr-*` 变量 | 全局 token 换色 | — | **产品 token 契约内，正常、不算越界** | ✅ 设计内 |

> **冗余/自相矛盾**（复核补充 5）：h1-h6 同时存在「弱版 L165」与「强版 L198」、p 存在「弱版 L184」与「强版 L212」两份全局定义——弱版被强版完全覆盖，属死代码，且掩盖了"这不是零优先级"的真面目。

---

## 4. 作用域与架构缺陷

1. **无 markdown 容器作用域**：骨架与主题的元素规则全是裸选择器，注入又全局——"只在对话 Markdown 里生效"在 CSS 层面**没有任何锚点**。
2. **产品类名"半真实半猜测"**（复核修正）：
   - `md-code-block` **是真实产品类名**，会命中产品代码块 DOM（出处：`@deepseek-ai/dsh-client-ui-primitives/lib/index.js:4952` `className: clsx(CodeBlock_module_css_default.block, "md-code-block", className)`，以及 `@deepseek-ai/dsh-web-frontend` 的 CSS/JS bundle）。因此 L359 那条把代码块内 `button` 强压到 18px 高的规则**会真实作用于产品**。
   - `.dsw-code-block` / `.markdown-body` / `.markdown-it-code-block` / `.code-copy-btn` 在 DSH 产物中**无定义**，属作者臆测（猜中则耦合产品内部类名，产品改版即碎；猜不中则由裸 `pre`、`body > pre` 兜底继续泄漏）。
   - ⚠️ 本工作区（`dsh-markdown-xyy`）只有插件源码、没有产品 DOM，这就是"在本工作区无法验证类名"的原因——真实产品类名只存在于 DSH 安装包里。
3. **同元素重复且矛盾规则**：`:where(ul, ol)` 两次（L537 1.4em vs L613 2.0em）、`:where(p)` 两次（L184 vs L212）——主题是逐版堆叠迭代出来的，维护性与可预测性差。
4. **硬编码色值**：行内代码 `background:#14121E !important; color:#F472B6 !important` 是字面量而非 `var(--dsw-alias-*)`，浅色档下也强制深底粉字。
5. **文档盲区**（复核确认）：`docs/themes.md`（L20-22）承诺「`:where()` 零优先级 → 产品显式样式永远优先」，且全文 grep 确认 **`!important` 一词从未在文档中出现、无任何风险披露**——与主题实际 242 次 `!important`（62 条规则强制覆盖产品样式）直接矛盾。内置主题（lobeui-emphasis / inkpaper / qingci）守规矩，用户主题失控且无门禁拦截。

---

## 5. 严重度汇总与优先级

| 优先级 | 问题 | 理由 |
|---|---|---|
| P0 | 全站 checkbox 重绘（`appearance:none !important` + 白对勾） | 交互控件被劫持、无障碍/原生外观丢失、浅底白勾不可见 |
| P0 | 骨架 `ul>li::before{content:"-"}` 全站破折号 | 最直接可见的"多出符号" |
| P0 | KaTeX/MathJax 相关类全站子树 `!important` 强制（L265-295） | 公式块被整块重排压扁，且对内部所有元素强制透明化 |
| P1 | `h1~h6 / p / ul / ol / li / table / pre` 全站 `!important` 改排 | 整站版式被重排，不只对话区 |
| P1 | `sup/sub` 等宽粗体 + `line-height:0` | 原生角标/脚注可破行 |
| P1 | 行内代码硬编码深底 | 浅色档下观感突兀且全局 |
| P2 | `::selection` / scrollbar / focus 环 / img 全站改观 | 观感统一性被破坏（scrollbar/focus 无 !important） |
| P2 | 伪元素圆点与 `::marker` 叠加竞争 | 原生列表标记混杂 |
| — | `panel.css` | ✅ 无越界 |

---

## 6. 整改建议（仅建议，本报告未实施任何修改）

### 高优先级
1. **作用域锚点化**：把骨架与主题的元素规则统一收敛到一个 markdown 渲染根容器下（需在运行中的产品页面用 DevTools 确认**真实**容器类名/属性，而不是猜）。这是根治"全局泄漏"的唯一正解。
2. **移除 / 收敛 `!important`**：元素级定制一律去掉 `!important`，改用「作用域 + 注入顺序」取胜；确需强制的也要限定在容器内（尤其 KaTeX/MathJax 子树强制、checkbox 重绘、`:where(h1..h6)+...` 相邻兄弟 four 大高危）。
3. **删除全局破折号**：骨架 `typography.css:21` 的 `ul>li::before{content:"-"}` 移除或限定到容器；列表符号由主题在容器内用 `::marker`/`::before` 提供。

### 中优先级
4. **checkbox 限定到任务列表**：`input[type=checkbox]` 加下文（`li.task-list-item input[type=checkbox]` 或容器前缀），不再全站重绘。
5. **主题与内置主题对齐**：以 `plugin/assets/template.css` / `example.css` 的三段式为准，元素定制段只用 `:where()` 不加 `!important`；同元素不重复堆叠。
6. **用到真实类名、去掉臆测类名**：`md-code-block` 是真实类名**可直接用作作用域锚点之一**（出处已确认）；`.dsw-code-block` / `.markdown-body` / `.markdown-it-code-block` / `.code-copy-btn` 无定义应移除或替换为实测容器；硬编码色值改用 `--mdvr-*` 变量。

### 低优先级
7. **文档与门禁**：`docs/themes.md` 把 `!important` 列为红线；保存校验（`validateCss`）加"检测元素级 `!important`"警告。

> 以上建议**均未写入**任何主题/插件文件。如需要，可另行安排一次"整改实施"任务。

---

## 7. 附：审计方式、参与方与复核记录

### 参与方
- **subagent 1 — 符号注入审计**：完整交付（2.1~2.4 四类符号注入 + panel.css 通过）。
- **subagent 2 — 优先级越界审计**：产出统计（242 次 `!important`）后中断，统计口径由复核修正。
- **subagent 3 — 作用域隔离分析**：因本工作区无产品源码而受阻（这正是产品类名难验证的原因）。
- **subagent 4 — 复核**：对结论 A~J 全量核对 + 新增 6 条遗漏补充（本文已并入）。

### 复核修正记录
- **C**：「约 240 条带 `!important` 的规则」→ 修正为 **62 条规则块**（242 是 `!important` 声明出现次数）。
- **E**：`a:focus-visible / input:focus-visible`（L807-810）**无 `!important`**（仅 `:where()` 全局）；`::selection`（L792-795）是**裸全局伪元素、无 `:where()` 包裹**（越界更强）。
- **I**：`md-code-block` 在 DSH 产物中是**真实产品类名**（非全部"猜测"）；仅 `.dsw-code-block` / `.markdown-body` / `.markdown-it-code-block` / `.code-copy-btn` 无定义。
- **补充并入**：滚动条全站重绘（L797-804）、KaTeX/MathJax 子树强制（L265-295）、代码高亮 token 类强制（L422-444）、标题相邻兄弟 margin 强制（L207-209）、标题/段落双份定义（L165/184 vs L198/212）、a/img/hr/blockquote/kbd/var/samp 全局重设。

全部操作**只读**：未创建、修改、删除任何主题、插件或产品文件；仅新增本报告。
