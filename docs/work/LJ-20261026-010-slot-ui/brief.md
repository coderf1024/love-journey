# LJ-20261026-010-slot-ui · 饭点卡片与菜单头部微调

- 状态：in-review
- 提出人：人
- 日期：2026-10-26
- 分支：`fix/LJ-20261026-010-slot-ui`

## 背景与目标

- `.slot-card` 去掉阴影。
- 去掉饭点选择器下方的 `selected-slot` 摘要行。
- `.menu-head` 去掉 `margin-top`。

## 范围

- 要做：
  - 删除 `selected-slot` 的 HTML、CSS 和 JS 渲染。
  - 删除 `.slot-card` 的 `box-shadow`。
  - 删除 `.menu-head` 的 `margin-top`。
- 不做：
  - 不改饭点选择逻辑、菜单内容和订单状态。

## 验收标准

1. 饭点卡片无阴影，选中/已预约样式正常。
2. 饭点选择器下方不再显示摘要行。
3. 菜单标题紧接上方内容，无额外上边距。
