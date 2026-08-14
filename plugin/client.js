// ============================================================
// Client half v0.5.0 — 主题系统 + Markdown 排版 + 版本面板
// 镜像 mdvr-1/pkg-4，与 Harness 定义保持一致
//
// 【文件结构总览】
//   §1 配置区        —— ACTIVE_THEME（默认主题）与公共变量 DEFAULT_VARS
//   §2 字体栈        —— 共享 sans/等宽栈（Geist 优先 + 中文回退）
//   §3 主题注册表    —— THEMES：每套主题 = tokens(13) + vars(--mdvr-*) + css(扩展)
//       3.1 lobeui-emphasis  LobeUI 原生中性色 + 靛蓝强调系统（默认）
//       3.2 inkpaper         暖纸：米白纸底 + 墨褐 accent
//       3.3 qingci           青瓷：青绿灰阶 + 青瓷绿 accent
//   §4 共享排版骨架  —— TYPO_CSS：只引用 var(--dsw-alias-*) / var(--mdvr-*)，不含写死色值
//   §5 面板与设置页样式 —— PANEL_CSS（版本卡片 + 主题设置页）
//   §6 主题切换引擎  —— buildVarsCss / activateTheme（token 层替换 + 样式表重建）
//   §7 组件          —— VersionCard（版本卡片）/ ThemeSettings（主题设置页）
//   §8 插件入口 apply()
//
// 【能控制什么 / 到什么程度】（详见 docs/themes.md）
//   ① 全局 token：13 个 --dsw-alias-*（浅/深双值）→ 整个应用配色
//   ② 强调变量：--mdvr-*（accent/highlight/quote/code/table/link 系）→ 排版层色彩细节
//   ③ 元素排版：TYPO_CSS 约 30 条规则 → 全部 Markdown 元素的字体/间距/圆角/边框/动效
//   ④ 面板 UI：自绘组件 + 专属样式 → 完全控制
//   限制：不改产品 DOM；:where() 零优先级（产品显式样式优先）；token 名单固定 13 个；无持久化
// ============================================================

// ---------- §1 配置区 ----------
// 版本清单（版本面板与 Host 台账使用；与 plugin/host.js 的 MANIFEST 保持一致）
const MANIFEST = {
  version: '0.5.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme',
  date: '2026-08-14',
  changes: [
    '主题系统化：全部可定制 CSS 收敛为主题注册表（13 token + --mdvr-* 变量 + 每主题扩展 CSS），全量注释',
    '内置 3 主题：lobeui-emphasis（默认）/ inkpaper（暖纸）/ qingci（青瓷）',
    '设置页「主题设置」：卡片式切换（会话级内存态，默认 ACTIVE_THEME 可配置）',
    '切换引擎：token 层整层替换 + 样式表重建，卸载自动清理',
  ],
}

// 默认主题 id（设置页切换为会话级内存态，刷新/重启后恢复此值）
const ACTIVE_THEME = 'lobeui-emphasis'

// 公共强调变量：所有主题共享（链接蓝约定 + 琥珀高亮），主题可覆盖同名字段
const DEFAULT_VARS = {
  light: {
    '--mdvr-link': '#005ae0',             // 链接色（WCAG AA 实测 5.93:1，geekblue step10）
    '--mdvr-link-hover': '#0072f5',       // 链接 hover（变浅提示可交互）
    '--mdvr-highlight': '#b3541e',        // 琥珀高亮（与 warn 金区分：更红更沉）
    '--mdvr-highlight-soft': '#fdf0dc',   // 琥珀高亮 tint 底（mark 元素用）
  },
  dark: {
    '--mdvr-link': '#60b1ff',             // 深色档链接（blue[9]，深底上提亮）
    '--mdvr-link-hover': '#a7d3ff',       // 深色档 hover（更亮）
    '--mdvr-highlight': '#ffb45e',        // 深色档琥珀（提亮保对比）
    '--mdvr-highlight-soft': '#3a2f1e',   // 深色档琥珀 tint 底（近黑，避免刺眼）
  },
}

