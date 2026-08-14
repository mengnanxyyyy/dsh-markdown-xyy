# LobeUI 色彩体系研究 + 「墨纸」主题逐 token 对比与改动建议

> 研究对象：lobehub/lobe-ui（master，树 SHA `17cc8a6`）、lobehub/lobe-chat（main）
> 对比对象：「墨纸 InkPaper」v0.1.0 的 13 个 `--dsw-alias-*` token（浅色/深色双值）
> 所有对比度数值均按 WCAG 2.1 相对亮度公式实测计算。

---

## 一、LobeUI 色彩体系的要点（含来源文件）

LobeUI 的主题**不是写死一组 token**，而是「**13 步色板（scale）+ 一套生成器 → antd AliasToken + 语义色 + 定制色**」的三层架构。来源如下：

### 1. 色板层：`src/color/colors/*.ts`（Radix 风格，13 步，索引 0–12）
每个色板是一个 `ColorScaleItem`（`src/color/types.ts`），含 4 组各 13 步：
- `light`（不透明）与 `dark`
- `lightA` / `darkA`（带 alpha 的透明渐变，用于 fill/覆盖层）

关键色板文件：
- 中性灰 `src/color/colors/gray.ts`
- 品牌主 `src/color/colors/primary.ts` 与 `src/color/colors/index.ts`（色板地图）
- 语义：`green.ts`/`lime.ts`（success）、`gold.ts`（warning）、`red.ts`/`volcano.ts`（error）、`blue.ts`/`geekblue.ts`（info）
- 可选中性色 `src/color/neutrals/{mauve,olive,sage,sand,slate}.ts`、可选主色 12 种

### 2. 生成层：`src/styles/theme/generateColorPalette.ts`
两个生成器把色板映射到 antd token，**索引是核心约定**：

`generateColorNeutralPalette`（灰）：
| token | light 取值 | dark 取值 |
|---|---|---|
| `colorText` | `light[12]` | `dark[12]` |
| `colorTextSecondary` | `light[10]` | `dark[10]` |
| `colorTextTertiary` | `light[8]` | `dark[8]` |
| `colorTextQuaternary` | `light[6]` | `dark[6]` |
| `colorBgLayout` | `light[1]` | `dark[0]` |
| `colorBgContainer` | `light[0]` | `dark[1]` |
| `colorBgElevated` | `light[0]` | `dark[2]` |
| `colorBorder` | `light[3]` | `dark[3]` |
| `colorBorderSecondary` | `light[2]` | `dark[2]` |

`generateColorPalette`（Primary/Success/Warning/Error/Info，语义色）核心映射：
`colorPrimary = scale[appearance][9]`；`colorPrimaryHover=[8]`；`colorPrimaryActive=[10]`（light）；文字用 `scale[9]` 或 `A[9]` 的 `...Text` 变体。

**关键设计意图**：语义色用「第 9 步」作**强调/描边/底色**，用 `...Text`/`...TextHover` 变体作**可阅读小字**——两者分离，不强行让同一个 hex 同时满足「好看」和「对比度」。

### 3. 组装层：`src/styles/theme/token/{base,light,dark}.ts` + `antdTheme.ts`
- `light.ts`：success=green、warning=gold、error=volcano、info=geekblue、primary=primary(中性灰)
- `dark.ts`：success=lime、error=red、info=blue、primary=primary
- `antdTheme.ts`：`createLobeAntdTheme({appearance, neutralColor, primaryColor})` 按 appearance 选算法

**注意**：LobeUI 浅色主题的 `colorPrimary` 用的其实是**中性黑**（`primary.light[9] = #222222`），深色用 `#eeeeee`；彩色仅作点缀与语义，这和我们「品牌主色=棕色」是不同的设计取向。

### 4. 深浅切换（3 档 light/dark/auto）
- lobe-chat `src/layout/GlobalProvider/NextThemeProvider.tsx`：`next-themes` 配 `enableSystem` + `defaultTheme="system"`，提供 `light | dark | system(auto)` 三档。
- `src/layout/GlobalProvider/AppTheme.tsx`：`useIsDark()` → `currentAppearence`，传入 `ThemeProvider appearance` + `customTheme={{neutralColor, primaryColor}}`，并把用户选择写入 cookie（`LOBE_THEME_PRIMARY_COLOR` / `LOBE_THEME_NEUTRAL_COLOR`，见 `packages/const/src/theme.ts`）。
- lobe-ui `src/ThemeProvider/ThemeProvider.tsx`：`antd-style` 的 `ThemeProvider` 承接 `appearance`，`createLobeAntdTheme` 按 apperance 选明/暗 token + 算法。

**对我们的启发**：已有「浅/深双值」=只支持 3 档里的前两档；若加 `auto` 需要把 token 从"静态双值"改成"跟随系统通知重算"。DSH 侧 `theme.overrideTokens` 若只支持静态双值，`auto` 需额外监听系统颜色方案事件自行切换。

