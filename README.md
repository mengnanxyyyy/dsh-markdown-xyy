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

- **v1.2.2「修复：fs stat 句柄」**：`resolveProjectRoot` 探测改用 fs 服务 `resolve()` 句柄（stat 不接受字符串路径）——v1.2.1 探测未生效的补丁，已实测命中项目根，恢复设置页面板样式。
- **v1.2.1「修复：项目根按内容探测」**：Host 改用 `resolveProjectRoot`（workspaceRoot → 兄弟目录 → 显式兜底）定位项目根，修复 DSH 启动目录 ≠ 插件项目目录时资产读取失败的问题。
- **v1.2.0「用户主题管理 + 资产文件化」**：设置页新增「🆕 新建用户主题」与每卡「✏️ 编辑」；编辑器带实时语法高亮 + 一键格式化 + 保存写回 `~/.dsh/web-themes`；内置主题只读；内置主题/骨架/面板样式/模板全部由 Host 从文件读取（改文件即生效，无需升级插件）。
- **v1.1.0「动态用户目录」**：用户主题目录改为系统动态解析 `$HOME/.dsh/web-themes`（shell 读 `$HOME` 优先 → workspaceRoot 推导 → 硬编码回退，不写死路径）；目录已从 `mdvr-themes` 更名 `web-themes`。
- v1.0.0「用户主题动态加载」：`~/.dsh/` 放 CSS 即新主题，无需打包升级（历史版本）。
- v0.9.0 / v0.8.0 / v0.7.0 / v0.6.0 / v0.5.0 / v0.4.0 / v0.3.0 / v0.2.0 / v0.1.0：历史版本（见台账）。
- 台账：[manifest/versions.json](manifest/versions.json)
