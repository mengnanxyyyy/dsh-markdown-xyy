// ============================================================
// Client half v0.7.0 — 主题系统（CSS 文件驱动）+ Markdown 排版 + 版本面板
//
// ⚠️ 本文件由 scripts/build-client.js 生成 —— THEMES 部分禁止手改！
//    主题定义在 themes/*.css（每主题一个 CSS 文件），修改后运行：
//      node scripts/build-client.js
//    逻辑部分源文件：plugin/src/client.core.js
//
// 【文件结构总览】
//   §1 配置区        —— MANIFEST / ACTIVE_THEME（默认主题）
//   §2 主题元信息    —— THEME_META（显示名/描述/色板预览）
//   §3 主题注册表    —— THEMES（由构建脚本从 themes/*.css 生成，勿手改）
//   §4 共享排版骨架  —— TYPO_CSS（只引用 var(--dsw-alias-*) / var(--mdvr-*)）
//   §5 面板与设置页样式 —— PANEL_CSS
//   §6 主题切换引擎  —— activateTheme（注入主题 CSS + 骨架 + 面板）
//   §7 组件          —— VersionCard / ThemeSettings
//   §8 插件入口 apply()
//
// 【能控制什么 / 到什么程度】（详见 docs/themes.md 与 themes/demo.css 元素目录）
//   ① 全局 token：13 个 --dsw-alias-*（浅/深）→ 整个应用配色
//   ② 强调变量：--mdvr-*（accent/highlight/quote/code/table/link 系）→ 排版层色彩细节
//   ③ 元素排版：TYPO_CSS 约 30 条规则 → 全部 Markdown 元素
//   ④ 面板 UI：自绘组件 + 专属样式 → 完全控制
//   限制：不改产品 DOM；:where() 零优先级；token 名单固定 13 个；无持久化
// ============================================================

// ---------- §1 配置区 ----------
// 版本清单（版本面板与 Host 台账使用；与 plugin/host.js 的 MANIFEST 保持一致）
const MANIFEST = {
  version: '0.7.0',
  name: 'LobeUI 风格 · 主题系统',
  palette: 'multi-theme-css',
  date: '2026-08-14',
  changes: [
    '新增「原生」主题（themes/native.css）：完全不注入插件样式（不覆盖 token、不注入排版骨架、不定义变量），一键恢复 DSH 出厂观感',
    '面板样式变量加回退值：原生模式下插件自有 UI（版本卡片/主题设置页）仍正常渲染',
    '切换引擎支持原生分支：原生主题仅注入 PANEL_CSS，离开时自动卸载全部插件样式',
  ],
}

// 默认主题 id（设置页切换为会话级内存态，刷新/重启后恢复此值）
const ACTIVE_THEME = 'lobeui-emphasis'

// ---------- §2 主题元信息（显示名/描述/色板预览；CSS 内容在 §3） ----------
const THEME_META = {
  'native': {
    name: '原生（无插件样式）',
    desc: '完全恢复 DSH 出厂观感：不覆盖 token、不注入排版',
    swatches: ['#ffffff', '#f9fafb', '#0f1115', '#5686fe'],
    native: true, // 原生模式标记：运行时只注入 PANEL_CSS，跳过 TYPO_CSS 与主题 CSS
  },
  'demo': {
    name: 'DSH 默认',
    desc: 'DSH 出厂观感（全元素目录参考）',
    swatches: ['#ffffff', '#f9fafb', '#0f1115', '#5686fe'],
  },
  'lobeui-emphasis': {
    name: 'LobeUI 风格（强调）',
    desc: 'LobeUI 原生中性色 + 靛蓝强调系统（默认）',
    swatches: ['#f8f8f8', '#ffffff', '#222222', '#5856d6'],
  },
  'inkpaper': {
    name: '墨纸 · InkPaper',
    desc: '暖纸身份：米白纸底 + 墨褐 accent',
    swatches: ['#faf6ef', '#f2ece0', '#8a5a2b', '#8a5a2b'],
  },
  'qingci': {
    name: '青瓷',
    desc: '青绿灰阶：瓷白底 + 青瓷绿 accent',
    swatches: ['#f4f7f5', '#fbfdfb', '#2f6b52', '#2f6b52'],
  },
}