---

## 二、当前 13 token 与 LobeUI 原则的逐项对比

### ✅ 做得对的地方
| 方面 | 现状 | LobeUI 印证 |
|---|---|---|
| 文字主色对比度 | 浅 14.0:1 / 深 13.9:1 | 与 lobe `colorText`（浅 #080808 18.9:1 / 深 #fff 21:1）同一量级，均远超 AA |
| 深色背景刻意偏黑 | `#191715` | lobe dark `colorBgLayout = #000000`，深色确实默认近黑 |
| 抬升层次用「更浅/更深」递进 | base→layer1→layer2 | 同 lobe `colorBgLayout→colorBgContainer→colorBgElevated` 递进思路 |

### ⚠️ 偏离 / 可改进的地方

**1. 文字次级对比度偏低、三级文字缺失。**
`label-secondary` 浅 `#6d6350/5.53:1`、深 `#a39a87/6.41:1`，达标但偏弱；且 **没有第三级文字**（lobe 有 `colorTextTertiary` = 8 档、`colorTextQuaternary` = 6 档，用于 disabled/metadata）。我们的 `.mdvr-meta`、`.mdvr-changes` 都塞在 secondary 一档里，层级糊在一起。

**2. 侧栏 `--dsw-specific-sidebar-fill` 浅色 `#efe8da` 与 layer-1 `#f3eee4` 仅相差约 ΔL≈0.016，视觉上几乎无分层**；lobe 的 surface 递进靠的是灰阶 `#f8f8f8→#eeeeee→#dddddd`（Δ 明显）。深色同理 `#1e1b17` 与 base `#191715` 太近。

**3. 语义色：我们"反着用"了 lobe 的两层分离原则。**
- error 浅 `#b0452c` vs lobe `volcano.light[9]=#ec5e41`：我们更深、更"红棕"，与品牌棕混色，两个错误感不纯。
- warn 浅 `#a97a1d`（3.58:1）是全表最低的小字对比，接近但不到 AA(4.5:1)；lobe 的 `gold.light[9]=#ee9e0b` 更橙、更亮，用作**描边/图标**而非正文强调。
- 我们没有 `colorInfo`（蓝/geekblue）——lobe 明确有 info 通道（geekblue.light[9]=#0072f5 等）。

**4. 边框：深浅两色 `border-l1/l2` 对比度都很弱（lobe 边框本就是弱对比的装饰线，1.4–1.8:1 属正常）**，但我们的 `border-l2` 与 `border-l1` 差得不够（#d2c6ac vs #e3dac6），层次感弱。lobe 用 `colorBorder=light[3]` 与 `colorBorderSecondary=light[2]` 拉开。

**5. 品牌色作为链接/强调色**：浅 `#8a5a2b`(5.49:1)、深 `#d9a15c`(7.83:1) 均 OK；但作为**小字链接**对比度偏紧，且缺少 hover 变体（lobe 有 `colorPrimaryHover`/`colorLinkHover`）。`colorLink` 在 lobe 里直接指向 `colorInfoText`（蓝系），标了链接不会和品牌色混。

---

## 三、建议改动清单（before → after，均含浅/深）

> 建议原则：**保留暖纸美感，但把"色阶递进"和"文字/强调两层语义"对齐 LobeUI。** 浅色 bg 三元组统一微调为更暖的灰米，深色三元组拉开亮度。

### 背景三元组（对齐 lobe bgLayout/bgContainer/bgElevated 递进）
| token | 现状 light / dark | 建议 after light / dark | 理由 |
|---|---|---|---|
| `--dsw-alias-bg-base` | `#faf7f1` / `#191715` | **`#faf6ef`** / **`#14120f`** | 深色更贴近 lobe dark bgLayout 近黑；浅色降一点点饱和度，暖感不变 |
| `--dsw-alias-bg-layer-1` | `#f3eee4` / `#211e1a` | **`#f2ece0`** / **`#1d1915`** | 与 base 拉开（lobe: `#f8f8f8→#eeeeee`） |
| `--dsw-alias-bg-layer-2` | `#eae3d4` / `#2a2621` | **`#e9e1d0`** / **`#28231d`** | 三级递进更明显 |
| `--dsw-specific-sidebar-fill` | `#efe8da` / `#1e1b17` | **`#032`位置参考 layer-2，建议 `#ece4d5`** / **`#1a1612`** | 侧栏与 layer-1 太近；lobe surface 各层 Δ 需可见。**建议为侧栏再降半档使 Δ 可见** |

### 边框（对齐 lobe colorBorder=3 / colorBorderSecondary=2）
| token | 现状 | 建议 after | 理由 |
|---|---|---|---|
| `--dsw-alias-border-l1` | `#e3dac6` / `#3a342b` | **`#dbcfb3`** / **`#3a342b`** | 主边框加深，与 bg 拉开（lobe light[3] 比 bg 深一档） |
| `--dsw-alias-border-l2` | `#d2c6ac` / `#4b4234` | **`#c6b68f`** / **`#4a4132`** | 次边框进一步加深，与 l1 拉开 |

