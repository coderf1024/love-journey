# LJ-20261026-005-filter-ui · 实现方案

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/app.js` | 订单和恋爱卡流水的筛选栏包一层 `.me-filters-bar`。 |
| `css/style.css` | 新增吸顶容器；定义子页面标题高度变量。 |
| `admin.html` | `ORDER_FILTERS` 把「全部」放到第一项。 |

## 吸顶定位

- `.me-sub-head` 吸在 `header + safe-top`，高度固定为 `--me-sub-head-h`。
- `.me-filters-bar` 吸在 `header + safe-top + --me-sub-head-h`，带不透明背景，避免列表从缝隙透出。

## 手动 QA

- 订单列表滚动，筛选栏固定。
- 恋爱卡流水滚动，筛选栏固定。
- 管理端订单默认「全部」且在第一位。