// ---------- §3 主题注册表（构建生成，勿手改） ----------
const THEMES = {
  "demo": { css: `/* ============================================================
 * 主题：demo —— DSH 默认（出厂观感）
 * ------------------------------------------------------------
 * 【职责】覆盖插件能控制的全部样式，恢复 DSH 出厂默认观感。
 * 【维护铁律】本文件必须随版本更新：
 *   1) 13 个 token 取 DSH 出厂值（来源 dsh-client-ui-theme/
 *      lib/styles/design-platform.css 的 --dsw-static-* 静态变量）
 *   2) §C 元素目录必须与 plugin/src/client.core.js 的 TYPO_CSS
 *      保持同步（每次骨架改动都要回来核对）
 * 【挂载机制】与产品一致：浅色写 body，深色写 body[data-ds-dark-theme]
 * （产品深色用属性选择器而非 prefers-color-scheme，必须沿用）
 * ============================================================ */

/* ---------- ① 浅色档：全局 token + 强调变量 ---------- */
/* 控制：13 个全局 token（--dsw-alias-*）—— 整个应用配色（表面/文字/边框/语义色） */
/* 控制：强调变量（--mdvr-*）—— 排版层全部色彩细节 */
/* 值来源：dsh-client-ui-theme design-platform.css（body 浅色块） */
body {
  /* 表面分层（DSH 浅色全白） */
  --dsw-alias-bg-base: #ffffff;              /* 应用底色 = static-neutral-bluish-00 */
  --dsw-alias-bg-layer-1: #ffffff;           /* 抬升表面 = bluish-00 */
  --dsw-alias-bg-layer-2: #ffffff;           /* 嵌套表面 = bluish-00 */
  --dsw-alias-bg-overlay: #e9ecf2;           /* 浮层 = bluish-150 */
  --dsw-alias-border-l1: rgba(0, 0, 0, 0.04);   /* 主边框 = 4% 黑 */
  --dsw-alias-border-l2: rgba(0, 0, 0, 0.1);    /* 次边框 = 10% 黑 */
  /* 品牌与文字 */
  --dsw-alias-brand-primary: #0f1115;        /* 品牌主色 = bluish-1000（近黑，与 LobeUI 同思路） */
  --dsw-alias-label-primary: #0f1115;        /* 主文字 = bluish-1000 */
  --dsw-alias-label-secondary: #61666b;      /* 次文字 = bluish-700 */
  /* 语义色（DSH 出厂值） */
  --dsw-alias-state-error-primary: #ec1313;  /* 错误 = red-600 */
  --dsw-alias-state-success-primary: #22c55e; /* 成功 = green-500 */
  --dsw-alias-state-warn-primary: #f59e0b;   /* 警告 = amber-500 */
  --dsw-specific-sidebar-fill: #f9fafb;      /* 侧栏底 = bluish-50 */
  /* 强调变量（DSH 品牌蓝 deepseek-450 #5686fe 体系） */
  --mdvr-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  --mdvr-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  --mdvr-mm: 2;                              /* 间距倍数（排版节奏基准） */
  --mdvr-link: #2f56d9;                      /* 链接色（品牌蓝加深，AA） */
  --mdvr-link-hover: #5686fe;                /* 链接 hover */
  --mdvr-highlight: #b3541e;                 /* 琥珀高亮（与 warn 区分） */
  --mdvr-highlight-soft: #fdf0dc;            /* 高亮 tint 底（mark） */
  --mdvr-accent: #5686fe;                    /* 主强调色：边条/标条/列表符号 */
  --mdvr-accent-text: #2f56d9;               /* tint 面上的强调文字（AA） */
  --mdvr-accent-soft: #ebf0ff;               /* 强调 tint 底（行内代码/嵌套引用） */
  --mdvr-accent-faint: #b3c9fe;              /* 45% 预混（h1 下划线） */
  --mdvr-accent-fainter: #ccdbff;            /* 30% 预混（hr） */
  --mdvr-code-border: #d9e3ff;               /* 行内代码描边 */
  --mdvr-table-head-bg: #eef3ff;             /* 表头底 */
  --mdvr-table-head-text: #2f56d9;           /* 表头字 */
  --mdvr-quote-bg: #f2f6ff;                  /* 引用衬底 */
  --mdvr-quote-border: #5686fe;              /* 引用边条 */
}

/* ---------- ② 深色档：全局 token + 强调变量 ---------- */
/* 控制：与 ① 相同，仅深色取值（DSH 出厂：bluish-950/875/850 系） */
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: #151517;              /* 应用底色 = bluish-950 */
  --dsw-alias-bg-layer-1: #232324;           /* 抬升表面 = bluish-875 */
  --dsw-alias-bg-layer-2: #2c2c2e;           /* 嵌套表面 = bluish-850 */
  --dsw-alias-bg-overlay: #61666b;           /* 浮层 = bluish-700 */
  --dsw-alias-border-l1: rgba(255, 255, 255, 0.06); /* 主边框 = 6% 白 */
  --dsw-alias-border-l2: rgba(255, 255, 255, 0.12); /* 次边框 = 12% 白 */
  --dsw-alias-brand-primary: #f9fafb;        /* 品牌主色 = bluish-50 */
  --dsw-alias-label-primary: #f9fafb;        /* 主文字 = bluish-50 */
  --dsw-alias-label-secondary: #cfd3d6;      /* 次文字 = bluish-300 */
  --dsw-alias-state-error-primary: #f25a5a;  /* 错误 = red-400 */
  --dsw-alias-state-success-primary: #22c55e; /* 成功 = green-500 */
  --dsw-alias-state-warn-primary: #f59e0b;   /* 警告 = amber-500 */
  --dsw-specific-sidebar-fill: #1b1b1c;      /* 侧栏底 = bluish-900 */
  /* 强调变量（深色档提亮） */
  --mdvr-link: #8fb0ff;                      /* 链接色 */
  --mdvr-link-hover: #a8c4ff;                /* 链接 hover */
  --mdvr-highlight: #ffb45e;                 /* 琥珀高亮 */
  --mdvr-highlight-soft: #3a2f1e;            /* 高亮 tint 底 */
  --mdvr-accent: #8fb0ff;                    /* 主强调色 */
  --mdvr-accent-text: #a8c4ff;               /* tint 上强调文字 */
  --mdvr-accent-soft: #262b37;               /* 强调 tint 底 */
  --mdvr-accent-faint: #4c5b7f;              /* 45% 预混 */
  --mdvr-accent-fainter: #3a445d;            /* 30% 预混 */
  --mdvr-code-border: #39435c;               /* 行内代码描边 */
  --mdvr-table-head-bg: #262b37;             /* 表头底 */
  --mdvr-table-head-text: #a8c4ff;           /* 表头字 */
  --mdvr-quote-bg: #20242e;                  /* 引用衬底 */
  --mdvr-quote-border: #8fb0ff;              /* 引用边条 */
}

/* ---------- ③ 元素目录（覆盖全部可控元素；值 = 共享骨架 TYPO_CSS 默认） ----------
 * 每个元素一条规则 + 注释说明控制哪个部分。
 * 与 plugin/src/client.core.js 的 TYPO_CSS 一一对应，版本更新必须同步。
 * 说明：demo 主题不覆盖骨架（值与骨架一致，重复声明无害），
 *       未来若某元素要"恢复 DSH 原样"，把对应规则改回 DSH 默认值即可。 */

/* 正文：中文友好行高 + 断字兜底 */
:where(p, ul, ol, blockquote, pre, table, li) { line-height: 1.8; overflow-wrap: break-word; }
/* 字体：Markdown 作用域套用 sans 栈 */
:where(p, ul, ol, blockquote, pre, table, h1, h2, h3, h4, h5, h6, li, td, th, a) { font-family: var(--mdvr-sans); }
/* 段落：首尾去空 + 段间 1em（倍数制节奏） */
:where(p) { margin: 0; letter-spacing: 0.02em; }
:where(p:not(:first-child)) { margin-top: 1em; }
:where(p:not(:last-child)) { margin-bottom: 1em; }
/* 标题：阶梯 2/1.6/1.3/1.15/1em、700、行高 1.25；h1 主题色下划线 */
:where(h1, h2, h3, h4, h5, h6) { line-height: 1.25; font-weight: 700; margin: 1.1em 0 0.6em; }
:where(h1) { font-size: 2em; padding-bottom: 0.35em; border-bottom: 1px solid var(--mdvr-accent-faint); }
:where(h2) { font-size: 1.6em; }
:where(h3) { font-size: 1.3em; }
:where(h4) { font-size: 1.15em; }
:where(h5) { font-size: 1em; }
:where(h6) { font-size: 0.9em; color: var(--dsw-alias-label-secondary); }
/* 列表：主题色 "-" 符号；任务列表 checkbox 对齐 */
:where(ul, ol) { margin: 1em 0; margin-left: 1em; padding-left: 0; list-style-position: outside; }
:where(ul) { list-style-type: none; }
:where(ul > li::before) { content: "-"; margin-inline: -1em 0.5em; color: var(--mdvr-accent); opacity: 0.85; }
:where(li) { margin: 0.4em 0; }
:where(li p:first-child) { display: inline; }
:where(li.task-list-item) { list-style: none; }
:where(input[type="checkbox"]) { margin: 0 0.4em 0.2em 0; vertical-align: middle; }
/* 行内代码：主题 tint 底 + 描边 + 强调字（一眼可辨代码） */
:where(code, samp) { font-family: var(--mdvr-mono); font-size: 0.875em; line-height: 1; padding: 0.1em 0.4em; margin-inline: 0.15em; border: 1px solid var(--mdvr-code-border); border-radius: 0.25em; background: var(--mdvr-accent-soft); color: var(--mdvr-accent-text); white-space: break-spaces; overflow-wrap: break-word; }
/* 代码块：中性底 + 左侧主题色标条 + 细描边 */
:where(pre) { margin: 1em 0; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; padding: 16px; box-shadow: inset 3px 0 0 0 var(--mdvr-accent), inset 0 0 0 1px var(--dsw-alias-border-l1); overflow-x: auto; font-size: 0.85em; line-height: 1.6; font-variant-ligatures: none; }
:where(pre code) { background: transparent; border: none; padding: 0; margin: 0; font-size: inherit; line-height: inherit; white-space: pre; }
/* 引用：主题色边条 + tint 底 + 正文提到主色（重点块） */
:where(blockquote) { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid var(--mdvr-quote-border); border-radius: 0 8px 8px 0; background: var(--mdvr-quote-bg); color: var(--dsw-alias-label-primary); }
:where(blockquote p:first-child) { margin-top: 0; }
:where(blockquote p:last-child) { margin-bottom: 0; }
:where(blockquote blockquote) { background: var(--mdvr-accent-soft); }
/* 表格：表头 tint + 强调字 + 700；外框+横线式 */
:where(table) { display: block; overflow-x: auto; width: max-content; max-width: 100%; border-collapse: collapse; border-spacing: 0; margin: 1em 0; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l2); font-size: 0.92em; word-break: auto-phrase; }
:where(th, td) { min-width: 120px; padding: 0.75em 1em; text-align: start; }
:where(th) { background: var(--mdvr-table-head-bg); color: var(--mdvr-table-head-text); font-weight: 700; }
:where(tr) { box-shadow: 0 1px 0 var(--dsw-alias-border-l1); }
:where(tr:last-child) { box-shadow: none; }
/* 分割线：主题色 30% 虚线 */
:where(hr) { border: none; border-top: 1px dashed var(--mdvr-accent-fainter); margin: 1.8em 0; }
/* 链接：信息蓝 + hover 过渡（尊重 reduced-motion） */
:where(a) { color: var(--mdvr-link); text-decoration: none; }
:where(a:hover) { color: var(--mdvr-link-hover); }
@media (prefers-reduced-motion: no-preference) { :where(a) { transition: color 200ms cubic-bezier(0.05, 0.7, 0.1, 1); } }
/* 强调/细节：strong 中性 700；mark 琥珀 tint；删除线次文字；上下标；kbd 中性；图片内描边 */
:where(strong) { font-weight: 700; color: var(--dsw-alias-label-primary); }
:where(mark) { background: var(--mdvr-highlight-soft); color: var(--dsw-alias-label-primary); padding: 0 0.2em; border-radius: 3px; }
:where(del) { color: var(--dsw-alias-label-secondary); }
:where(sup, sub) { font-size: 0.75em; line-height: 1; }
:where(kbd) { font-family: var(--mdvr-mono); font-size: 0.85em; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2); border-radius: 4px; padding: 0.15em 0.45em; }
:where(img) { max-width: 100%; border-radius: 8px; box-shadow: 0 0 0 1px var(--dsw-alias-border-l1); }
` },
  "inkpaper": { css: `/* ============================================================
 * 主题：inkpaper —— 墨纸（暖纸）
 * ------------------------------------------------------------
 * 东方纸墨感：浅色像宣纸（米白纸底 + 墨褐 accent），深色像玄夜。
 * 引用块恢复卡片感（窄边条 + 大圆角，见 ③）。
 * 挂载机制：浅色 body / 深色 body[data-ds-dark-theme]（与产品一致）。
 * ============================================================ */

/* ---------- ① 浅色档：全局 token + 强调变量 ---------- */
body {
  /* 表面分层（暖灰米） */
  --dsw-alias-bg-base: #faf6ef;              /* 宣纸米白 */
  --dsw-alias-bg-layer-1: #f2ece0;           /* 抬升表面 */
  --dsw-alias-bg-layer-2: #e9e1d0;           /* 嵌套表面 */
  --dsw-alias-bg-overlay: #fffdf8;           /* 浮层 */
  --dsw-alias-border-l1: #dbcfb3;            /* 主边框（纸色加深） */
  --dsw-alias-border-l2: #c6b68f;            /* 次边框 */
  /* 品牌与文字 */
  --dsw-alias-brand-primary: #8a5a2b;        /* 墨褐 */
  --dsw-alias-label-primary: #292113;        /* 暖黑文字 */
  --dsw-alias-label-secondary: #71664f;      /* 次文字 */
  /* 语义色（沿用 WCAG AA 值） */
  --dsw-alias-state-error-primary: #c74330;  /* 错误 */
  --dsw-alias-state-success-primary: #287b38; /* 成功 */
  --dsw-alias-state-warn-primary: #985d00;   /* 警告 */
  --dsw-specific-sidebar-fill: #ece4d5;      /* 侧栏（比 layer-1 降半档分层） */
  /* 强调变量（墨褐 accent 系，与品牌同族） */
  --mdvr-sans: Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --mdvr-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace;
  --mdvr-mm: 2;                              /* 间距倍数 */
  --mdvr-link: #005ae0;                      /* 链接色（保持信息蓝约定，AA） */
  --mdvr-link-hover: #0072f5;                /* 链接 hover */
  --mdvr-highlight: #b3541e;                 /* 琥珀高亮 */
  --mdvr-highlight-soft: #fdf0dc;            /* 高亮 tint 底（mark） */
  --mdvr-accent: #8a5a2b;                    /* 墨褐：边条/标条/列表符号 */
  --mdvr-accent-text: #6d4a1f;               /* 深褐字（tint 上 AA） */
  --mdvr-accent-soft: #f4ecdc;               /* 米褐 tint 底 */
  --mdvr-accent-faint: #cab5a0;              /* 45% 预混（h1 下划线） */
  --mdvr-accent-fainter: #dccebf;            /* 30% 预混（hr） */
  --mdvr-code-border: #e6dcc8;               /* 行内代码描边（米褐） */
  --mdvr-table-head-bg: #f1e8d8;             /* 表头底 */
  --mdvr-table-head-text: #6d4a1f;           /* 表头字 */
  --mdvr-quote-bg: #f6efe2;                  /* 引用衬底（纸黄） */
  --mdvr-quote-border: #8a5a2b;              /* 引用边条（墨褐） */
}

/* ---------- ② 深色档：全局 token + 强调变量 ---------- */
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: #14120f;              /* 玄夜近黑 */
  --dsw-alias-bg-layer-1: #1d1915;           /* 抬升表面 */
  --dsw-alias-bg-layer-2: #28231d;           /* 嵌套表面 */
  --dsw-alias-bg-overlay: #211c17;           /* 浮层 */
  --dsw-alias-border-l1: #3a342b;            /* 主边框 */
  --dsw-alias-border-l2: #4a4132;            /* 次边框 */
  --dsw-alias-brand-primary: #d9a15c;        /* 琥珀 */
  --dsw-alias-label-primary: #efe8da;        /* 暖白文字 */
  --dsw-alias-label-secondary: #a8a08c;      /* 次文字 */
  --dsw-alias-state-error-primary: #f4416c;  /* 错误 */
  --dsw-alias-state-success-primary: #62c473; /* 成功（青绿而非 lime） */
  --dsw-alias-state-warn-primary: #ee9e0b;   /* 警告（金） */
  --dsw-specific-sidebar-fill: #1a1612;      /* 侧栏 */
  /* 强调变量（琥珀系） */
  --mdvr-link: #60b1ff;                      /* 链接色 */
  --mdvr-link-hover: #a7d3ff;                /* 链接 hover */
  --mdvr-highlight: #ffb45e;                 /* 琥珀高亮 */
  --mdvr-highlight-soft: #3a2f1e;            /* 高亮 tint 底 */
  --mdvr-accent: #d9a15c;                    /* 琥珀：主强调 */
  --mdvr-accent-text: #e8b872;               /* 浅琥珀字 */
  --mdvr-accent-soft: #2b2418;               /* 深褐 tint 底 */
  --mdvr-accent-faint: #6d5232;              /* 45% 预混 */
  --mdvr-accent-fainter: #4f3d26;            /* 30% 预混 */
  --mdvr-code-border: #4a3d28;               /* 代码描边 */
  --mdvr-table-head-bg: #2b2418;             /* 表头底 */
  --mdvr-table-head-text: #e8b872;           /* 表头字 */
  --mdvr-quote-bg: #221d15;                  /* 引用衬底 */
  --mdvr-quote-border: #d9a15c;              /* 引用边条 */
}

/* ---------- ③ 元素级定制（可选） ---------- */
/* 引用块恢复东方卡片感：窄边条 + 大圆角 */
:where(blockquote) { border-left-width: 3px; border-radius: 0 12px 12px 0; }
` },
  "lobeui-emphasis": { css: `/* ============================================================
 * 主题：lobeui-emphasis —— LobeUI 风格（强调）
 * ------------------------------------------------------------
 * 中性灰阶 + 靛蓝强调系统（插件默认主题）。
 * 色值来源：lobe-ui master 色板（gray/primary/red/lime/blue step9）
 * + docs/readability-a11y.md 的 WCAG AA 修正（浅档语义色加深）。
 * 挂载机制：浅色 body / 深色 body[data-ds-dark-theme]（与产品一致）。
 * ============================================================ */

/* ---------- ① 浅色档：全局 token + 强调变量 ---------- */
body {
  /* 表面分层（lobe bgLayout gray[1] / bgContainer gray[0]） */
  --dsw-alias-bg-base: #f8f8f8;              /* 应用底色 */
  --dsw-alias-bg-layer-1: #ffffff;           /* 抬升表面 */
  --dsw-alias-bg-layer-2: #f0f0f0;           /* 嵌套表面（代码/引用衬底） */
  --dsw-alias-bg-overlay: #ffffff;           /* 浮层 */
  --dsw-alias-border-l1: #e3e3e3;            /* 主边框 gray[3] */
  --dsw-alias-border-l2: #eeeeee;            /* 次边框 gray[2] */
  /* 品牌与文字（lobe primary[9] 中性黑 / gray[12][10]） */
  --dsw-alias-brand-primary: #222222;        /* 品牌主色（中性黑） */
  --dsw-alias-label-primary: #080808;        /* 主文字 */
  --dsw-alias-label-secondary: #666666;      /* 次文字 */
  /* 语义色（浅档按 WCAG AA 加深） */
  --dsw-alias-state-error-primary: #c74330;  /* 错误（AA 加深，原 step9 #ec5e41 仅 3.36:1） */
  --dsw-alias-state-success-primary: #287b38; /* 成功（AA 加深，原 #379d4a 仅 3.45:1） */
  --dsw-alias-state-warn-primary: #985d00;   /* 警告（AA 加深，原 #ee9e0b 仅 2.20:1） */
  --dsw-specific-sidebar-fill: #f0f0f0;      /* 侧栏底（灰阶近似） */
  /* 强调变量（靛蓝 accent 系：与链接蓝错色相、与语义色分离） */
  --mdvr-sans: Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --mdvr-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace;
  --mdvr-mm: 2;                              /* 间距倍数 */
  --mdvr-link: #005ae0;                      /* 链接色（geekblue step10，AA 5.93:1） */
  --mdvr-link-hover: #0072f5;                /* 链接 hover（step9） */
  --mdvr-highlight: #b3541e;                 /* 琥珀高亮 */
  --mdvr-highlight-soft: #fdf0dc;            /* 高亮 tint 底（mark） */
  --mdvr-accent: #5856d6;                    /* 主强调色：边条/标条/列表符号 */
  --mdvr-accent-text: #1d4ed8;               /* tint 上强调文字（AA 5.72:1） */
  --mdvr-accent-soft: #ebebfa;               /* 强调 tint 底 */
  --mdvr-accent-faint: #b4b3ed;              /* 45% 预混（h1 下划线） */
  --mdvr-accent-fainter: #cdccf3;            /* 30% 预混（hr） */
  --mdvr-code-border: #d5d2f4;               /* 行内代码描边 */
  --mdvr-table-head-bg: #edecfb;             /* 表头底 */
  --mdvr-table-head-text: #3b3aa8;           /* 表头字（≥5.9:1） */
  --mdvr-quote-bg: #f2f1fc;                  /* 引用衬底 */
  --mdvr-quote-border: #5856d6;              /* 引用边条 */
}

/* ---------- ② 深色档：全局 token + 强调变量 ---------- */
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: #000000;              /* 应用底色（近黑） */
  --dsw-alias-bg-layer-1: #0d0d0d;           /* 抬升表面 */
  --dsw-alias-bg-layer-2: #1a1a1a;           /* 嵌套表面 */
  --dsw-alias-bg-overlay: #1a1a1a;           /* 浮层 */
  --dsw-alias-border-l1: #202020;            /* 主边框 gray dark[3] */
  --dsw-alias-border-l2: #1a1a1a;            /* 次边框 gray dark[2] */
  --dsw-alias-brand-primary: #eeeeee;        /* 品牌主色（中性白） */
  --dsw-alias-label-primary: #ffffff;        /* 主文字 */
  --dsw-alias-label-secondary: #aaaaaa;      /* 次文字 */
  --dsw-alias-state-error-primary: #f4416c;  /* 错误 = red[9] */
  --dsw-alias-state-success-primary: #c4f042; /* 成功 = lime[9] */
  --dsw-alias-state-warn-primary: #ffb224;   /* 警告 = gold dark[9] */
  --dsw-specific-sidebar-fill: #101010;      /* 侧栏底 */
  /* 强调变量（深色档提亮） */
  --mdvr-link: #60b1ff;                      /* 链接色 = blue[9] */
  --mdvr-link-hover: #a7d3ff;                /* 链接 hover = blue[11] */
  --mdvr-highlight: #ffb45e;                 /* 琥珀高亮 */
  --mdvr-highlight-soft: #3a2f1e;            /* 高亮 tint 底 */
  --mdvr-accent: #a8a5f5;                    /* 主强调色 */
  --mdvr-accent-text: #7dd3fc;               /* tint 上强调文字（天青，AA） */
  --mdvr-accent-soft: #23222d;               /* 强调 tint 底（近黑，13.5:1） */
  --mdvr-accent-faint: #535175;              /* 45% 预混 */
  --mdvr-accent-fainter: #3c3b53;            /* 30% 预混 */
  --mdvr-code-border: #3a3750;               /* 行内代码描边 */
  --mdvr-table-head-bg: #23222d;             /* 表头底 */
  --mdvr-table-head-text: #c6c3ff;           /* 表头字 */
  --mdvr-quote-bg: #1d1c26;                  /* 引用衬底 */
  --mdvr-quote-border: #8f8bf2;              /* 引用边条 */
}

/* ---------- ③ 元素级定制（可选） ---------- */
/* 无专属扩展：完全走共享骨架 TYPO_CSS */
` },
  "native": { css: `/* ============================================================
 * 主题：native —— 原生（无插件样式）
 * ------------------------------------------------------------
 * 本文件刻意不含任何规则：
 *   - 不覆盖 13 个全局 token（--dsw-alias-*）
 *   - 不定义任何强调变量（--mdvr-*）
 *   - 不注入排版骨架（TYPO_CSS）
 * 效果：DSH 出厂观感 —— 产品自带样式 100% 生效，插件零干预。
 *
 * 说明：
 *   - 运行时本主题仅注入 PANEL_CSS（版本卡片/主题设置页的
 *     插件自有 UI 样式），只影响插件自身组件，不影响产品界面；
 *     切换离开本主题时，之前的 token/排版样式表会被整体卸载，
 *     产品观感随主题恢复。
 * ============================================================ */
/* （无规则：构建产物中该主题 css 为空，运行时跳过 TYPO_CSS 与 token 注入） */
` },
  "qingci": { css: `/* ============================================================
 * 主题：qingci —— 青瓷
 * ------------------------------------------------------------
 * 釉色灵感：瓷白底 + 豆青绿 accent，整体更圆润（代码块/表格 12px 圆角）。
 * 挂载机制：浅色 body / 深色 body[data-ds-dark-theme]（与产品一致）。
 * ============================================================ */

/* ---------- ① 浅色档：全局 token + 强调变量 ---------- */
body {
  /* 表面分层（青绿灰阶） */
  --dsw-alias-bg-base: #f4f7f5;              /* 青白底 */
  --dsw-alias-bg-layer-1: #fbfdfb;           /* 瓷白表面 */
  --dsw-alias-bg-layer-2: #e9efea;           /* 嵌套表面（冷灰绿） */
  --dsw-alias-bg-overlay: #ffffff;           /* 浮层 */
  --dsw-alias-border-l1: #d7e0d8;            /* 主边框（青灰） */
  --dsw-alias-border-l2: #c2d0c4;            /* 次边框 */
  /* 品牌与文字 */
  --dsw-alias-brand-primary: #2f6b52;        /* 青瓷绿 */
  --dsw-alias-label-primary: #17231c;        /* 墨绿黑文字 */
  --dsw-alias-label-secondary: #5c6f62;      /* 次文字 */
  /* 语义色（沿用 WCAG AA 值） */
  --dsw-alias-state-error-primary: #c74330;  /* 错误 */
  --dsw-alias-state-success-primary: #287b38; /* 成功 */
  --dsw-alias-state-warn-primary: #985d00;   /* 警告 */
  --dsw-specific-sidebar-fill: #edf2ee;      /* 侧栏（冷灰绿） */
  /* 强调变量（青瓷绿 accent 系：与成功绿同族但更深沉） */
  --mdvr-sans: Geist, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --mdvr-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace;
  --mdvr-mm: 2;                              /* 间距倍数 */
  --mdvr-link: #005ae0;                      /* 链接色（保持信息蓝约定，AA） */
  --mdvr-link-hover: #0072f5;                /* 链接 hover */
  --mdvr-highlight: #b3541e;                 /* 琥珀高亮 */
  --mdvr-highlight-soft: #fdf0dc;            /* 高亮 tint 底（mark） */
  --mdvr-accent: #2f6b52;                    /* 青瓷绿：边条/标条/列表符号 */
  --mdvr-accent-text: #1e4d3a;               /* 深绿字（tint 上 AA） */
  --mdvr-accent-soft: #e4efe7;               /* 青绿 tint 底 */
  --mdvr-accent-faint: #a1bcb1;              /* 45% 预混 */
  --mdvr-accent-fainter: #c1d3cb;            /* 30% 预混 */
  --mdvr-code-border: #cfdcd2;               /* 行内代码描边（青灰） */
  --mdvr-table-head-bg: #e0ebe3;             /* 表头底 */
  --mdvr-table-head-text: #1e4d3a;           /* 表头字 */
  --mdvr-quote-bg: #eaf2ec;                  /* 引用衬底 */
  --mdvr-quote-border: #2f6b52;              /* 引用边条 */
}

/* ---------- ② 深色档：全局 token + 强调变量 ---------- */
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: #0e1210;              /* 墨绿黑 */
  --dsw-alias-bg-layer-1: #141a16;           /* 抬升表面 */
  --dsw-alias-bg-layer-2: #1b231d;           /* 嵌套表面 */
  --dsw-alias-bg-overlay: #171d19;           /* 浮层 */
  --dsw-alias-border-l1: #2a352d;            /* 主边框 */
  --dsw-alias-border-l2: #37443b;            /* 次边框 */
  --dsw-alias-brand-primary: #7fc4a0;        /* 青瓷绿（提亮） */
  --dsw-alias-label-primary: #e8f0ea;        /* 墨绿白文字 */
  --dsw-alias-label-secondary: #97a89c;      /* 次文字 */
  --dsw-alias-state-error-primary: #f4416c;  /* 错误 */
  --dsw-alias-state-success-primary: #62c473; /* 成功（青绿） */
  --dsw-alias-state-warn-primary: #ee9e0b;   /* 警告（金） */
  --dsw-specific-sidebar-fill: #111613;      /* 侧栏 */
  /* 强调变量（深色档提亮） */
  --mdvr-link: #60b1ff;                      /* 链接色 */
  --mdvr-link-hover: #a7d3ff;                /* 链接 hover */
  --mdvr-highlight: #ffb45e;                 /* 琥珀高亮 */
  --mdvr-highlight-soft: #3a2f1e;            /* 高亮 tint 底 */
  --mdvr-accent: #7fc4a0;                    /* 青瓷绿：主强调 */
  --mdvr-accent-text: #9ed9b8;               /* 浅青绿字 */
  --mdvr-accent-soft: #17241d;               /* 深绿 tint 底 */
  --mdvr-accent-faint: #416251;              /* 45% 预混 */
  --mdvr-accent-fainter: #30473b;            /* 30% 预混 */
  --mdvr-code-border: #2e3d33;               /* 代码描边 */
  --mdvr-table-head-bg: #18241d;             /* 表头底 */
  --mdvr-table-head-text: #9ed9b8;           /* 表头字 */
  --mdvr-quote-bg: #15201a;                  /* 引用衬底 */
  --mdvr-quote-border: #7fc4a0;              /* 引用边条 */
}

/* ---------- ③ 元素级定制（可选） ---------- */
/* 青瓷釉感：代码块/表格用更大圆角 */
:where(pre), :where(table) { border-radius: 12px; }
` },
}

