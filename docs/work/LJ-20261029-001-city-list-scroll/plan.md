# LJ-20261029-001 · 实现方案

- `.city-grid`：`grid-template-rows: repeat(2, auto)` + `grid-auto-flow: column` + `grid-auto-columns` 按 3/4/2 列；`overflow-x:auto`、`scroll-snap-type:x proximity`、隐藏滚动条。
- `.city-cell`：`scroll-snap-align:start`，保持单行名称/日期。
- 列表头部提示改为「最近在前 · 左右滑动」。
- `highlightCityCell` 已使用 `scrollIntoView`；横向滚动后会自动滚到目标列，保留。
- `.asia-map`：`height: min(46vh, 380px); min-height: 260px`。
- 缓存 token bump；字体不变。
- QA：500 截图检查两行、滚动提示、地图高度；320/390 真机手测。