// ---------- §2 字体栈（共享，主题不可覆盖） ----------
const FONT_SANS = [
  'Geist', '-apple-system', 'BlinkMacSystemFont',
  '"Segoe UI Variable Display"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial',
  '"HarmonyOS Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"',
  '"Microsoft YaHei UI"', '"Microsoft YaHei"', '"Source Han Sans SC"', '"Noto Sans CJK SC"',
  'ui-sans-serif', 'system-ui', 'sans-serif',
  '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"',
].join(', ')
const FONT_MONO = [
  '"Geist Mono"', 'ui-monospace', 'SFMono-Regular', '"SF Mono"',
  'Menlo', '"Cascadia Code"', 'Consolas', '"Liberation Mono"', 'monospace',
].join(', ')

// ---------- §3 主题注册表 ----------
// 每套主题 = { name, desc, tokens, vars, css }
//   tokens：13 个全局 token（浅/深双值）—— 控制整个应用配色
//   vars  ：--mdvr-* 强调变量（浅/深两档，公共变量省略则回退 DEFAULT_VARS）
//   css   ：专属扩展规则（追加在共享骨架之后，可覆盖/补充元素样式）
const THEMES = {
  // ---- 3.1 lobeui-emphasis：LobeUI 原生中性色 + 靛蓝强调系统（默认） ----
  // 色值来源：lobe-ui master 色板（gray/primary/red/lime/blue step9）+ readability-a11y WCAG 修正
  'lobeui-emphasis': {
    name: 'LobeUI 风格（强调）',
    desc: 'LobeUI 原生中性色 + 靛蓝强调系统（默认）',
    tokens: {
      '--dsw-alias-bg-base': { light: '#f8f8f8', dark: '#000000' },           // 应用底色：lobe bgLayout gray[1]/[0]
      '--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#0d0d0d' },        // 抬升表面：lobe bgContainer gray[0]/[1]
      '--dsw-alias-bg-layer-2': { light: '#f0f0f0', dark: '#1a1a1a' },        // 嵌套表面（代码/引用衬底）
      '--dsw-alias-bg-overlay': { light: '#ffffff', dark: '#1a1a1a' },        // 浮层
      '--dsw-alias-border-l1': { light: '#e3e3e3', dark: '#202020' },         // 主边框 gray[3]
      '--dsw-alias-border-l2': { light: '#eeeeee', dark: '#1a1a1a' },         // 次边框 gray[2]
      '--dsw-alias-brand-primary': { light: '#222222', dark: '#eeeeee' },     // 品牌主色：lobe primary[9]（中性黑/白）
      '--dsw-alias-label-primary': { light: '#080808', dark: '#ffffff' },     // 主文字 gray[12]
      '--dsw-alias-label-secondary': { light: '#666666', dark: '#aaaaaa' },   // 次文字 gray[10]
      '--dsw-alias-state-error-primary': { light: '#c74330', dark: '#f4416c' },   // 错误：浅档 AA 加深 / 深档 red[9]
      '--dsw-alias-state-success-primary': { light: '#287b38', dark: '#c4f042' }, // 成功：浅档 AA 加深 / 深档 lime[9]
      '--dsw-alias-state-warn-primary': { light: '#985d00', dark: '#ffb224' },    // 警告：浅档 AA 加深 / 深档 gold[9]
      '--dsw-specific-sidebar-fill': { light: '#f0f0f0', dark: '#101010' },   // 侧栏底（灰阶近似）
    },
    vars: {
      // 靛蓝 accent 系：与链接蓝错色相、与成功绿/警告金分离（readability-palette）
      light: {
        '--mdvr-accent': '#5856d6',             // 主强调色：边条/代码块左标条/列表符号
        '--mdvr-accent-text': '#1d4ed8',        // tint 面上的强调文字（AA 实测 5.72:1）
        '--mdvr-accent-soft': '#ebebfa',        // 强调 tint 底（行内代码/嵌套引用）
        '--mdvr-accent-faint': '#b4b3ed',       // 45% 预混（h1 下划线）
        '--mdvr-accent-fainter': '#cdccf3',     // 30% 预混（hr 分割线）
        '--mdvr-code-border': '#d5d2f4',        // 行内代码描边（靛蓝 tint）
        '--mdvr-table-head-bg': '#edecfb',      // 表头底（靛蓝 tint）
        '--mdvr-table-head-text': '#3b3aa8',    // 表头字（≥5.9:1）
        '--mdvr-quote-bg': '#f2f1fc',           // 引用衬底
        '--mdvr-quote-border': '#5856d6',       // 引用边条
      },
      dark: {
        '--mdvr-accent': '#a8a5f5',             // 深色档主强调（提亮保对比）
        '--mdvr-accent-text': '#7dd3fc',        // 深色档 tint 上文字（天青，AA）
        '--mdvr-accent-soft': '#23222d',        // 深色档 tint 底（近黑，13.5:1）
        '--mdvr-accent-faint': '#535175',       // 深色档 45% 预混
        '--mdvr-accent-fainter': '#3c3b53',     // 深色档 30% 预混
        '--mdvr-code-border': '#3a3750',        // 深色档代码描边
        '--mdvr-table-head-bg': '#23222d',      // 深色档表头底
        '--mdvr-table-head-text': '#c6c3ff',    // 深色档表头字
        '--mdvr-quote-bg': '#1d1c26',           // 深色档引用衬底
        '--mdvr-quote-border': '#8f8bf2',       // 深色档引用边条
      },
    },
    css: '', // 该主题无专属扩展，完全走共享骨架
  },

  // ---- 3.2 inkpaper：暖纸（米白纸底 + 墨褐 accent + 琥珀 highlight） ----
  // 东方纸墨感：浅色像宣纸、深色像玄夜；引用块恢复卡片感（专属 css）
  'inkpaper': {
    name: '墨纸 · InkPaper',
    desc: '暖纸身份：米白纸底 + 墨褐 accent',
    tokens: {
      '--dsw-alias-bg-base': { light: '#faf6ef', dark: '#14120f' },           // 宣纸米白 / 玄夜近黑
      '--dsw-alias-bg-layer-1': { light: '#f2ece0', dark: '#1d1915' },        // 抬升表面（暖灰米）
      '--dsw-alias-bg-layer-2': { light: '#e9e1d0', dark: '#28231d' },        // 嵌套表面
      '--dsw-alias-bg-overlay': { light: '#fffdf8', dark: '#211c17' },        // 浮层
      '--dsw-alias-border-l1': { light: '#dbcfb3', dark: '#3a342b' },         // 主边框（纸色加深）
      '--dsw-alias-border-l2': { light: '#c6b68f', dark: '#4a4132' },         // 次边框
      '--dsw-alias-brand-primary': { light: '#8a5a2b', dark: '#d9a15c' },     // 墨褐 / 琥珀
      '--dsw-alias-label-primary': { light: '#292113', dark: '#efe8da' },     // 暖黑文字
      '--dsw-alias-label-secondary': { light: '#71664f', dark: '#a8a08c' },   // 次文字
      '--dsw-alias-state-error-primary': { light: '#c74330', dark: '#f4416c' },   // 语义色沿用 AA 值
      '--dsw-alias-state-success-primary': { light: '#287b38', dark: '#62c473' }, // 深档用青绿而非 lime
      '--dsw-alias-state-warn-primary': { light: '#985d00', dark: '#ee9e0b' },    // 深档金
      '--dsw-specific-sidebar-fill': { light: '#ece4d5', dark: '#1a1612' },   // 侧栏（比 layer-1 降半档分层）
    },
    vars: {
      // 墨褐 accent 系：暖纸上的强调色 = 墨褐/琥珀，与品牌同族
      light: {
        '--mdvr-accent': '#8a5a2b',             // 墨褐：边条/标条/列表符号
        '--mdvr-accent-text': '#6d4a1f',        // 深褐字（tint 上 AA）
        '--mdvr-accent-soft': '#f4ecdc',        // 米褐 tint 底
        '--mdvr-accent-faint': '#cab5a0',       // 45% 预混（h1 下划线）
        '--mdvr-accent-fainter': '#dccebf',     // 30% 预混（hr）
        '--mdvr-code-border': '#e6dcc8',        // 行内代码描边（米褐）
        '--mdvr-table-head-bg': '#f1e8d8',      // 表头底
        '--mdvr-table-head-text': '#6d4a1f',    // 表头字
        '--mdvr-quote-bg': '#f6efe2',           // 引用衬底（纸黄）
        '--mdvr-quote-border': '#8a5a2b',       // 引用边条（墨褐）
      },
      dark: {
        '--mdvr-accent': '#d9a15c',             // 琥珀：深色档主强调
        '--mdvr-accent-text': '#e8b872',        // 浅琥珀字
        '--mdvr-accent-soft': '#2b2418',        // 深褐 tint 底
        '--mdvr-accent-faint': '#6d5232',       // 45% 预混
        '--mdvr-accent-fainter': '#4f3d26',     // 30% 预混
        '--mdvr-code-border': '#4a3d28',        // 代码描边
        '--mdvr-table-head-bg': '#2b2418',      // 表头底
        '--mdvr-table-head-text': '#e8b872',    // 表头字
        '--mdvr-quote-bg': '#221d15',           // 引用衬底
        '--mdvr-quote-border': '#d9a15c',       // 引用边条
      },
    },
    // 专属扩展：引用块恢复东方卡片感（窄边条 + 大圆角）
    css: ':where(blockquote) { border-left-width: 3px; border-radius: 0 12px 12px 0; }',
  },

  // ---- 3.3 qingci：青瓷（青绿灰阶 + 青瓷绿 accent） ----
  // 釉色灵感：瓷白底 + 豆青绿；整体更圆润（代码块/表格 12px 圆角）
  'qingci': {
    name: '青瓷',
    desc: '青绿灰阶：瓷白底 + 青瓷绿 accent',
    tokens: {
      '--dsw-alias-bg-base': { light: '#f4f7f5', dark: '#0e1210' },           // 青白底 / 墨绿黑
      '--dsw-alias-bg-layer-1': { light: '#fbfdfb', dark: '#141a16' },        // 瓷白表面
      '--dsw-alias-bg-layer-2': { light: '#e9efea', dark: '#1b231d' },        // 嵌套表面（冷灰绿）
      '--dsw-alias-bg-overlay': { light: '#ffffff', dark: '#171d19' },        // 浮层
      '--dsw-alias-border-l1': { light: '#d7e0d8', dark: '#2a352d' },         // 主边框（青灰）
      '--dsw-alias-border-l2': { light: '#c2d0c4', dark: '#37443b' },         // 次边框
      '--dsw-alias-brand-primary': { light: '#2f6b52', dark: '#7fc4a0' },     // 青瓷绿
      '--dsw-alias-label-primary': { light: '#17231c', dark: '#e8f0ea' },     // 墨绿黑文字
      '--dsw-alias-label-secondary': { light: '#5c6f62', dark: '#97a89c' },   // 次文字
      '--dsw-alias-state-error-primary': { light: '#c74330', dark: '#f4416c' },   // 语义色沿用 AA 值
      '--dsw-alias-state-success-primary': { light: '#287b38', dark: '#62c473' }, // 深档青绿
      '--dsw-alias-state-warn-primary': { light: '#985d00', dark: '#ee9e0b' },    // 深档金
      '--dsw-specific-sidebar-fill': { light: '#edf2ee', dark: '#111613' },   // 侧栏（冷灰绿）
    },
    vars: {
      // 青瓷绿 accent 系：与成功绿同族但更深沉，靠色相与浓度区分
      light: {
        '--mdvr-accent': '#2f6b52',             // 青瓷绿：边条/标条/列表符号
        '--mdvr-accent-text': '#1e4d3a',        // 深绿字（tint 上 AA）
        '--mdvr-accent-soft': '#e4efe7',        // 青绿 tint 底
        '--mdvr-accent-faint': '#a1bcb1',       // 45% 预混
        '--mdvr-accent-fainter': '#c1d3cb',     // 30% 预混
        '--mdvr-code-border': '#cfdcd2',        // 行内代码描边（青灰）
        '--mdvr-table-head-bg': '#e0ebe3',      // 表头底
        '--mdvr-table-head-text': '#1e4d3a',    // 表头字
        '--mdvr-quote-bg': '#eaf2ec',           // 引用衬底
        '--mdvr-quote-border': '#2f6b52',       // 引用边条
      },
      dark: {
        '--mdvr-accent': '#7fc4a0',             // 深色档青瓷绿（提亮）
        '--mdvr-accent-text': '#9ed9b8',        // 浅青绿字
        '--mdvr-accent-soft': '#17241d',        // 深绿 tint 底
        '--mdvr-accent-faint': '#416251',       // 45% 预混
        '--mdvr-accent-fainter': '#30473b',     // 30% 预混
        '--mdvr-code-border': '#2e3d33',        // 代码描边
        '--mdvr-table-head-bg': '#18241d',      // 表头底
        '--mdvr-table-head-text': '#9ed9b8',    // 表头字
        '--mdvr-quote-bg': '#15201a',           // 引用衬底
        '--mdvr-quote-border': '#7fc4a0',       // 引用边条
      },
    },
    // 专属扩展：青瓷釉感——代码块/表格用更大圆角
    css: ':where(pre), :where(table) { border-radius: 12px; }',
  },
}

