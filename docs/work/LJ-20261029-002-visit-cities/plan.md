# LJ-20261029-002 · 实现方案

## 总体思路

城市数据是整份 JSON 文档（`content/cities.json`），没有集合索引，一次读-改-写即可。代码侧只补坐标和省份映射，避免城市只出现在列表、地图上没有点。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/app.js` | `cityCoordinates` 增加大理、丽江、开封；`PROVINCE_OF` 增加对应省份 |
| `index.html` / `admin.html` / `use.html` / `css/style.css` / `js/app.js` | 缓存 token `20261029-02` → `20261029-03` |
| OSS `db/content/cities.json` | 追加 4 条 |
| OSS `db-test/content/cities.json` | 追加 4 条 |

## 数据结构 / 兼容 / 迁移

- 记录结构沿用 `{ id, name, date, description }`；id 接着 `city_019` … `city_022`。
- 只追加，不删除任何现有记录；`updatedAt` 写成写入时间。
- 写入前把两个原文档备份到 `/tmp`（不提交、不含密钥）。

## 分步任务

- [x] 1. 建任务文档与分支
- [ ] 2. 代码补坐标/省份 + 缓存 bump
- [ ] 3. 写数据脚本（dry-run → 两个库写入）
- [ ] 4. 读回核对 + 页面验收

## 手动 QA 重点

- 测试库与 `?env=prod` 各看一次城市列表和地图（云南/河南点亮、点击定位）。
- 确认现有 18 条记录未变。

## 风险与回滚

- 覆盖写整份文档属于 read-modify-write；写入时页面若在编辑城市会丢更新（目前没有城市编辑入口，风险低）。
- 回滚：用 /tmp 备份原样写回。
