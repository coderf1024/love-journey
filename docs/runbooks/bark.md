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

## 变量

`{siteName}`、`{userName}`、`{adminName}`、`{userUrl}`、`{userOrderUrl}`、`{adminUrl}`、`{slotKey}`、`{orderId}`、`{slot}`、`{date}`、`{time}`、`{weekday}`、`{items}`、`{itemCount}`、`{total}`、`{note}`、`{status}`、`{placedAt}`、`{etaMinutes}`、`{refund}`、`{reason}`、`{minutes}`、`{balance}`。

- 未知变量替换为空字符串；不做条件语法。
- `{items}` 是逗号连接的菜名，不带数量。
- `{userOrderUrl}` = 用户端基础地址 + `?slot=<slotKey>#order`，用户打开后直接定位对应饭点。

## 模板编辑

- 每个事件旁有「模板」入口，打开弹窗。
- 支持标题、副标题、正文、点击地址四项；变量面板点击插入当前输入框。
- 底部显示样例订单的实时渲染结果。
- 「发送测试」先弹出渲染后的确认框，确认后才真正发送。
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
