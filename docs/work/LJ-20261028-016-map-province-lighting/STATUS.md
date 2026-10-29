# LJ-20261028-016 · 状态

- 状态：done
- 分支：`feat/LJ-20261028-016-map-province-lighting`
- 最后更新：2026-10-28 16:50
- 当前负责人：AI

## 发布

- 2026-10-29 合并 `main`（`f77a17f`），GitHub Pages 部署；发布 token `20261029-04`。

## 已完成

- 已读 `docs/README.md`、术语表、任务模板、OSS 数据安全手册；
- 只读确认线上 `cities.json` 共 18 条（17 国内 + 济州岛），国内落在 15 个省级区域；
- 已建分支与任务目录；
- 测试库：`isTestEnv` / `dbRoot` / `uploadsRoot`、测试角标、Bark 跳过、克隆脚本、测试库文档；
- 克隆脚本 `--dry-run` 通过：源 68 个对象，目标 `db-test` 仅 2 个空索引；
- 地图：城市→省份归并、7 大区色阶、`geo.regions` 省级填色、移除灰点、境外印章、三列/四列城市格、badge/图例；
- 按验收反馈：移除大区颜色图例和地图图例；badge 只显示城市总数；城市格名称左/年月右一行；地图初始显示整张中国并留边（zoom 1.2 / center [104,36]）；城市格点击后 6x 放大定位并显示 tooltip（已自动点击上海/大同验证；tooltip 在缩放完成后重新锚定，固定放在目标城市点下方）；探索/锁定按钮统一左下角，境外城市高亮印章；≤360px 两列；探索入口改为左下角紧凑胶囊（无副标题）。
- 字体已重建，缓存 token 已 bump 到 `20261028-02`；
- 1440 与 500 宽度截图检查通过（生产数据只读查看）。

## 已完成补充

- 人工已执行 `node scripts/clone-test-db.js --force`：68 个对象写入 `db-test`，Bark/催一催关闭；
- 本地默认测试库页面读到 18 城，左下角「测试库」角标正常；
- 本地 `?env=prod` 页面无测试角标；`?env` 在 tab 切换时保留；本地 prod 会显示「线上库」角标。

## 未完成 / 下一步

1. 已人工验收并通过；代码提交到当前功能分支；
2. 按当前发布策略保留功能分支，暂不合并 main；
3. 自动缩放、刷新保持视角、城市详情卡留后续任务。

## 阻塞

- 无。

## 已验证

- 线上城市清单（只读渲染）：18 条，见 `notes.md`。

## 关键文件

- `js/app.js`、`index.html`、`css/style.css`
- `js/oss-config.js`、`js/oss-utils.js`、`js/store.js`
- `scripts/clone-test-db.js`
- `docs/runbooks/test-db.md`

## 备注

- 生产 `cities.json` 没有 `overseas/country` 字段，本次用内置境外名单兜底。
- 城市详情卡/照片暂不做。
