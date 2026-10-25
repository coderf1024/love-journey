# OSS 数据安全

## 事实

- OSS bucket 同时存放 JSON 文档和图片；`love-journey/db/` 是数据库根。
- 浏览器和管理端使用同一套 AccessKey；权限和 exposed 前端是同一边界。
- 没有事务、锁、版本号；写入是 read-modify-write。
- 文档索引是派生读模型；手工改文档后可能留下旧索引。

## 读写规则

1. **先只读**：任何线上写操作前先读取当前文档/索引确认状态。
2. **不要手改 OSS JSON**：优先用管理端或 `js/store.js` 函数；迁移用脚本。
3. **写前确认目标路径**：`space.json`、`commerce/menu.json`、`commerce/wallet.json`、`commerce/orders/`、`commerce/coupons/`。
4. **不要批量删除**：没有明确授权不删除订单、卡券、菜品或图片。
5. **清理测试数据**：测试结束必须删除临时文档/索引项/上传图片，并验证数量恢复。
6. **一次只跑一个数据迁移**：多个需求同时改数据容易触发竞态。

## 原子性

- `placeOrder`：订单写成功后再写钱包；钱包失败会删订单。
- `cancelOrder`：订单改 cancelled + 钱包退款；钱包失败会恢复订单。
- `serveOrder`：先写菜单图片集，再写订单。订单失败时图片可能已在菜品图集；重试按 URL 去重。
- 不要在这些流程中随意加入第三次独立写入。

## 索引

- 集合：`commerce/orders/index.json`、`commerce/coupons/index.json`。
- `dbCollection.list()` 会读取索引；索引缺失时从文档重建。
- 手工写文档后如果索引过期，调用对应 collection 的 `rebuild()`。
- 订单索引是摘要；订单详情以 `<orderId>.json` 为准。

## 删除

- 浏览器直接 `DELETE` OSS 对象会被 CORS 拦截。
- `dbDelete()` 使用 `ossClient.deleteMulti([key])`（OSS `POST ?delete`），不要改回 `ossClient.delete()`。
- 卡券删除已恢复硬删除；用户端/核销页会把不存在的卡当作缺失处理。

## 竞态

以下场景可能丢更新：

- 用户下单同时管理端改状态；
- 管理端出餐同时用户取消；
- 周更 Action 发卡同时管理端手动发卡；
- 两个标签页同时写订单/钱包。

处理原则：出现冲突以最新读取为准，重新检查再操作；不要在客户端假装有事务。

## 迁移

- 迁移脚本必须支持 `--dry-run`（已有脚本参照）。
- 先输出将要写入的路径、条数、关键差异。
- 需要图片/字段结构变更时，优先一次写整份文档，不要循环多次 read-modify-write。
- 重要变更前导出相关 JSON 到本地备份（不要提交含密钥的备份）。

## 密钥

- 不打印 AccessKey、Bark key、管理口令。
- 不要把真实 secret 写进 README、docs、commit message 或截图。
- 生产/调试 Bark key 只在管理端系统页填写；收尾时可清空或关闭。