// ---------- §4 共享排版骨架 ----------
// 只引用 var(--dsw-alias-*)（全局 token）与 var(--mdvr-*)（主题强调变量），不含写死色值。
// :where() 零优先级 → 产品显式样式永远优先，我们只兜底"裸语义元素"。
// ⚠️ themes/demo.css 的 §C 元素目录与本骨架一一对应，修改骨架必须同步 demo.css。
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
  '.mdvr-badge { font-family: var(--mdvr-mono, ui-monospace, Menlo, Consolas, monospace); font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: var(--mdvr-accent, #5856d6); color: #ffffff; }',
  '.mdvr-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; opacity: 0.9; }',
  '.mdvr-changes { margin: 2px 0 0; padding-left: 18px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-changes li { margin: 2px 0; }',
  '.mdvr-hist { border-top: 1px dashed var(--mdvr-accent-fainter, #cdccf3); padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }',
  '.mdvr-hist-title { font-size: 11px; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: 0.05em; }',
  '.mdvr-hist-item { display: flex; gap: 8px; align-items: baseline; font-size: 12px; }',
  '.mdvr-tag { font-family: var(--mdvr-mono, ui-monospace, Menlo, Consolas, monospace); font-size: 10px; flex: none; }',
  // 主题设置页
  '.mdvr-themes { display: flex; flex-direction: column; gap: 8px; }',
  '.mdvr-themes-title { font-size: 12px; color: var(--dsw-alias-label-secondary); }',
  '.mdvr-theme-card { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); cursor: pointer; text-align: left; font-size: 13px; color: var(--dsw-alias-label-primary); }',
  '.mdvr-theme-card:hover { border-color: var(--mdvr-accent-faint, #b4b3ed); }',
  '.mdvr-theme-card-active { border-color: var(--mdvr-accent, #5856d6); box-shadow: 0 0 0 1px var(--mdvr-accent, #5856d6); }',
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
let themeDisposer = null      // 当前样式表清理函数

