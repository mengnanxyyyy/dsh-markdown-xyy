# v0.2.0 合成方案 —— 对标 LobeUI 的设计细节改动

> 由 4 个并行研究 subagent 的竞品报告合成（均为 lobe-ui master 源码取证）：
> - `docs/lobeui-compare.md` — 代码块 / Markdown 组件细节
> - `docs/lobeui-typography-competitive.md` — 字体与排版体系
> - `docs/lobeui-theme-comparison.md` — 色彩体系与 13-token 逐项对比
> - 设计语言报告（圆角/阴影/间距/交互，来源 DESIGN.md + token/base.ts + customStylish.ts）

## 一、Token 层改动（13 个，保留暖纸身份，修结构）

| token | v0.1.0 light / dark | v0.2.0 light / dark | 理由 |
| --- | --- | --- | --- |
| bg-base | #faf7f1 / #191715 | **#faf6ef / #14120f** | 深色近黑（lobe dark bgLayout≈#000） |
| bg-layer-1 | #f3eee4 / #211e1a | **#f2ece0 / #1d1915** | 与 base 拉开 |
| bg-layer-2 | #eae3d4 / #2a2621 | **#e9e1d0 / #28231d** | 三级递进明显 |
| bg-overlay | #fdfbf6 / #241f1a | **#fffdf8 / #211c17** | 浮层提亮/压暗 |
| border-l1 | #e3dac6 / #3a342b | **#dbcfb3 / #3a342b** | 主边框加深一档（lobe colorBorder=[3]） |
| border-l2 | #d2c6ac / #4b4234 | **#c6b68f / #4a4132** | 次边框与 l1 拉开（lobe [2]） |
| brand-primary | #8a5a2b / #d9a15c | 不变 | 主色克制原则，保留身份 |
| label-primary | #2b261e / #e9e2d4 | **#292113 / #efe8da** | 暖黑加深，14.7:1 |
| label-secondary | #6d6350 / #a39a87 | **#71664f / #a8a08c** | 次级文字提对比 |
| state-error | #b0452c / #e0704f | **#b23a30 / #f4416c** | 与品牌棕解耦，取纯净红（lobe red[9]） |
| state-success | #3e7d4c / #7fb98a | **#379d4a / #62c473** | 直取 lobe green[9] |
| state-warn | #a97a1d / #d9a94e | **#b77900 / #ee9e0b** | 取 gold step9 做强调 |
| sidebar-fill | #efe8da / #1e1b17 | **#ece4d5 / #1a1612** | 侧栏与 layer-1 分层（原 ΔL≈0.016 几乎不可见） |

> 无法新增 token（DSH 平台只认 Theme.listTokens 的 13 个）：第三级文字用 `opacity` 近似；hover/link 变体、info 通道留作未来能力。

## 二、排版层改动（纯 CSS，:where() 零优先级）

| 项 | v0.1.0 | v0.2.0 | 来源 |
| --- | --- | --- | --- |
| 字体栈 | 无（产品默认） | 补 sans 中文友好栈 + mono 栈（JetBrains Mono 优先） | LobeUI token/base.ts |
| 正文行高 | 1.75 | **1.8** + letter-spacing 0.02em | Markdown style.ts |
| 段落间距 | 0.6em 0 | 首尾去空 + 段间 1em（倍数制） | Markdown style.ts |
| 标题 | 1.5/1.3/1.15/1.05、600、1.35 | **2/1.6/1.3/1.15/1、700、1.25** | Markdown style.ts（聊天场景缩放） |
| 行内 code | 无边框、0.88em | **胶囊化**：1px 边框、0.875em、lh 1、padding .1em/.4em | markdown.style.ts |
| 代码块 | 8px 圆角 + 实边框 + .9em 1.1em | **内描边 inset ring + 8px + 固定 16px** | Highlighter style.ts |
| 表格 | 单元格全边框、width 100% | **外框+横线式**、max-content 横滚、min-width 120px、padding .75em 1em | markdown.style.ts |
| 引用 | 3px 边条 + 卡片底 | 4px 边条 + 卡片底保留（产品签名）+ 次文字色 | 签名保留 + 微调 |
| hr | 实线 | **虚线** 1.8em | markdown.style.ts |
| ul | 原生圆点 | 自定义 `·` 符号（opacity .6）+ task-list 对齐 | markdown.style.ts |
| img | 无 | 1px 内描边 + 8px 圆角 | markdown.style.ts |
| 链接 | 无过渡 | 品牌色 + hover 下划线 + 200ms 过渡（reduced-motion 关闭） | customStylish / DESIGN.md |
| strong | 650 | **600** | markdown.style.ts |

## 三、明确不采纳（报告均确认不适用）

1. 13 步 Radix 色族生成器 / Fill·Hover·Active 满族 token（依赖 antd-style 运行时 JS）
2. 浮层三级外投影阴影（排版层无弹层，且坏纸面扁平感）
3. Geist 字体照抄（保留暖纸身份，只借栈结构）
4. 语法高亮、复制按钮、语言标签、行号（需 JS，留路线图 v0.3+）
5. 主色单色化（我们本有墨褐/琥珀身份色）

## 四、落地文件

- `plugin/client.js` — TOKENS + TYPO_CSS + PANEL_CSS（圆角统一 8px）
- `plugin/host.js` — MANIFEST v0.2.0
- `manifest/versions.json` — 台账新增条目
