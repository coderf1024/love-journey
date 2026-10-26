# LJ-20261026-007-me-scroll-views · 实现方案

## 总体思路

把 `body.me-orders-page` 改名为 `body.me-fixed-view`，由 `state.meView` 决定是否启用。启用时整个子视图锁定视口高度，固定区保持自然高度，列表区用 `flex: 1; min-height: 0; overflow-y: auto` 吃掉剩余空间。

## 固定区 / 滚动区

| 视图 | 固定区 | 滚动区 |
|---|---|---|
| 我的订单 | 子标题、统计、筛选 | `.me-orders` |
| 恋爱卡流水 | 子标题、统计、筛选、底部说明 | `.me-coupons` |
| 恋爱币 | 子标题、余额卡片、“最近流水”标题 | `.wallet-entries.me-ledger` |

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/app.js` | `me-orders-page` 改为 `me-fixed-view`；`orders / wallet / cards` 都启用；`resetMeView` 清理。 |
| `css/style.css` | 重命名选择器；新增 `.me-coupons` / `.wallet-entries.me-ledger` 滚动规则；删除 420px 固定高度。 |

## 手动 QA

- 三个视图分别滚动，页面 `scrollY` 保持 0。
- 固定区位置在滚动前后不变。
- 320 / 390 / 1280 和横屏下列表高度可用。
