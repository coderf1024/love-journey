# LJ-20261026-005-filter-ui · 状态

- 状态：in-review
- 分支：`fix/LJ-20261026-005-filter-ui`
- 最后更新：2026-10-26 14:40
- 当前负责人：人（验收）

## 已完成

- 订单和恋爱卡流水的筛选栏加吸顶容器。
- 管理端「全部」移到订单筛选第一项。

## 未完成 / 下一步

1. 人工确认滚动吸顶效果和管理端 tab 顺序。
2. 合入 `feat/love-space-ordering`。

## 后续调整

- 订单页的吸顶方案已被 `LJ-20261026-006-orders-scroll` 替换为“固定视口 + 列表内部滚动”；恋爱卡流水的吸顶改动已撤回。

## 已验证

- 无头 Chrome：订单筛选栏 `position: sticky`、`top: 96px`；页面滚动后从 176px 吸到 98px。
- 无头 Chrome：恋爱卡流水筛选栏同样 sticky、`top: 96px`。
- 管理端订单筛选第一项和默认选中都是「全部」。
- `node --check`：`js/app.js` 和 admin 内联脚本通过。

## 关键文件

- `js/app.js`
- `css/style.css`
- `admin.html`
