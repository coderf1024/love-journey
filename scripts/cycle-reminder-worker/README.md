# 生理期每日提醒 Worker

每天北京时间 09:00 跑一次：读 OSS 上的 `cycle/periods.json` 和 `cycle/settings.json`，
判断今天该不该推，推一条 Bark，然后把结果写回 `settings.lastPush`。

**它绝不写 `periods.json`，也绝不重算预测。** 预测算错还是她没记，从这个位置分不出来。

## 它读什么、写什么

| 文档 | 读 | 写 |
|---|---|---|
| `cycle/periods.json` | ✅ 只用 `prediction` 和 `items` | ❌ |
| `cycle/settings.json` | ✅ | ✅ 只写 `lastPush` |
| `space.json` | ✅ 取 Bark 密钥和头像 | ❌ |

## 推什么

| 触发 | 条件 | 默认文案 |
|---|---|---|
| `before` | 距预计开始日 = `remindDaysBefore` 里的天数（默认提前 1 天） | 「还有 {days} 天」 |
| `start` | 今天就是预计开始日 | 「预计今天开始」 |
| `overdue` | 已过预计区间末日，且过期天数 = `overdueRemindDays` 里的值（默认 3/5/7/10） | 「已经过了 {overdue} 天」 |

不推的情况：提醒关闭、没有可用预测、经期正在进行中、当天已经推过、落在预测区间内但还没过期。

文案在管理端「系统 → 生理期 → 提醒文案」改，变量 `{days}` `{range}` `{overdue}` `{url}`。

## 部署（两种方式，选一个）

### 方式 A：控制台粘贴（不用装任何东西）

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Worker**。
2. 名字填 `love-journey-cycle-reminder`，Create。
3. 点 **Edit code**，把 `scripts/cycle-reminder-worker/worker.js` 全文粘进去，Deploy。
4. 回到 Worker 页面 → **Settings** → **Variables and Secrets**，加下面这些（都选 **Secret** 或 Text 均可，值只有你自己看得到）：

   | 名字 | 值 |
   |---|---|
   | `OSS_REGION` | `oss-cn-beijing` |
   | `OSS_BUCKET` | `love-config` |
   | `OSS_ACCESS_KEY_ID` | 与 `js/oss-config.js` 里同一个 AccessKeyId |
   | `OSS_ACCESS_KEY_SECRET` | 与 `js/oss-config.js` 里同一个 AccessKeySecret |
   | `USER_URL` | `https://coderf.site/index.html#me`（点通知落到哪） |

   Key 的明文就在页面里（`CryptoUtils.decrypt` 能解出来），不用重新申请。

5. **Settings** → **Triggers** → **Add Cron Trigger**，填 `0 1 * * *`（UTC，等于北京时间 09:00）。

### 方式 B：wrangler（本地命令）

```bash
cd <repo>/scripts/cycle-reminder-worker
npx wrangler login          # 浏览器授权，一次就够
npx wrangler secret put OSS_REGION
npx wrangler secret put OSS_BUCKET
npx wrangler secret put OSS_ACCESS_KEY_ID
npx wrangler secret put OSS_ACCESS_KEY_SECRET
npx wrangler secret put USER_URL
npx wrangler deploy
```

`wrangler.toml` 里已经写好 `crons = ["0 1 * * *"]`，deploy 时自动注册。

## 验证

部署后打开浏览器访问 Worker 地址：

```
https://love-journey-cycle-reminder.<你的子域>.workers.dev/run?dry=1
```

默认就是 dry run：只返回「今天会不会推、推哪一档、文案长什么样」，不写任何东西、不发通知。

想看某一天的判断结果，加参数：

```
/run?dry=1&today=2026-12-08
```

确认无误后手动真跑一次（会推一条 Bark 并写 `lastPush`）：

```
/run?dry=0
```

**注意**：`dry=0` 会真的推送。如果今天不是提醒日，它会返回 `skip` 而不发。

## 排错

| 返回 | 含义 |
|---|---|
| `no-prediction` | `periods.json` 里没有可用的 `prediction`（记录不足 3 次，或超过 90 天没记） |
| `period-running` | 现在有进行中的经期，不打扰 |
| `not-a-remind-day` | 今天不在 `remindDaysBefore` 里 |
| `inside-window` | 已进入预测区间但还没过期，这类由过期提醒接管 |
| `already-pushed` | 今天已经推成功了 |
| `bark-disabled` | `space.settings.bark.enabled === false` |
| `no-key` | `space.settings.bark.userKey` 为空 |

## 已知限制

- OSS 写入用 V1 **URL 签名**（`OSSAccessKeyId` + `Expires` + `Signature` 放在查询串里），只 PUT `cycle/settings.json` 一个对象；不删不改别的。之所以不用 `Authorization` 头：Workers 不允许手动设置 `Date` 头，头签名会失效。
- 用的是 `js/oss-config.js` 里同一把 AccessKey。这把 Key 权限较大，Workers 的 `OSS_ACCESS_KEY_SECRET` 请只放在 Secret 里，不要写进仓库或截图。
- 每天只跑一次，容忍几分钟延迟（Cloudflare cron 不保证秒级）。
- 推送失败会写 `lastPush.ok = false`，用户端首页会显示「上次提醒没发出去」的横幅。
