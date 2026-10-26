# LJ-20261026-010-slot-ui · 实现方案

| 文件/模块 | 改动 |
|---|---|
| `index.html` | 删除 `#selected-slot` 节点。 |
| `js/app.js` | `renderOrderPage()` 删除 selected-slot 渲染。 |
| `css/style.css` | 删除 `.selected-slot` 样式；`.slot-card` 去掉 `box-shadow`；`.menu-head` 去掉 `margin-top`。 |

## 手动 QA

- 饭点卡片选中/已预约/截止样式不受影响。
- 菜单、我想吃入口和购物车布局正常。