// ---------- §4 共享排版骨架 ----------
// 只引用 var(--dsw-alias-*)（全局 token）与 var(--mdvr-*)（主题强调变量），不含写死色值。
// :where() 零优先级 → 产品显式样式永远优先，我们只兜底"裸语义元素"。
const TYPO_CSS = [
  // 基线：中文友好行高 + 断字兜底
  ':where(p, ul, ol, blockquote, pre, table, li) { line-height: 1.8; overflow-wrap: break-word; }',
  // 字体：Markdown 作用域套用主题 sans 栈
  ':where(p, ul, ol, blockquote, pre, table, h1, h2, h3, h4, h5, h6, li, td, th, a) { font-family: var(--mdvr-sans); }',
  // 段落：首尾去空 + 段间 1em（倍数制节奏）
  ':where(p) { margin: 0; letter-spacing: 0.02em; }',
  ':where(p:not(:first-child)) { margin-top: 1em; }',
  ':where(p:not(:last-child)) { margin-bottom: 1em; }',
  // 标题：阶梯 2/1.6/1.3/1.15/1、700、行高 1.25；h1 带主题色下划线（唯一彩色标题元素）
  ':where(h1, h2, h3, h4, h5, h6) { line-height: 1.25; font-weight: 700; margin: 1.1em 0 0.6em; }',
  ':where(h1) { font-size: 2em; padding-bottom: 0.35em; border-bottom: 1px solid var(--mdvr-accent-faint); }',
  ':where(h2) { font-size: 1.6em; }',
  ':where(h3) { font-size: 1.3em; }',
  ':where(h4) { font-size: 1.15em; }',
  ':where(h5) { font-size: 1em; }',
  ':where(h6) { font-size: 0.9em; color: var(--dsw-alias-label-secondary); }',
  // 列表：主题色 "-" 符号（LobeUI 式），任务列表对齐
  ':where(ul, ol) { margin: 1em 0; margin-left: 1em; padding-left: 0; list-style-position: outside; }',
  ':where(ul) { list-style-type: none; }',
  ':where(ul > li::before) { content: "-"; margin-inline: -1em 0.5em; color: var(--mdvr-accent); opacity: 0.85; }',
  ':where(li) { margin: 0.4em 0; }',
  ':where(li p:first-child) { display: inline; }',
  ':where(li.task-list-item) { list-style: none; }',
  ':where(input[type="checkbox"]) { margin: 0 0.4em 0.2em 0; vertical-align: middle; }',
  // 行内代码：主题 tint 底 + 同色系描边 + 强调字（一眼可辨代码）
  ':where(code, samp) { font-family: var(--mdvr-mono); font-size: 0.875em; line-height: 1; padding: 0.1em 0.4em; margin-inline: 0.15em; border: 1px solid var(--mdvr-code-border); border-radius: 0.25em; background: var(--mdvr-accent-soft); color: var(--mdvr-accent-text); white-space: break-spaces; overflow-wrap: break-word; }',
  // 代码块：中性底（留给未来语法高亮）+ 左侧主题色标条 + 细描边
  ':where(pre) { margin: 1em 0; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; padding: 16px; box-shadow: inset 3px 0 0 0 var(--mdvr-accent), inset 0 0 0 1px var(--dsw-alias-border-l1); overflow-x: auto; font-size: 0.85em; line-height: 1.6; font-variant-ligatures: none; }',
  ':where(pre code) { background: transparent; border: none; padding: 0; margin: 0; font-size: inherit; line-height: inherit; white-space: pre; }',
  // 引用：主题色边条 + tint 底 + 正文提到主色（重点块）
  ':where(blockquote) { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid var(--mdvr-quote-border); border-radius: 0 8px 8px 0; background: var(--mdvr-quote-bg); color: var(--dsw-alias-label-primary); }',
  ':where(blockquote p:first-child) { margin-top: 0; }',
  ':where(blockquote p:last-child) { margin-bottom: 0; }',
  ':where(blockquote blockquote) { background: var(--mdvr-accent-soft); }',
  // 表格：表头主题 tint + 强调字 + 700；外框+横线式，无单元格边框，无斑马纹
  ':where(table) { display: block; overflow-x: auto; width: max-content; max-width: 100%; border-collapse: collapse; border-spacing: 0; margin: 1em 0; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l2); font-size: 0.92em; word-break: auto-phrase; }',
  ':where(th, td) { min-width: 120px; padding: 0.75em 1em; text-align: start; }',
  ':where(th) { background: var(--mdvr-table-head-bg); color: var(--mdvr-table-head-text); font-weight: 700; }',
  ':where(tr) { box-shadow: 0 1px 0 var(--dsw-alias-border-l1); }',
  ':where(tr:last-child) { box-shadow: none; }',
  // 分割线：主题色 30% 虚线（弱化但可见）
  ':where(hr) { border: none; border-top: 1px dashed var(--mdvr-accent-fainter); margin: 1.8em 0; }',
  // 链接：公共信息蓝 + hover 过渡（尊重 reduced-motion）
  ':where(a) { color: var(--mdvr-link); text-decoration: none; }',
  ':where(a:hover) { color: var(--mdvr-link-hover); }',
  '@media (prefers-reduced-motion: no-preference) { :where(a) { transition: color 200ms cubic-bezier(0.05, 0.7, 0.1, 1); } }',
  // 强调/细节：strong 中性 700（浓度强调，保护链接蓝信号）；mark 琥珀 tint；kbd 保持中性
  ':where(strong) { font-weight: 700; color: var(--dsw-alias-label-primary); }',
  ':where(mark) { background: var(--mdvr-highlight-soft); color: var(--dsw-alias-label-primary); padding: 0 0.2em; border-radius: 3px; }',
  ':where(del) { color: var(--dsw-alias-label-secondary); }',
  ':where(sup, sub) { font-size: 0.75em; line-height: 1; }',
  ':where(kbd) { font-family: var(--mdvr-mono); font-size: 0.85em; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 0.15em 0.45em; }',
  ':where(img) { max-width: 100%; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l1); }',
].join('\n')

