# 架构说明

## 1. 设计原则

| 原则 | 落地方式 |
| --- | --- |
| 不可变版本 | 每个 Package 是一个不可变版本，`cordis_run update` 原子切换，失败可回滚到 `currentPackageId` |
| 双半分工 | Host 管「版本台账」状态与 RPC；Client 管「主题 + 排版 + 面板 UI」 |
| 不碰基线 | 主题 = CSS 文件（`themes/*.css` / `~/.dsh/web-themes/*.css`）经 `styles.insert` 注入 `body` / `body[data-ds-dark-theme]`，排版用 `styles.insert` 的 `:where()` 零优先级选择器，永不修改产品主题注册表或 DOM 结构 |
| 一次迭代一个 Package | 修改必须追加新 Package，绝不覆盖旧版本；旧版本随时可 rollback |
| 台账双写 | 插件内存台账（进程内）+ `manifest/versions.json`（工作区持久态，随 git 留存） |

## 2. 分层

```
┌─ Host（DSH Node.js 进程）──────────────────────────────┐
│  version ledger（内存台账，按 packageId 去重）           │
│  harness.handle('versions.note')   ← Client 激活时上报   │
│  harness.handle('versions.list')   → 返回台账快照        │
│  harness.handle('themes.builtin.list') / themeAssets.get │
│  harness.handle('themes.user.list|get|save')             │
└─────────────────────────────────────────────────────────┘
              │  Package-private JSON RPC（host.call）
┌─ Client（浏览器页面）───────────────────────────────────┐
│  styles.insert(typography + 主题 CSS + panel CSS)        │
│    └─ body / body[data-ds-dark-theme]（与产品挂载一致）   │
│  tool.view.cordis (key: self)                            │
│    └─ 版本卡片：当前版本徽标 + 变更日志 + 历史台账         │
└─────────────────────────────────────────────────────────┘
```

### Host 半职责（版本台账 + 主题文件）

- 持有内存台账 `ledger`：`{pluginId, packageId, version, name, palette, date, changes}`，按 `packageId` 去重、最新在前。
- `versions.note`：Client 面板挂载时上报自身 Package 的 MANIFEST，Host 记账。
- `versions.list`：返回 `{current, history}` 快照。
- 内置主题 / 共享资产 / 用户主题全部从文件读取（`themes/*.css`、`plugin/assets/*.css`、`$HOME/.dsh/web-themes/*.css`）；大文本走分块协议（8000 字符/片）。
- `themes.user.save` 为事务化上传（uploadId 隔离 + 分片完整性 + Host 侧 CSS 校验）。
- 只传 JSON 标量，不序列化任何 Cordis/DSH 活对象。

### Client 半职责（主题 + 排版 + 面板）

- **主题层**：`styles.insert(typographyCss + 主题css + panelCss)`，浅色 `body` / 深色 `body[data-ds-dark-theme]`；切换 = 先构建新样式、成功后再替换旧样式（原子，v1.3.0）。
- **排版层**：`styles.insert(css)`，包级样式表，卸载自动清理。
- **版本面板**：`slots.inject('tool.view.cordis')` + `slots.register({name, key: 'self'})`，渲染在最新 `cordis_run` 卡片内。

## 3. 版本模型

```
Plugin（稳定实例，pluginId）
 └── Package（不可变版本，packageId）v0.1.0
 └── Package v0.2.0
 └── Package v0.3.0 ...
```

- `currentPackageId` = 最近一次完全成功的版本；`nextPackageId` = 正在审批/激活/最近失败的目标。
- 每个 Package 内嵌 `MANIFEST`（版本号、名称、日期、主题名、变更日志），是版本的“身份证”。
- 台账记录以 `packageId` 为唯一键：同一版本重复激活只更新时间，不产生重复条目。

## 4. 主题管线（如何新增/调整配色）

1. 在 `themes/`（内置）或 `$HOME/.dsh/web-themes/`（用户）新建/修改 `.css`，浅色写 `body{...}`、深色写 `body[data-ds-dark-theme]{...}`，13 个 `--dsw-alias-*` + `--mdvr-*` 变量定义在 CSS 内。
2. 内置主题在 `plugin/src/client.core.js` 的 `THEME_META` 加显示信息。
3. 改资产/主题文件后刷新页面即生效（Host 每次 RPC 从文件读取）。
4. 升级 Package → 页面刷新 → 新样式表替换旧样式表。

## 5. 排版策略

- 全部使用 `:where()` 零优先级选择器，产品自带 class 样式的组件天然胜出，只有“裸语义元素”的 Markdown 内容吃到我们的排版 → 副作用最小化。
- 变量一律引用 `var(--dsw-alias-*)` token，深浅色自动跟随，无需写死颜色。
- v0.1 为通用基线（中文字体栈、行高、标题/列表/代码/引用/表格/分割线/kbd）；后续迭代可按真实渲染 DOM 精细化作用域。

## 6. 文件职责

| 文件 | 职责 |
| --- | --- |
| `plugin/host.js` / `plugin/client.js` | 当前 Package 源码镜像（与 Harness 内定义一致，供 git 留存/对照） |
| `manifest/versions.json` | 版本台账持久态，每次迭代追加，packageId 在 define 后回填 |
| `docs/iteration-playbook.md` | 迭代步骤清单 |
| `docs/capabilities.md` | 能力清单与路线图 |
