# 能力清单（我能提供什么）

> 这是「版本记录 · Markdown 主题排版」插件项目的能力全景。已交付 = 当前版本可用；路线图 = 待迭代实现。

## A. 版本记录

| # | 能力 | 状态 |
| --- | --- | --- |
| A1 | 每次迭代自动形成不可变版本（Package），随时可回滚到任意历史版本 | ✅ 已交付（平台机制） |
| A2 | 版本台账：版本号、名称、日期、变更日志、主题名，按 packageId 去重 | ✅ v0.1.0 |
| A3 | `cordis_run` 卡片内版本面板：当前版本徽标 + 本次变更日志 + 历史版本列表 | ✅ v0.1.0 |
| A4 | `manifest/versions.json` 持久台账 + git tag 基线 | ✅ v0.1.0 |
| A5 | 台账落盘到工作区文件（Host 用 `fs` 服务自动同步 `manifest/versions.json`） | 🔜 路线图 |
| A6 | 版本对比视图（任意两版 diff 变更日志 / 配色差异） | 🔜 路线图 |

## B. 主题（颜色层）

| # | 能力 | 状态 |
| --- | --- | --- |
| B1 | 全局 token 覆盖：13 个 `--dsw-alias-*` token，浅/深双套 | ✅ v0.1.0 |
| B2 | 叠加层机制：不改基线主题，卸载即还原，同一 source 更新即整层替换 | ✅ v0.1.0 |
| B3 | LobeUI 原生配色（v0.3.0）：中性灰阶（浅 #f8f8f8/#fff ↔ 深 #000/#0d0d0d）、主色中性黑 #222/#eee、边框/文字灰阶按 lobe 生成器映射 | ✅ v0.3.0 |
| B4 | 语义色取 lobe step9（深档沿用）；浅档按 WCAG AA 实测加深 `#c74330`/`#287b38`/`#985d00`；链接信息蓝 `#005ae0`/`#60b1ff`（AA） | ✅ v0.4.0 |
| B5 | 主题系统化：每主题一个独立 CSS 文件（`plugin/assets/themes/*.css`），构建脚本内联；内置 lobeui-emphasis / inkpaper / qingci / strawberry-mocha（草莓猛男粉）四套主题 | ✅ v0.6.0（strawberry-mocha v1.4.0） |
| B6 | 设置页「主题设置」（`settings.section`）：选择模型——「系统自带」默认（零干预）+ 内置/用户主题卡片（互斥单选）；外观三档按钮在第三方/用户主题激活时变灰禁用 | ✅ v0.9.0 |
| B7 | 用户主题动态加载：`$HOME/.dsh/web-themes/`（v1.1.0 起系统动态解析：shell 读 `$HOME` → workspaceRoot 推导 → 硬编码回退）放 CSS 文件即新主题（无需打包升级），Host fs 读取 + 设置页一键刷新 | ✅ v1.0.0 → v1.1.0 |
| B11 | 用户主题管理（v1.2.0）：设置页「🆕 新建用户主题」+ 每卡「✏️ 编辑」；内置主题只读（无编辑按钮）；编辑器 = 实时语法高亮（透明 textarea 叠彩色 pre）+「🧹 格式化」+「💾 保存」（Host `themes.user.save` RPC，沙箱放开 `danger-full-access`）。v1.5.0 起新建默认模板 = `plugin/assets/template-strawberry.css`（草莓猛男粉，与内置主题同源，失败回退 template.css） | ✅ v1.2.0（模板 v1.5.0） |
| B12 | 资产文件化（v1.2.0）：内置主题/排版骨架/面板样式/新建模板由 Host 从文件读取（plugin/assets/themes/*.css + plugin/assets/*.css，基于 workspaceRoot），改文件刷新即生效无需升级插件；Host 新增 themes.builtin.list / themeAssets.get RPC；构建脚本改为源码拷贝 | ✅ v1.2.0 |
| B13 | 统一变量契约（v1.4.0）：`--mdvr-*` 扩展为完整分层体系——L1 身份色（标题/文本/accent/组件/列表 + `--hl-*` 语法高亮，浅深成对）+ L2 排版/形状常量 + L3 功能旋钮（`:root` 单值），`strawberry-mocha` 成为全量消费的参考实现；盘点见 `docs/unified-variables.md` | ✅ v1.4.0 |
| B8 | 「系统自带」选项：插件零干预（不注入 token/排版/变量），深浅跟随系统，默认选择 | ✅ v0.9.0 |
| B9 | 外观三档切换（v0.8.0）：设置页 ☀️ 浅色 / 🌙 深色 / 🖥️ 跟随系统（产品 `theme.setTheme` 官方接口，实时生效 + 偏好持久化） | ✅ v0.8.0 |
| B9 | 第三档 auto：监听 `prefers-color-scheme` 事件重算 token | 🔜 路线图（v0.8.0 已提供产品级「跟随系统」档，此路线图项已基本覆盖） |
| B10 | 跟随系统深浅色（`theme` 服务内置感知；v0.6.0 起用产品原生 `body[data-ds-dark-theme]` 机制） | ✅ 平台机制 |

## C. Markdown 排版

| # | 能力 | 状态 |
| --- | --- | --- |
| C1 | 字体栈：LobeUI 原生 Geist / Geist Mono 优先 + 中文栈（PingFang/YaHei/Noto CJK） | ✅ v0.3.0 |
| C2 | 倍数制排版节奏：段落首尾去空 + 段间 1em、行高 1.8、字距 0.02em | ✅ v0.2.0 |
| C3 | 标题阶梯 2/1.6/1.3/1.15/1em、700、行高 1.25（h1 下边框签名保留） | ✅ v0.2.0 |
| C4 | 行内 code 胶囊化（1px 边框 + lh 1）；代码块内描边 + 圆角 8px + padding 16px | ✅ v0.2.0 |
| C5 | 表格外框+横线式（无单元格边框、min-width 120px、横向滚动、padding .75em 1em） | ✅ v0.2.0 |
| C6 | hr 虚线、引用 4px 中性左边条（无底色，LobeUI 极简风）、ul 自定义 "-" 符号、图片内描边、链接信息蓝 + hover 过渡 200ms（reduced-motion 降级） | ✅ v0.3.0 |
| C7 | 零优先级策略（`:where()`）：只影响裸语义 Markdown，产品组件样式不被破坏 | ✅ v0.1.0 |
| C8 | 全量颜色引用 token 变量，深浅色自动跟随，无写死色值 | ✅ v0.1.0 |
| C9 | 按真实渲染 DOM 精细化作用域（当前为通用基线） | 🔜 路线图 |
| C10 | 代码语法高亮（需 JS 引入 shiki 等） | 🔜 路线图 |
| C11 | 消息内排版开关（每会话可关） | 🔜 路线图 |

## D. 快速迭代基础设施

| # | 能力 | 状态 |
| --- | --- | --- |
| D1 | 固定迭代循环（改 MANIFEST → define → update → 验证 → commit+tag） | ✅ v0.1.0 |
| D2 | 源码镜像 `plugin/host.js` + `plugin/client.js`，版本与 git 一一对应 | ✅ v0.1.0 |
| D3 | 迭代手册与故障排查表 | ✅ v0.1.0 |
| D4 | 自动化验证清单（浅/深/面板三步验收） | ✅ v0.1.0 |
| D5 | 竞品设计研究流水线：多 subagent 分工挖掘（色彩/字体/代码块/设计语言）→ 合成方案落盘 | ✅ v0.2.0 |
| D6 | 强调色专项团队：竞品/色彩系统/元素规范/无障碍校验四路并行 → 合成落盘 | ✅ v0.4.0 |

## E. 重点信息强调系统（v0.4.0）

| # | 能力 | 状态 |
| --- | --- | --- |
| E1 | 强调色变量系统：`--mdvr-accent`（靛蓝 #5856d6/#a8a5f5）+ highlight（琥珀）+ 全套 tint/边条/表头/引用变量，浅深双档 | ✅ v0.4.0 |
| E2 | 引用块：4px 靛蓝边条 + tint 底 + 正文提到 primary（重点块） | ✅ v0.4.0 |
| E3 | 行内 code：靛蓝 tint 底 + 同色系描边 + 深蓝字（tint 上文字 AA 实测 5.72:1） | ✅ v0.4.0 |
| E4 | 代码块：中性底保留 + inset 3px 靛蓝左标条（为语法高亮留白） | ✅ v0.4.0 |
| E5 | 表头靛蓝 tint + 700；h1 靛蓝下划线；列表符号/分割线靛蓝 | ✅ v0.4.0 |
| E6 | 克制原则：正文/strong/标题文字不上语义色；strong 中性 700 浓度强调；kbd 不上色 | ✅ v0.4.0 |
| E7 | gfm alert 五色告警块（note/tip/important/warning/caution，复用 state-* + link，零新增 token） | 🔜 路线图 |
| E8 | 语法高亮后代码块语义上色（shiki + lobe-theme 思路） | 🔜 路线图 |

| E9 | 主题文件格式规范 + 新增主题步骤 + 注释规范（docs/themes.md） | ✅ v0.5.0 |

## 当前路线图（建议顺序）

1. **v0.6.0**：语法高亮（shiki + 语义化 lobe-theme 思路，随深浅自动切换）+ 复制按钮（C10/E8）
2. **v0.7.0**：gfm alert 五色告警块（E7）+ 主题持久化（选择写入 Host 内存，会话内跨刷新保留）
3. **v0.8.0**：台账落盘自动同步（A5）+ auto 第三档（B7）
4. **v0.9.0**：版本对比视图（A6）
