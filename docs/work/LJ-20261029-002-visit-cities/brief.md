# LJ-20261029-002 · 新增去过的城市：大理、丽江、郑州、开封

- 状态：in-progress
- 提出人：人
- 日期：2026-10-29
- 分支：`feat/LJ-20261029-002-visit-cities`（从 001 分支拉出）

## 背景与目标

用户要在地图/城市列表里记录四座新去过的城市：大理、丽江、郑州、开封。测试库 `love-journey/db-test` 和线上库 `love-journey/db` 都要加。

## 范围

- 要做：
  - 两个库的 `content/cities.json` 各追加 4 条记录（名称 / 日期 / 描述 / id / updatedAt）；
  - `js/app.js` 补 `cityCoordinates` 与 `PROVINCE_OF`：大理、丽江（云南省）、开封（河南省）；郑州已有；
  - 缓存 token bump。
- 不做（非目标）：
  - 不改城市列表两行分页逻辑；
  - 不重建测试库、不动其他文档；
  - 不替换字体（城市名走系统字体栈）。

## 验收标准

1. 两个库读回都是 22 条，新增 4 条字段齐全、id 唯一。
2. 本地（测试库）和 `?env=prod`（线上库）都能看到四座城市，日期排序正确。
3. 地图上云南（大理/丽江）和河南（郑州/开封）省份点亮；点击城市格能 6x 定位。
4. console 无报错；320/390/1280 无横向溢出。

## 涉及面

- 页面：index.html 我们页（山河共赏 + 城市列表）
- 数据/OSS：`love-journey/db/content/cities.json`、`love-journey/db-test/content/cities.json`
- 通知/Bark：无
- 管理端：无
- 兼容/迁移：只追加，不删除；写入前导出原文档到 /tmp

## 风险与开放问题

- [x] 日期与描述由人提供后写入
- [ ] 写入顺序：先 dry-run 预览 diff，再依次写两个库
