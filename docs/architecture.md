# 架构说明

> 在 DeepSeek Harness 上运行的动态 Cordis 插件（pluginId 前缀 `mdvr`），功能 =「版本记录 + Markdown 对话主题排版」。
> 本文讲整体结构；主题系统细节见 `docs/themes.md`，变量契约见 `docs/variables.md`，开发/发布流程见 `docs/development.md`。

## 1. 设计原则

| 原则 | 落地方式 |
| --- | --- |
| 不可变版本 | 每个 Package 是一个不可变版本，`cordis_run update` 原子切换，失败可回滚到 `currentPackageId`；旧版本永不覆盖、随时可回滚 |
| 双半分工 | Host 管「版本台账」状态与 RPC、主题资产文件读写；Client 管「主题选择 + 排版 + 面板 UI」 |
| 不碰基线 | 主题 = CSS 文件（`plugin/assets/themes/*.css` / `$HOME/.dsh/web-themes-xyy/*.css`），经 `styles.insert` 注入 `body` / `body[data-ds-dark-theme]`；元素排版用 `:where()` 零优先级选择器做增量覆盖；永不修改产品主题注册表或 DOM 结构 |
| 一次迭代一个 Package | 每次改动必须追加新 Package（`cordis_define` kind: existing），绝不覆盖旧版本 |
| 台账双写 | 插件内存台账（进程内，按 `packageId` 去重）+ `manifest/versions.json`（工作区持久态，随 git 留存） |

## 2. 整体分层

```
┌─ Host（DSH Node.js 进程）───────────────────────────────────┐
│  版本台账 ledger（内存态，按 packageId 去重、最新在前）         │
│  RPC：                                                       │
│    versions.note        ← Client 面板挂载时上报自身 MANIFEST  │
│    versions.list        → 台账快照 { current, history }       │
│    themes.builtin.list  → 内置主题 id 列表（文件枚举）          │
│    themes.builtin.get   → 内置主题 CSS（分块）                 │
│    themeAssets.get      → 共享资产 panel.css                    │
│    themes.user.list     → 用户主题 id 列表（文件枚举）          │
│    themes.user.get      → 用户主题 CSS（分块）                 │
│    themes.user.save     → 保存/新建用户主题（事务化分块上传）    │
│  项目根 / 用户主题目录均按内容动态解析，不信任工作区配置          │
├──────────────────────────────────────────────────────────────┤
│              Package-private JSON RPC（host.call）            │
├──────────────────────────────────────────────────────────────┤
│  Client（浏览器页面）                                          │
│  styles.insert(主题 CSS + panel.css)                          │
│    └─ body / body[data-ds-dark-theme]（与产品挂载机制一致）     │
│  slots.inject('settings.section')  → 主题设置页                 │
│  slots.inject('tool.view.cordis', key: 'self') → 版本面板       │
└──────────────────────────────────────────────────────────────┘
```

## 3. Host 半职责（版本台账 + 主题资产）

- **内存台账** `ledger`：条目 `{pluginId, packageId, version, name, palette, date, changes}`，按 `packageId` 去重、最新在前。
- `versions.note`：版本面板挂载时上报自身 Package 的 MANIFEST，Host 记账。
- `versions.list`：返回 `{current, history}` 快照，供面板渲染。
- **内置主题 / 共享资产 / 用户主题全部从文件读取**：`plugin/assets/themes/*.css`、`plugin/assets/panel.css`、`$HOME/.dsh/web-themes-xyy/*.css`（v1.17.0 起 `template.css` 已删除，新建起步改取所选内置主题内容）；改文件即生效，无需升级插件。
- **大文本分块协议**：页面↔宿主单条消息约 16KB 上限；所有大文本（主题 / 模板 / 资产）按 8000 字符/片分块传输。get 侧以 `{index, total, chunk}` 循环拉取（客户端校验 index/total 一致性，防错位拼接）；save 侧为事务化上传（uploadId 隔离并发 + 分片完整性检查 + TTL/并发上限，**全部分片到齐后**拼接），再执行 Host 侧 CSS 语法校验（注释/字符串/花括号/圆括号闭合），错误明确拒绝；单文件上限 100KB。
- **用户主题保存显式放开沙箱**：写 `$HOME/.dsh/web-themes-xyy/<id>.css` 走 `danger-full-access` 策略（用户主动编辑自己的主题文件）。
- 只传 JSON 标量，不序列化任何 Cordis/DSH 活对象。

### 目录解析（不硬编码）

- **项目根** `resolveProjectRoot(ctx)`：⚠️ `sandboxPolicy.workspaceRoot` 是 DSH 主进程启动目录、不一定是插件项目目录。按内容探测：`workspaceRoot` → 其父目录与一级子目录（兄弟项目）→ `FALLBACK_PROJECT_DIR` 兜底；以 `plugin/assets/panel.css` + `plugin/assets/themes/strawberry-mocha.css` 并存为哨兵，首次解析后缓存。
- **用户主题目录** `resolveUserThemesDir(ctx)`：shell 读 `$HOME` → `workspaceRoot` 推导 → `FALLBACK_USER_THEMES_DIR` 三级回退。
- ⚠️ fs 服务的 `stat/readText/listDir/writeText` 必须传 `resolve()` 返回的句柄对象（`{targetKey}`），不能传字符串路径。

## 4. Client 半职责（主题系统 + 版本面板）