// ---------- §5 面板与设置页样式（插件自有组件，普通类选择器） ----------
const PANEL_CSS = [
  // 版本卡片
  '.mdvr-card { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); font-size: 13px; line-height: 1.6; }',
  '.mdvr-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
  '.mdvr-title { font-weight: 650; font-size: 13px; }',
  '.mdvr-badge { font-family: var(--mdvr-mono); font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--mdvr-accent); color: #ffffff; }',
  '.mdvr-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; opacity: 0.9; }',
  '.mdvr-changes { margin: 2px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-changes li { margin: 2px 0; }',
  '.mdvr-hist { border-top: 1px dashed var(--mdvr-accent-fainter); padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-hist-title { font-size: 11px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: 0.05em; }',
  '.mdvr-hist-item { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }',
  '.mdvr-tag { font-family: var(--mdvr-mono); font-size: 10px; flex: none; }',
  // 主题设置页
  '.mdvr-themes { display: flex; flex-direction: column; gap: 8px; }',
  '.mdvr-themes-title { font-size: 12px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-theme-card { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; text-align: left; font-size: 13px; color: var(--dsw-alias-label-primary); }',
  '.mdvr-theme-card:hover { border-color: var(--mdvr-accent-faint); }',
  '.mdvr-theme-card-active { border-color: var(--mdvr-accent); box-shadow: 0 0 0 1px var(--mdvr-accent); }',
  '.mdvr-theme-swatches { display: flex; gap: 4px; }',
  '.mdvr-theme-swatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--dsw-alias-border-l1); }',
  '.mdvr-theme-info { display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-theme-name { font-weight: 650; }',
  '.mdvr-theme-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); }',
].join('\n')

