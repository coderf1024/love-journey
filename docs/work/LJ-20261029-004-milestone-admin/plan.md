# LJ-20261029-004 · 实现方案

## 总体思路

管理端新增一个与「菜单」同级的子视图 `milestones`，从「系统 → 数据」进入；列表和编辑弹窗复用现有 admin 组件样式。数据仍写单个 `content/milestones.json`（条数有界，整份读、整份写），保存与上传逻辑放在 `admin.html` 内，避免改共享 JS。封面图复用 `uploadBucketImage()` 的现有压缩流程，落到 `uploads/milestones/`。

用户端 `memoryCoverHTML` 恢复图片分支：`image` 非空时输出 4:3 `<img>`，年份改为白色叠层、隐藏 motif；无图或图片 `onerror` 时移除 `has-image`，露出原来的纯色渐变和 motif。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `admin.html` | 「系统 → 数据」+ 桌面侧栏入口；`milestones` 列表视图、编辑弹窗、保存/删除/上传内联逻辑、样式 |
| `js/app.js` | `memoryCoverHTML` 有 `image` 时输出 `<img>`；加载失败移除 `has-image` 回退渐变 |
| `css/style.css` | `.memory-cover-img` 绝对定位 + `object-fit: cover`；照片封面的白色年份/阴影；有图时隐藏 motif |
| `index.html` / `admin.html` / `use.html` / `css/style.css` / `js/app.js` | 缓存 token `20261029-04` → `20261030-01` |
| `docs/architecture/data-model.md` | 补 `milestones.json` 字段、上传路径、用户端读取/兜底说明 |
| `CHANGELOG.md` | Unreleased / Added 记录管理端配置和用户端封面展示 |
| 不修改 | `js/store.js`、`js/oss-utils.js`（管理端保存/上传使用已有全局函数） |

## 数据结构 / 兼容 / 迁移

`content/milestones.json` 保持现有结构：

```jsonc
{
  "version": 1,
  "updatedAt": "YYYY-MM-DD HH:mm:ss",
  "items": [{
    "id": "ms_001",              // 旧数据已有；新增用 ms_<时间戳>_<序号>
    "date": "2026-01-25",        // 可为空 → 「旧时光」
    "title": "新家",
    "description": "…",
    "image": "https://…/uploads/milestones/….jpg", // 可空
    "order": 1                   // 历史字段，不参与展示排序
  }]
}
```

- 展示顺序仍由 `date` 倒序决定，`order` 不参与排序。
- 保存时只补缺失的 `id`，保留旧字段；删除为数组移除后整份写入。
- 图片上传路径由 `uploadsRoot()` 决定，测试库自动落到 `uploads-test/`。
- 用户端对旧 `image` 直接渲染；URL 失效时 `onerror` 隐藏图片并移除 `has-image`，回退渐变。
- 旧数据不批量改写；管理端编辑时才补 `id` / `updatedAt`。

## 分步任务

- [x] 1. 原型评审：入口、列表、弹窗、4:3 封面、单图、硬删除均已确认。
- [x] 2. 管理端：系统入口、侧栏入口、列表（搜索/筛选/分组）、编辑弹窗、删除确认、图片预览与上传。
- [x] 3. 管理端数据：整份保存、id 补齐、`updatedAt`；上传前缀 `uploads/milestones/`。
- [x] 4. 用户端：卡片/详情读取 `image`，无图/失败回退纯色渐变。
- [x] 5. 缓存 token bump 到 `20261030-01`。
- [x] 6. 手动 QA（320/390/1280、管理端增删改、用户端有图/无图/坏图）。
- [x] 7. 文档、CHANGELOG。

## 手动 QA 重点

- 管理端入口计数与列表一致；有图/无图筛选正确。
- 新增日期在未来/过去都能按日期落到正确位置。
- 上传 4:3、竖图、超大图三种情况，管理端预览裁切不变形。
- 图片 URL 填错时管理端预览显示「加载失败」，不出现破图图标。
- 删除确认框在列表滚动位置和移动端底部弹层都正常。
- 用户端有图卡片：白色年份可读、日期胶囊保留、照片不变形。
- 用户端无图卡片：原渐变 + motif，和 011 的视觉效果一致。
- 用户端坏图：图片隐藏后渐变和 motif 恢复，不出现破图图标。
- 用户端详情大图与卡片一致；上一段/下一段切换后图片跟着更新。
- 320 / 390 / 1280 无横向溢出；console 无报错。

## 风险与回滚

- 整份写入存在读改写竞态，但只有管理端一个写入口，风险低。
- 图片上传与文档写入分两步，和菜品图一致：先上传图片，再保存文档；保存失败时图片成为孤儿文件，可接受。
- 用户端旧 `image` 会重新显示，其中可能有失效链接；已做 `onerror` 兜底，验收时抽查。
- 回滚代码即可恢复纯色封面；数据里的 `image` 保留不删。
