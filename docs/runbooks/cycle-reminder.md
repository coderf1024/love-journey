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
- 版本：`eb1ad017-4959-4ce6-8394-0ecfa1d6f4c2`（100%，2026-11-18 二次部署，取消公开入口）
- Cron：`0 1 * * *` 已注册
- Secret：`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`（`secret_text`）
- **无公开 URL**：`workers_dev = false`、`preview_urls = false`、`fetch()` 一律 404。旧的 `*.workers.dev` 地址已返回 `error code: 1042`。与 `love-morning-greeting` 一致。
- 生产库 `cycle/settings.json` **不存在**（404），因此实际不会推送。

待办：等到真正启用时，先在管理端「系统 → 生理期」保存一次设置（这会创建 `settings.json`），再确认 `remindEnabled` 的取值。

## 没有 HTTP 入口（2026-11-18 修正)

最初给这个 Worker 开了 `workers_dev = true` 和一个 `/run` 入口，还配了可选 `RUN_TOKEN`，理由是「方便手动验证某一天」。

这是错的。`scheduled()` 由 Cloudflare 的 cron 调度器直接调用，**完全不需要公网 URL**。那个入口唯一的用途是我自己用 curl 试，代价却是把「能触发真推送、能改写 `lastPush`」的能力挂到公网，并靠「记得设 token」兜底。

现在与早安完全一致：

- `workers_dev = false`、`preview_urls = false`
- `fetch()` 一律返回 404
- `RUN_TOKEN` 已从 Cloudflare 删除

验证分两层，各管各的：

| 想验证 | 怎么做 |
|---|---|
| 文案对不对 | 管理端「系统 → 生理期 → 发送测试」 |
| 定时会不会执行 | Dashboard → Workers → `love-cycle-reminder` → Logs |
| 判定逻辑 | `npm test`（20 条内存用例） |
| 本地真跑一次 | `wrangler dev --test-scheduled --remote` |

**管理端的「发送测试」**（2026-11-18 加，与早安同一套思路）：用已保存的文案 + 真实预测渲染，发到用户手机；三种场景（即将开始 / 当天 / 过期后）可单选或全选，发送前有确认框。**不写 `lastPush`、不改设置、不影响明天的定时判断。** 它只证明「发出来的东西长什么样」，不证明「cron 会不会跑」——后者只能看日志。

## fail closed 的默认值

`decide()` 遇到缺失的 `cycle/settings.json` 返回 `no-settings`，**不推送**。

浏览器侧 `normalizeCycleSettings(null)` 的缺省是「开」，那是给已经配置过的空间用的。Worker 面对的是一个可能从未启用的功能，不能同样默认开——否则部署当天就可能开始推送。生产库目前没有 `cycle/**`，所以即使 cron 触发也只会得到 `no-settings`。
