# LJ-20261029-004 · 实现方案

## 总体思路

管理端新增一个与「菜单」同级的子视图 `milestones`，从「系统 → 数据」进入；列表和编辑弹窗复用现有 admin 组件样式。数据仍写单个 `content/milestones.json`（条数有界，整份读、整份写），由 `js/store.js` 统一做规范化与 `updatedAt`。封面图复用现有上传/压缩流程，落到 `uploads/milestones/`。用户端 `memoryCoverHTML` 恢复图片分支，纯色渐变作为兜底。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/oss-utils.js` | 新增 `uploadMilestoneImage(file)`，压缩后写入 `uploads/milestones/`（沿用 `uploadsRoot()`） |
| `js/store.js` | 新增 `saveMilestones(items)`（整份写入、补 id、trim、updatedAt）；新增 `upsertMilestone` / `deleteMilestone` 或由管理端组装后调用 `saveMilestones` |
| `admin.html` | 「系统 → 数据」新增「岁月留痕」行；新增 `data-panel="milestones"` 列表视图；新增回忆编辑弹窗；`VIEW_TITLES`、`switchView`、返回逻辑、初始化 |
| `js/app.js` | `memoryCoverHTML` 有 `image` 时输出 `<img>`；加载失败移除图片回退渐变；卡片与详情共用 |
| `css/style.css` | 照片封面的叠层、年份/日期可读性；`object-fit: cover`；无图时保持现状 |
| 文档 | `docs/architecture/data-model.md`、`docs/architecture/flows.md` 补字段与上传路径；`CHANGELOG.md` |
| 缓存版本 | 三页 + CSS/JS 内 token 统一 bump |

## 数据结构 / 兼容 / 迁移

`content/milestones.json` 保持现有结构：

```jsonc
{
  "version": 1,
  "updatedAt": "YYYY-MM-DD HH:mm:ss",
  "items": [{
    "id": "ms_001",              // 旧数据已有；新增用 ms_<时间戳或递增序号>
    "date": "2026-01-25",        // 可为空 → 「旧时光」
    "title": "新家",
    "description": "…",
    "image": "https://…/uploads/milestones/….jpg", // 可空
    "order": 1                   // 保留字段，不参与展示排序
  }]
}
```

- 展示顺序仍由 `date` 倒序决定，`order` 不参与排序。
- 保存时只补缺失的 `id`，不改旧字段；删除为数组移除后整份写入。
- 图片上传路径由 `uploadsRoot()` 决定，测试库自动落到 `uploads-test/`。
- 旧 `image` URL 若失效，前端隐藏图片并回退渐变，不阻塞卡片渲染。

## 分步任务

- [ ] 1. 原型评审（本阶段）：`docs/design/milestone-admin-wireframe.html`，人确认入口、列表、弹窗、图片比例和删除策略。
- [ ] 2. 数据层：`uploadMilestoneImage` + `saveMilestones`，本地测试库验证整份写入和 id 补齐。
- [ ] 3. 管理端：系统入口、列表视图、编辑弹窗、删除确认、图片预览。
- [ ] 4. 用户端：封面图片渲染、失败回退、卡片/详情叠层可读性。
- [ ] 5. 手动 QA（320/390/1280、测试库新增/编辑/删除、旧数据无图回退）。
- [ ] 6. 文档、缓存 token、字体子集、CHANGELOG。

## 手动 QA 重点

- 系统页入口计数与列表一致；有图/无图筛选正确。
- 新增日期在未来/过去都能按日期落到正确位置。
- 上传 4:3、竖图、超大图三种情况，卡片裁切不变形。
- 图片 URL 填错时用户端回退渐变，不出现破图图标。
- 删除确认框在列表滚动位置和移动端底部弹层都正常。
- 旧的无图回忆和带旧 `image` 的回忆都要检查。

## 风险与回滚

- 整份写入存在读改写竞态，但只有管理端一个写入口，风险低；写入前以管理端当前载入数据为准。
- 图片上传与文档写入分两步，和菜品图一致：先上传图片，再保存文档；保存失败时图片成为孤儿文件，可接受。
- 用户端改动是纯展示，回滚代码即可恢复纯色封面；数据里的 `image` 保留不删。
