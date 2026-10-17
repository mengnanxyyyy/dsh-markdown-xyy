# 跨平台与 Desktop 兼容

> 适用范围：Windows 原生、macOS、WSL2 内的 `dsh web`，以及 DeepSeek Harness **Desktop**（Electron 壳）。
> 本文记录**资源 / 主题文件引用链路**、平台相关不变量、验证清单与已知限制；门禁第 13 节（`scripts/check-release.js`）静态守护这些不变量。
> 事实来源：DSH 仓库 `apps/desktop/README.zh.md`、`docs/user/develop/basic/publish.zh.md`、`docs/cookbook/adding-a-settings-card.zh.md`，以及本机 DSH 安装包内 `dsh-client-modules` / `dsh-host-webserver` / `dsh-client-ui-theme` / `dsh-fs-local` / `dsh-shell` / `dsh-atomic-write` 的 README 与源码（0.2.0 实测）。

## 支持矩阵

| 运行形态 | 状态 | 说明 |
| --- | --- | --- |
| Web · Linux / WSL2 / macOS | ✅ 日常验证路径 | 本机 WSL2 内 `dsh web`，全部功能可用 |
| Web · Windows 原生 | ⚠️ v2.1.3+ 静态修复，待实机验证 | 修复前：内置主题列表为空、用户主题不可用 |
| Desktop · macOS / Linux | ⚠️ 待实测 | 需单独装进 `desktop` profile；`/mdvr/api` 的 Electron 转发待确认 |
| Desktop · Windows | ⚠️ v2.1.3+ 静态修复，待实机验证 | 同时受 Windows 路径与 Desktop profile 两条约束 |
| 动态 define 通道 | ✅ POSIX；Windows 依赖 workspaceRoot 探测 | 无 `__MDVR_PKG_ROOT__` 注入，按内容探测项目根 |

## 资源引用链路

浏览器半侧**读不到文件系统**（DSH 客户端 bundle 只提供 lazy-CJS 模块，资源必须来自 Host）。因此本插件的所有 CSS 都以"Host 读文本 → 分块 RPC → 客户端注入 `<style>`"的方式工作，**没有任何相对 URL 引用**：

```
内置主题 / panel.css（常驻安装通道）
  lib/index.mjs 包装器注入 __MDVR_PKG_ROOT__ = resolve(fileURLToPath(new URL('..', import.meta.url)))
    → host.js resolveProjectRoot() 优先采用（动态通道无此标识，退化为 workspaceRoot 内容探测）
    → fs.resolve(joinPath(root, 'plugin/assets/...')) → fs.readText
    → 8000 字符/片 RPC（/mdvr/api/themes.builtin.get 或 harness.handle）
    → 客户端拼接分片 → document.head 注入 <style>

用户主题
  目录 = <DSH_HOME>/web-themes-xyy（默认 ~/.dsh/web-themes-xyy；
         Windows 为 %USERPROFILE%\.dsh\web-themes-xyy，即 C:\Users\<用户名>\.dsh\web-themes-xyy）
    → 设置页显示 Host 返回的真实绝对路径（自定义 DSH_HOME / Windows 盘符都准确）
    → 分辨率优先级：包装器注入 __MDVR_DSH_HOME__ → shell 探测（echo "$HOME" / $USERPROFILE）
      → workspaceRoot 推导（/home/<u>、/Users/<u>、C:\Users\<u>）→ 全失败返回 null（功能降级，不猜路径）
    → fs.listDir / readText / writeText（写时申请 danger-full-access 策略）
    → 目录不存在无需预处理：fs.writeText 的原子写内部 mkdir(recursive) 自动建父目录
```

为什么不在构建时内联 CSS：主题是**可编辑资产**（文件即主题、改文件即生效），内联会破坏这条约定；同时主题只在需要时按需拉取，避免增大 bundle。

## 平台相关不变量（门禁第 13 节）

