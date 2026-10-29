# LJ-20261029-004 · 实现方案

## 总体思路

管理端新增一个与「菜单」同级的子视图 `milestones`，从「系统 → 数据」进入；列表和编辑弹窗复用现有 admin 组件样式。数据仍写单个 `content/milestones.json`（条数有界，整份读、整份写），保存与上传逻辑放在 `admin.html` 内，避免改共享 JS 和用户端资源。封面图复用 `uploadBucketImage()` 的现有压缩流程，落到 `uploads/milestones/`。用户端代码完全不动，回忆继续显示纯色封面。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `admin.html` | 「系统 → 数据」新增「岁月留痕」行；侧栏「系统」组新增入口；新增 `data-panel="milestones"` 列表视图、编辑弹窗、保存/删除/上传逻辑；`VIEW_TITLES`、`switchView`、返回逻辑、`renderAll` |
| `docs/architecture/data-model.md` | 补 `milestones.json` 字段、`uploads/milestones/` 路径和「用户端暂不展示」说明 |
| `CHANGELOG.md` | Unreleased / Added 记录本次管理端功能 |
| 不修改 | `index.html`、`js/app.js`、`css/style.css`、`js/store.js`、`js/oss-utils.js`、缓存 token |

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
- 管理端缩略图/预览加载失败时显示渐变占位，不阻塞列表渲染。
- 用户端不读 `image`；字段先保存，等以后单独做用户端展示。

## 分步任务

- [x] 1. 原型评审：入口、列表、弹窗、4:3 封面、单图、硬删除均已确认。
- [ ] 2. 管理端数据：`loadAdminData()` 已有 `milestones`；在 `admin.html` 内实现整份保存、id 补齐、`updatedAt`。
- [ ] 3. 管理端 UI：系统入口、侧栏入口、列表（搜索/筛选/分组）、编辑弹窗、删除确认、图片预览与上传。
- [ ] 4. 手动 QA（320/390/1280、测试库新增/编辑/删除、旧数据无图回退、用户端确认无改动）。
- [ ] 5. 文档、CHANGELOG；不 bump 缓存 token（未改共享 JS/CSS）。

## 手动 QA 重点

- 系统页入口计数与列表一致；有图/无图筛选正确。
- 新增日期在未来/过去都能按日期落到正确位置。
- 上传 4:3、竖图、超大图三种情况，管理端预览裁切不变形。
- 图片 URL 填错时管理端预览显示「加载失败」，不出现破图图标。
- 删除确认框在列表滚动位置和移动端底部弹层都正常。
- 旧的无图回忆和带旧 `image` 的回忆都要检查。
- 用户端 `index.html` / `js/app.js` / `css/style.css` 的 git diff 为空。

## 风险与回滚

- 整份写入存在读改写竞态，但只有管理端一个写入口，风险低；写入前以管理端当前载入数据为准。
- 图片上传与文档写入分两步，和菜品图一致：先上传图片，再保存文档；保存失败时图片成为孤儿文件，可接受。
- 只改 `admin.html`；回滚即恢复旧管理端页面，数据里的 `image` 保留不删。
