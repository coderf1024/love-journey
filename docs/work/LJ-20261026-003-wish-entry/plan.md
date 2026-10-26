# LJ-20261026-003-wish-entry · 实现方案

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `index.html` | 删除 `.wish-entry` 独立卡片。 |
| `js/app.js` | `renderMenuCategories()` 在分类末尾追加「＋ 我想吃」；分类栏点击处理 `[data-wish-open]`。 |
| `css/style.css` | 删除 `.wish-entry` / `.menu-wish-btn`；新增 `.menu-cat-wish` 弱化样式。 |

## 细节

- 标签使用 `menu-cat` 基础样式，加 `margin-left:auto` 靠右；分类内容超出屏幕时自然排在最后。
- 颜色沿用 muted，虚线边框，不抢分类的选中态。
- 提交弹窗和业务函数完全复用。

## 手动 QA 重点

- 分类栏最右侧标签可见；点击打开弹窗。
- 分类切换仍正常。
- 提交/审核流程不变。
