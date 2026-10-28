# LJ-20261028-016 · 实现方案

## 总体思路

先做测试库隔离，保证后续本地验收不写线上；再改地图数据归并、配色、境外印章和城市列表。

## 测试库

### 环境判定（浏览器）

- `isTestEnv()` 只看本地/私有 IP：`localhost`、`127.0.0.1`、`0.0.0.0`、`192.168.*`、`10.*`、`172.16-31.*`。
- 线上域名始终返回 `false`，避免公网通过 `?env=test` 打开测试库。
- 本地 `?env=prod` 强制生产库；`?env=test` 在本地/私有 IP 上强制测试库。
- `dbRoot()` 根据 `isTestEnv()` 在 `OSS_CONFIG.dbRoot` / `OSS_CONFIG.testDbRoot` 之间选择。
- 上传前缀同理走 `OSS_CONFIG.testUploadsRoot`。
- 页面加载时在测试环境注入「测试库」角标（内联样式，不依赖额外 CSS）。

### Bark

- `sendBark()` 在测试环境直接返回 `false`，除非 URL 带 `?bark=on`。
- 克隆脚本同时把测试库 `space.settings.bark.enabled` 置为 `false`、`nudgeEnabled` 置为 `false`。

### 克隆脚本

`scripts/clone-test-db.js`：

- 读取 `OSS_REGION` / `OSS_BUCKET` / `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`；
- 源 `SOURCE_DB_ROOT=love-journey/db`，目标 `TARGET_DB_ROOT=love-journey/db-test`；
- 只读源库，只写目标库；目标必须包含 `test`，且不能等于源；
- `--dry-run` 输出数量/路径，不写；
- 目标非空时需要 `--force`；`--force` 先清理目标再复制；
- 复制 `space.json` 时禁用 Bark / 催一催；
- 不复制图片；测试环境新上传走 `uploads-test/`。

### 文档

- 新增 `docs/runbooks/test-db.md`；
- 更新 `docs/runbooks/local-development.md` 的「本地默认测试库」说明；
- `CLAUDE.md` 记录测试库与地图新规则。

## 地图

### 数据归并

- 新增 `PROVINCE_OF`：覆盖 `cityCoordinates` 里的国内城市/地点，例如：
  - 古北水镇 → 北京市，张家口 → 河北省，乌兰察布 → 内蒙古自治区，延吉 → 吉林省，
  - 都江堰 → 四川省，济南 → 山东省，长沙 → 湖南省，香港/澳门 → 特别行政区；
- 新增 `REGION_OF`：省级 → 7 大区；
- `provinceGroups()`：按省归并 `state.cities`，取最早访问日期作为该省的访问时间；
- 境外城市使用 `OVERSEAS_CITY_NAMES` 兜底（济州岛）或记录上的 `overseas/country`，不参与省份归并。

### 配色

- 7 个大区固定色相，低饱和：
  - 华北 玫红 / 东北 雾蓝 / 华东 鼠尾草 / 华南 杏 / 华中 青绿 / 西南 藕紫 / 西北 沙金；
- 同区省份按访问时间排序，由浅到深（最多 5 档）；
- 用 HSL 生成 hex，统一 fill/stroke；不再为每座城市造独立颜色；
- 图例显示 7 个大区色标。

### ECharts

- `geo.regions` 填省份颜色；
- 删除未访问 `scatter` 系列；
- `effectScatter` 仅保留国内已访问城市；
- 省份 tooltip 显示「去过 N 座：…」，未去过省份显示「还没去过」；
- 城市 tooltip 保留日期/描述；
- `updateMapData()` 暂时保持现有重建逻辑；自动缩放/刷新保持视角记录为后续优化。

### 列表与境外

- `renderCityChips()` 改为三列 `.city-grid`：
  - 18 条按最近访问排序；
  - 每格名称 + 日期；境外加 ✈；
  - 不再横向滚动；
- 地图右下角 `.overseas-stamp`：
  - 显示最近境外城市的年月/名称/国家；
  - 点击高亮城市列表中对应的境外格（无城市详情卡）；
- badge：`18 座城市 · 1 座境外`；图例：`国内 17 座`。

### 文件

| 文件 | 改动 |
|---|---|
| `js/oss-config.js` | 增加 `testDbRoot` / `testUploadsRoot` |
| `js/oss-utils.js` | `isTestEnv`、`dbRoot`、上传前缀、测试角标 |
| `js/store.js` | 测试环境跳过 Bark |
| `scripts/clone-test-db.js` | 新增克隆脚本 |
| `docs/runbooks/test-db.md` | 新增 |
| `docs/runbooks/local-development.md` | 更新 |
| `js/app.js` | 省份归并、配色、地图 series、城市网格、印章 |
| `index.html` | 地图区 HTML、缓存版本 |
| `css/style.css` | 城市网格、印章、区域图例、缓存版本 |
| `CLAUDE.md` / `docs/architecture/data-model.md` | 新规则 |
| `CHANGELOG.md` | 任务条目 |

## 手动 QA 重点

- 本地默认测试库；`?env=prod` 切生产；线上域名强制生产；
- 测试库克隆前后数据量一致；源库未被修改；
- 18 条城市、15 个省份、2 个同省双城；
- 境外印章与 ✈ 城市格；
- 320/390/1280 无横向溢出；
- console 无报错；缓存版本一致。

## 风险与回滚

- 测试库误写生产：克隆脚本强制目标含 `test`，本地默认测试库；线上域名不认 `?env=test`。
- Bark 误发：双重关闭 + `?bark=on` 才打开。
- 颜色/布局回归：保留原型对照；必要时回滚 `js/app.js` / `css/style.css` / `index.html`。
