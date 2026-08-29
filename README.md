# dsh-markdown-xyy

**给 DeepSeek Harness 的对话 Markdown 换上主题 —— 4 套内置主题（浅/深双档）+ 用户主题自由定义，顺带把插件迭代记成可回滚的版本台账。**

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-1.15.0-5856d6.svg)](manifest/versions.json)
[![lang](https://img.shields.io/badge/language-中文-brightgreen.svg)](README.md)
[![lang-en](https://img.shields.io/badge/English-README-blue.svg)](README.en.md)

运行在 [DeepSeek Harness](https://github.com/deepseek-ai) 上的 Cordis 插件：不动产品基线主题，用纯 CSS 给对话里的 Markdown 排版与配色换肤——标题、代码块、表格、引用、链接、高亮，浅色深色各一套，跟随系统自动切换。

## 📖 项目缘起

做这个项目的初衷很简单：**原生对话样式在面对大量文本时，并不适合阅读。**

大段对话内容堆在一起时，信息是「平」的——标题、引述、重点、代码全靠默认排版撑着，看得越快越抓不住重点。而我每天都要面对大量对话文本，**把重点信息着色、层次分明**就变得特别重要：扫一眼就能定位关键内容，长对话也能快速读完。

这个项目就是为此而来：给对话里的 Markdown 加一套「阅读辅助」主题——重点突出、排版清晰、深浅双档，同时绝不破坏产品默认主题。

> 本项目由 AI 全程协作完成：核心开发是我的合作伙伴 **deepseek-v4-flash**，四套主题的配色由国际友人 **Gemini** 协助调色打磨。

## 主题预览

| 草莓猛男粉 `strawberry-mocha` | Cyber Titanium · 钛影 `cyber-titanium` |
| :---: | :---: |
| ![草莓猛男粉](screenshots/strawberry-mocha.jpg) | ![钛影](screenshots/cyber-titanium.jpg) |
| 丝绒草莓甜点 × Catppuccin Mocha 暗夜，标准参考实现 | Space Black 空间黑 × 阳极钛紫 × 电光青 × 冷银 |

| High-Vis Clarity · 高清晰 `high-vis-clarity` | 松烟墨黛 `pine-smoke-ink` |
| :---: | :---: |
| ![高清晰](screenshots/high-vis-clarity.jpg) | ![松烟墨黛](screenshots/pine-smoke-ink.jpg) |
| 旧显示器 / 低色域友好：高反差冷白 × 纯天蓝 × 黄金重点 | 徽墨沉香 × 矿物朱砂 × 远山黛蓝 × 宣纸冷白 |

> 预览图存放于 [screenshots/](screenshots/)，换图直接覆盖同名文件即可。

## 特性

- **✔️ 4 套内置主题**，每套浅色 / 深色双档，☀️ / 🌙 / 🖥️ 外观三档随系统切换
- **✔️ 用户主题即放即用**：往 `~/.dsh/web-themes/` 放一个 CSS 文件就是新主题，无需打包、无需升级插件
- **✔️ 实时主题编辑器**：设置页内新建 / 编辑用户主题，语法高亮 + 一键格式化，保存前双端 CSS 校验
- **✔️ 元素级排版增量覆盖**：`:where()` 零优先级，只兜底裸 Markdown 元素，产品显式样式永远优先
- **✔️ 不可变版本台账**：每个迭代 = 一个不可变 Package，run 卡片内即看当前版本与完整历史，可随时回滚
- **✔️ 常驻安装即用即走**：npm registry 一条命令装好（`dsh plugin add dsh-markdown-xyy`），GitHub 备选，进程重启不丢

## 快速开始

前置：一个可运行的 DeepSeek Harness 环境（`dsh web`）。本项目无运行时依赖，无需安装 npm 包。

**常驻安装（推荐，重启不丢）**

直接在 npm registry 安装（已发布：[dsh-markdown-xyy](https://www.npmjs.com/package/dsh-markdown-xyy)）：

```bash
dsh plugin --profile web add dsh-markdown-xyy
```

或跟随 GitHub main 最新（镜像尚未同步 npm 新包时可用）：

```bash
dsh plugin --profile web add github:mengnanxyyyy/dsh-markdown-xyy
```

加载后进入 **设置 → 主题设置**：切换「系统自带」或 4 套内置主题，新建 / 编辑用户主题。

## 自定义主题

主题 = 一个 CSS 文件，三段式结构（① 浅色档 `body {…}` ② 深色档 `body[data-ds-dark-theme] {…}` ③ 元素定制 `:where()`）。参考与完整教程见 [docs/themes.md](docs/themes.md) 和内置模板 `plugin/assets/template.css`；变量契约（L0 平台 token / L1 身份色 / L2 常量 / L3 旋钮）见 [docs/variables.md](docs/variables.md)。

## 项目结构

```
dsh-markdown-xyy/
├── README.md / README.en.md     # 中 / 英 README
├── AGENTS.md                    # 面向 Agent 贡献者的项目约定
├── LICENSE                      # MIT
├── package.json                 # 常驻安装包清单（main=lib/index.mjs，exports ./client）
├── cordis.patch.yml             # dsh bundle 插件行（dsh plugin add 后挂载）
├── screenshots/                 # 主题预览图（README 画廊）
├── docs/                        # architecture / themes / variables / capabilities / development
├── manifest/
│   └── versions.json            # 版本台账持久镜像
├── lib/
│   └── index.mjs                # 常驻安装版 Host 半（生成产物）
├── client/
│   └── client.js                # 常驻安装版 Client 半（__ModuleLoader__ 注册，生成产物）
├── plugin/
│   ├── host.js                  # Host 半源码镜像（版本台账 + 主题资产 RPC）
│   ├── client.js                # 动态版 Client 半产物（勿手改）
│   ├── src/client.core.js       # Client 半源码（唯一的可编辑源）
│   └── assets/                  # panel.css / template.css / themes/（4 个内置主题）
└── scripts/
    ├── build-client.js          # 动态版产物构建
    ├── build-installed.js       # 常驻版双半产物构建
    ├── check-release.js         # 发布门禁
    └── minify.js                # define 传输用安全精简
```

## 文档

| 文档 | 内容 |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | 架构：双半分工 / 版本模型 / 主题管线 / 双通道 |
| [docs/themes.md](docs/themes.md) | 主题系统规范：能力边界 / 文件格式 / 用户主题 |
| [docs/variables.md](docs/variables.md) | 变量契约：L0 平台 token / L1 身份色 / L2 常量 / L3 旋钮 |
| [docs/capabilities.md](docs/capabilities.md) | 能力清单与路线图 |
| [docs/development.md](docs/development.md) | 开发与发布流程（一次迭代 = 一个 Package） |

## 开发

迭代流程 **改 MANIFEST → build → define → run → 验证 → tag** 见 [docs/development.md](docs/development.md)；发版前跑发布门禁：

```bash
node scripts/check-release.js
```

## 许可

[MIT](LICENSE) © 2026 dsh-markdown-xyy contributors