# 生理期提醒运维

每天北京时间 09:00（UTC `0 1 * * *`）由 `workers/cycle-reminder/` 判断并推送。

详细说明（判定表、验证命令、已知限制）在 [Worker 目录的 README](../../workers/cycle-reminder/README.md)。本页只记部署状态和需要人决定的边界。

## 与其他定时任务的关系

| Worker | Cron（UTC） | 北京时间 | 职责 |
|---|---|---|---|
| `love-morning-greeting` | `14 0 * * *` | 08:14 | 早安（天气 + 一句话 + 失败告警） |
| `love-cycle-reminder` | `0 1 * * *` | 09:00 | 生理期提醒（只读缓存 + 一条 Bark） |

两者独立，不合并。一个 Worker 本身支持多个 cron（`crons = [...]`，用 `event.cron` 区分），免费额度是每账号 5 个 cron 触发器。分开的理由是部署与故障互不影响，不是额度。

## 部署状态

2026-11-18 首次部署完成：

- Worker：`love-cycle-reminder`
- 地址：`https://love-cycle-reminder.coderf.workers.dev`
- 版本：`33b5c22b-e4a4-4a0e-9e78-30c64bc21874`（100%）
- Cron：`0 1 * * *` 已注册
- Secret：`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`、`RUN_TOKEN`（三项均 `secret_text`）
- 生产库 `cycle/settings.json` **不存在**（404），因此实际不会推送。`/run` 各日期分支均返回 `no-settings`，符合预期。

待办：等到真正启用时，先在管理端「系统 → 生理期」保存一次设置（这会创建 `settings.json`），再确认 `remindEnabled` 的取值。

## 安全默认（2026-11-18 修正）

最初的设计让 `RUN_TOKEN` 可选，不设就等于任何人都能 `?dry=0` 触发真推送。已改成：

1. **未配置 `RUN_TOKEN` 时，`dry=0` 一律拒绝**（返回 `README` 提示），只能 dry run。
2. **token 不匹配时不返回 401，而是降级为 dry run**，并在响应里带 `warning`。理由是 401 会让「忘了 token」看起来像「服务坏了」；降级后结果仍然可读，且不会误发。
3. **`decide()` 对缺失的 `settings.json` 返回 `no-settings`（fail closed）**。浏览器侧 `normalizeCycleSettings(null)` 缺省是「开」，那是给已启用空间用的；Worker 面对的是一个可能从未启用的功能，不能默认开。
4. `workers_dev = true` 保留，因为 `/run` 是唯一的人工验证入口；生产库没有 `cycle/**`，即使被触发也只是返回 `no-settings`。

## 数据边界

- 只读 `cycle/periods.json`、`cycle/settings.json`、`space.json`。
- **只写** `cycle/settings.json` 的 `lastPush` 字段，整份覆盖写入。
- 从不写 `cycle/periods.json`，从不重算预测。

## 漏发处理

- 用户端首页横幅会在 `lastPush.ok === false` 且 3 天内提示；横幅只提示，不补发。
- 管理端「系统 → 生理期」显示上次推送结果。
- 目前没有自动补发。当天漏了就漏了，第二天按新的一天重新判断——这是刻意的：补发一个过期提醒会让「今天该不该提醒」这件事变得不可推理。