// ---------- §6 主题切换引擎 ----------
// 运行时状态（函数体作用域，进程内有效）
let rootCtx = null            // apply() 注入的 ctx 引用（供设置页切换时使用）
let activeThemeId = ACTIVE_THEME  // 当前生效主题 id
let tokenDisposer = null      // 当前 token 层清理函数
let themeDisposer = null      // 当前样式表清理函数

// 组装主题变量 CSS：公共变量 + 主题变量（浅/深两档），含字体栈与倍数常量
function buildVarsCss(theme) {
  const light = { ...DEFAULT_VARS.light, ...(theme.vars.light || {}) }
  const dark = { ...DEFAULT_VARS.dark, ...(theme.vars.dark || {}) }
  const toBlock = (o) => Object.keys(o).map((k) => ' ' + k + ': ' + o[k] + ';').join('')
  return ':root { --mdvr-sans: ' + FONT_SANS + '; --mdvr-mono: ' + FONT_MONO + '; --mdvr-mm: 2;'
    + toBlock(light) + ' }'
    + '\n@media (prefers-color-scheme: dark) { :root {' + toBlock(dark) + ' } }'
}

// 激活主题：1) token 层整层替换（同 source）；2) 重建样式表（变量+骨架+扩展+面板）
function activateTheme(ctx, id) {
  const theme = THEMES[id]
  if (!theme) return
  // 1) 全局 token 层：同 source 重调 = 整层替换并置顶；先卸旧层再叠新层
  if (tokenDisposer) { tokenDisposer(); tokenDisposer = null }
  tokenDisposer = ctx.theme.overrideTokens('md-theme', theme.tokens)
  // 2) 排版层：变量 CSS + 共享骨架 + 主题扩展 + 面板样式，先卸旧表再注入
  if (themeDisposer) { themeDisposer(); themeDisposer = null }
  const css = buildVarsCss(theme) + '\n' + TYPO_CSS + '\n' + (theme.css ? theme.css + '\n' : '') + PANEL_CSS
  themeDisposer = styles.insert(css)
  activeThemeId = id
}

