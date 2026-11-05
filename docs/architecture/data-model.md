# 数据模型

所有数据在 OSS bucket 的 `love-journey/db/` 下（路径由 `OSS_CONFIG.dbRoot` 决定）。本地/私有 IP 默认使用 `love-journey/db-test`，线上域名始终使用 `love-journey/db`；见 [测试库](../runbooks/test-db.md)。完整结构以 `js/store.js` 为准，本文只记录约定和容易出错的字段。

## 文档树

```text
love-journey/db/
  space.json
  content/
    story.json
    milestones.json
    goals.json
    cities.json
    announcements.json
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

## cities.json

`{ "items": [{ "name": "北京", "date": "2020-12-20", "description": "…" }] }`，可选 `overseas: true` / `country: "韩国"`。首页地图按 `name` 归并到省份：同一省有多个城市时只点亮一次，颜色取最早访问的城市；境外城市不参与省份归并，用地图角落印章展示。现有数据没有 `overseas/country` 时，`js/app.js` 用内置境外名单兜底。

## milestones.json

```jsonc
{
  "version": 1,
  "updatedAt": "2026-10-30 12:00:00",
  "items": [{
    "id": "ms_001",              // 旧数据已有；新增记录由管理端补 ms_<时间戳>_<序号>
    "date": "2026-01-25",        // 可为空 → 用户端归入「旧时光」
    "title": "新家",
    "description": "…",
    "image": "https://…/uploads/milestones/….jpg", // 可空，管理端封面
    "order": 1                   // 历史字段，不参与展示排序
  }]
}
```

- 管理端「系统 → 岁月留痕」维护整份数组：新增、编辑、删除都整份写入，保存时补 `id`、`updatedAt`，只 trim 已知字段，保留其他字段。
- 展示顺序由 `date` 倒序决定，`order` 不参与排序；无日期条目排最后。
- 封面图上传到 `love-journey/uploads/milestones/`（测试库 `uploads-test/`），由管理端 `uploadBucketImage()` 压缩上传。
- **用户端回忆卡片和详情读取 `image`**：有图时照片铺满 4:3 封面；没有图片或加载失败时回退 v0–v3 纯色渐变，不出现破图。
- 管理端列表和编辑弹窗会显示封面缩略图/4:3 预览。
- 用户端回忆详情有一个**临时**「上传照片」维护入口，直接把图片上传到 `uploads/milestones/`，并原地更新当前回忆的 `image`；用于前期补图，补完后应移除。

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
    "nudgeEnabled": false,
    "thanksReward": 10
  }
}
```

- `name`/`avatar` 由管理端「空间资料」维护，用户端顶部和「空间」页读取。
- `serving` 没有管理 UI，改排期时直接改文档或 seed。
- `thanksReward` 可选，默认 10；设为 0 时「谢谢大厨」只记录感谢、不返币。首版没有管理 UI。
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
  "thanks": { "note": "谢谢大厨，超级好吃", "at": "…", "reward": 10, "rewardTxId": "thanks_20261024-1200-01" },
  "cancelled": null
}
```

- `servedImage` 是订单项快照，不随菜品图片集后续变化；历史订单用它展示「本次出餐」。
- `thanks` 只在出餐 / 完成后写入；`reward` / `rewardTxId` 是返币快照。旧订单没有这两个字段时不补发。
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
    { "id": "tx_…", "type": "order|grant|refund|thanks", "amount": -18, "balanceAfter": 465, "note": "…", "createdAt": "…", "by": "user" }
  ]
}
```

`balance` 是反规范化字段，必须和流水一起写。没有管理员钱包。

- `thanks` 流水由「谢谢大厨」触发，id 固定为 `thanks_<orderId>`，备注是「谢谢大厨 + 哪一餐」（如 `谢谢大厨 10.24 周六 午餐`）。同一订单重复感谢不会重复发币。

## 恋爱卡

`coupons/index.json` 是用户端读取的列表；`<couponId>.json` 是核销事实来源。字段：`id/title/icon/duration/durationUnit/acquiredDate/usedDate/status`。

- 周更 Action 和管理端手动发卡都会增加新文档并更新索引。
- 浏览器直接 `DELETE` OSS 对象会被 CORS 拦截；`dbDelete` 改为 `deleteMulti`（`POST ?delete`）实现硬删除。不要改回 `ossClient.delete`。

## 更新公告

`content/announcements.json` 是一个有界列表，不拆集合：

```jsonc
{
  "items": [
    {
      "id": "an_…",
      "title": "谢谢大厨，能返恋爱币啦",
      "summary": "吃完饭说声谢谢，钱包里会多 10 枚恋爱币。",
      "items": ["出餐后点「谢谢大厨」，每单返一次", "返币会记在「空间 → 恋爱币」流水里"],
      "cta": { "label": "去小灶看看", "href": "index.html#order" },
      "status": "draft | published | offline",
      "version": "20261103120210",
      "publishedAt": "2026-11-03 12:02:10",
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "updatedAt": "…"
}
```

- 新建固定 `draft`；只能通过 `publishAnnouncement()` 进入 `published`，`unpublishAnnouncement()` 进入 `offline`，`offline` 可重新发布。
- 已发布不能直接删除，必须先下线；用户端只读取 `published`。
- `version` 是发布时间的 14 位数字 `YYYYMMDDHHmmss`，由 `publishAnnouncement()` 写入；编辑不改，重新发布会刷新。
- `items` 是纯文本字符串数组，不带图标；用户端统一渲染圆点。
- `cta` 可空；非空时 `label` / `href` 必须成对。`href` 只允许 `index.html#home|order|coupons|me` 或 `https://` 外链。
- 公告已读状态只存浏览器 `localStorage`（key 带 `dbRoot()`），不写 OSS。

## 数据安全与竞态

- 没有事务、锁或 ETag；所有 read-modify-write 都可能丢更新。
- 订单 + 钱包、菜单图片集 + 订单都需要按代码中的顺序写，失败时按现有回滚/重试逻辑处理。
- 任何线上写操作先只读检查；批量迁移先 dry-run；删除、重置、清理必须得到明确授权。详见 [OSS 数据安全](../runbooks/oss-data.md)。
