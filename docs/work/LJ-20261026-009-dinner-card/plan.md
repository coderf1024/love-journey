# LJ-20261026-009-dinner-card · 实现方案

| 文件/模块 | 改动 |
|---|---|
| `index.html` | 删除 `#dinner-emoji` 节点。 |
| `js/app.js` | `renderDinnerCard()` 去掉 emoji 节点和赋值，保留标题/描述/CTA。 |
| `css/style.css` | 删除 `.dinner-emoji`（含桌面媒体查询）；`::after` 改为 `right:70px; top:3px`。 |

## 注意

- 原 JS 以 `if (!emoji || ...) return` 作为守卫，删节点后必须同步移除，否则整张卡片不会更新。
