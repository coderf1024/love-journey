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

（部署后在此记录：Worker 名、版本 ID、Secret 绑定、Cron 生效时间。）

## 数据边界

- 只读 `cycle/periods.json`、`cycle/settings.json`、`space.json`。
- **只写** `cycle/settings.json` 的 `lastPush` 字段，整份覆盖写入。
- 从不写 `cycle/periods.json`，从不重算预测。

## 漏发处理

- 用户端首页横幅会在 `lastPush.ok === false` 且 3 天内提示；横幅只提示，不补发。
- 管理端「系统 → 生理期」显示上次推送结果。
- 目前没有自动补发。当天漏了就漏了，第二天按新的一天重新判断——这是刻意的：补发一个过期提醒会让「今天该不该提醒」这件事变得不可推理。
