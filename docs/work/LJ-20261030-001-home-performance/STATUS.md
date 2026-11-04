# STATUS · LJ-20261030-001

- 状态：in-review
- 开始：2026-10-30
- 分支：当前分支（人要求不新建分支）
- 发布 token：`20261030-01`（未合并 `main`、未发布）

## 已完成

- 读路径：`dbGet()` 改匿名 `fetch`（无预检、12s 超时、404 映射 NoSuchKey）；写路径 SDK 按需加载；SDK 自托管到 `assets/vendor/aliyun-oss-sdk-6.18.0.min.js`；三个页面移除 alicdn script，加 bucket `preconnect`。
- 首屏：`loadAppData()` 改 `Promise.allSettled` + localStorage 快照（key 带 `dbRoot()`）；`bootstrap()` 先渲染缓存再后台刷新；天数由 `index.html` 内联脚本 + `#days[data-start]` 提前算出。
- 渲染：未访问 tab / 时间线弹层延迟渲染；轮播布局改 `requestAnimationFrame`；页面隐藏时暂停倒计时。
- 地图：`china-map.simplified.json`（0.02° 简化）+ `?v=`；数据加载后、距视口 200px 才初始化；涟漪动画未改。
- 字体：`build-fonts.sh` 改为按实际字体位置取字；`font-cute-chars.txt` 新增；两个 woff2 重建（33KB / 188KB）。
- 文档：CLAUDE.md、README、local-development、release、CHANGELOG、assets/vendor/README。

## 验证

见 `QA.md`。本地 headless Chrome：0 OPTIONS、首页不加载 OSS SDK、冷启动天数 ~20–48ms、地图正常、三页无控制台错误。

## 下一步

1. 人工在 320/390/1280 和真机验收（含下单/管理端写入，验证 SDK 按需加载）。
2. 通过后合并 `main` 发布，线上 smoke 由人完成。
