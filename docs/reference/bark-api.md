# bark
iPhone 推送通知工具 Bark，它是一个开源 App：通过简单的 HTTP 请求，就能把自定义消息推送到你的手机，支持通知分组、自定义铃声等功能，也可以自建服务端。

# 1 纯文本与换行

展示中文、英文、数字、Emoji 和换行。JSON 中的 \n 会转换为正文换行。

```bash
curl --silent --show-error --fail-with-body \
  --request POST 'https://api.day.app/push' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<'JSON'
{
  "device_key": "YOUR_DEVICE_KEY",
  "group": "网站通知格式测试",
  "isArchive": "1",
  "body": "【1/7 纯文本】\n你好，这是你的网站发来的测试消息。\n支持中文、English、数字 123，以及 Emoji 🎉✅。"
}
JSON
```

# 2 标题与副标题

分别设置 title、subtitle 和 body，观察三个层级的显示效果。

```bash
curl --silent --show-error --fail-with-body \
  --request POST 'https://api.day.app/push' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<'JSON'
{
  "device_key": "YOUR_DEVICE_KEY",
  "group": "网站通知格式测试",
  "isArchive": "1",
  "title": "2/7 标题：报告生成完成 ✅",
  "subtitle": "副标题：你的网站 · 任务通知",
  "body": "这里是正文。\n本周报告已生成，共包含 12 条数据。\n标题、副标题、正文会分别显示。"
}
JSON
```

# 3 Markdown 文字样式

使用 markdown 参数展示加粗、斜体、删除线、行内代码和链接。传入 markdown 时会忽略 body。

```bash
curl --silent --show-error --fail-with-body \
  --request POST 'https://api.day.app/push' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<'JSON'
{
  "device_key": "YOUR_DEVICE_KEY",
  "group": "网站通知格式测试",
  "isArchive": "1",
  "title": "3/7 Markdown：文字样式",
  "markdown": "**这是加粗**，*这是斜体*，~~这是删除线~~。\n\n行内代码：`status = success`\n\n[打开 Bark 官网](https://bark.day.app)"
}
JSON
```

# 4 Markdown 结构排版

展示标题、引用、无序列表、有序列表、任务列表和代码块。

````bash
curl --silent --show-error --fail-with-body \
  --request POST 'https://api.day.app/push' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<'JSON'
{
  "device_key": "YOUR_DEVICE_KEY",
  "group": "网站通知格式测试",
  "isArchive": "1",
  "title": "4/7 Markdown：结构排版",
  "markdown": "# 报告摘要\n> 这是一段引用\n\n- 新增用户：12 人\n- 完成任务：8 项\n\n1. 查看报告\n2. 确认结果\n\n- [x] 数据整理\n- [ ] 人工确认\n\n```json\n{\"status\": \"ok\"}\n```"
}
JSON
````

# 5 图片通知

image 使用图片 URL。长按或展开通知查看大图，也可在 Bark 历史记录里查看；图片下载超时可能不显示。

```bash
curl --silent --show-error --fail-with-body \
  --request POST 'https://api.day.app/push' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<'JSON'
{
  "device_key": "YOUR_DEVICE_KEY",
  "group": "网站通知格式测试",
  "isArchive": "1",
  "title": "5/7 图片通知 🏞️",
  "body": "这条消息附带一张风景图片。\n请长按或展开通知查看大图，也可以在 Bark 历史记录中查看。",
  "image": "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1000&q=80"
}
JSON
```

# 6 自定义图标

icon 使用图片 URL，替换通知中的默认图标，需要 iOS 15 及以上。

```bash
curl --silent --show-error --fail-with-body \
  --request POST 'https://api.day.app/push' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<'JSON'
{
  "device_key": "YOUR_DEVICE_KEY",
  "group": "网站通知格式测试",
  "isArchive": "1",
  "title": "6/7 自定义图标",
  "body": "这条通知使用 Bark 官方示例头像。\n你的网站可以把它换成品牌 Logo 或用户头像。",
  "icon": "https://day.app/assets/images/avatar.jpg"
}
JSON
```

# 7 点击跳转

点击通知打开 url 指定的网页。正式接入时可替换为你的网站详情页。

