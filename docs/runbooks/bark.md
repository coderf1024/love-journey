# Bark 通知

## 运行方式

- 纯浏览器侧发送：`js/store.js` 的 `sendBark()` 调用 Bark `POST /push`。
- 不做定时任务；通知只在触发动作发生的页面打开时发送。
- 没有站内消息中心；工作台「需要你处理」只承载可处理的待办。

## 配置

管理端「系统 → 通知」：

- Bark 推送总开关
- 用户密钥：接收「开始制作 / 出餐」
- 管理员密钥：接收「新单 / 用户取消 / 催一催」
- 用户端跳转地址 / 管理端跳转地址
- 每类事件的发送开关（默认全开）
- 催一催开关（`space.settings.nudgeEnabled`，默认关闭）
- 每个事件可编辑标题 / 副标题 / 正文 / 跳转地址模板

全部保存在 `space.settings.bark` 和 `space.settings.links`。密钥不要发到聊天或写进文档。

## 事件

| event | 收件人 | 默认模板 url |
|---|---|---|
| `newOrder` | 管理员 | `{adminUrl}` |
| `userCancel` | 管理员 | `{adminUrl}` |
| `cooking` | 用户 | `{userOrderUrl}` |
| `served` | 用户 | `{userOrderUrl}` |
| `nudge` | 管理员 | `{adminUrl}` |

事件开关在 `space.settings.bark.events`；`false` 时 `sendBark()` 直接跳过。

## 口吻

五个事件按收件人分两套口吻，默认模板就是这个分工；改模板时不要混用。

| | 大厨侧（`newOrder` / `userCancel` / `nudge`） | 用户侧（`cooking` / `served`） |
|---|---|---|
| 定位 | 系统通知 | 男朋友发来的消息 |
| 标题 | 事件名：新预约 / 预约已取消 / 催一催 | 一句他说的话：我开火啦 / 做好啦，快来吃 |
| 正文 | 人、菜、金额、备注/原因、当前状态，分行可扫读 | 在做什么、还要多久、你来干嘛 |
| 人称 | 第三人称或无人称 | 第一人称「我」+ 第二人称「你」 |
| 交易信息 | 合计、退款、原因全部保留 | 不出现金额、订单号、状态枚举 |
| emoji | 不用 | 最多一个 |
| 副标题 | 饭点 `{slot}` | 饭点 `{slot}` |

- 大厨侧不放「管理端」、用户侧不放「用户端」这类渠道标签，收件人自己知道是哪个端。
- 大厨侧默认不放订单号；需要排查时手动插入 `{orderId}`。
- 用户侧不出现 `{status}`，状态枚举留给管理端。
- `{minutes}` 目前是距下单时间，长预约会得到几千分钟，默认模板不使用；语义修好前不要写成「已经等了 X 分钟」。

## 变量

`{siteName}`、`{userName}`、`{userLabel}`、`{adminName}`、`{userUrl}`、`{userOrderUrl}`、`{adminUrl}`、`{slotKey}`、`{orderId}`、`{slot}`、`{date}`、`{time}`、`{weekday}`、`{items}`、`{itemCount}`、`{total}`、`{note}`、`{noteBlock}`、`{status}`、`{placedAt}`、`{etaMinutes}`、`{refund}`、`{reason}`、`{reasonBlock}`、`{minutes}`、`{balance}`。

- 未知变量替换为空字符串；不做条件语法。
- `{items}` 是逗号连接的菜名，不带数量。
- `{userLabel}` = 用户名，成员名为空时回退为「TA」，避免标题开头多出空格。
- `{noteBlock}` / `{reasonBlock}` 自带前导换行：有值时渲染成 `\n备注：…` / `\n原因：…`，为空时整块消失。模板里直接接在上一行末尾，不要另起一行，否则会出现空行。
- `{userOrderUrl}` = 用户端基础地址 + `?slot=<slotKey>#order`，用户打开后直接定位对应饭点。

## 默认值与已保存模板

`barkTemplate()` 返回 `{ ...默认模板, ...space.settings.bark.templates[event] }`。**代码里的默认值只对没有保存过的事件生效。** 如果线上 `space.json` 已保存旧模板，改代码不会改变实际推送；需要在管理端逐个事件点「恢复默认」或按新文案保存。

## 出餐配图

`serveOrder()` 和 `setOrderStatus('served')` 推送出餐通知时，会把订单里第一张非空 `servedImage` 作为 Bark 的 `image` 字段发送。图片 URL 必须能被 Bark 服务端公开访问；没有成品图时不传 `image`，推送照常发送。大厨侧通知不加图。

## 模板编辑

- 每个事件旁有「模板」入口，打开弹窗。
- 支持标题、副标题、正文、点击地址四项；变量面板点击插入当前输入框。
- 底部显示样例订单的实时渲染结果。
- 「发送测试」先弹出渲染后的确认框，确认后才真正发送。
- 出餐事件的测试会把当前菜单第一张图作为样例成品图，确认框会注明；用于验证通知配图，不依赖真实订单。
- 不覆盖其他事件模板；保存只更新当前事件。

## 调试

- 测试按钮会真实发送到 Bark；调试时确认设备 key 正确。
- 不要为了测试把真实 key 写进代码或文档。
- 生产 key 可配置为用户/管理员各一把；调试阶段可以临时相同。
- 周更发卡 Action 与 Bark 独立，Bark 成功/失败不影响发卡数据。

## 相关

- 接口请求格式参考 [Bark API 示例](../reference/bark-api.md)。
- 数据字段见 [数据模型](../architecture/data-model.md)。
- 出餐流程见 [核心流程](../architecture/flows.md)。
