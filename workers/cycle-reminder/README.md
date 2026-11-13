# 生理期提醒运维

每天北京时间 09:00（UTC `0 1 * * *`）由 `workers/cycle-reminder/` 判断并推送。规则、阈值、文案全部在管理端「系统 → 生理期」维护，存在 `love-journey/db/cycle/settings.json`。

与 [早安](./morning-greeting.md) 是两个独立 Worker：时机不同（08:14 / 09:00）、依赖不同（天气 + 一言 + 告警 / 只读缓存）。合并会让改一个功能就得重新部署另一个，部署出错时两边一起受影响。

## 它做什么、不做什么

| 做 | 不做 |
|---|---|
| 每天 09:00 读 `cycle/periods.json` + `cycle/settings.json` + `space.json` | 不重算预测 |
| 按**缓存的** `prediction.range` 判断今天该不该推 | 不写 `periods.json` |
| 推一条 Bark（用户密钥） | 不写任何发送记录以外的历史 |
| 只把 `lastPush` 写回 `settings.json` | 不改经期记录 |

**为什么不重算**：预测日过了她还没记录，分不清是预测算错还是她没记。用「没记」去改预测，只会越算越偏。预测原样留着，才有东西可以事后回测。

## 判定表

| 条件 | 结果 |
|---|---|
| `settings.enabled === false` | `cycle-disabled` |
| `remindEnabled === false` | `reminders-off` |
| `prediction.status !== 'ok'` | `no-prediction` |
| 有进行中的经期（无 `end` 且 0–30 天内） | `period-running` |
| 当天已经推成功过 | `already-pushed` |
| 距预计开始 = `remindDaysBefore` 中的值（默认 1 / 0） | `before` / `start` |
| 已进入区间未过期 | `inside-window`（静默） |
| 过期天数 = `overdueRemindDays` 中的值（默认 3 / 5 / 7 / 10） | `overdue` |
| 其他 | `not-a-remind-day` / `not-an-overdue-day` |

上次推送 **失败** 不会挡住今天（只有 `ok === true` 才算已推）。这是有意的：宁可重试一次，也不要因为一次网络抖动就整天静默。

## Cron 与 Worker 数量

一个 Worker 支持多个 cron（`crons = ["14 0 * * *", "0 1 * * *"]`），`scheduled(event)` 里用 `event.cron` 区分。免费账号限制的是**每账号 5 个 cron 触发器**，不是 Worker 数。

尽管如此这里仍保持独立 Worker，理由见开头。现在两个：`love-morning-greeting`（08:14）、`love-cycle-reminder`（09:00）。

## 部署

与早安同一套：wrangler 4.160.1，仅限 Worker 目录；站点根目录仍无 package.json。密钥复用同一把 RAM AccessKey（与早安、站点相同），**不新增明文密钥到仓库**。

```bash
cd workers/cycle-reminder
npm ci
npm test                 # node:test，全内存 mock，不联网、不推送、不写 OSS
npx wrangler whoami      # 登录过期就先 npx wrangler login
npx wrangler deploy --dry-run
```

首次部署顺序（先部署再注入密钥；未注入时运行只会报 `缺少 OSS_...`，不会误发）：

```bash
npx wrangler deploy
npx wrangler secret put OSS_ACCESS_KEY_ID
npx wrangler secret put OSS_ACCESS_KEY_SECRET
npx wrangler secret put RUN_TOKEN      # 可选；不设则 /run 不再要求口令
npx wrangler secret list
```

`[vars]` 里只有 `OSS_REGION` / `OSS_BUCKET` / `DB_ROOT`，与早安一致。`USER_URL` 不设时回落到 `space.settings.links.user`，再回落到 `https://coderf.site/index.html`。

`workers_dev = true` 是**有意的**：`/run` 是唯一的人工验证入口，生产域名没有这条通道。设置 `RUN_TOKEN` 后必须带 `?token=`；不设则任何人知道地址都能触发一次真推送（`dry=0`），所以**建议设**。

## 验证（先 dry run，再真跑）

```bash
# 只看判断结果：不发通知、不写 OSS
curl 'https://love-cycle-reminder.<子域>.workers.dev/run?token=<RUN_TOKEN>'

# 指定某一天，覆盖各分支
curl '.../run?token=...&today=2026-12-08'   # before
curl '.../run?token=...&today=2026-12-09'   # start
curl '.../run?token=...&today=2026-12-14'   # overdue（第 3 天）

# 真的推一次并写 lastPush
curl '.../run?token=...&dry=0'
```

`dry=0` 会真的发 Bark、真的写 `settings.lastPush`。只在自己手机上验证时用。

## 漏发怎么看

- 用户端首页有横幅：`lastPush.ok === false` 且不超过 3 天时显示「上次的提醒没发出去」，点「去记录」直接开记录弹层。这条横幅**不会**自己去重算或补发。
- 管理端「系统 → 生理期 → 数据」显示上次推送的 `kind` 与结果。
- Cloudflare Dashboard → Worker → Logs 里每次运行都有一行 `[cycle-reminder] {...}`。

## 已知限制

- **只会推送一次就写 `lastPush`**。Bark 返回 200 但用户实际没收到（令牌失效、设备被移除）无法在服务端察觉。
- **没有补发入口**。漏发当天只能手动发一条，不写 `lastPush`（避免污染判断）。
- **OSS 无事务**：写 `settings.json` 是整份覆盖。如果管理端刚好在同一秒保存设置，后写的一方赢。
- **Cron 有分钟级延迟**，09:00 不保证准时。
- 共享 RAM Key 的权限与站点相同，Cloudflare Secret 只保护存储，不收窄权限。若以后要最小化，可换成只允许 `cycle/settings.json` PutObject 的专用 Key（同早安 runbook 的策略写法）。
