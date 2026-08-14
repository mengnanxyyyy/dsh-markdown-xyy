# v0.4.0 合成方案 —— Markdown 重点信息强调色系统

> 由 4 人 subagent 团队并行研究合成（全部落盘）：
> - `docs/readability-competitor.md` — 竞品研究（LobeUI/ChatGPT/Claude/Gemini + GitHub GFM）
> - `docs/readability-palette.md` — 强调色彩系统设计（靛蓝 accent + 琥珀 highlight）
> - `docs/readability-elements.md` — 元素级强调排版规范（before→after CSS）
> - `docs/readability-a11y.md` — 语义层级 + WCAG 对比度实测 + 色盲仿真

## 一、核心决策

1. **主强调色 = 靛蓝**（浅 `#5856d6` / 深 `#a8a5f5`）：与链接蓝 `#005ae0` 错开色相、与 success 绿 / warn 金完全分离；低饱和沉稳。竞品验证：五家产品都不给正文上色，语义色只落在结构块。
2. **克制原则**（竞品共识）：底用 tint、形状用边条、只有重点词才用 highlight（琥珀）；strong/标题文字/段落/列表文字保持中性——唯一视觉高亮点落在真正要强调的对象上。
3. **对比度实测修正**（`docs/readability-a11y.md` 逐对实测）：
   - 链接浅档 `#0072f5`(4.44:1 不达标) → `#005ae0`(5.93:1，即 geekblue step10，符合 LobeUI「文字用深一档变体」)
   - 浅档语义色 step9 全不达正文 AA → 加深：error `#c74330`、success `#287b38`、warn `#985d00`（深档不变）
   - tint 上正文用 `#1d4ed8`(5.72:1) 或深正文；强调色最稳用法是 4px 边条（全部 >3:1）
4. **色盲安全**：状态语义色不可只靠颜色区分（Protanopia 下绿/红不可分）——强调色选靛蓝/天青避开红绿冲突带，任何状态标记保留非颜色线索（边条/字重/图标）。
5. **为非颜色线索兜底**（WCAG 1.4.1）：每条强调元素都绑定至少一种非颜色手段（边框/字重/符号/下划线）。

## 二、`--mdvr-*` 强调变量清单（浅 / 深）

| 变量 | 浅 | 深 | 用途 |
| --- | --- | --- | --- |
| --mdvr-accent | #5856d6 | #a8a5f5 | 边条/代码块左标条/列表符号 |
| --mdvr-accent-text | #1d4ed8 | #7dd3fc | tint 面上的强调文字（AA 实测） |
| --mdvr-accent-soft | #ebebfa | #23222d | 行内代码/引用衬底 |
| --mdvr-accent-faint | #b4b3ed | #535175 | h1 下划线（45% 预混） |
| --mdvr-accent-fainter | #cdccf3 | #3c3b53 | hr 分割线（30% 预混） |
| --mdvr-highlight | #b3541e | #ffb45e | 关键词/高亮（琥珀，与 warn 区分） |
| --mdvr-highlight-soft | #fdf0dc | #3a2f1e | mark 高亮底 |
| --mdvr-code-border | #d5d2f4 | #3a3750 | 行内代码描边（靛蓝 tint） |
| --mdvr-table-head-bg | #edecfb | #23222d | 表头底 |
| --mdvr-table-head-text | #3b3aa8 | #c6c3ff | 表头字（≥5.9:1） |
| --mdvr-quote-bg | #f2f1fc | #1d1c26 | 引用衬底 |
| --mdvr-quote-border | #5856d6 | #8f8bf2 | 引用边条 |
| --mdvr-link | #005ae0 | #60b1ff | 链接（AA 修正） |
| --mdvr-link-hover | #0072f5 | #a7d3ff | 链接 hover |

深色档统一在 `@media (prefers-color-scheme: dark)` 覆盖；全部为插件自有变量，不进 13-token 名单。

## 三、元素级改动（before → after 要点）

| 元素 | v0.3.0 | v0.4.0 |
| --- | --- | --- |
| strong | 600 中性 | **700 + label-primary**（浓度强调，不上色） |
| 行内 code | 灰胶囊（layer-2 + 灰边） | **靛蓝 tint 底 + 靛蓝描边 + 深蓝字 #1d4ed8** |
| 代码块 pre | 中性底 + 灰 inset ring | **保持中性底 + inset 3px 靛蓝左标条**（为语法高亮留白） |
| 引用 blockquote | 4px 灰边条 + 无底 + 次级字 | **4px 靛蓝边条 + 靛蓝 tint 底 + 正文提到 primary** |
| 表格头 | layer-2 灰底 + 600 | **靛蓝 tint 底 + 靛蓝字 + 700**（外框/无斑马纹不变） |
| h1 | 无下划线（LobeUI 极简） | **45% 靛蓝下划线**（唯一彩色标题元素） |
| 列表符号 | 中性 "-" opacity .5 | **靛蓝 "-" opacity .85** |
| hr | 灰虚线 | **30% 靛蓝虚线** |
| 链接 | #0072f5/#60b1ff | **#005ae0/#60b1ff**（AA） |
| mark | 无 | **琥珀 tint 底**（highlight-soft） |
| kbd | 中性 | 保持中性（避免"键/链接"误信号） |

## 四、13-token 变化（仅浅档语义色加深，WCAG 实测）

| token | v0.3.0 | v0.4.0 |
| --- | --- | --- |
| state-error-primary 浅 | #ec5e41 | **#c74330** |
| state-success-primary 浅 | #379d4a | **#287b38** |
| state-warn-primary 浅 | #ee9e0b | **#985d00** |

其余 10 个 token 不变（保持 LobeUI 原生中性）。

## 五、明确不做（竞品/团队共识）

1. 正文（strong/标题文字/段落/列表文字）不上语义色——满屏彩会杀链接与结构信号
2. 代码块不上彩色衬底（留给未来语法高亮）
3. 表格不恢复斑马纹
4. 不引入 gfm alert 五色块（产品未渲染该结构；若未来需要，直接复用 state-* + --mdvr-link，零新增 token）
5. kbd 不上色

## 六、落地文件

- `plugin/client.js` — TOKENS（语义色修正）+ --mdvr-* 变量 + TYPO_CSS 元素规则
- `plugin/host.js` — MANIFEST v0.4.0
- `manifest/versions.json` — 台账新增条目
