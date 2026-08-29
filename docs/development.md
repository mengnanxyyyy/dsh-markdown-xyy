# 开发与发布流程

> 面向贡献者的固定迭代流程：保证「版本记录」的台账完整、可回滚、可追溯。整体架构见 `docs/architecture.md`，主题系统规范见 `docs/themes.md`，变量契约见 `docs/variables.md`。

## 一次迭代 = 一个 Package

| 步骤 | 动作 | 产出 |
| --- | --- | --- |
| 1 | 确定版本号（semver：新功能 / 修复） | 版本号 |
| 2 | 同步修改 `plugin/host.js` 与 `plugin/src/client.core.js` 内的 `MANIFEST`（version/name/palette/date/changes，双份一致），然后 `node scripts/build-client.js` 生成 `plugin/client.js`（⚠️ client.js 是构建产物，禁止手改） | 双份一致的 MANIFEST + 产物 |
| 3 | `manifest/versions.json` 顶部插入新条目（`packageId` 先留空） | 台账新条目 |
| 4 | `node scripts/check-release.js` 跑发布门禁（MANIFEST 一致性 / JS 语法 / 资产完整性 / CSS 结构 / 主题浅深挂载 / panel fallback） | 门禁通过 |
| 5 | minify 双半：`node scripts/minify.js plugin/host.js /tmp/host.min.js`、`node scripts/minify.js plugin/client.js /tmp/client.min.js`，然后 `node --check` 两个产物 | 可传输的精简双半 |
| 6 | `cordis_define`（`kind: existing` + 原 pluginId，**host + client 双半一次传完**）→ 拿到新 `packageId` → `cordis_inspect_self` 核对双半完整 | 新 Package |
| 7 | `cordis_run`（`mode: update`）激活；可能需用户审批；失败读诊断修复后重试，或 `mode: run` 回滚到 `currentPackageId` | 激活成功 |
| 8 | 浏览器刷新页面，验证：配色（浅/深）、排版、版本面板展示 | 验收 |
| 9 | 把 `packageId` 回填进 `manifest/versions.json`，提交 git（`git commit -m "vX.Y.Z: …"` + `git tag vX.Y.Z`） | 持久台账 + 版本标签 |

## 硬性约束

1. **绝不覆盖旧 Package**：修改 = 追加新 Package。旧版本用于回滚和对照。
2. **双份 MANIFEST 必须一致**：Host 台账与 Client 面板读同一份信息，不一致会导致面板与台账错位（check-release 第 2 项自动核对）。
3. **台账唯一键 = packageId**：重复激活同一版本只更新时间，不产生重复记录。
4. **验证三步**：浅色模式、深色模式、版本面板（含历史列表）都要看一眼再收工。
5. **审批被拒**：不要重复请求审批；先与用户确认方向，再出下一个 Package。

## 快速排查

| 现象 | 排查 |
| --- | --- |
| 主题没生效 | `cordis_inspect_self(pluginId, packageId)` 看 client 诊断；确认注入成功（`applySelection` 先构建新样式、成功后才替换旧样式）；深色档需主题文件同时含 `body` 与 `body[data-ds-dark-theme]`（选择器拼错则深色档不回退） |
| 排版没生效 | 确认样式已注入；`:where()` 零优先级下产品显式样式优先属预期，需要覆盖时按需 `!important`（参考内置主题 ③ 段） |
| 面板不显示 | 确认 `tool.view.cordis` 用 `key: 'self'`；面板绑定最新一次成功的 run 卡片 |
| `versions.list` 报错 | Host 半未运行；`harness.handle` 名与 `host.call` 名必须一致 |
| 更新失败 | `currentPackageId` 仍是旧版；`cordis_inspect_self` 读 `nextPackageId` 诊断后修同一插件，update 重试，或 run 回滚 |

## 基础约定

- 传输：单条消息约 26KB 转义字节上限，`plugin/host.js` + `plugin/client.js` 全文放不下，**必须用 minify 产物传输**；define 后 `cordis_inspect_self` 核对 `code.host` / `code.client` 均完整。
- 进程重启后插件丢失：用当前 `plugin/host.js` + `plugin/client.js`（minify 后）重新 define；台账历史在 `manifest/versions.json`。
- packageId 按进程分配、随重启重置，新进程可能拿到与旧条目相同的 id；`versions.json` 如实回填即可（check-release 对重复一律降级为警告）。