# LJ-20261026-009-dinner-card · 状态

- 状态：accepted
- 分支：`fix/LJ-20261026-009-dinner-card`
- 最后更新：2026-10-26
- 当前负责人：人（验收）

## 已完成

- 删除 dinner-emoji 节点、样式和 JS 赋值。
- `.dinner-card::after` 调整为 `right:70px; top:3px`。

## 未完成 / 下一步

- 无。已合入 `feat/love-space-ordering`；按发布策略暂不合并 `main`。

## 已验证

- 无头 Chrome：卡片无 `dinner-emoji` 节点，标题/描述/CTA 正常渲染。
- 无头 Chrome：`::after` 计算定位为 right 70px、top 3px；390 和 1280 宽度一致。
- 首页 console 无 JS 报错。

## 关键文件

- `index.html`
- `js/app.js`
- `css/style.css`
