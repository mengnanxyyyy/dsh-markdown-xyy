# 主题系统说明（v0.5.0）

> 本插件能控制的全部 CSS 都收敛为「主题注册表」：一套共享排版骨架 + 多套主题配置。
> 每套主题 = 13 个全局 token + `--mdvr-*` 强调变量 + 专属扩展 CSS。

## 一、插件能控制什么 / 到什么程度

| 层 | 内容 | 控制范围 | 程度 |
| --- | --- | --- | --- |
| ① 全局 token | `--dsw-alias-*` 13 个（bg 三层/overlay/边框×2/品牌/文字×2/语义×3/侧栏） | 整个应用表面、文字、边框、语义色 | 浅/深双值，全量覆盖 |
| ② 强调变量 | `--mdvr-*`（accent 系 5 个 + highlight 系 2 个 + quote/code/table 系 5 个 + link 系 2 个） | 排版层的全部色彩细节 | 浅/深双值（`prefers-color-scheme`） |
| ③ 元素排版 | `TYPO_CSS` 约 30 条规则：字体栈、字号、行高、间距、圆角、边框、阴影、动效、列表符号、表格、代码、引用、hr、kbd、img、mark | 所有 Markdown 元素的样式 | 规则级（`:where()` 零优先级） |
| ④ 面板 UI | `PANEL_CSS` + 自绘组件（版本卡片 / 主题设置页） | 插件自有 UI | 完全控制 |

### 明确做不到（平台限制）

1. **不改产品 DOM**：不能改类名、结构、属性；不能操作 `document.body`/`window`。
2. **零优先级**：`:where()` 意味着产品显式样式（类选择器）永远优先，我们只兜底"裸语义元素"。
3. **token 名单固定**：13 个 `--dsw-alias-*` 由平台 `Theme.listTokens` 决定，不可新增（新色只能走 `--mdvr-*` 自定义变量）。
4. **无持久化**：动态插件是内存态，设置页的选择在刷新/重启后恢复默认（`ACTIVE_THEME` 配置项决定默认值）。
5. **无 JS 组件进对话流**：只能注册平台预留的座位（run 卡片、设置页、侧栏动作等），不能往消息流里插自定义组件。

## 二、主题文件格式（`plugin/client.js` 的 `THEMES` 注册表）

每个主题是一个自包含对象，**全部字段必填、每部分带注释**：

```js
'主题id': {
  name: '显示名',
  desc: '一句话描述（设置页展示）',
  // ① 全局 token：浅/深双值（来源 Theme.listTokens，13 个）
  tokens: { '--dsw-alias-bg-base': { light: '#f8f8f8', dark: '#000000' }, /* ... */ },
  // ② 强调变量：浅/深两档；公共变量（link/highlight 系）可省略 → 回退 DEFAULT_VARS
  vars: {
    light: { '--mdvr-accent': '#5856d6', /* ... */ },
    dark:  { '--mdvr-accent': '#a8a5f5', /* ... */ },
  },
  // ③ 专属扩展 CSS：追加在共享 TYPO_CSS 之后（可选，空字符串表示不扩展）
  css: ':where(pre) { border-radius: 12px; }',
},
```

共享骨架 `TYPO_CSS` 只引用 `var(--dsw-alias-*)` 与 `var(--mdvr-*)`，**不含任何写死色值**——主题切换 = 换变量，骨架不动。

## 三、内置主题

| id | 名称 | 风格 |
| --- | --- | --- |
| `lobeui-emphasis` | LobeUI 风格（强调） | LobeUI 原生中性色 + 靛蓝强调系统（默认） |
| `inkpaper` | 墨纸 · InkPaper | 暖纸身份：米白纸底 + 墨褐 accent + 琥珀 highlight |
| `qingci` | 青瓷 | 青绿灰阶：瓷白底 + 青瓷绿 accent |

## 四、如何新增一个主题

1. 复制任意主题块，改 id/name/desc；
2. 定 13 个 token 的浅/深值（注意：浅档语义色建议参考 `docs/readability-a11y.md` 的 AA 值）；
3. 定 accent 系变量的浅/深值（建议生成 tint 配方：`result = round(α·A + (1−α)·S)`，浅档 α=12%、深档 α=14%）；
4. 需要差异化元素时写 `css` 扩展规则；
5. 定义新 Package → update → 设置页里验证。

## 五、切换机制（`activateTheme`）

1. `theme.overrideTokens('md-theme', tokens)`：同 source 重调 = 整层替换并置顶（token 层无需先卸）。
2. `styles.insert(varsCss + TYPO_CSS + theme.css + PANEL_CSS)`：先 dispose 旧样式表，再注入新组合。
3. 卸载（stop/update/undefine）：`ctx.effect` 持有两个 disposer，Fiber 清理时自动还原。
4. 默认主题由文件顶部 `ACTIVE_THEME` 配置项决定；设置页切换为会话级（内存态）。

## 六、注释规范（本项目约定）

- 文件头部：总览注释（结构图 + 能力清单 + 限制）。
- 每个 Section：`// ====` 分隔 + 职责说明。
- 每个主题块：块首注释（风格说明、色值思路）。
- 每条 CSS 规则：行内注释说明用途；引用变量时注明变量含义。
- 台账/镜像/文档与 Package 代码保持同步（见 `docs/iteration-playbook.md`）。
