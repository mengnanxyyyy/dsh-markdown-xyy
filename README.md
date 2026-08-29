# dsh-markdown-xyy

**DeepSeek Harness 动态插件：版本记录 + Markdown 对话主题排版。**

一个运行在 DeepSeek Harness 上的动态 Cordis 插件（pluginId 前缀 `mdvr`），解决插件迭代中的两个真实痛点：

- **版本会丢** —— Harness 动态插件是内存态，进程重启即失，改动散落在会话里无从追溯；
- **观感难定制** —— 对话里的 Markdown 排版与配色想要可配置，又绝不能破坏产品自带的主题基线。

本项目把这两件事打包成一个插件：

- **版本记录**：每个迭代 = 一个不可变 Cordis Package。插件维护内存台账，经 `versions.note` / `versions.list` RPC 上报与查询，并随每次迭代镜像存档到 `manifest/versions.json`（与 git tag 对应）；`cordis_run` 卡片内直接展示当前版本与完整历史。
- **Markdown 对话主题排版**：主题 = 纯 CSS 资产文件（内置 `plugin/assets/themes/*.css`、用户 `$HOME/.dsh/web-themes/*.css`），由 Host 运行时从文件读取，Client 以 `styles.insert` 注入 `body` / `body[data-ds-dark-theme]`（与产品挂载机制一致，不改产品基线主题）。Markdown 排版由产品 `._markdown_*` 规则兜底，主题用 `:where()` 零优先级做元素级增量覆盖，产品显式样式永远优先。

## 特性

- ✔️ **不可变版本台账 + 版本面板**：一次迭代一个 Package，版本号 / 日期 / 变更随包携带，`cordis_run` 卡片内即看当前与全部历史
- ✔️ **4 套内置主题**：草莓猛男粉 `strawberry-mocha`（标准参考）、钛影 `Cyber-Titanium-native`、高清晰 `High-Vis-Clarity-native`、松烟墨黛 `Pine-Smoke-Ink-native`
- ✔️ **用户主题动态加载**：往 `$HOME/.dsh/web-themes/` 放一个 CSS 就是新主题，无需打包、无需升级插件
- ✔️ **深浅色双档跟随系统**：外观 ☀️ / 🌙 / 🖥️ 三档，主题自带浅深两档即随切换生效
- ✔️ **实时主题编辑器**：设置页内新建 / 编辑用户主题，实时语法高亮 + 一键格式化，保存前双端 CSS 校验，错误拒绝写入
- ✔️ **Markdown 元素级排版增量覆盖**：`:where()` 零优先级，只影响裸语义元素，不碰产品基线主题
- ✔️ **发布门禁脚本**：`node scripts/check-release.js` 一键校验 MANIFEST 一致性 / CSS 契约 / packageId 唯一，达标才可发版

## 快速开始（加载插件）

前置：一个可运行的 DeepSeek Harness 会话环境。本项目无任何 npm 依赖，不需要安装步骤。

**① 克隆仓库**

```bash
git clone https://github.com/mengnanxyyyy/dsh-markdown-xyy.git && cd dsh-markdown-xyy
```

**② 构建并精简双半源码**（供 define 传输；minify 只删注释 / 折叠空白，语义零风险）

```bash
node scripts/build-client.js                        # 同步 plugin/src/client.core.js → plugin/client.js + 资产检查
node scripts/minify.js plugin/host.js /tmp/host.min.js
node scripts/minify.js plugin/client.js /tmp/client.min.js
node --check /tmp/host.min.js && node --check /tmp/client.min.js   # 可选：语法复核
```

**③ 在 Harness 会话中加载动态插件**

1. `cordis_define`：`kind: new`（或对既有实例用 `existing`），**host + client 双半一次传入**（即上面的两个 minify 产物），pluginId 前缀 `mdvr`。
2. `cordis_run`：首次用 `run`，已有版本用 `update` 切换到新 Package。

加载完成后进入 **设置 → 主题设置**：可切换「系统自带」或 4 套内置主题，也可新建 / 编辑用户主题（实时语法高亮编辑器）。

## 项目结构

```
dsh-markdown-xyy/
├── AGENTS.md               # 面向 Agent 贡献者的项目约定
├── LICENSE
├── README.md
├── docs/
│   ├── architecture.md     # 架构：双半分工 / 版本模型 / 主题管线
│   ├── themes.md           # 主题系统规范（能力边界 / 文件格式 / 用户主题）
│   ├── variables.md        # 变量契约（L0 平台 token / L1 身份色 / L2 常量 / L3 旋钮）
│   ├── capabilities.md     # 能力清单与路线图
│   └── development.md      # 开发与发布流程（一次迭代 = 一个 Package）
├── manifest/
│   └── versions.json       # 版本台账持久镜像
├── plugin/
│   ├── host.js             # Host 半源码镜像（版本台账 + 主题资产 RPC）
│   ├── client.js           # Client 半源码镜像（构建产物，勿手改）
│   ├── src/client.core.js  # Client 半源码（唯一的可编辑源）
│   └── assets/
│       ├── panel.css       # 面板 / 设置页样式
│       ├── template.css    # 完整参考主题（带全部注释）
│       └── themes/         # 内置主题（4 个 CSS）
└── scripts/
    ├── build-client.js     # 拷贝 client.core.js → client.js + 资产检查
    ├── check-release.js    # 发布门禁（MANIFEST 一致性/CSS 契约/packageId 唯一）
    └── minify.js           # define 传输用安全精简
```

## 当前版本

**v1.15.0「对话流节点间距紧凑化」**（2026-08-29）：四个内置主题新增 §14——以稳定属性 `[data-chat-flow]` 为锚点（产品哈希类名跨构建会变，勿用），把对话流主列 `gap` 由 16px 收紧到 5px，工具调用卡 / 消息 / 状态条等全部对话流节点垂直间距统一变紧凑。

完整版本历史见 [manifest/versions.json](manifest/versions.json)，git 侧对应 tag 见 `git tag`（如 `v1.15.0`）。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | 架构：双半分工 / 版本模型 / 主题管线 |
| [docs/themes.md](docs/themes.md) | 主题系统规范：能力边界 / 文件格式 / 用户主题 |
| [docs/variables.md](docs/variables.md) | 变量契约：L0 平台 token / L1 身份色 / L2 常量 / L3 旋钮 |
| [docs/capabilities.md](docs/capabilities.md) | 能力清单与路线图 |
| [docs/development.md](docs/development.md) | 开发与发布流程（一次迭代 = 一个 Package） |

## 开发

迭代流程：**改 MANIFEST → build → define → run → 验证 → tag**，完整步骤与约定见 [docs/development.md](docs/development.md)。发版前跑发布门禁：

```bash
node scripts/check-release.js
```

脚本校验：双份 MANIFEST 版本一致、`client.js` 与源未漂移、CSS 契约（浅深双档挂载、`var(--mdvr-*)` 回退、括号闭合）、packageId 唯一、minify 产物可传；失败返回非零退出码并指明具体原因。

## 许可

[MIT](LICENSE) © 2026 dsh-markdown-xyy contributors