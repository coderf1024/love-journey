# LJ-20261026-007-me-scroll-views · 状态

- 状态：in-review
- 分支：`fix/LJ-20261026-007-me-scroll-views`
- 最后更新：2026-10-26 16:20
- 当前负责人：人（验收）

## 已完成

- `me-orders-page` 泛化为 `me-fixed-view`，覆盖订单、恋爱卡流水、恋爱币流水。
- `.me-coupons` 和 `.wallet-entries.me-ledger` 改为内部滚动。
- 删除两处 `max-height: 420px`。

## 未完成 / 下一步

1. 人工确认三个视图的滚动和高度。
2. 合入 `feat/love-space-ordering`。

## 已验证

- 无头 Chrome：订单、恋爱卡流水、恋爱币流水三个视图均为列表内部滚动，页面 `scrollY` 保持 0。
- 390×844：订单列表 591px、卡片流水 539px、恋爱币流水 473px。
- 320×568：订单 315px、卡片 263px、恋爱币 197px。
- 1280×800：订单 507px、卡片 473px、恋爱币 389px。
- 各尺寸下滚动列表前后固定区位置不变。
- `node --check js/app.js` 通过。

## 关键文件

- `js/app.js`
- `css/style.css`