### 文字（对齐 lobe 文字多级阶 + 提高 secondary）
| token | 现状 | 建议 after | 理由 |
|---|---|---|---|
| `--dsw-alias-label-primary` | `#2b261e` / `#e9e2d4` | **`#292113`**（14.75:1）/ **`#efe8da`**（15.3:1） | 略偏暖黑，接近 lobe colorText 深度 |
| `--dsw-alias-label-secondary` | `#6d6350` / `#a39a87` | **`#71664f`**（5.25:1）/ **`#a8a08c`**（7.2:1） | 提高次级文字对比（浅 ≤4.5 正文字更稳）|
| （新增）三级文字 | 无 | **建议新增 `--dsw-alias-label-tertiary` = `#9b9181` / `#7a7466`** | 供 disabled/版本标签用，对齐 lobe colorTextTertiary |

### 品牌色（对齐 lobe primary 的 hover/active 变体；链接可考虑 info 蓝）
| token | 现状 | 建议 after | 理由 |
|---|---|---|---|
| `--dsw-alias-brand-primary` | `#8a5a2b` / `#d9a15c` | **保留主色，但补 hover 变体 `#7a4c20` / `#e8b872`** | lobe 有 colorPrimaryHover=[8]；目前缺 hover |
| 链接色 | 用 brand-primary | **建议独立 `--dsw-alias-link` = #0d78ce / #60b1ff（blue 系）** | lobe `colorLink = colorInfoText`（蓝），链接与品牌明显区分 |

### 语义色（对齐 lobe 的"强调色"与"文字色"分离 + 补 info）
| token | 现状 | 建议 after | 理由 |
|---|---|---|---|
| `--dsw-alias-state-error-primary` | `#b0452c` / `#e0704f` | **`#a51d3c`? 保留酒红更贴 lobe red[9]=#f4416c 的偏玫红 → 建议 `#bf2250` / `#f4416c`** | 与品牌棕解耦；lobe error 走 red，不走棕 red。若要更"暖纸"用 volcano `#ec5e41` |
| `--dsw-alias-state-success-primary` | `#3e7d4c` / `#7fb98a` | **`#379d4a` / `#62c473`** | 直接对齐 lobe green[9]=#379d4a / green.dark[9]=#62c473 |
| `--dsw-alias-state-warn-primary` | `#a97a1d` / `#d9a94e` | **`#b77900`(浅描边)/`#d9a94e` 或 `#ee9e0b`/`#ffb224`** | lobe gold[9]=#ee9e0b；**警告若作正文小字需单独加深**，否则用 step9 作图标/描边 |
| （新增）`--dsw-alias-state-info-primary` | 无 | **`#0d78ce` / `#60b1ff`** | 对齐 lobe geekblue/blue info 通道 |

---

## 四、可落地的顶层结论（给实现者的 5 条）

1. **补第三档 `auto`**：把 token 从"静态双值"升级为"监听 `prefers-color-scheme` 事件重算"（对应 lobe 的 `NextThemesProvider enableSystem / defaultTheme=system` + `AppTheme useIsDark`）。DSH `theme.overrideTokens` 若只静态承载，需要在 Client 里自行监听系统深浅并重复注入。
2. **文字引入三级阶**：primary/secondary/**tertiary**，把 `.mdvr-meta`/changes 等从 secondary 降到 tertiary，层次立刻清晰。
3. **语义色"画两层"**：强调（描边/图标/底色）用一个 hex，小字用 `...Text` 深一档的 hex——不要在同一个 token 上既追求好看又追求可读，学 lobe 的 `[9]` vs `...Text[10/A9]`。
4. **把品牌色、链接色、info 色三者分开**；hover 变体补上（clone lobe colorPrimaryHover）。
5. **加深深色 bg 到近黑 + 拉开各 surface Δ**，这是 lobe dark 观感"克制高级"的主要来源。

来源（URL）：
- 主题生成 `src/color/colors/*.ts`、`src/color/types.ts`
- `src/styles/theme/generateColorPalette.ts`、`src/styles/theme/token/{base,light,dark}.ts`、`src/styles/theme/antdTheme.ts`、`src/styles/theme/customToken.ts`
- `src/ThemeProvider/ThemeProvider.tsx`、`src/ThemeProvider/type.ts`
- lobe-chat `src/layout/GlobalProvider/{AppTheme,NextThemeProvider}.tsx`、`packages/const/src/theme.ts`
- 文档与参考：<https://deepwiki.com/lobehub/lobe-ui/2.1-themeprovider-and-global-styles>、<https://lobehub.github.io/lobe-ui/>、lobe-chat theme 文档（unpkg `@lobehub/chat` docs/usage/features/theme.mdx）
