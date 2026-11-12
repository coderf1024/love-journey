# LJ-20261112-001 · 实现方案

## 实现

- `workers/morning-greeting/`：独立 Wrangler 4.160.1 工程，UTC `14 0 * * *`，只有 scheduled 发送；关闭 workers.dev / preview URL，HTTP 返回 404。OSS Secret 只用于发送状态写入，读路径匿名加新鲜查询参数。
- `js/store.js`：北京时间、WMO 映射、8 秒请求超时、一句话最多 10 次、统一文案、直接 Bark 测试 / 补发。测试库默认阻止推送且不写失败记录；Bark 总开关关闭时同样停止。
- `admin.html`：已保存设置与未保存草稿分开，长期与临时收件人分开。08:14 后读取状态，最多每分钟刷新；08:30 后漏发待办。读取失败展示未知状态，跨天重置。手动补发不依赖 Worker HTTP 可达性。
- 字体重建；三页、CSS / JS 静态资源 token 统一 `20261112-02`。
- Node 内置测试在 Worker 目录内，不引入额外测试框架或站点构建依赖。

## 数据契约

`space.json.settings.morningGreeting`：

```json
{
  "enabled": false,
  "recipients": ["user", "admin"],
  "alertOnFail": true,
  "homeReminder": true
}
```

缺失时默认关闭、收件人为空，两个提醒默认开启。启用后保存必须至少选一位收件人。

`greeting/YYYY-MM-DD.json` 仅保存 `date`、`kind`、`status`、`sentAt`、`recipients`、可选 `error`，不保存标题、副标题或正文。`sent` / `resent` 表示完整发送；`partial` / `failed` 允许补发。补发和定时重试都保留已有成功收件人，跳过其推送。

## 文案

标题为「宝宝早安 · 今天是我们在一起的第 N 天」（读取 `content/story.json.startDate`），副标题为北京时间日期 / 星期 / 北京天气，正文为 api.shadiao.pro 的 `data.text`。天气不可用只省略天气；一句话不可用则记录失败，Worker 按开关报警。Open-Meteo 的国内无代理可达性尚未证实。

## 完成情况

- [x] 原型与方案确认，记录外部心跳暂缓
- [x] Worker / 管理端领域层、重试去重、无快照
- [x] 管理端通知页、确认框、首页待办、即时刷新、跨天处理
- [x] 真实测试库保存与重载，恢复原始文档
- [x] 27 项 mock 回归、语法检查、Worker dry-run
- [x] 320 / 390 / 1280 管理端和用户端检查
- [x] 字体、缓存、ADR、运维和任务文档更新
- [x] Cloudflare CLI 授权、Worker / Cron 部署、按用户追加决定复用当前 Key 注入 Secret
- [ ] 用户验收、管理端发布、启用长期收件人、真机验证

## 运维与边界

[运维手册](../../runbooks/morning-greeting.md) 包含最小 RAM 策略、部署顺序、关闭方法、天气证据和告警边界。OSS 无锁，不保证跨设备并发严格一次送达；发出后记录写失败会明确提醒核对手机。没有外部心跳，完全未触发的 Cron 无法自己告警。