// ---------- §7 组件 ----------
// 版本卡片：展示当前版本徽标 + 本次变更 + 历史台账（数据来自 Host RPC）
function VersionCard(props) {
  const [state, setState] = React.useState({ loading: true, current: null, history: [], error: null })

  React.useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        await host.call('versions.note', { pluginId: props.pluginId || '', packageId: props.packageId, manifest: props.manifest })
        const data = await host.call('versions.list')
        if (!alive) return
        setState({ loading: false, current: data.current || props.manifest, history: data.history || [], error: null })
      } catch (err) {
        if (!alive) return
        setState({ loading: false, current: props.manifest, history: [], error: String((err && err.message) || err) })
      }
    }
    load()
    return () => { alive = false }
  }, [])

  if (state.loading) {
    return React.createElement('div', { className: 'mdvr-card' }, '📜 加载版本记录…')
  }
  if (state.error) {
    return React.createElement('div', { className: 'mdvr-card' }, '📜 版本记录不可用：' + state.error)
  }

  const cur = state.current || props.manifest
  const hist = (state.history || []).filter((e) => e.packageId !== (cur.packageId || ''))
  const changes = Array.isArray(cur.changes) ? cur.changes : []
  const meta = [cur.date, cur.palette].filter(Boolean).join(' · ')

  return React.createElement('div', { className: 'mdvr-card' },
    React.createElement('div', { className: 'mdvr-head' },
      React.createElement('span', { className: 'mdvr-title' }, '📜 ' + (cur.name || '版本记录')),
      React.createElement('span', { className: 'mdvr-badge' }, 'v' + cur.version),
      React.createElement('span', { className: 'mdvr-meta' }, meta),
    ),
    changes.length > 0 && React.createElement('ul', { className: 'mdvr-changes' },
      changes.map((c, i) => React.createElement('li', { key: i }, c)),
    ),
    hist.length > 0 && React.createElement('div', { className: 'mdvr-hist' },
      React.createElement('div', { className: 'mdvr-hist-title' }, '历史版本'),
      hist.map((e, i) => React.createElement('div', { key: i, className: 'mdvr-hist-item' },
        React.createElement('span', { className: 'mdvr-tag' }, 'v' + e.version),
        React.createElement('span', { className: 'mdvr-meta' }, String(e.date || '') + (Array.isArray(e.changes) && e.changes[0] ? ' · ' + e.changes[0] : '')),
      )),
    ),
  )
}

