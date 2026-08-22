# dsh-markdown-xyy

**版本记录 + Markdown 对话主题排版** — 一个运行在 DeepSeek Harness 上的动态 Cordis 插件项目。

它做三件事：

1. **版本记录**：每次迭代都是一个不可变 Package，插件自动维护版本台账（版本号、日期、变更日志、主题名），并在 `cordis_run` 卡片内展示当前版本与历史。
2. **主题**：内置/用户主题均为独立 CSS 文件，由 Host 运行时读取（`themes/*.css` + `~/.dsh/web-themes/*.css`），Client 以 `styles.insert` 注入 `body` / `body[data-ds-dark-theme]`（与产品挂载机制一致），不改动产品基线主题。
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

- **v1.3.0「可靠性收口 + 无障碍」**：分块保存协议事务化（uploadId + 分片完整性 + Host 侧 CSS 校验 + TTL/容量上限，杜绝缺片/并发混片写坏主题文件）；资产读取统一分块（`themeAssets.get`）；主题选择原子化 + Run 生命周期隔离；主题卡按钮化/aria 语义；格式化器字符串与 `url()` 保护；新增 `scripts/check-release.js` 发布门禁。
- **v1.2.5「编辑器叠加根治」**：pre/textarea 不软换行 + 横向滚动，逐字符对齐杜绝叠字重叠（历史版本）。
- **v1.2.3「分块传输」**：大文本 8000 字符/片分块，修复 ~16KB 消息上限导致的加载失败与保存截断（历史版本）。
- 完整台账：[manifest/versions.json](manifest/versions.json)
