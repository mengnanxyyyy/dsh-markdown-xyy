# dsh-markdown-xyy

**版本记录 + Markdown 对话主题排版** — 一个运行在 DeepSeek Harness 上的动态 Cordis 插件项目。

它做三件事：

1. **版本记录**：每次迭代都是一个不可变 Package，插件自动维护版本台账（版本号、日期、变更日志、主题名），并在 `cordis_run` 卡片内展示当前版本与历史。
2. **主题**：内置/用户主题均为独立 CSS 文件，由 Host 运行时读取（`plugin/assets/themes/*.css` + `~/.dsh/web-themes/*.css`），Client 以 `styles.insert` 注入 `body` / `body[data-ds-dark-theme]`（与产品挂载机制一致），不改动产品基线主题。内置主题仅 `strawberry-mocha`（草莓猛男粉，v1.7.0 起唯一内置）。
3. **Markdown 排版**：v1.3.0 起排版骨架停用（v1.8.0 删除 typography.css）——对话排版由产品 `._markdown_*` 规则兜底，主题通过自身 ③ 段（`:where()` 零优先级）做中文友好的增量覆盖（如草莓猛男粉的全套元素排版）；产品显式样式不会被覆盖。

## 项目结构

```
dsh-markdown-xyy/
├── README.md                    # 本文件
├── docs/
│   ├── architecture.md          # 架构说明（双半分工 / 版本模型 / 迭代流程）
│   ├── iteration-playbook.md    # 快速迭代手册（每次迭代的固定步骤）
│   ├── capabilities.md          # 能力清单（这个项目能提供什么 + 路线图）
│   ├── lobeui-synthesis.md      # v0.2.0 对标 LobeUI 的合成改动方案
│   ├── lobeui-compare.md        # 竞品研究：代码块 / Markdown 组件
│   ├── lobeui-typography-competitive.md  # 竞品研究：字体与排版
│   ├── lobeui-theme-comparison.md        # 竞品研究：色彩体系
│   ├── diagnosis-velvet-native-leak.md    # 诊断：Velvet 主题对原生排版的影响（整改依据）
│   └── unified-variables.md              # 统一变量契约盘点（L0/L1/L2/L3 + panel 消费面）
├── manifest/
│   └── versions.json            # 版本台账（持久态，与插件内存台账对应）
├── plugin/
│   ├── host.js                  # 当前 Package 的 Host 半源码镜像
│   └── client.js                # 当前 Package 的 Client 半源码镜像
└── .gitignore
```

## 快速迭代循环（核心）

```
改 MANIFEST（版本号+变更日志）
   → 更新 manifest/versions.json
   → 镜像 plugin/host.js + plugin/client.js
   → cordis_define（追加不可变 Package）
   → cordis_run update
   → 页面刷新验证主题/排版/版本面板
   → git commit + tag
```

完整步骤见 [docs/iteration-playbook.md](docs/iteration-playbook.md)。

## 当前版本

- **v1.11.0「深浅模式整改」**：subagent 交叉审核确认 ③ 段零裸色、两档变量零缺失；修复浅档选区白字不可读（改深丁香紫 AA≈4.6:1）、阴影拆浅深两档（浅=紫 tint / 深=黑 0.45）、行内代码浅档拆燕麦粉底+深草莓字（深档保留墨夜紫签名）；7 个单值变量移入两档 body 成对定义，模板同步。
- **v1.10.0「三层作用域体系」**：猛男粉主题彻底区分 markdown 与全站——第 0 层全站仅 body 字体/基色（走 `--mdvr-sans` + `--dsw-alias-label-primary` 变量共享）；第 1 层标题/段落/行内修饰/上下标/代码块/表格/引用/分割线/链接/图片全部收敛到 `[class*="_markdown_"]`（UI 同名元素不再被染）；删除 `body > pre` 死规则、拆分 pre 双规格、selection/滚动条/焦点环保持全局签名；模板同步。
- **v1.9.0「列表 markdown 限定 + padding 对齐」**：草莓猛男粉（及新建模板）的列表基座/嵌套/任务清单全部收敛到 `[class*="_markdown_"]`（设置面板等 UI 列表/checkbox 不再受影响）；新增 `--mdvr-list-pad`（顶层 ul/ol/任务列表统一 1.6em）+ `--mdvr-list-pad-nested`（嵌套每层 1.2em），修复 ul 18px / ol 2.4em / 任务 0.8em 三值错位。
- **v1.7.0「内置主题精简」**：移除早期纯配色主题 lobeui-emphasis / inkpaper / qingci，内置主题仅保留「草莓猛男粉」（全变量化完整主题；历史在 git）。
- **v1.6.0「内置主题目录内聚」**：`themes/*.css` 迁入 `plugin/assets/themes/*.css`（插件目录内，打包/携带 `plugin/` 即带上全部主题；Host 优先读 assets、旧 `themes/` 兼容回退）。
- **v1.5.0「草莓猛男粉模板化 + 列表分块修复」**：新增模板资产 `plugin/assets/template-strawberry.css`（「🆕 新建用户主题」默认起步）；修复内置主题列表因 ~16KB 通道超限被截断为空（改 `themes.builtin.get` 分块拉取）。
- **v1.4.0「草莓猛男粉内置」**：新增内置主题 `plugin/assets/themes/strawberry-mocha.css`（中文名 草莓猛男粉；第三方 Velvet-Strawberry-Mocha-v2-native-var 内置化）——13 token + 全量 `--mdvr-*` 身份色（浅深成对） + L2/L3 排版常量 + `--hl-*` 语法高亮；元素段按诊断报告整改；统一变量契约盘点成文 `docs/unified-variables.md`。
- **v1.3.0「可靠性收口 + 无障碍」**：分块保存协议事务化（uploadId + 分片完整性 + Host 侧 CSS 校验 + TTL/容量上限，杜绝缺片/并发混片写坏主题文件）；资产读取统一分块（`themeAssets.get`）；主题选择原子化 + Run 生命周期隔离；主题卡按钮化/aria 语义；格式化器字符串与 `url()` 保护；新增 `scripts/check-release.js` 发布门禁。
- **v1.2.5「编辑器叠加根治」**：pre/textarea 不软换行 + 横向滚动，逐字符对齐杜绝叠字重叠（历史版本）。
- **v1.2.3「分块传输」**：大文本 8000 字符/片分块，修复 ~16KB 消息上限导致的加载失败与保存截断（历史版本）。
- 完整台账：[manifest/versions.json](manifest/versions.json)
