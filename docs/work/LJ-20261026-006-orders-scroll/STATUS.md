# LJ-20261026-006-orders-scroll · 状态

- 状态：accepted
- 分支：`fix/LJ-20261026-006-orders-scroll`
- 最后更新：2026-10-26
- 当前负责人：人（验收）

## 已完成

- 订单视图改为视口高度 flex 布局，只有列表滚动。
- 移除订单筛选栏 sticky 和 `--me-sub-head-h`。
- 恋爱卡流水恢复普通筛选栏。

## 未完成 / 下一步

- 无。已合入 `feat/love-space-ordering`；按发布策略暂不合并 `main`。

## 已验证

- 无头 Chrome：订单页 `body.me-orders-page`，页面 `scrollY` 保持 0，`.me-orders` 内部滚动；标题和筛选位置不变。
- 390×844 列表高 591px，320×568 高 315px，1280×800 高 507px。
- 无头 Chrome：恋爱卡流水没有 `me-orders-page` 类，筛选栏恢复普通布局。

## 关键文件

- `js/app.js`
- `css/style.css`
