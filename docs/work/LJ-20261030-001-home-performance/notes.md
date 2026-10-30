# 备注 · LJ-20261030-001

## 为什么慢（测量）

| 项 | 之前 | 现在 |
|---|---|---|
| Ma Shan Zheng | 395KB | 33KB |
| Noto Serif SC Bold | 570KB | 188KB |
| 首页 OSS SDK | 1.17MB（gzip 182KB），阻塞 | 不加载，写入时按需 |
| 文档读取 | 9 个签名 GET + 9 个 OPTIONS（`Access-Control-Max-Age: 0`，预检不缓存） | 9 个匿名 GET，无 OPTIONS |
| 地图 JSON | 582KB | 209KB（gzip 60KB） |
| 地图初始化 | 数据加载同时、rootMargin 500px | 数据完成后、rootMargin 200px |

## 关键决定

- bucket 公共读（匿名 GET 200，`Access-Control-Allow-Origin: *`），所以读路径可以不用 SDK、不带自定义头；写路径仍走 SDK。
- 地图涟漪动画按人要求常驻，未改动。
- P2（静态 SVG 替换 ECharts、Service Worker、兜底字体 unicode-range）不做。
- 字体按“实际使用该字体的位置”取字，不再把 2,664 个兜底字打进主字体；`scripts/font-extra-chars.txt` 停用。
- 首屏缓存 key 带 `dbRoot()`，测试库与线上库隔离；有读取失败的那次不覆盖缓存。

## 已知取舍

- 首次访问仍需等一次网络（约 0.8–1.3s 拿到数据）；天数已由内联脚本提前显示。
- 新增内容用到的字若不在当前子集，会回退宋体；改内容后跑 `./scripts/build-fonts.sh`。
- OSS SDK 在首页不加载；打开小灶、管理端登录后、核销页渲染后会空闲预热（`warmOssSdk`），首次写入通常无需等待。极端情况下按钮会显示「下单中… / 核销中…」。
