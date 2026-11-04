# LJ-20261029-004 · 状态

- 状态：in-review（实现完成，等待人工验收）
- 分支：`feat/LJ-20261029-004-milestone-admin`
- 最后更新：2026-11-04
- 当前负责人：人（验收）

## 已完成

- 从 `main` 拉出功能分支；原型经人确认。
- 管理端「系统 → 数据」新增「岁月留痕」入口，显示总条数 / 有封面数；桌面侧栏「系统」组新增同级入口。
- 管理端 `milestones` 视图：按年份分组、日期倒序，无日期归入「旧时光」；搜索；全部 / 有封面 / 无封面筛选。
- 管理端编辑弹窗：日期、标题、描述、封面图（上传或 URL）、4:3 预览、年份自动显示。
- 管理端保存：整份写入 `content/milestones.json`，补 `id` / `updatedAt`，保留旧字段；删除复用确认框。
- 封面上传复用 `uploadBucketImage()`，测试环境 `uploads-test/milestones/`，生产 `uploads/milestones/`。
- 用户端 `memoryCoverHTML` 读取 `image`：有图显示 4:3 照片，年份白色叠层、隐藏 motif；无图/加载失败回退 v0–v3 渐变 + motif。
- 用户端卡片和详情共用同一套封面渲染；日期胶囊、详情正文、前后翻页保持不变。
- 缓存 token bump 到 `20261104-01`（三页 + CSS/JS/OSS SDK 内引用）。
- 文档：data-model、CHANGELOG、CLAUDE、brief、plan 已同步。

### 2026-11-04 合并 main

- 已把 `main`（首页性能优化、谢谢大厨返币 + 更新公告）合入本分支。
- 管理端同时保留「岁月留痕」和「更新公告」入口/视图；`VIEW_TITLES`、返回按钮、`switchView` 白名单和子页状态同时包含两者。
- `js/app.js` 保留 main 的 `MAP_SRC`/首屏 fallback，同时保留回忆封面图片分支；`css/style.css` 保留图片封面规则。
- 新增 `syncMilestoneCache()`：管理端保存/删除后同步 main 首屏缓存里的 `milestones`。
- 合并后管理端、用户端回归通过，缓存 token `20261104-01`。

## 未完成 / 下一步

1. 人在本地 8888（默认测试库）验收：管理端增删改/上传；用户端有图、无图、坏图三种状态。
2. 抽查线上 13 条带旧 `image` 的回忆，确认图片链接仍然有效。
3. 验收通过后按发布流程合并 `main`。

## 阻塞

- 无。等待人工验收。

## 已验证

### 管理端

- `node --check` 内联脚本通过；所有新引用的 DOM id 存在。
- 无头 Chrome 登录页加载无 console 报错。
- 注入假数据跑通：列表 5 条、年份分组、日期倒序、摘要与入口计数一致。
- 搜索「海边」、有封面/无封面筛选结果正确。
- 编辑保存：写 `content/milestones.json`、保留 `ms_001` id、更新后列表立即归位。
- 新增：自动生成 `ms_<时间戳>_<序号>`，按日期插入正确年份，删除按钮在新增态隐藏。
- 删除：确认框 → 数组移除 → 整份写入 → 列表更新。
- 上传：测试环境前缀 `love-journey/uploads-test/milestones/`，成功提示与预览正常；坏 URL 显示「图片加载失败」。
- 320 / 390 / 1280：页面无横向溢出；列表与弹窗布局正常。
- 合并 main 后：里程碑/公告两个视图切换正常，侧栏激活、返回按钮正常；保存回忆仍写入 `content/milestones.json`。

### 用户端

- 注入 4 条假回忆（有图 / 无图 / 坏图 / 无日期）：
  - 有图卡片 `has-image`、`<img>` 可见、年份白色、motif 隐藏；
  - 无图卡片无 `<img>`，渐变 + motif 可见，年份深色；
  - 坏图在 `onerror` 后移除 `has-image`、图片隐藏、渐变 + motif 恢复；
  - 无日期卡片正常。
- 详情封面：`memory-detail-cover v0 has-image`，图片和白色年份显示。
- 320 / 390 / 1280 页面 `scrollWidth === viewport`；横向轮播内部滚动属于预期。
- console 无异常。

## 关键文件

- `admin.html`（管理端，含合并后的公告入口）
- `js/app.js`（用户端封面渲染 + main 首屏优化）
- `css/style.css`（照片封面样式）
- `index.html` / `use.html` / `admin.html` / `css/style.css` / `js/app.js`（缓存 token）
- `docs/architecture/data-model.md`、`CHANGELOG.md`、`CLAUDE.md`
- `docs/work/LJ-20261029-004-milestone-admin/`
- `docs/design/milestone-admin-wireframe.html`

## 备注

- 管理端保存/上传逻辑放在 `admin.html` 内，不改 `js/store.js` / `js/oss-utils.js`；用户端只改 `js/app.js` + `css/style.css`。
- 图片 URL 失效时用户端自动回退渐变，不出现破图。
- AI 未向真实 OSS 写入测试数据；真实登录/上传请在测试库验收。
- 本需求后续改动都留在 `feat/LJ-20261029-004-milestone-admin`，不再新建分支。
