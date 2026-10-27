# LJ-20261026-011 · 实现方案

## 总体思路

排序放在客户端：数据源 `content/milestones.json` 不动，`applyAppData` 载入后按 `date` 倒序排列，轮播、详情、时间线共用同一份已排序的 `state.milestones`。回忆封面统一走现有的 v0–v3 纯色渐变，去掉 `milestone.image` 的渲染路径。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/app.js` | `applyAppData` 按日期倒序排序；`memoryCoverHTML` 不再输出 `<img>`；删除列表/详情里的图片失败兜底；`renderTimeline` 改为日期倒序、年份倒序 |
| `css/style.css` | 删除 `.memory-cover img`、`.memory-card:hover .memory-cover img`、`.memory-detail-cover img` |
| `index.html` / `admin.html` / `use.html` / `css/style.css` / `js/app.js` / `CLAUDE.md` | 缓存 token `20261026-09` → `20261026-10` |
| `CHANGELOG.md` | Unreleased / Changed 记录本次调整 |

## 数据结构 / 兼容 / 迁移

- `milestones.json` 不改写，`image` 字段保留；以后管理端支持回忆图片上传时，恢复 `memoryCoverHTML` 的图片分支即可。
- 无日期条目排在最后，时间线继续归入「旧时光」分组。

## 分步任务

- [x] 1. 载入数据后按日期倒序排序。
- [x] 2. 封面与详情去掉图片渲染及对应样式。
- [x] 3. 时间线改为最新在前、年份倒序。
- [x] 4. 缓存 token、CHANGELOG、任务文档。

## 手动 QA 重点

- 首页轮播第一张为最新回忆，计数 `01 / 41`，横向滑动正常。
- 「全部」时间线年份从 2026 递减到 2020，组内日期从新到旧。
- 任意卡片详情封面是纯色渐变，没有图片。
- 320 / 390 / 1280 无横向溢出，console 无报错。

## 风险与回滚

- 纯代码改动，无数据写入；回滚即恢复图片渲染和正序排序。
