# LJ-20261030-001 · 方案

## 关键判断

- 数据总量只有约 52KB，慢在往返：OSS SDK 的读请求带 `Authorization`，每个文档多一次 OPTIONS；bucket 返回 `Access-Control-Max-Age: 0`，预检不缓存。
- 字体 965KB 里大部分字符永远不会以该字体渲染（正文用系统字体，装饰字体只覆盖短标题）。
- 地图成本是 ECharts 1.02MB + GeoJSON 582KB，且 IntersectionObserver 的 500px 预加载在首屏就触发。

## 改动清单

### 1. 读路径（js/oss-utils.js）

- 新增 `publicObjectUrl()`。
- `dbGet()` 改为普通 `fetch`（`cache: 'no-cache'`，12s 超时），404 仍映射为 `NoSuchKey`。
- 新增 `loadOssSdk()` / `ensureOSS()`；`dbPut` / `dbDelete` / `dbList` / 上传前按需加载自托管 SDK。
- SDK 自托管到 `assets/vendor/aliyun-oss-sdk-6.18.0.min.js`。

### 2. 缓存与首屏（js/store.js + js/app.js）

- `store.js` 增加 `readAppDataCache()` / `writeAppDataCache()`，key 带 `dbRoot()` 和 schema 版本。
- `loadAppData()` 改 `Promise.allSettled`：`space` / `menu` 网络失败才整体失败，其余降级；有失败时不覆盖缓存。
- `bootstrap()` 先同步渲染缓存，再后台重新校验并重绘。
- 天数使用 `LOVE_START_FALLBACK` 本地兜底。
- `refreshData()` 继续后台刷新，但不再阻塞首屏。

### 3. 渲染

- `renderDashboard()` 只渲染当前 tab；`renderCoupons` / `renderOrderPage` / `renderMePage` 由 `switchPage` 首次进入时渲染。
- `renderTimeline()` 改为弹层打开时渲染。
- `renderMilestones()` 的 `updateCarouselMeta()` 放到 `requestAnimationFrame`。
- `tickLoveTime()` 在 `document.hidden` 时跳过。

### 4. 地图

- 新增 `scripts/build-map.js`（Node，无依赖）：坐标取 3 位小数 + Douglas-Peucker 简化 + 精简 properties，输出 `assets/data/china-map.simplified.json`。
- `app.js` 改读简化文件并带 `?v=`；`observeMap()` 等数据加载完再启动，`rootMargin` 500px → 200px。
- 涟漪动画、roam、tooltip、城市聚焦逻辑保持原样。

### 5. 字体

- `scripts/build-fonts.sh` 改为按实际字体位置取字：
  - `--font-cute`：`space.name`、`space.members[].name`、`story.title`、`coupon.title`、`scripts/font-cute-chars.txt` 里的静态文案。
  - `--font-display`：标题类动态字段（回忆标题、目标标题、城市名、菜名、卡券标题、空间/故事名）+ 页面静态 UI 文案 + 数字/拉丁/标点。
  - 不再把 `font-extra-chars.txt` 的 2,664 个兜底字打进主字体。
- 重新生成两个 woff2；文件名不变。

### 6. 资源与版本

- 三个页面移除 alicdn SDK script，加 bucket `preconnect`。
- 缓存 token `20261029-04` → `20261030-01`。
- `assets/vendor/README.md` 记录新增 SDK。

## 手动 QA

- 首页首屏天数、字体、地图；320/390/1280。
- 缓存命中（第二次打开）与强制无缓存（DevTools disable cache）两种情况。
- 下单 / 取消 / 管理端登录 / 发卡 / 出餐图片上传 / 删除卡券。
- 地图探索、锁定、城市点选、境外印章、涟漪。
- 测试库 `?env=prod` / 默认 test 的缓存隔离。