| 项 | 不变量 | 违反后的真实故障 |
| --- | --- | --- |
| 13.1 | URL → 文件路径必须 `fileURLToPath`，禁止 `URL.pathname` | `URL.pathname` 在 Windows 给出 `/C:/...`，空格/中文保留 `%20` 等编码 → 包内资产全部读不到 |
| 13.2 | 用户主题目录优先用包装器注入的 `__MDVR_DSH_HOME__` | 依赖 `$HOME` / POSIX 形态 workspaceRoot → Windows 下目录解析失败 |
| 13.3 | shell 服务只用 `resolve()` + `execute().result()`，禁止 `run()` | DSH 0.2.x 的 `ctx.shell` 没有 `run()`，旧探测分支一直静默失效 |
| 13.4 | 禁止硬编码 `/home/<user>` 兜底 | 换机器 / Windows 会指向不存在的目录 |
| 13.5 | 禁止 POSIX 专属 shell 命令（`printf` / `mkdir -p`） | Windows 执行器是 PowerShell（`dsh-pwsh-local`），命令直接失败 |
| 13.6 | 主题 id 必须拦截 Windows 保留设备名（`con`/`nul`/`com1`…） | `con.css` 之类在 Windows 无法创建，保存报莫名错误 |
| 13.7 | 诊断日志写 `os.tmpdir()` | Windows 没有 `/tmp`，日志静默丢失 |
| 13.8 | 用户主题目录不存在时 `themes.user.list` 返回空列表（`stat` 先行） | 首装 / 还没保存过主题时目录尚未创建，旧实现 `listDir` 抛 ENOENT → 客户端误报「读取用户主题失败」 |
| 13.9 | 用户主题路径提示用 Host 返回的真实绝对路径；未知时 Windows 用 `%USERPROFILE%\.dsh\web-themes-xyy` 兜底 | 只写 `~/.dsh/web-themes-xyy` 时 Windows 用户按提示找不到目录（`~` 在资源管理器里无效） |

## 验证清单

### WSL2 / Linux 日常验证（改动后必跑）

```bash
node scripts/build-client.js && node scripts/build-installed.js && node scripts/check-release.js
```

门禁第 13 节全绿即表示平台不变量未被破坏；其余章节覆盖主题契约与版本对齐。

### Windows 原生验证

1. 在 Windows 侧装同一版本：`dsh plugin --profile web add dsh-markdown-xyy`（或 `file:` 指向工作区）
2. 打开设置 → 主题设置，确认：
   - 4 套内置主题**列表非空**（P0 修复的靶心：`__MDVR_PKG_ROOT__` 解析）
   - 面板 UI 样式正常（`panel.css` 读取成功）
   - 新建用户主题能保存，文件落在 `%USERPROFILE%\.dsh\web-themes-xyy\<id>.css`
3. 若配置了 `DSH_HOME`，确认用户主题落在 `%DSH_HOME%\web-themes-xyy\`
4. 刻意试一次非法文件名（如 `con`、`a/b`、`.hidden`）→ 应得到可读的中文错误提示

### Desktop 验证

1. 先启动一次 Desktop 初始化 profile，完全退出
2. 安装（Desktop 与 Web 的 profile **互相独立**）：
   - 应用内 **插件（Plugins）** 页安装，或
   - 用 Desktop 自带的 `dsh` 命令：`dsh plugin --profile desktop add dsh-markdown-xyy`
   - ⚠️ npm 全局安装的 `dsh` 会拒绝管理 desktop profile；必须先注册 Desktop 的 dsh 命令（应用菜单 → 管理 dsh 命令…）
3. 重启 Desktop，确认：主题设置区块出现、内置主题可切换、深浅色正常、版本面板显示正确版本
4. 确认 Host↔Client RPC：若设置页主题列表为空但 Host 无报错，检查 Electron 是否把 `dsh-app://app/mdvr/api/*` 转发给 Web Host（`/mdvr/api` 走的是 Host 的 `webServer` 路由，Desktop Host 默认监听系统分配端口）

## 已知限制

- **动态 define 通道不做资产注入**：没有 `__MDVR_PKG_ROOT__`，只能靠 `workspaceRoot` 内容探测；Windows 下若 DSH 从别处启动会找不到 `plugin/assets` → 主题列表为空（诚实降级，不再猜路径）。
- **`DSH_HOME` 自定义时用户主题跟着迁移**：目录语义是 `<DSH_HOME>/web-themes-xyy`；默认 `~/.dsh` 下路径不变。旧自定义路径（如果曾用 `$HOME` 手建）需要自行迁移。
- **Desktop 的 `/mdvr/api` 转发依赖 Electron 行为**：0.2.x Desktop 文档写"应用 HTTP 请求转发给已认证 Web Host"，但旧版 `dsh-host-webserver` README 描述过 `file://` + IPC fetch 桥（两者不一致）。若实测不通，需要改用平台提供的 API 桥接（届时要改 `scripts/build-installed.js` 里的 client host 桥）。
- **Desktop 恢复机制**：Host 启动失败时 Desktop 会禁用第三方 bundle；本插件 `apply` 已 try/catch，资产不可读时降级返回错误而不是抛异常，不会误触发恢复。
- 门禁第 11 节的两条环境警告（本机 DSH 版本 / cordis 版本落后于声明基线）属正常环境差异，与跨平台无关。

## 参考

- [DSH Desktop README](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.zh.md)
- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)
- [添加设置卡片（第三方插件客户端形态）](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-settings-card.zh.md)
- 本机 DSH 安装包内：`dsh-client-modules` / `dsh-host-webserver` / `dsh-client-ui-theme` / `dsh-fs-local` / `dsh-shell` / `dsh-atomic-write` 的 README
