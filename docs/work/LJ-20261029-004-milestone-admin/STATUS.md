# LJ-20261029-004 · 状态

- 状态：in-review（实现完成，等待人工验收）
- 分支：`feat/LJ-20261029-004-milestone-admin`
- 最后更新：2026-10-30
- 当前负责人：人（验收）

## 已完成

- 从 `main` 拉出功能分支；原型经人确认。
- 范围收窄为**只改管理端**，用户端代码和渲染未动。
- 管理端「系统 → 数据」新增「岁月留痕」入口，显示总条数 / 有封面数；桌面侧栏「系统」组新增同级入口。
- 新增 `milestones` 视图：按年份分组、日期倒序，无日期归入「旧时光」；搜索标题/描述；全部 / 有封面 / 无封面筛选。
- 新增编辑弹窗：日期、标题、描述、封面图（上传或 URL）、4:3 预览、年份自动显示。
- 新增保存逻辑：整份写入 `content/milestones.json`，补 `id` / `updatedAt`，保留旧字段。
- 新增删除：复用管理端确认框，硬删除数组项。
- 封面上传复用 `uploadBucketImage()`，测试环境落到 `uploads-test/milestones/`，生产落到 `uploads/milestones/`。
- 列表缩略图和预览加载失败时回退渐变 / 错误提示，不出现破图。
- 文档：data-model、CHANGELOG、brief、plan 已同步。

## 未完成 / 下一步

1. 人在本地 8888（默认测试库）验收：系统入口、列表、新增/编辑/删除、上传封面。
2. 验收通过后按发布流程合并 `main`；本次未改共享 JS/CSS，不需要 bump 缓存 token。
3. 用户端展示封面图是后续独立需求，本次明确不做。

## 阻塞

- 无。等待人工验收。

## 已验证

- `node --check` 内联脚本通过；所有新引用的 DOM id 存在。
- 无头 Chrome 登录页加载无 console 报错。
- 注入假数据（未写 OSS）跑通：列表 5 条、年份分组 2026 / 2025 / 旧时光、日期倒序、摘要与入口计数一致。
- 搜索、有封面/无封面筛选结果正确。
- 编辑保存：写 `content/milestones.json`、保留 `ms_001` id、日期/标题/描述/封面更新后列表立即归位。
- 新增：自动生成 `ms_<时间戳>_<序号>`，按日期插入正确年份，删除按钮在新增态隐藏。
- 删除：确认框 → 数组移除 → 整份写入 → 列表更新。
- 上传：测试环境前缀 `love-journey/uploads-test/milestones/`，成功提示与预览正常；坏 URL 显示「图片加载失败」。
- 320 / 390 / 1280：页面无横向溢出，`scrollWidth === viewport`；列表与弹窗布局正常。
- `git diff` 仅 `admin.html` + 文档；`index.html` / `js/app.js` / `css/style.css` / 共享 JS 无改动。

## 关键文件

- `admin.html`（唯一代码改动）
- `docs/architecture/data-model.md`
- `CHANGELOG.md`
- `docs/work/LJ-20261029-004-milestone-admin/`
- `docs/design/milestone-admin-wireframe.html`

## 备注

- 保存/上传逻辑放在 `admin.html` 内，避免改 `js/store.js` / `js/oss-utils.js`，也不影响用户端缓存 token。
- 图片只保存数据，用户端仍显示纯色封面；这是人明确确认的范围。
- AI 未向真实 OSS 写入测试数据；真实登录 / 上传请在测试库验收。
- 本需求后续改动都留在 `feat/LJ-20261029-004-milestone-admin`，不再新建分支。
