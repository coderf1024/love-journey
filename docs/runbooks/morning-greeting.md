# 每日早安运维

每天北京时间 08:14（UTC `14 0 * * *`）由 `workers/morning-greeting/` 发送。管理端「系统 → 通知 → 每日早安」保存开关、用户 / 大厨收件人、失败告警与首页待办提醒。没有第二个检查 Cron，也没有 Worker HTTP 发送入口。

## 部署前准备

- 站点仍从 main 部署静态文件；Worker 独立部署，不改变 EdgeOne / GitHub Pages 流程。
- 用户于 2026-11-12 追加决定：复用当前站点的 RAM AccessKey，已通过 stdin 注入 Cloudflare Secret。原 Key 权限保持不变，未扩大，也未收窄。
- 共享 Key 与管理端属于同一权限边界，不能声称只允许写早安目录。STS 确认身份为 RAMUser，但当前 Key 无权列出完整 RAM 策略。如以后拆分专用 Key，可使用以下最小策略；配置、story 与记录使用公开读，不需要 ListBucket 或私有读权限。

```json
{
  "Version": "1",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["oss:PutObject"],
    "Resource": ["acs:oss:*:*:love-config/love-journey/db/greeting/*"]
  }]
}
```

密钥值通过 Wrangler 交互输入或 `secret bulk` 的 stdin 输入；不要打印或放进命令参数、仓库、聊天、`[vars]`。本次使用进程内解码并直接传给 stdin，未生成明文密钥文件。本地 `.dev.vars*` 已忽略；不用时删除本地副本。

```bash
cd workers/morning-greeting
npm ci
npm test
npx wrangler deploy --dry-run
npx wrangler whoami
# 如果登录已过期，再运行：
npx wrangler login
```

首次部署顺序（先确保 OSS 的早安开关未开启，避免密钥尚未注入就尝试发送）：

```bash
npx wrangler deploy
npx wrangler secret put OSS_ACCESS_KEY_ID
npx wrangler secret put OSS_ACCESS_KEY_SECRET
npx wrangler secret list
npx wrangler deployments list
```

部署完成并核实两项 Secret 后，在已发布的管理端保存 Bark 总开关、早安开关和长期收件人。Secret 列表只能证明绑定存在；实际 RAM 权限仍需检查策略和下一次运行结果。Cron 配置传播可能需要几分钟，见 [Cloudflare Cron 文档](https://developers.cloudflare.com/workers/configuration/cron-triggers/)。

当前交付状态（2026-11-12）：Worker `love-morning-greeting` 已部署，Cron `14 0 * * *` 已配置；两项 `secret_text` 绑定经 secret list 验证。「宝宝早安」标题更新后当前 100% 版本为 `0fbff0a9-1169-4582-8a50-bac489a11bc2`。管理端已随 `433695e` 合并 main 发布，两站只读 smoke 通过。生产 space 尚无 morningGreeting 配置，按用户要求自动发送保持关闭，由用户自行选择收件人并启用；真实推送仍待实际使用验收。

## 测试与补发

2026-11-13：新标题与早安不跳转网页已部署至 Worker，当前版本 `e3f46320-03ff-4232-8bd9-137469d8c7d2`；管理端随 `0072d7c` 发布至两站。用户已开启早安并选择两位收件人，本轮不修改 OSS 开关、收件人或其他通知配置。上面的 11-12 开关状态仅为首次发布记录。

- 标题模板在代码里（Worker 与 `js/store.js`），当前为「宝宝早呀，在一起的第 N 天！」；N 从 OSS 的恋爱开始日期计算。天气、一句话实时获取。只有早安通知不带 Bark `url`，其他通知及失败告警跳转保持不变。

- 测试收件人独立选择，只影响本次测试。读取现有已保存的 Bark 密钥，现取天气与一句话，发送前确认；不更改长期配置，不写当天记录。
- 「补发」使用已保存的长期收件人；刚改收件人需先保存。发送前重新读当天记录，跳过已有成功记录的人。`sent` / `resent` 时拒绝再次补发。
- 天气获取失败或 8 秒超时只省略天气；一句话最长 20 字，最多请求 10 次，每次 8 秒超时。取不到一句话时不发半成品，记录失败原因。
- 本地 / 私网默认是测试库，默认禁止真实 Bark。需要真机验收时由人打开 [本地测试管理端](http://localhost:8889/admin.html?bark=on)，选择测试收件人并确认。
- 不要直接用生产配置运行 `wrangler dev --test-scheduled`：本地触发也会调用真实 Bark、写生产 OSS。仓库内 `npm test` 全部使用内存 mock，不会真实推送或写 OSS。

## 发送记录与漏发

记录仅存于 `love-journey/db/greeting/YYYY-MM-DD.json`，字段为 `date`、`kind`（scheduled / manual）、`status`（sent / resent / partial / failed）、`sentAt`、`recipients`（audience / ok / error）、可选 `error`。不存标题、天气或一句话，不做内容快照。

- 定时失败且可读到配置时，用管理员密钥即时推送告警；「失败告警」关闭时不发。
- 写发送记录失败也会告警，即使 Bark 已成功。此时先核对手机实际收到的通知，再决定补发，避免重复。
- 如果 OSS 配置完全不可读，Worker 无法获得管理员密钥；如果 Bark 自身不可用，告警也可能失败。Cloudflare 日志保留失败，不承诺这种情况下仍可推送告警。
- 管理端 08:14 后读取今天的结果，最多每分钟刷新一次；08:30 后且早安、首页提醒和 Bark 已开启，缺记录 / partial / failed 才出现待办。读失败显示「状态读取失败」，不把未知结果当作漏发。跨北京时间零点清除昨天的状态。
- 今天尚无记录时 OSS 返回 404 属于预期的缺对象响应；浏览器可能在控制台显示网络 404。这不代表脚本异常，也不应为隐藏它而新增 bucket 列表权限。
- 重试会保留成功收件人。但 OSS 无事务锁，两个浏览器 / Worker 同时发送、Bark 接收后请求超时、或发出后写记录失败，均无法保证严格一次送达。补发期间页面防重复点击；请避免多端同时补发。

查看日志：

```bash
cd workers/morning-greeting
npx wrangler tail
```

`tail` 只查看日志，不触发任务。Worker 已开启 observability；故障后也可在 Cloudflare 控制台看历史运行。

## 天气可达性

使用 [Open-Meteo](https://open-meteo.com/en/docs) 的北京坐标、北京时间日预报，与 Worker 和浏览器文案一致。携带 Origin 的请求实测返回 `Access-Control-Allow-Origin: *`。2026-11-12 本机 `--noproxy '*'` 复测 3 次均 200、约 1 秒；此前记录为 15 次成功。但是 DNS 为 `198.18.x.x` 代理假 IP，不能证明中国大陆无代理直连，也不是长期稳定性证据。正式验收仍需手机关闭代理后验证；[免费 API 条款](https://open-meteo.com/en/terms) 不保证持续可用。

## 关闭与回滚

管理端关闭「发送早安」并保存，下次定时执行跳过、首页不再提醒，手动补发仍可使用已保存的收件人。完全撤销定时任务可删除 Cloudflare Cron Trigger；代码回滚用 Worker 历史版本。删除 Worker 是另外的破坏性操作，不作为日常关闭步骤。

发送时间只在 `wrangler.toml` 配置；修改后同步管理端的时间文字、08:14 读取门槛、08:30 提醒门槛和 ADR。方案 3（独立外部心跳，比如 healthchecks.io）能发现 Cron 完全未触发，按用户决定暂缓，未接入。
