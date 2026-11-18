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
npx wrangler secret list
```

`[vars]` 里只有 `OSS_REGION` / `OSS_BUCKET` / `DB_ROOT`，与早安一致。`USER_URL` 不设时回落到 `space.settings.links.user`，再回落到 `https://coderf.site/index.html`。

**没有公开 URL**（2026-11-18 修正）：最初为了 `/run` 开了 `workers_dev`，还加了可选 `RUN_TOKEN`。这是错的——`scheduled()` 是定时触发，不需要公网入口；开了就等于把「能触发真推送」挂到公网，并要靠「记得设 token」来兜底。现在与早安一致：`workers_dev = false`、`fetch()` 返回 404。

**`decide()` 对缺失的 `settings.json` 返回 `no-settings`，fail closed。** 浏览器侧 `normalizeCycleSettings(null)` 缺省是「开」，那是给已启用空间用的；Worker 面对的是可能从未启用的功能。生产库目前没有 `cycle/**`，所以即使 cron 触发也只会得到 `no-settings`。

## 验证

**主要方式：管理端「系统 → 生理期 → 发送测试」**（2026-11-18 加，和早安的「发送测试」同一套思路）。

- 用**已保存的**文案 + 真实预测渲染，发一条到用户手机。
- 三种场景可单选或全选：即将开始 / 当天 / 过期后；每次发送前有确认框。
- **不写 `lastPush`、不改任何设置**，因此不影响第二天的定时判断。
- **它验证的是「文案对不对」，不是「定时任务会不会执行」。** 后者只能在 Dashboard 日志里看——这也是这个测试存在的理由：定时不该靠人去守。

发送前先点「保存生理期设置」，因为测试读的是已保存的值，不是表单里没保存的草稿。

其他两种方式：

```bash
# 判定逻辑：20 条 node:test，全内存，覆盖每个分支
npm test

# 本地触发真实 scheduled()（会真的读 OSS、真的推 Bark）
npx wrangler dev --test-scheduled --remote
curl "http://localhost:8787/__scheduled?cron=0+1+*+*+*"
```

线上确认定时是否真的跑过：Cloudflare Dashboard → Workers & Pages → `love-cycle-reminder` → Logs，每次运行输出一行 `[cycle-reminder] {...}`，`reason` 字段就是「为什么推 / 不推」。

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
