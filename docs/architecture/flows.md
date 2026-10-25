# 核心流程

## 1. 周末预约与订单状态

```text
pending 待接单
  → accepted 已接单
  → prepping 备菜中
  → cooking 制作中
  → served 已出餐
  → completed 已完成
```

另有 `cancelled 已取消`。

- 饭点：周六/周日 12:00、20:00；提前两个周末开放，开饭前 60 分钟截止。
- 同一 `slotKey` 同时只能有一个未结束订单；不同饭点可以同时存在。
- 用户可取消 `pending/accepted`；开始备菜后只能由管理端取消。
- 取消会全额退款到用户钱包，并释放饭点。
- 用户点「吃好啦」把 `served` 变成 `completed`；管理端也可以完成。

## 2. 出餐与图片集

1. 管理端在「订单」里点「出餐」，打开出餐拍照弹窗。
2. 弹窗按菜品逐道列出，每道菜必须上传一张成品图才能确认。
3. 「拍照」使用 `capture="environment"` 直接打开移动端系统相机；「相册」走普通文件选择。
4. 图片压缩后上传到 `love-journey/uploads/dishes/`，返回 OSS URL。
5. 确认出餐时 `serveOrder()`：
   - 校验每道菜都有照片；
   - 把照片追加到对应菜品 `images[]`（不改变主图）；
   - 给订单项写入 `servedImage` 快照；
   - 订单状态改为 `served`；
   - 发送用户端「出餐」Bark。
6. 用户端订单卡/详情/历史：
   - 菜品行显示菜品主图；
   - 单独「本次出餐」区域用大图显示 `servedImage`，不与菜品图混在一起；
   - 菜品详情轮播显示 `images[]` 积累的所有图片。

补充：

- 出餐照片立即进入菜品图片集；订单快照独立保留，删除菜品图集里的某张图不会影响历史订单展示。
- 菜品图片集顺序第一张是主图；设为主图=移到第一位；拖动排序可改变顺序；删除主图下一张补位。
- 图片数量不限；单张走现有压缩（最大 1600px、JPEG 0.82）。

## 3. Bark 通知

| 事件 | 发给 | 默认点击地址 |
|---|---|---|
| `newOrder` 新单 | 管理员 key | `{adminUrl}` |
| `userCancel` 用户取消 | 管理员 key | `{adminUrl}` |
| `cooking` 开始制作 | 用户 key | `{userOrderUrl}` |
| `served` 出餐 | 用户 key | `{userOrderUrl}` |
| `nudge` 催一催 | 管理员 key | `{adminUrl}` |

- 每个事件有独立开关，默认开。
- 「催一催」功能本身由 `space.settings.nudgeEnabled` 控制，默认关闭；关闭时用户端不显示按钮，`nudgeOrder()` 拒绝调用。
- 模板包含 title/subtitle/body/url，变量在发送时替换。
- 没有定时通知任务；只在动作发生的页面里发送。
- `{userOrderUrl}` 会在用户端基础地址上追加 `?slot=<slotKey>#order`，打开后自动选中对应饭点。

## 4. 用户端通知深链

- `applyOrderDeepLink()` 在启动加载完成后读取 `?slot=`。
- 如果饭点不在未来可售列表里，会从订单快照补一个不可预约的 slot。
- 选中该饭点，切到小灶页，然后从地址栏移除 `slot` 参数，避免后续刷新反复跳回。
- 用户打开出餐通知后看到的是订单状态和「本次出餐」大图。

## 5. 恋爱卡

- 每周日 GitHub Action 自动发卡（脚本 `scripts/auto-gift-massage.js`）。
- 管理端也可以手动补发，新增文档 + 更新索引 + 更新计数器。
- 用户端扫描二维码进入 `use.html?id=…` 核销；核销后写 `usedDate/status`。
- 管理端删除卡券：软删除已废弃，现在是硬删除，底层 `dbDelete` 用 `deleteMulti` 绕过浏览器 DELETE CORS。

## 6. 管理端登录

- 口令在 `js/oss-config.js` 的 `adminPasscode`，只是入口门禁，不是安全边界。
- 登录后写入 `sessionStorage`，有效期 12 小时；刷新保持登录，关闭标签页后需要重新登录。
- 桌面侧栏同时提供首页/订单/恋爱卡/恋爱币/系统设置/菜单/空间资料；移动端底部四个 tab。

## 7. 图片上传

- 菜品主图/出餐图：`uploadDishImage()` → `uploadBucketImage()` → `love-journey/uploads/dishes/`。
- 空间头像：`uploadSpaceImage()` → `love-journey/uploads/space/`。
- 浏览器端压缩；图片是公开读对象，URL 直接用于页面展示。
