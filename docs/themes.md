# 主题系统规范

> 主题系统 = 插件能控制的所有 CSS 的收敛。**每套主题 = 一个独立 CSS 文件**：内置主题在 `plugin/assets/themes/*.css`（随插件打包携带），用户主题在 `$HOME/.dsh/web-themes/*.css`（放文件即新主题，无需打包/升级插件）。
> 主题文件里用到的全部变量（13 个 `--dsw-alias-*` 平台 token、`--mdvr-*` 身份色、`--hl-*` 语法高亮、L2/L3 排版常量）的名单与默认值见 `docs/variables.md`。

## 一、插件能控制什么 / 到什么程度

| 层 | 内容 | 控制范围 | 程度 |
| --- | --- | --- | --- |
| ① 全局 token | `--dsw-alias-*` 13 个（bg 三层/overlay/边框×2/品牌/文字×2/语义×3/侧栏） | 整个应用表面、文字、边框、语义色 | 浅/深双值，全量覆盖 |
| ② 强调变量 | `--mdvr-*`（accent 系 5 + link 系 2 + highlight 系 2 + quote 系 2 + code/table 系 3 + 字体 2 + 旋钮 1，共 17 个核心；另有标题/文本/列表/派生扩展） | 排版层的全部色彩细节 | 浅/深双值 |
| ③ 元素排版 | 对话 Markdown 排版由产品 `._markdown_*` 规则兜底，主题通过自身 ③ 段（`:where()` 零优先级 + 按需 `!important`）增量覆盖 | 所有 Markdown 元素（标题/段落/列表/代码/表格/引用/分割线/链接/高亮/选区等） | 主题 ③ 段（规则级） |
| ④ 面板 UI | `plugin/assets/panel.css` + 自绘组件（版本卡片 / 主题设置页 / 主题编辑器） | 插件自有 UI | 完全控制 |

### 明确做不到（平台限制）

1. **不改产品 DOM**：不能改类名、结构、属性；不能操作 `document.body` / `window`。
2. **零优先级**：`:where()` 意味着产品显式样式永远优先，主题只兜底「裸语义元素」；要覆盖产品显式样式需按需 `!important`。
3. **token 名单固定**：13 个 `--dsw-alias-*` 由平台 `Theme.listTokens` 决定，不可新增（新颜色只能走 `--mdvr-*` 自定义变量）。
4. **无持久化**：选择为会话级内存态，刷新/重启后恢复默认（`DEFAULT_SELECTION = 'system-native'`）。
5. **无 JS 进对话流**：只能注册平台预留的座位（run 卡片、设置页、侧栏动作等）。

## 二、主题文件格式（三段式）

每个主题一个 CSS 文件，三段式结构（全部带注释，参考 `plugin/assets/themes/strawberry-mocha.css`）：

```css
/* 文件头注释：主题 id / 名称 / 风格说明 / 色值来源 */

/* ① 浅色档：13 个全局 token + --mdvr-* 强调变量 */
body { ... }

/* ② 深色档：同 ① 的深色取值 */
body[data-ds-dark-theme] { ... }

/* ③ 元素级定制（可选）：追加在 ① ② 之后，:where() 增量覆盖产品兜底 */
:where(...) { ... }
```

要点：

- **挂载机制与产品一致**：浅色写 `body`、深色写 `body[data-ds-dark-theme]`——产品用**属性选择器**标记深色，不是 `@media (prefers-color-scheme)`；选择器拼错则深色档完全不生效且不回退。插件样式注入晚于产品样式表，同选择器后者胜出。
- **变量齐全性**：`--mdvr-sans` / `--mdvr-mono` / `--mdvr-mm` 是排版常量；`--mdvr-link*` / `--mdvr-highlight*` 是公共约定（链接蓝 + 琥珀高亮）；`--mdvr-accent*` / `--mdvr-quote*` / `--mdvr-code-*` / `--mdvr-table-*` 是主题身份色。变量分层（L0 → L1 → L2 → L3）与全部默认值见 `docs/variables.md`。
- **元素作用域**：主题 ③ 段全部规则以 `[class*="_markdown_"]` 限定（产品对话 Markdown 容器的 CSS Modules 稳定子串），只影响对话内容，设置面板等 UI 不被波及；`:where()` 包裹选择器，零优先级兜底。选区 / 滚动条 / 焦点环（主题签名层）刻意保持全站生效。
- **`!important` 的使用**：产品对对话 Markdown 有显式样式（`._markdown_*` 类规则，特异性 ≥ (0,2,x)），`:where()` 归零后必然输给产品；主题身份属性需要 `!important` 取胜（内置主题 ③ 段即如此，见注释说明）。

