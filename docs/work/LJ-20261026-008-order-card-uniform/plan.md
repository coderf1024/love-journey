# LJ-20261026-008-order-card-uniform · 实现方案

| 文件/模块 | 改动 |
|---|---|
| `css/style.css` | `.me-orders`、`.me-coupons`、`.wallet-entries` 加 `align-content: start`。 |

## 原因

CSS Grid 容器的 `align-content: normal` 在有剩余空间时按 `stretch` 处理，自动行会被拉伸。列表在 flex 布局里 `flex: 1` 占满剩余高度，订单少时就会触发。

## 手动 QA

- 造一单待接单 + 多单已完成，分别在「全部」和「待接单」量卡片高度。
- 恋爱卡 / 恋爱币少量记录时不出现行拉伸。
