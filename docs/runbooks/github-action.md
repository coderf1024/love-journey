# GitHub Action：每周恋爱卡

完整配置步骤在仓库根目录的 [GitHub Action 配置](../reference/github-action-setup.md)。

要点：

- 工作流：`.github/workflows/auto-gift-massage.yml`
- 脚本：`scripts/auto-gift-massage.js`
- 每周日北京时间 08:00 运行
- 读取 GitHub Secrets：`OSS_REGION`、`OSS_BUCKET`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`
- 写入 `love-journey/db/commerce/coupons/` 和 `counters.json`，并更新卡券索引
- 与页面部署、Bark 通知互不影响

注意：

- 这个 Action 只负责发卡，不负责 Bark 通知；Bark 没有 cron。
- 修改工作流前先确认不影响现有周更逻辑。
- 失败排查先看 Actions 日志，再检查 OSS 权限/路径。
