# LJ-20261026-006-orders-scroll · 实现方案

## 布局

订单视图锁定为视口高度，只有列表滚动：

```css
body.me-orders-page { overflow: hidden; }
body.me-orders-page .app-main { height: 100vh; height: 100dvh; box-sizing: border-box; }
body.me-orders-page #page-me,
body.me-orders-page .me-sub-view { height: 100%; }
body.me-orders-page .me-sub-view { display: flex; flex-direction: column; }
body.me-orders-page .me-sub-head { flex: 0 0 auto; }
body.me-orders-page .me-sub-body {
    flex: 1; min-height: 0; display: flex; flex-direction: column;
}
body.me-orders-page .me-list-summary,
body.me-orders-page .me-filters { flex: 0 0 auto; }
body.me-orders-page .me-orders {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
}
```

高度由 `100dvh - 实际 padding - 子标题 - 统计 - 筛选` 自动分配，不写死像素。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/app.js` | 订单视图加/移除 `me-orders-page`；移除订单和卡片的 `.me-filters-bar` 包裹；`resetMeView` 清理类名。 |
| `css/style.css` | 移除 `--me-sub-head-h`、`.me-filters-bar` 吸顶；新增订单视图 flex 布局。 |
| `docs/work/BOARD.md`、`CHANGELOG.md` | 记录任务和变更。 |

## 手动 QA

- 订单滚动时标题、统计、筛选不动。
- 页面 `scrollY` 保持 0，列表 `scrollTop` 变化。
- 320 / 390 / 1280 和横屏下列表高度可用。
- 恋爱卡流水筛选栏不吸顶，行为与之前一致。