```bash
curl --silent --show-error --fail-with-body \
  --request POST 'https://api.day.app/push' \
  --header 'Content-Type: application/json; charset=utf-8' \
  --data-binary @- <<'JSON'
{
  "device_key": "YOUR_DEVICE_KEY",
  "group": "网站通知格式测试",
  "isArchive": "1",
  "title": "7/7 点击跳转 🔗",
  "body": "点击这条通知，会打开 Bark 官网。\n正式接入后，可以换成你的网站订单、消息或报告详情页。",
  "url": "https://bark.day.app"
}
JSON
```

# 接口说明

所有命令通过 POST JSON 调用 /push。正文中的换行、双引号由 JSON 转义；带单引号的 heredoc 标记保留 Markdown 反引号等字符，避免被 shell 执行。

[Bark 请求参数](https://github.com/Finb/Bark/blob/master/docs/params.md) · [Bark 使用教程](https://github.com/Finb/Bark/blob/master/docs/tutorial.md)


## 用户 / 大厨触达时机表

这是分析结果，还没有改通知代码。当前没有后端和推送通道，所以「即时」触达只在页面打开且有轮询时有效；「下次打开」靠页面加载时对比状态；「定时」只能依赖 GitHub Actions，且 cron 是尽力而为、可能延迟 5–20 分钟。

### 即时触达

| 时机            | 给谁 | 触达模板                                                                | 建议渠道                             | 优先级 |
| --------------- | ---- | ----------------------------------------------------------------------- | ------------------------------------ | ------ |
| 下单成功        | 用户 | 预约成功：{dateLabel} {mealLabel} · {time}，共 {total} 币，等大厨接单。 | 站内 toast（已有）                   | P0     |
| 新预约待接单    | 大厨 | 新预约：{slot}；{items}；合计 {total} 币；备注：{note}。                | 小灶 tab 红点 + 标题计数 + 外部 push | P0     |
| 催一催          | 大厨 | 她催你啦：{slot} 的 {orderId} 还在「{status}」，已等 {minutes} 分钟。   | 外部 push + 管理端置顶               | P0     |
| 用户取消 / 退款 | 大厨 | {slot} 的预约被取消了，{total} 币已退回；原因：{reason}。               | 外部 push + 管理端红点               | P0     |
| 大厨接单        | 用户 | 大厨接单啦，{dateLabel} {mealLabel} 见。                                | 20s 轮询 toast + 下次打开横幅        | P1     |
| 开始备菜 / 制作 | 用户 | 大厨系上围裙开始备菜了。/ 下锅啦，约 {etaMinutes} 分钟后开饭。          | 轮询 toast + 横幅                    | P1     |
| 出餐            | 用户 | 出餐啦：{items}。趁热吃，吃完点「吃好啦」。                             | 轮询 toast + 外部 push               | P0     |
| 完成            | 用户 | 一餐圆满，碗我来洗。                                                    | 订单卡 / 下次打开横幅                | P2     |
| 大厨取消 / 退款 | 用户 | 这单取消了：{slot} · {total} 币已退回，余额 {balance}。                 | 轮询 toast + 钱包流水 + 横幅         | P1     |
| 大厨发币        | 用户 | 大厨给你发了 {amount} 币：{note}。余额 {balance}。                      | 低频轮询 toast + 钱包横幅            | P1     |
| 新恋爱卡到账    | 用户 | 收到一张「{title}」{duration}{unit}，去恋爱卡看看。                     | 恋爱卡 tab 红点 + 下次打开横幅       | P1     |
| 同一饭点被抢占  | 用户 | 这个饭点刚刚被约走了（{slot}），换一个吧。                              | 下单失败 toast（已有）               | P2     |
| 核销 / 感谢留言 | 大厨 | 她留言：{note}（{slot}）。                                              | 管理端订单卡 + 下次打开横幅          | P2     |

### 定时 / 下次打开触达

| 时机                   | 给谁        | 触达模板                                                                               | 建议渠道                                          | 优先级                   |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------ |
| 开饭前 24h             | 双方        | 用户：明天 {mealLabel}（{time}）约好了：{items}。大厨：明天有 {n} 个饭点：{slotList}。 | 站内横幅 / 大厨摘要                               | P1                       |
| 开饭前 2h 或临近截止   | 用户        | 已下单：{items}，2 小时后开饭。未下单：{slot} 还有 {minutes} 分钟截止预约。            | 外部 push（推荐）+ 站内                           | P1                       |
| 开饭前 30 分钟仍待接单 | 大厨        | 还有 30 分钟开饭，{orderId} 仍是待接单；她在等。                                       | 外部 push + 管理端置顶                            | P0                       |
| 超过预约时间仍未处理   | 大厨        | {n} 单已过预约时间：{orderList}。                                                      | 管理端置顶红条 + 每日摘要                         | P1                       |
| 管理员登录 / 打开后台  | 大厨        | 小灶有 {pending} 单待接单、{served} 单待确认，最早 {slot}。                            | 小灶角标 + 登录后横幅 + 标题计数                  | P1                       |
| 赊账接近上限           | 双方        | 余额 {balance} 币，最多可欠 {limit} 币，只剩 {remaining} 币额度。                      | 钱包/结算页提示 + 管理端红字                      | P1                       |
| 每周发卡失败           | 大厨        | 本周恋爱卡没发出去：{error}。上次成功：{lastSuccessDate}。                             | GitHub Actions failure 通知（Bark / 企微 / 邮件） | P0                       |
| 恋爱卡即将过期         | 用户        | 「{title}」还有 {days} 天过期，记得用掉。                                              | 站内横幅 / 外部                                   | P2（需先加 `expiresAt`） |
| 已出餐超过 2h 未确认   | 用户 / 大厨 | 吃完记得点「吃好啦」。/ {orderId} 已出餐 {hours} 小时，等她确认。                      | 站内横幅                                          | P2                       |

### 当前已有的触达

- 下单成功 toast、用户端 20 秒订单轮询与状态 toast（仅 prepping / cooking / served）。
- 用户端「催一催」（5 分钟冷却）和「谢谢大厨」留言，但大厨只能在下一次刷新后台时看到。
- 管理端小灶每 15 秒轮询、待接单统计，但只在已登录且停在「小灶」tab 时运行。
- 「我们」页订单角标、页面重新可见时的刷新。

### 最大缺口

1. **大厨离页即失联**：新单、催单、用户取消、临近开饭未接单，都只写进 `orders/index.json`，没有外部通道。
2. **「催一催」没有投递保证**：只是写文档；大厨不打开后台就等于没催。
3. **没有跨会话未读**：toast 只对比当前会话内的变化，隔天打开或页面关闭期间的变更不会提示。
4. **没有调度器**：24h / 2h 提醒、超时积压、发卡失败检查都做不到。
5. **钱包和恋爱卡不在快轮询里**：没有活跃订单时发币、新卡完全静默。
6. **周更 Action 静默失败**：目前失败只 `exit 1`，没有 `if: failure()` 通知。

### 建议落地顺序

- **阶段 0（零外部服务）**：管理端登录后常驻轮询 `orders/index`，加小灶角标和标题计数；用户端加未读横幅和 `lastSeen`；钱包/恋爱卡纳入低频检查；Action 加失败通知。
- **阶段 1（一条外部通道）**：选 Bark 或企业微信机器人，用 Cloudflare Worker / 阿里云函数做一层转发，只推新单、催单、用户取消、30 分钟未接单、出餐。浏览器前端不能直接持有 webhook 密钥。
- **阶段 2（定时摘要）**：Actions cron 做开饭前提醒、超时扫描、每周发卡心跳；不建议为了两个人引入完整 Web Push。

需要的话，下一步可以先把阶段 0 的站内未读和管理端常驻角标实现掉。以下 7 条 curl 命令对应 2026 年 10 月 22 日已发送的测试消息，参数和内容保持一致。当时 7 次请求均返回 HTTP 200、code 200、message success；这表示接口返回成功，实际显示效果以手机为准。

在 macOS 或 Linux 的终端中，复制任意一段完整命令即可发送对应通知。每执行一段会再次推送一条消息。命令已填入你提供的 Key，统一归入「网站通知格式测试」分组，并保存到 Bark 历史记录。分享文档前请替换 device_key。