- **主题层**：`styles.insert(主题CSS + panelCss)`；浅色写 `body`、深色写 `body[data-ds-dark-theme]`（与产品挂载机制一致）。切换 = `applySelection(id)` 先生成并成功插入新样式、再卸载旧样式（原子切换，目标不可用时旧主题保持不动）。`ctx.effect` 持有样式表 disposer，stop/update/undefine 自动还原。
- **设置页**：`slots.inject('settings.section')` 注册「主题设置」页（id `mdvr-theme`），含外观三档（☀️/🌙/🖥️，走产品 `theme` 服务，可选依赖）、系统自带/内置/用户主题互斥选择、用户主题刷新/新建/编辑。
- **版本面板**：`slots.inject('tool.view.cordis')` + `slots.register({name, key: 'self'})`，渲染在最新 `cordis_run` 卡片内：当前版本徽标 + 本次变更日志 + 历史台账。

## 5. 版本模型

```
Plugin（稳定实例，pluginId）
 └── Package（不可变版本，packageId）v1.0.0
 └── Package v1.1.0
 └── Package …
```

- `currentPackageId` = 最近一次完全成功的版本；`nextPackageId` = 正在审批/激活/最近失败的目标。
- 每个 Package 内嵌 `MANIFEST`（version / name / palette / date / changes），Host 与 Client 各一份，是版本的「身份证」；台账记录以 `packageId` 为唯一键：同一版本重复激活只更新时间，不产生重复条目。
- 动态插件是内存态：进程重启后插件丢失，需用当前 `plugin/host.js` + `plugin/client.js` 重新 define；历史台账在 `manifest/versions.json`。

## 6. 主题管线（文件即主题）

1. 在 `plugin/assets/themes/`（内置）或 `$HOME/.dsh/web-themes-xyy/`（用户）新建/修改 `.css`：浅色写 `body { ... }`、深色写 `body[data-ds-dark-theme] { ... }`，13 个 `--dsw-alias-*` 与 `--mdvr-*` 变量定义在文件内（契约见 `docs/variables.md`）。
2. 内置主题需要在 `plugin/src/client.core.js` 的 `THEME_META` 注册显示名/描述/双档色板，并运行 `node scripts/build-client.js`（用户主题自动出现在列表，无需注册）。
3. 改文件后刷新页面即生效（Host 每次 RPC 从文件读取）。
4. 需要发布新版本时按 `docs/development.md` 走完整迭代流程。

## 7. 排版策略

- 对话 Markdown 排版由**产品 `._markdown_*` 规则兜底**；主题只在自己的 ③ 元素定制段用 `:where()` 做增量覆盖——`:where()` 零优先级，产品显式样式天然胜出，只有「裸语义元素」吃到主题排版，副作用最小化；需要覆盖产品显式样式时按需 `!important`（内置主题 ③ 段即如此）。
- 早期排版骨架（独立 typography.css）已废弃：由产品兜底 + 主题增量覆盖取代。
- 颜色一律引用变量（`--dsw-alias-*` 全局 token + `--mdvr-*` 身份色），深浅自动跟随，不写死色值。

## 8. 文件职责

| 文件 | 职责 |
| --- | --- |
| `plugin/host.js` | Host 半源码镜像（与 Harness 内定义一致，供 git 留存/对照；含 MANIFEST） |
| `plugin/src/client.core.js` | Client 半源文件（唯一改逻辑处；含 MANIFEST、THEME_META、默认选择） |
| `plugin/client.js` | Client 构建产物（`node scripts/build-client.js` 拷贝生成，禁止手改） |
| `plugin/assets/themes/*.css` | 内置主题（4 个，文件即主题） |
| `plugin/assets/panel.css` | 插件自有 UI 样式（版本卡片 / 设置页 / 编辑器） |
| `plugin/assets/themes/*.css` | 参考实现 = 内置 `strawberry-mocha`（原 template.css 已删，v1.17.0） |
| `scripts/build-client.js` | 源 → 产物拷贝 + 资产完整性检查 |
| `scripts/check-release.js` | 发布门禁（MANIFEST 一致性 / 语法 / 资产 / CSS 契约 / packageId 提示） |
| `scripts/minify.js` | 双半精简产物（define 传输用） |
| `manifest/versions.json` | 版本台账持久态，每次迭代追加，packageId 在 define 后回填 |
| `docs/architecture.md` | 本文：整体架构与职责边界 |
| `docs/themes.md` | 主题系统规范（能力边界 / 文件格式 / 选择模型 / 新增主题） |
| `docs/variables.md` | 统一变量契约（L0~L3 全部变量名单与默认值） |
| `docs/capabilities.md` | 能力全景与路线图 |
| `docs/development.md` | 贡献者开发/发布流程与快速排查 |
| `README.md` / `README.en.md` / `AGENTS.md` / `LICENSE` | 项目说明（中/英）/ 项目记忆 / 许可证 |
| `package.json` / `cordis.patch.yml` | 常驻安装包清单 / dsh bundle 插件行（`dsh plugin add` 挂载） |
| `lib/index.mjs` / `client/client.js` | 常驻安装版双半产物（`scripts/build-installed.js` 生成，勿手改） |
| `screenshots/` | README 主题预览画廊图片 |

## 9. 双通道（动态 define / 常驻安装）

同一份源码、两条装载通道，仅通信传输不同：

| | 动态 define（开发迭代） | 常驻安装（dsh plugin add） |
| --- | --- | --- |
| Host 半注册 | `harness.handle`（动态注入全局） | `webServer.register`（`/mdvr/api/*` HTTP JSON 路由） |
| Client 半 | 运行时全局 `host`/`styles`/`React` | 包装器内同签名桥（fetch + `<style>` 注入 + `require('react')`） |
| 生命周期 | 内存态，进程重启丢失 | 随 `dsh web` 常驻，bundle 层装载 |

host.js 的 `registerRpc()` 按 `typeof harness` 自动选择通道（有 harness 走动态，无则走 webServer）；改源码后两个通道的产物都要重新生成（`build-client.js` + `build-installed.js`）。