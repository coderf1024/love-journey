# LJ-20261029-004 · 记录

- 2026-10-29：按人要求从 `main` 新建 `feat/LJ-20261029-004-milestone-admin`；后续改动不再新建分支。
- 原型阶段只新增 `docs/design/milestone-admin-wireframe.html` 和任务文档，不改页面代码、缓存 token、OSS 数据。
- 011 把 `memoryCoverHTML` 的图片分支删掉了；管理端阶段先不恢复，2026-10-30 追加用户端展示时已恢复（见下）。
- 现有 `milestones.json` 经迁移脚本已经带 `ms_001` 形式的 `id`；管理端列表用数组索引定位编辑，保存时保留已有 id。
- 旧数据带 `image` 字段的回忆，在管理端列表会显示为「有封面」；用户端在 2026-10-30 后也显示图片。
- 已确认：4:3 固定封面比例、单图、硬删除；初始阶段只改管理端，后续追加用户端展示。

## 2026-10-30 实现记录

- 人确认四项取舍：4:3 封面、单图、硬删除、入口在系统 → 数据（桌面侧栏同级）；同时明确**初始阶段只改管理端，用户端不改**（当天晚些时候追加用户端展示，见下）。
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

## 2026-11-04 合并 main

- 按人要求把 `main` 合入 `feat/LJ-20261029-004-milestone-admin`；`main` 新增首页性能优化、谢谢大厨返币 + 更新公告，涉及 `admin.html` / `js/app.js` / `js/store.js` / `js/oss-utils.js` / `css/style.css` / `index.html` / `use.html` / 文档。
- 冲突处理：
  - 管理端侧栏和系统数据区同时保留「岁月留痕」与「更新公告」；`VIEW_TITLES`、返回按钮、`switchView` 允许列表和 `admin-subpage` 同时包含 `milestones` / `announcements`。
  - `js/app.js` 取 main 的 `MAP_SRC` / 首屏 fallback / token 结构，保留 `memoryCoverHTML` 的图片分支。
  - `css/style.css` 取 main 的 token，保留 `.memory-cover-img` / `has-image` 规则。
  - `index.html` / `use.html` 取 main 的结构（本地 OSS SDK、preconnect、首屏脚本），只保留统一 token。
  - `CLAUDE.md` 合并 main 的「更新公告 / warmOssSdk」系统说明和本需求的「岁月留痕」说明。
- 缓存 token 统一 bump 到 `20261104-01`（三页 + CSS/JS + `js/oss-utils.js` 的 `OSS_SDK_URL`）。
- main 的首屏缓存会缓存整份 `loadAppData`；新增 `syncMilestoneCache()`，管理端保存/删除回忆后同步更新 localStorage 里的 `milestones`，避免用户端先看到旧一屏。
- 合并后回归：管理端里程碑视图/弹窗/保存、更新公告空态、侧栏激活和返回按钮都正常；用户端有图/无图/坏图、详情、时间线、320/390/1280 正常；console 无报错。

## 2026-11-05 视觉微调 + 翻页动画

- `.memory-card` 去掉 `box-shadow`，`transition` 只保留 transform。
- `.timeline-year` 去掉 `position: sticky / top / z-index`，保留原来的间距和背景；年份不再吸顶。
- 详情翻页动画：
  - 新增 `.memory-detail-copy` 包住日期/标题/描述，导航按钮不参与动画，避免点完按钮后按钮跟着跳。
  - 下一段：封面从右 18px + scale 1.02、opacity .35 淡入；正文从右 12px、opacity 0 淡入，延迟 24ms；总时长 300ms。
  - 上一段：方向镜像（-18px / -12px）。
  - 快速连点先取消上一组动画再开始；`prefers-reduced-motion: reduce` 时直接切换、不播动画。
- 缓存 token `20261105-01`；`index.html` 新增 `.memory-detail-copy` 包裹层。
- CDP 验证：card box-shadow `none`、timeline-year `position: static`、next/prev keyframe 方向正确（±18/±12px）、reduced-motion 下动画数为 0、320/390/1280 无横向溢出、console 无异常。

## 2026-11-05 移动端左右滑动

- 回忆详情增加触摸滑动：左滑下一段、右滑上一段，沿用同一套方向感动画。
- 用 Pointer Events + `#memory-sheet .sheet-scroll { touch-action: pan-y pinch-zoom; overflow-x: hidden; }`：竖向滑动交给正文滚动，横向位移超过 12px 且明显大于纵向才锁定为翻页；松手位移 ≥56px 才切换。
- 从按钮/链接/输入框开始的触摸不拦截，避免误触；快速连点/连滑由 `stepMemory` 取消上一组动画。
- 底部「上一段 / 下一段」按钮保留，作为无障碍、桌面和不习惯滑动用户的兜底。
- 缓存 token `20261105-02`。
- CDP 验证：左滑 index 0→1、右滑 1→0；竖滑和 30px 短滑不切换；按钮仍可用；320/390/1280 无横向溢出；console 无异常。

## 2026-11-05 首次滑动提示

- 移动端详情在正文和按钮之间显示「‹ 左右滑动 ›」，箭头做两次轻摆；`aria-hidden="true"`，不影响读屏和按钮操作。
- 只在触摸设备显示（`pointer: coarse` 或 `maxTouchPoints > 0`）；桌面端隐藏，按钮兜底。
- 未滑动前每次打开详情都会显示；第一次横向滑动 ≥56px 后写入 `localStorage: lj-memory-swipe-hint-seen` 并永久隐藏。
- `prefers-reduced-motion` 下箭头不摆动，提示文字仍显示。
- 缓存 token `20261105-03`。
- CDP 验证：第一次打开提示显示、箭头动画运行；左滑后提示隐藏且 localStorage 为 1；再次打开不显示；reduce 模式箭头动画为 none；320/390/1280 无横向溢出；console 无异常。
