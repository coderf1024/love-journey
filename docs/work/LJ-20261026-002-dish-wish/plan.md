# LJ-20261026-002-dish-wish · 实现方案

## 总体思路

用户提交的是「申请」，不是菜品。申请单独存集合，审核通过才调用 `upsertDish()` 写入 `menu.json`；这样待审核内容不会出现在用户菜单，也不会和菜单编辑互相覆盖。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/oss-utils.js` | 新增 `uploads/requests/` 前缀和 `uploadDishRequestImage()`。 |
| `js/store.js` | 新增 `dishRequestCollection`、`submitDishRequest`、`listDishRequests`、`approveDishRequest`、`rejectDishRequest`；`upsertDish` 支持 `sourceRequestId`；`loadAdminData` 带上申请；新增 `dishRequest` Bark 模板。 |
| `index.html` | 小灶菜单头加「我想吃」按钮；新增提交 sheet。 |
| `js/app.js` | 打开/提交逻辑、图片上传、URL 预览、校验和提示。 |
| `css/style.css` | 「我想吃」按钮、提交 sheet 和预览样式。 |
| `admin.html` | 菜单页待审核区、首页待办、审核模式复用菜品弹窗、Bark 设置行和事件标签。 |
| `docs/runbooks/bark.md`、`CLAUDE.md`、`CHANGELOG.md`、`docs/architecture/*` | 事件、集合、流程和口吻说明。 |

## 数据结构

```jsonc
// commerce/dish-requests/<requestId>.json
{
  "id": "req_...",
  "name": "可乐鸡翅",
  "image": "https://.../uploads/requests/....jpg",
  "status": "pending", // pending | approved | rejected
  "submittedAt": "2026-10-26 10:00:00",
  "reviewedAt": null,
  "dishId": null
}
```

正式菜品新增可选 `sourceRequestId`，用于审核重试去重。

## 审核一致性

1. 先按 `sourceRequestId` 查菜单，已有菜品就只补申请状态。
2. 没有则 `upsertDish()` 创建菜品。
3. 再写申请状态和 `dishId`；第二次写失败时，重试会命中第一步的查重。

## 分步任务

- [x] 1. 存储层：申请集合和审核函数。
- [x] 2. 用户端提交入口、图片上传和校验。
- [x] 3. 管理端待审核队列和审核弹窗。
- [x] 4. `dishRequest` Bark 通知和设置项。
- [x] 5. 文档、缓存版本、字体。
- [ ] 6. 手动验收。

## 手动 QA 重点

- 拍照、相册、粘贴 URL 三种图片方式。
- 空菜名/空图片/非法 URL 的提示。
- 审核上架后菜单立即可见；重复点保存不产生重复菜品。
- 不采纳后从队列消失。
- Bark 文案、图标和图片。
- 原有下单、菜单编辑、其他通知。

## 风险与回滚

- 用户上传图片会公开展示；界面必须提示。
- 没有用户登录，拿到站点地址的人都能提交；管理端可拒绝，必要时后续加限制。
- 回滚：移除入口和审核队列，申请集合保留不影响现有功能。