// 主题设置页：主题卡片列表（色板预览 + 名称 + 描述），点击即切换（会话级内存态）
function ThemeSettings() {
  const [active, setActive] = React.useState(activeThemeId)
  const entries = Object.keys(THEMES).map((id) => {
    const t = THEMES[id]
    // 色板预览：底色 / 抬升面 / 品牌色 / 强调色
    const swatches = [
      (t.tokens['--dsw-alias-bg-base'] || {}).light,
      (t.tokens['--dsw-alias-bg-layer-1'] || {}).light,
      (t.tokens['--dsw-alias-brand-primary'] || {}).light,
      (t.vars.light || {})['--mdvr-accent'],
    ].filter(Boolean)
    return { id, theme: t, swatches }
  })

  return React.createElement('div', { className: 'mdvr-themes' },
    React.createElement('div', { className: 'mdvr-themes-title' },
      '主题切换（会话级：刷新/重启后恢复默认 ' + ACTIVE_THEME + '）'),
    entries.map(({ id, theme, swatches }) => {
      const sel = id === active
      return React.createElement('button', {
        key: id,
        className: 'mdvr-theme-card' + (sel ? ' mdvr-theme-card-active' : ''),
        onClick: () => { activateTheme(rootCtx, id); setActive(id) },
      },
        React.createElement('span', { className: 'mdvr-theme-swatches' },
          swatches.map((c, i) => React.createElement('span', {
            key: i,
            className: 'mdvr-theme-swatch',
            style: { background: c },
          })),
        ),
        React.createElement('span', { className: 'mdvr-theme-info' },
          React.createElement('span', { className: 'mdvr-theme-name' }, theme.name + (sel ? ' ✓' : '')),
          React.createElement('span', { className: 'mdvr-theme-desc' }, theme.desc),
        ),
      )
    }),
  )
}

// ---------- §8 插件入口 ----------
return {
  inject: ['theme'],
  apply(ctx) {
    rootCtx = ctx
    // 按配置应用默认主题（ACTIVE_THEME）
    activateTheme(ctx, ACTIVE_THEME)
    // Fiber 卸载清理：还原 token 层与样式表（stop/update/undefine 时自动执行）
    ctx.effect(() => () => {
      if (tokenDisposer) { tokenDisposer(); tokenDisposer = null }
      if (themeDisposer) { themeDisposer(); themeDisposer = null }
    })

    const slots = ctx.get('slots')
    if (slots === undefined) return
    // 设置页：主题设置（settings.section 列表条目，id 唯一）
    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'mdvr-theme', label: '主题设置' },
      () => React.createElement(ThemeSettings),
    ))
    // run 卡片：版本面板（tool.view.cordis，key 固定 self）
    slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      (props) => React.createElement(VersionCard, { pluginId: props.pluginId || '', packageId: props.packageId, manifest: MANIFEST }),
    ))
  },
}