// 激活主题：注入 骨架 + 主题 CSS + 面板样式（先卸旧表再注入）
// 原生模式（THEME_META[id].native）：只注入 PANEL_CSS，不碰产品 token 与排版
// 说明：token 与强调变量都直接写在主题 CSS 的 body / body[data-ds-dark-theme] 上，
//       与产品挂载机制一致（注入顺序晚于产品样式表 → 同选择器后者胜出）；
//       切换主题时旧样式表整体卸载 → 产品观感随之恢复。
function activateTheme(ctx, id) {
  const entry = THEMES[id]
  if (!entry) return
  if (themeDisposer) { themeDisposer(); themeDisposer = null }
  const meta = THEME_META[id] || {}
  if (meta.native) {
    // 原生模式：仅保留插件自有 UI 的最小样式（不影响产品界面）
    themeDisposer = styles.insert(PANEL_CSS)
  } else {
    themeDisposer = styles.insert(TYPO_CSS + '\n' + entry.css + '\n' + PANEL_CSS)
  }
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
  const entries = Object.keys(THEMES).map((id) => ({ id, meta: THEME_META[id] || { name: id, desc: '', swatches: [] } }))

  return React.createElement('div', { className: 'mdvr-themes' },
    React.createElement('div', { className: 'mdvr-themes-title' },
      '主题切换（会话级：刷新/重启后恢复默认 ' + ACTIVE_THEME + '）'),
    entries.map(({ id, meta }) => {
      const sel = id === active
      return React.createElement('button', {
        key: id,
        className: 'mdvr-theme-card' + (sel ? ' mdvr-theme-card-active' : ''),
        onClick: () => { activateTheme(rootCtx, id); setActive(id) },
      },
        React.createElement('span', { className: 'mdvr-theme-swatches' },
          (meta.swatches || []).map((c, i) => React.createElement('span', {
            key: i,
            className: 'mdvr-theme-swatch',
            style: { background: c },
          })),
        ),
        React.createElement('span', { className: 'mdvr-theme-info' },
          React.createElement('span', { className: 'mdvr-theme-name' }, meta.name + (sel ? ' ✓' : '')),
          React.createElement('span', { className: 'mdvr-theme-desc' }, meta.desc),
        ),
      )
    }),
  )
}

// ---------- §8 插件入口 ----------
return {
  apply(ctx) {
    rootCtx = ctx
    // 按配置应用默认主题（ACTIVE_THEME）
    activateTheme(ctx, ACTIVE_THEME)
    // Fiber 卸载清理：还原注入的样式表（stop/update/undefine 时自动执行）
    ctx.effect(() => () => {
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
