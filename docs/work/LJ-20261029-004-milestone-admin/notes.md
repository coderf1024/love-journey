# LJ-20261029-004 · 记录

- 2026-10-29：按人要求从 `main` 新建 `feat/LJ-20261029-004-milestone-admin`；后续改动不再新建分支。
- 原型阶段只新增 `docs/design/milestone-admin-wireframe.html` 和任务文档，不改页面代码、缓存 token、OSS 数据。
- 011 把 `memoryCoverHTML` 的图片分支删掉了；实现时按当时的记录恢复 `<img>` 分支即可。
- 现有 `milestones.json` 经迁移脚本已经带 `ms_001` 形式的 `id`，编辑/删除可以按 id 定位。
- 旧数据有 13 条带 `image` 字段，目前不展示；恢复图片后会重新显示，需要人工抽查。
- 待确认：4:3 固定封面比例、单图还是多图、删除是否硬删除。
