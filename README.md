# dsh-markdown-xyy

**给 DeepSeek Harness 的对话 Markdown 换上主题 —— 4 套内置主题（浅/深双档）+ 用户主题自由定义，顺带把插件迭代记成可回滚的版本台账。**

[![license](https://img.shields.io/github/license/mengnanxyyyy/dsh-markdown-xyy)](LICENSE)
[![npm version](https://img.shields.io/npm/v/dsh-markdown-xyy)](https://www.npmjs.com/package/dsh-markdown-xyy)
[![npm downloads](https://img.shields.io/npm/dm/dsh-markdown-xyy)](https://www.npmjs.com/package/dsh-markdown-xyy)
[![GitHub stars](https://img.shields.io/github/stars/mengnanxyyyy/dsh-markdown-xyy)](https://github.com/mengnanxyyyy/dsh-markdown-xyy)
[![language](https://img.shields.io/badge/language-中文-brightgreen.svg)](README.md)
[![English](https://img.shields.io/badge/English-README-blue.svg)](README.en.md)
[![LINUX DO](https://shorturl.at/ggSqS)](https://linux.do)

运行在 [DeepSeek Harness](https://github.com/deepseek-ai) 上的 Cordis 插件：不动产品基线主题，用纯 CSS 给对话里的 Markdown 排版与配色换肤——标题、代码块、表格、引用、链接、高亮，浅色深色各一套，跟随系统自动切换。

## 版本与兼容性

| 本项目版本 | 对齐的 DeepSeek Harness 版本 |
| :---: | :---: |
| **v2.0.3** | **0.1.6-alpha.2** |

> 上表在每次 DSH 升版复验后更新。基线声明见 `package.json` 的 `dshCompatibility`；`node scripts/check-release.js` 第 11 项会核对本表与声明是否一致，并对「声明基线 ↔ 本机 DSH 运行时契约 ↔ 4 套内置主题 CSS」做三方比对（13 个 L0 token 名单、`settings.section` / `tool.view.cordis` 槽位、`body[data-ds-dark-theme]` 深色标记）——DSH 升版导致契约漂移会直接让门禁失败。

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
- **✔️ 主题选择持久化**：选中的主题自动记住（localStorage），刷新、新开页面、重启后原样恢复，多标签页实时同步
- **✔️ 用户主题即放即用**：往 `~/.dsh/web-themes-xyy/` 放一个 CSS 文件就是新主题，无需打包、无需升级插件
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

## 🎨 自定义主题（让 AI 复制粘贴，3 分钟换肤）

主题本质就是一个 **CSS 文件**：改它 = 换肤，无需改代码、无需升级插件，保存/放文件后刷新即生效。

**方式一：让 AI 改（最快，推荐）**

1. 设置 → 主题设置 →「🆕 新建用户主题」→ 选一个最接近你审美的**底子主题**（默认草莓猛男粉，顶部下拉可换钛影 / 高清晰 / 松烟墨黛）；
2. 复制编辑器里的整段 CSS，粘贴给任意 AI（DeepSeek / ChatGPT / Claude）；
3. 把需求发给它，例如：

```
你是 CSS 主题专家。这是 DSH 对话 Markdown 主题的完整 CSS，文件结构不能破坏：
[把编辑器里的整段 CSS 粘贴到这里]
帮我改成「赛博朋克」风：① 把 --mdvr-accent 和各处 --dsw-alias-* token 改成霓虹紫+电光青
② 背景改深黑 ③ 代码块加霓虹描边。保持三段式结构（body / body[data-ds-dark-theme] /
:where()）和全部变量名：只改值、不动名单，输出完整 CSS 让我直接粘贴回编辑器保存。
```

4. 把 AI 返回的完整 CSS 粘贴回编辑器 →「💾 保存」→ 新主题立刻出现在列表可选用（保存前插件会做 CSS 语法校验，不过会拒绝并提示原因）。

**方式二：手写 / 放文件**

- 主题 = 三段式 CSS：① 浅色档 `body {…}` ② 深色档 `body[data-ds-dark-theme] {…}` ③ 元素定制 `:where()`。参考内置 `plugin/assets/themes/strawberry-mocha.css`（全注释的标准参考实现）；
- 放文件即新主题：复制成 `~/.dsh/web-themes-xyy/<你的名字>.css` → 设置页「🔄 刷新用户主题」；
- 90% 的换肤效果来自几个关键变量（完整契约见 [docs/variables.md](docs/variables.md)）：
  - `--dsw-alias-bg-base` / `--dsw-alias-bg-layer-1` … 背景与表面层次
  - `--dsw-alias-brand-primary` 品牌 / 强调主色
  - `--mdvr-accent` 主题强调色、`--mdvr-link-*` 链接、`--mdvr-code-*` 代码、`--hl-*` 语法高亮

完整规范：[docs/themes.md](docs/themes.md)｜变量契约：[docs/variables.md](docs/variables.md)

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
│   └── assets/                  # panel.css / themes/（4 个内置主题）
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