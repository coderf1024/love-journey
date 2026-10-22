# GitHub Action 自动赠送按摩卡配置指南

## 功能说明

此 GitHub Action 会在每周日自动赠送一张 5 分钟的按摩卡，写入 OSS 文档存储的 `love-journey/db/commerce/coupons/` 下（索引和编号会一起更新）。

## 配置步骤

### 1. 配置 GitHub Secrets

在 GitHub 仓库的 **Settings > Secrets and variables > Actions** 中添加以下 Secrets：

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `OSS_REGION` | OSS 区域 | `oss-cn-beijing` |
| `OSS_BUCKET` | OSS Bucket 名称 | `my-love-journey` |
| `OSS_ACCESS_KEY_ID` | 阿里云 AccessKey ID | `LTAI...` |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | `your-secret-key` |

`OSS_DB_ROOT` 已经在工作流里设置为 `love-journey/db`，不需要额外的 Secret。旧的 `OSS_CONFIG_PATH` Secret 已不再使用，可以删除。

### 2. 获取阿里云 OSS 配置

1. 登录 [阿里云控制台](https://www.aliyun.com/)
2. 进入 **对象存储 OSS**
3. 查看你的 Bucket 信息，获取 Region 和 Bucket 名称
4. 进入 **AccessKey 管理** 创建或获取 AccessKey

### 3. 手动触发测试

配置完成后，可以手动触发测试：

1. 进入 GitHub 仓库的 **Actions** 标签页
2. 选择 **Auto Gift Massage Coupon** 工作流
3. 点击 **Run workflow**
4. 可以自定义按摩时长和标题（可选）

### 4. 自动执行时间

- 默认每周日 UTC 00:00 执行（北京时间周日 08:00）
- 如需修改时间，编辑 `.github/workflows/auto-gift-massage.yml` 中的 cron 表达式

### 5. 文件说明

```
.github/workflows/auto-gift-massage.yml  # GitHub Action 工作流配置
scripts/auto-gift-massage.js             # 自动赠送按摩卡的 Node.js 脚本
```

## 注意事项

1. **不影响 GitHub Pages 部署**：此 Action 只操作 OSS 数据，不会修改仓库文件或影响 Pages 部署
2. **安全性**：所有敏感信息都存储在 GitHub Secrets 中，不会暴露在代码里
3. **日志查看**：每次执行后可以在 Actions 页面查看详细日志

## 故障排查

如果 Action 执行失败：

1. 检查 GitHub Secrets 是否配置正确
2. 查看 Action 日志中的错误信息
3. 确认 OSS 配置和权限是否正确