## 三、选择模型

设置页「主题设置」分两组互斥单选：

1. **「系统自带」（默认，`DEFAULT_SELECTION = 'system-native'`）**：插件零干预——不注入 token/排版/变量，界面保持 DSH 出厂观感，深浅跟随系统/外观选择。
2. **内置 / 用户主题（互斥单选）**：选中即注入「主题 CSS + panel.css」，整体替换观感，取消选中（回到系统自带）即还原。

**外观 ☀️ 浅色 / 🌙 深色 / 🖥️ 跟随系统**：对任意选中主题可用（仅 `themeService` 缺失时按钮禁用），走产品 `theme.setTheme` 官方接口，实时生效且偏好持久化。主题 CSS 自带 `body`（浅）与 `body[data-ds-dark-theme]`（深）两档，切换外观档即跟随生效；只写单档的主题在另一档保持原样。

## 四、用户主题（动态添加、可编辑）

- **目录**：`$HOME/.dsh/web-themes/`，动态解析不硬编码——shell 读 `$HOME` → `workspaceRoot` 推导 → 回退目录（host.js `resolveUserThemesDir`）。放任意 `*.css` 即新主题，**无需打包/升级插件**。
- **id 约束**：文件名仅允许字母/数字/下划线/连字符，且不以点或连字符开头（`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`）。
- **添加方式三选一**：
  1. 手动放入 `*.css`（三段式格式，参考内置主题或完整参考主题 `plugin/assets/template.css`）→ 设置页「🔄 刷新用户主题」即生效；
  2. 设置页「🆕 新建用户主题」：默认以**内置主题 `strawberry-mocha` 的内容本身**起步（浅/深/元素定制全注释，填文件名保存）；未加载到时回退 `plugin/assets/template.css`（青瓷参考版）；
  3. 已有主题卡片右上「✏️ 编辑」：改 CSS 后「💾 保存」写回原文件。
- **编辑器能力**：实时语法高亮（透明 textarea 叠彩色 pre：注释/字符串/选择器/变量/at 规则/颜色/数值/属性名分色，跟随主题变量配色）；「🧹 格式化」一键排版（补分号、花括号换行、2 空格缩进、注释保留，结果通过语法校验才覆盖原文）；「Tab」插入缩进；保存走 Host `themes.user.save`（事务化分块上传 + 双端 CSS 校验 + 100KB 上限），沙箱显式放开；保存成功后若该主题正被使用则自动重新应用（修改即时生效）。
- **内置主题只读**：`plugin/assets/themes/*.css` 的卡片无「✏️ 编辑」按钮；但内置主题与共享资产由 Host 从文件读取，改文件后刷新/重启插件即生效，无需重新打包。

## 五、内置主题

| 文件 | 名称 | 风格 |
| --- | --- | --- |
| `plugin/assets/themes/strawberry-mocha.css` | 草莓猛男粉（标准参考实现） | 丝绒草莓甜点 × Catppuccin Mocha 暗夜：原生列表符号 + 全量 `--mdvr-*` 身份色 + `--hl-*` 语法高亮 + L2/L3 排版常量（全变量化参考实现，带完整 ③ 元素段，变量分层见 `docs/variables.md`） |
| `plugin/assets/themes/Cyber-Titanium-native.css` | Cyber Titanium · 钛影 | 2026 Mac 极客：Space Black 空间黑 × 阳极钛紫 × 电光青 × 冷银 |
| `plugin/assets/themes/High-Vis-Clarity-native.css` | High-Vis Clarity · 高清晰 | 旧显示器/低色域友好：高反差冷白 × 强辨识纯天蓝 × 黄金重点 |
| `plugin/assets/themes/Pine-Smoke-Ink-native.css` | 松烟墨黛 | 2026 中文文人：徽墨沉香 × 矿物朱砂 × 远山黛蓝 × 宣纸冷白 |

