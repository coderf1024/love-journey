# 数据模型

所有数据在 OSS bucket 的 `love-journey/db/` 下（路径由 `OSS_CONFIG.dbRoot` 决定）。完整结构以 `js/store.js` 为准，本文只记录约定和容易出错的字段。

## 文档树

```text
love-journey/db/
  space.json
  content/
    story.json
    milestones.json
    goals.json
    cities.json
  commerce/
    menu.json
    wallet.json
    counters.json
    dish-requests/
      index.json
      <requestId>.json
    orders/
      index.json
      <orderId>.json
    coupons/
      index.json
      <couponId>.json
```

集合是「一份记录一个文档 + 一个 index 读模型」。索引不是事实来源，丢失时可由 `dbCollection.rebuild()` 重建。

## space.json

```jsonc
{
  "schemaVersion": 2,
  "name": "我们的时光",
  "avatar": "https://…/love-journey/uploads/space/…jpg",
  "members": [
    { "id": "user", "name": "福福", "role": "user" },
    { "id": "chef", "name": "老李", "role": "admin" }
  ],
  "settings": {
    "serving": { "slots": [], "weeksAhead": 2, "cutoffMinutes": 60, "timezone": "Asia/Shanghai" },
    "bark": {
      "enabled": true,
      "userKey": "…",
      "adminKey": "…",
      "events": { "newOrder": true, "userCancel": true, "cooking": true, "served": true, "nudge": true },
      "templates": {
        "newOrder": { "title": "…", "subtitle": "…", "body": "…", "url": "{adminUrl}" }
      },
      "server": "https://api.day.app"
    },
    "links": { "user": "https://…/index.html", "admin": "https://…/admin.html" },
    "nudgeEnabled": false
  }
}
```

- `name`/`avatar` 由管理端「空间资料」维护，用户端顶部和「空间」页读取。
- `serving` 没有管理 UI，改排期时直接改文档或 seed。
- `bark.userKey` 接收用户事件，`bark.adminKey` 接收管理员事件；缺失时回退旧字段 `key`。
- 模板变量见 [Bark 手册](../runbooks/bark.md)；未知变量替换为空字符串。
- `links` 只存基础页面地址；实际订单链接在发送时追加 `?slot=<slotKey>#order`。

## menu.json

```jsonc
{
  "updatedAt": "…",
  "categories": [
    { "id": "quick", "name": "快手菜", "icon": "⚡", "order": 1 },
    { "id": "hardcore", "name": "硬核菜", "icon": "🔥", "order": 2 }
  ],
  "dishes": [{
    "id": "dish_…",
    "categoryId": "quick",
    "name": "酸辣土豆丝",
    "description": "…",
    "price": 18,
    "prepMinutes": 40,          // 只允许 40 / 60 / 90 / 120
    "image": "…",               // 主图，等于 images[0]
    "images": ["主图", "出餐成品图", "…"], // 有序，第一张为主图
    "tags": ["下饭", "香辣"],    // 只允许 下饭 / 香辣 / 酸甜
    "ingredients": "…",          // 仅管理端可见，可空
    "available": true,           // 下架菜品不在用户菜单出现
    "icon": "🥔",                 // 历史字段，仅图片缺失时兜底
    "todaySpecial": false,       // 历史字段，用户端不再展示
    "sourceRequestId": "",       // 由「我想吃」审核创建时写入，用于重试去重
    "order": 2
  }]
}
```

- 新菜上传的图片是主图；出餐时每道菜的成品图追加到 `images[]`。
- 管理端图片集支持删除、设为主图、拖动排序；删除主图时下一张自动补位。
- `upsertDish` 会把时间归一到四档、标签过滤到三个值，并保持主图在 `images[0]`。

## 菜品申请（我想吃）

```jsonc
// commerce/dish-requests/<requestId>.json
{
  "id": "req_…",
  "name": "可乐鸡翅",
  "image": "https://…/love-journey/uploads/requests/….jpg",
  "status": "pending",        // pending | approved | rejected
  "submittedAt": "2026-10-26 10:00:00",
  "reviewedAt": null,
  "dishId": null
}
```

- 用户只提交菜名和图片，申请不写入 `menu.json`，因此不会出现在用户菜单。
- 图片上传到 `love-journey/uploads/requests/`；也允许用户直接填 http(s) 图片地址。
- 管理端审核通过时 `approveDishRequest()` 创建正式菜品，并写入 `dish.sourceRequestId`；先写菜单再写申请，重试按 `sourceRequestId` 去重。
- 用户端不读取这个集合，也不展示申请状态；管理端 `loadAdminData()` 会带上 `dishRequests`。

## 订单

订单索引存摘要，订单文档存完整快照；字段详见 `js/store.js` 的 `orderSummary` 和 `placeOrder`。

关键字段：

```jsonc
{
  "id": "20261024-1200-01",
  "slotKey": "20261024-1200",
  "slot": { "dateLabel": "10.24 周六", "label": "午餐", "time": "12:00", "…": "…" },
  "status": "pending | accepted | prepping | cooking | served | completed | cancelled",
  "items": [{
    "dishId": "dish_…",
    "name": "酸辣土豆丝",
    "image": "菜品主图",
    "servedImage": "本次出餐图快照",
    "price": 18,
    "prepMinutes": 40
  }],
  "total": 18,
  "note": "少辣",
  "placedAt": "YYYY-MM-DD HH:mm:ss",
  "statusHistory": [{ "status": "pending", "at": "…", "by": "user" }],
  "payment": { "amount": 18, "balanceAfter": 482, "refundedAt": null },
  "nudges": [],
  "thanks": null,
  "cancelled": null
}
```

- `servedImage` 是订单项快照，不随菜品图片集后续变化；历史订单用它展示「本次出餐」。
- 出餐快照还会被追加到菜品 `images[]`，之后菜品详情轮播可见。
- 同一饭点只能有一个未结束订单；取消后饭点可重新预约。
- 订单 ID = `slotKey + '-' + 两位序号`；序号统计该饭点所有历史订单（含取消）。

## 钱包

```jsonc
{
  "ownerId": "user",
  "balance": 482,
  "overdraftLimit": 50,
  "entries": [
    { "id": "tx_…", "type": "order|grant|refund", "amount": -18, "balanceAfter": 465, "note": "…", "createdAt": "…", "by": "user" }
  ]
}
```

`balance` 是反规范化字段，必须和流水一起写。没有管理员钱包。

## 恋爱卡

`coupons/index.json` 是用户端读取的列表；`<couponId>.json` 是核销事实来源。字段：`id/title/icon/duration/durationUnit/acquiredDate/usedDate/status`。

- 周更 Action 和管理端手动发卡都会增加新文档并更新索引。
- 浏览器直接 `DELETE` OSS 对象会被 CORS 拦截；`dbDelete` 改为 `deleteMulti`（`POST ?delete`）实现硬删除。不要改回 `ossClient.delete`。

## 数据安全与竞态

- 没有事务、锁或 ETag；所有 read-modify-write 都可能丢更新。
- 订单 + 钱包、菜单图片集 + 订单都需要按代码中的顺序写，失败时按现有回滚/重试逻辑处理。
- 任何线上写操作先只读检查；批量迁移先 dry-run；删除、重置、清理必须得到明确授权。详见 [OSS 数据安全](../runbooks/oss-data.md)。
