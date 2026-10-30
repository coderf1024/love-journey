# LJ-20261029-004 · 记录

- 2026-10-29：按人要求从 `main` 新建 `feat/LJ-20261029-004-milestone-admin`；后续改动不再新建分支。
- 原型阶段只新增 `docs/design/milestone-admin-wireframe.html` 和任务文档，不改页面代码、缓存 token、OSS 数据。
- 011 把 `memoryCoverHTML` 的图片分支删掉了；本次按人要求不恢复，用户端仍用纯色渐变。
- 现有 `milestones.json` 经迁移脚本已经带 `ms_001` 形式的 `id`；管理端列表用数组索引定位编辑，保存时保留已有 id。
- 旧数据带 `image` 字段的回忆，在管理端列表会显示为「有封面」；用户端仍不展示图片。
- 已确认：4:3 固定封面比例、单图、硬删除、只改管理端。

## 2026-10-30 实现记录

- 人确认四项取舍：4:3 封面、单图、硬删除、入口在系统 → 数据（桌面侧栏同级）；同时明确**只改管理端，用户端不改**。
- 代码只改 `admin.html`：新增侧栏/系统入口、`milestones` 视图、编辑弹窗、保存/删除/上传内联逻辑和样式。
- 保存逻辑放在管理端页面内（`saveMilestonesAdmin`），直接 `dbGetOrNull` + `dbPut` 整份写 `content/milestones.json`；不改 `js/store.js` / `js/oss-utils.js`，因此不 bump 缓存 token。
- 封面上传复用现有全局 `uploadBucketImage(file, prefix)`，前缀 `${uploadsRoot()}/milestones/`；测试库自动 `uploads-test`。
- 列表编辑使用数组索引 `data-milestone-index`，保存后重新渲染；新增记录由保存函数生成 `ms_<timestamp>_<index>`。
- 图片只写数据，用户端 `memoryCoverHTML` 没恢复图片分支，回忆仍显示纯色渐变；后续若要做用户端展示，另开任务。
- 无头 Chrome + CDP 假数据验证通过；未向真实 OSS 写入。

## 2026-10-30 用户端封面展示

- 人追加范围：用户端里程碑图片从 `content/milestones.json` 读取；管理端没配置图片的继续用现有渐变背景。
- `js/app.js` 的 `memoryCoverHTML` 恢复图片分支：有 `image` 输出 `.memory-cover-img`，年份白色叠层，隐藏 motif；`onerror` 时隐藏图片并移除 `has-image`，渐变和 motif 自动恢复。
- `css/style.css` 新增 `.memory-cover-img`（4:3 绝对定位、`object-fit: cover`）和照片封面的白色年份/阴影；无图状态保持 011 的视觉。
- 用户端卡片和详情共用 `memoryCoverHTML`；时间线仍是文字列表，不加缩略图。
- 缓存 token 从 `20261029-04` bump 到 `20261030-01`（三页 + CSS/JS 内引用）。
- 未改 `js/store.js` / `js/oss-utils.js`；管理端保存/上传仍在 `admin.html` 内。
- CDP 假数据验证：有图、无图、坏图、详情、320/390/1280 全部通过，console 无异常。
