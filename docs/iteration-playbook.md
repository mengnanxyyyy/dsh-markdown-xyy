# 快速迭代手册

每次迭代必须按下列固定步骤执行，保证「版本记录」的台账完整、可回滚、可追溯。

## 一次迭代 = 一个 Package

| 步骤 | 动作 | 产出 |
| --- | --- | --- |
| 1 | 确定版本号（semver：`0.2.0` 新功能 / `0.2.1` 修复） | 版本号 |
| 2 | 同步修改 `plugin/host.js` 与 `plugin/client.js` 内的 `MANIFEST`（version/name/palette/date/changes） | 双份一致的 MANIFEST |
| 3 | `manifest/versions.json` 顶部插入新条目（`packageId` 先留空） | 台账新条目 |
| 4 | 用 `cordis_define`（`kind: existing` + 原 pluginId）定义新 Package | 新 `packageId` |
| 5 | 用 `cordis_run`（`mode: update`）激活；若失败，读诊断后修复并重试，或 `mode: run` 回滚到 `currentPackageId` | 激活成功 |
| 6 | 浏览器刷新页面，验证：配色（浅/深）、排版、版本面板展示 | 验收 |
| 7 | 把 `packageId` 回填进 `manifest/versions.json`，提交 git（`git commit -m "vX.Y.Z: ..."` + `git tag vX.Y.Z`） | 持久台账 + 版本标签 |

## 硬性约束

1. **绝不覆盖旧 Package**：修改 = 追加新 Package。旧版本用于回滚和对照。
2. **双份 MANIFEST 必须一致**：Host 台账与 Client 面板读同一份信息，不一致会导致面板与台账错位。
3. **台账唯一键 = packageId**：重复激活同一版本不产生重复记录。
4. **验证三步**：浅色模式、深色模式、版本面板（含历史列表）都要看一眼再收工。
5. **审批被拒**：不要重复请求审批；先与用户确认方向，再出下一个 Package。

## 快速排查

| 现象 | 排查 |
| --- | --- |
| 主题没生效 | `cordis_inspect_self(pluginId, packageId)` 看 client 诊断；确认 `overrideTokens` 每个 token 都给了 `{light, dark}` |
| 排版没生效 | 确认 `styles.insert` 的 CSS 已注入；`:where()` 是零优先级，产品显式样式会赢，属预期 |
| 面板不显示 | 确认 `tool.view.cordis` 用 `key: 'self'`；面板绑定最新一次成功的 run 卡片 |
| `versions.list` 报错 | Host 半未运行；`harness.handle` 名与 `host.call` 名必须一致 |
| 更新失败 | `currentPackageId` 仍是旧版；修复 `nextPackageId` 后 update 重试，或 run 回滚 |
