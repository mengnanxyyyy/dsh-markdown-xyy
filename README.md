# dsh-markdown-xyy

**版本记录 + Markdown 对话主题排版** — 一个运行在 DeepSeek Harness 上的动态 Cordis 插件项目。

它做三件事：

1. **版本记录**：每次迭代都是一个不可变 Package，插件自动维护版本台账（版本号、日期、变更日志、主题名），并在 `cordis_run` 卡片内展示当前版本与历史。
2. **主题**：通过 `theme.overrideTokens` 叠加全局 token 层（浅/深双套配色，当前为 LobeUI 原生风格），不改动产品基线主题。
3. **Markdown 排版**：通过 `styles.insert` 注入零优先级排版层（`:where()`），为对话中的语义化 Markdown（标题、列表、代码块、引用、表格…）提供中文友好排版；产品自带样式的组件不会被覆盖。

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
│   └── lobeui-theme-comparison.md        # 竞品研究：色彩体系
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

- **v0.3.0「LobeUI 风格」**：放弃暖纸身份，整体替换为 LobeUI 原生设计语言——中性灰阶配色（浅 #f8f8f8/#fff ↔ 深 #000/#0d0d0d）、主色中性黑 #222、语义色取 lobe step9、链接信息蓝 #0072f5/#60b1ff、Geist/Geist Mono 字体栈、引用去卡片化、h1 去下边框。色值直接取自 lobe-ui master 源码色板。
- v0.2.0「墨纸 · InkPaper」：对标 LobeUI 的细节打磨（已被 v0.3.0 替换）。
- v0.1.0：架构基线 + 主题层 + 基础排版 + 版本面板。
- 台账：[manifest/versions.json](manifest/versions.json)