四个内置主题按**同一变量契约 100% 对齐**（变量名单/三层作用域逐项一致，仅配色不同），`strawberry-mocha` 为参考实现；`THEME_META`（`plugin/src/client.core.js`）注册各主题的显示名/描述/双档色板预览。

## 六、构建与切换机制

- **构建**：`node scripts/build-client.js` = 拷贝 `plugin/src/client.core.js` → `plugin/client.js` + 资产完整性检查。CSS 资产不内联，Host 运行时从文件读取。
- **define 传输**：`node scripts/minify.js` 生成精简双半（仅删注释/折叠空白，token 流等价断言），一次传 host+client 双半；define 后 `cordis_inspect_self` 核对双半完整再 run。
- **发布门禁**：`node scripts/check-release.js` 自动核对 MANIFEST 一致性、构建产物、资产完整性、CSS 结构闭合、内置主题浅/深双档挂载（`body` + `body[data-ds-dark-theme]`）、panel.css 的 `var(--mdvr-*)` 全部带回退。
- **注入与原子切换**：`applySelection(id)` 先构建目标 CSS（主题文件缺失/unavailable 时返回失败不动现状），成功插入新样式后再卸载旧样式；「系统自带」只注入 panel.css。
- **卸载**：`ctx.effect` 持有样式表 disposer，stop/update/undefine 自动还原注入的样式。

## 七、如何新增一个主题

1. 在 `plugin/assets/themes/`（内置）或 `$HOME/.dsh/web-themes/`（用户）新建 `.css`（复制任意主题为模板，改头注释：主题 id / 名称 / 风格说明）。
2. 定 13 个 `--dsw-alias-*` token 的浅/深值。浅档语义色按 WCAG AA 实测值：error `#c74330` / success `#287b38` / warn `#985d00`（白底与页面底均达标）。
   > ⚠️ **浅色分界色注意**：浅色档边框/分层底色 vs 背景的对比是灰阶差显示器的重灾区——WCAG 1.4.11 非文本要求 ≥3:1，粉调审美受约束时至少 ≥2:1 肉眼可辨。调整优先级：先改主题专属 `--mdvr-code-border` 等，再谨慎动 L0 `--dsw-alias-border-*`（会波及整个产品 UI）。
3. 定 accent 系变量（tint 配方：`result = round(α·A + (1−α)·S)`，浅档 α=12%、深档 α=14%）。
4. 需要差异化元素时写 ③ 段扩展规则（`:where()` + markdown 限定；必要时 `!important`）。
5. 内置主题在 `plugin/src/client.core.js` 的 `THEME_META` 加一行（显示名/描述/双档色板预览），然后 `node scripts/build-client.js`；用户主题自动出现在列表，无需注册。
6. `node scripts/check-release.js` 过门禁 → 定义新 Package → update → 设置页验证（浅/深两档 + 面板）。

## 八、完整参考主题（第三方用户手册）

- **完整参考主题 = `plugin/assets/template.css`**：用最小文件演示「一个主题能改的全部内容」，每条规则注释写明影响范围——
  ① 头部警告区：挂载机制（属性选择器非媒体查询）、`:where()` 零优先级、13 token 固定名单、外观三档跟随、WCAG AA、生效方式（刷新即生效）、谨慎项（勿 @import 外部 URL、语法错误整段失效）；
  ② 浅色档 / 深色档：13 个全局 token（官方语义注释）+ `--mdvr-*` 变量（每个标注影响哪些元素）；
  ③ 元素级定制：全部可控元素规则（标题/段落/列表/任务框/行内代码/代码块/引用/表格/分割线/链接/粗体/高亮/删除线/上下标/kbd/图片）；
  ④ 扩展示例：选区 / 滚动条 / 斑马纹 / 焦点可见性；
  ⑤ 尾部配色速查：tint 配方、浅档语义色 AA 实测值、链接色建议、边条优先原则、深档亮度控制。
- **「🆕 新建用户主题」起点**：默认取内置 `strawberry-mocha` 的内容本身（它是最完整的参考实现）；`template.css` 作为加载失败时的回退模板。
- 编写主题时的硬性检查：浅色 `body` / 深色 `body[data-ds-dark-theme]`；元素定制一律 `:where()`；`--dsw-alias-*` 固定 13 个不可新增；正文对比度 ≥4.5:1。