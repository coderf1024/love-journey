# 任务看板

最后更新：2026-11-13

| ID | 需求 | 状态 | 分支 | 下一步 | 验收人 |
|---|---|---|---|---|---|
| LJ-20261113-001 | 六一宠物功能：一期真实 2D、基本资料与重要事件；当前仅原型 | in-review | `work/261113-cat-sixone` | v3 原型 `docs/design/liuyi-pet-wireframe.html` 待审阅；已定：统一事件+自由标签 / 日期完整必填 / 我们页只趴姿、睡姿放空间页 / 到家日即生日 / 事件照片≥1 可多张；趴姿已重新抠成透明底 `liuyi-lie.webp`；待答 4 项；素材改走图生图（提示词见 `image-prompts.md`）；业务未开发 | 人 |
| LJ-20261112-001 | 每日早安问候：08:14 Bark（Cloudflare Cron + Worker），管理端通知页配置收件人、失败告警、首页待办补发 | done | `work/261112-daily-job` 已合入 main（最新功能 `0072d7c`） | 11-13 新标题与仅早安不跳转网页已发布，28 项回归通过；保留用户已开启的配置和收件人 | 人 |
| LJ-20261109-001 | 管理端体验优化：首页用户端入口、待办口径、系统导航化 + 通知二级页、输入字号、回忆移动端布局、订单详情、菜品标签 | accepted | `feat/LJ-20261109-001-admin-ux` | 自查通过，按人指示合并 main；线上仍需真机确认 iOS 输入不缩放 | 人 |
| LJ-20261102-001 | 谢谢大厨返 10 恋爱币 + 新功能公告 | accepted | 已合并 main（merge `a447530`） | 等部署完成，人做线上 smoke；通过后改 done | 人 |
| LJ-20261030-001 | 首页加载速度：字体、天数、地图、OSS 读路径 | in-review | 当前分支（人要求不建新分支） | 人工按 QA.md 验收；通过后合并 main | 人 |
| LJ-20261025-001 | 工程规范与项目结构初始化 | in-review | `feat/love-space-ordering`（本次基线直接在当前分支完成） | 人工阅读 docs，确认规范后合并 | 人 |
| LJ-20261025-002 | 通知模板口吻拆分（大厨侧系统通知 / 用户侧男友口吻） | in-review | 已由 `feat/LJ-20261025-002-bark-tone` 合入 `feat/love-space-ordering`（merge `9dcccd6`） | 在 8888 验收；通过后合并 main；上线后保存新单默认模板 | 人 |
| LJ-20261025-003 | 开发规范改为只建分支、不使用 worktree | in-review | `chore/LJ-20261025-003-branch-only-workflow` | 合入 `feat/love-space-ordering`；人工确认后生效 | 人 |
| LJ-20261025-004 | 管理端测试确认框被模板弹窗遮挡 | in-review | `fix/LJ-20261025-004-admin-confirm-layer` | 人工复测「发送测试」确认框；通过后合入基线 | 人 |
| LJ-20261026-001 | 接单通知与空间头像图标 | in-review | `feat/LJ-20261026-001-bark-accept-icon` | 真机验证接单通知和头像图标；通过后合入基线 | 人 |
| LJ-20261026-002 | 我想吃：用户提交菜品申请，管理端审核上架 | in-review | `feat/LJ-20261026-002-dish-wish` | 真机验收三种图片方式和 Bark；通过后合入基线 | 人 |
| LJ-20261026-003 | 「我想吃」入口降到分类栏最右边 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-004 | 管理端确认框按钮配色与订单默认筛选 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-005 | 订单筛选吸顶与「全部」前置 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-006 | 订单列表内部滚动，修复与子标题重合 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-007 | 恋爱卡 / 恋爱币流水改为内部滚动 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-008 | 订单卡片在各筛选下布局统一 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-009 | 首页晚餐卡片去掉 emoji、调整水印 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-010 | 饭点卡片去阴影、移除选中摘要、菜单标题去上边距 | accepted | 已合入 `feat/love-space-ordering` | 验收通过；按发布策略暂不合并 main | 人 |
| LJ-20261026-011 | 岁月留痕最新在前、回忆卡片统一纯色 | done | `feat/LJ-20261026-011-milestone-order-solid` | 已发布（2026-10-27），线上 smoke 通过 | 人 |
| LJ-20261027-012 | 菜名字体子集覆盖线上菜品、管理端用户密钥改明文 | done | `fix/LJ-20261027-012-font-subset-and-bark-key` | 已发布（2026-10-27），线上 smoke 通过 | 人 |
| LJ-20261027-013 | 用户侧 Bark 模板精简并改为正式口吻 | done | `fix/LJ-20261027-013-bark-user-templates`（已合入 main） | 已发布；线上保留既有的「宝宝」自定义模板（人确认），代码默认值仅作兜底 | 人 |
| LJ-20261027-014 | 自托管 ECharts / qrcodejs，修复微信内地图打不开 | accepted | `fix/LJ-20261027-014-self-host-echarts-qrcode`（已合入 main） | 已发布 `2cacde9`，待微信真机复测 | 人 |
| LJ-20261029-001 | 城市列表两行横向滚动 + 地图高度 | done | `feat/LJ-20261029-001-city-list-scroll` | 已随 002 合并 main（`f77a17f`），发布 token `20261029-04` | 人 |
| LJ-20261029-002 | 新增去过的城市：大理、丽江、郑州、开封（测试库 + 线上库） | done | `feat/LJ-20261029-002-visit-cities` | 已合并 main（`f77a17f`），发布 token `20261029-04` | 人 |
| LJ-20261028-016 | 首页地图省份点亮 + 独立测试库 | done | `feat/LJ-20261028-016-map-province-lighting` | 已随 002 合并 main（`f77a17f`），发布 token `20261029-04` | 人 |
| LJ-20261028-015 | 管理端关闭浏览器后免重新登录（localStorage + 7 天滑动、首屏不闪登录页） | done | `261028_space_fix`（已合入 main `434abfe`） | 已发布，线上 smoke 待复核 | 人 |
| LJ-20261029-003 | 部署迁移：EdgeOne 主站 + GitHub Pages 备用（文档） | done | `chore/LJ-20261029-003-deploy-edgeone` | 已合并 main（文档提交 `02feaca`），文档发布 | 人 |
| LJ-20261029-004 | 管理端里程碑配置 + 用户端封面展示 | done | `feat/LJ-20261029-004-milestone-admin` | 已合并 main（merge `3eeab64`）并推送；线上 smoke 由人确认，补图完成后移除临时入口 | 人 |
| LJ-20261106-001 | 回忆详情查看原图 | done | `feat/LJ-20261106-001-milestone-photo-viewer` | 已合并 main（merge `b368b8e`）并推送；线上 smoke 由人确认 | 人 |

## 状态说明

- `draft`：需求草稿
- `ready`：范围已确认，可开工
- `in-progress`：开发中
- `blocked`：等待
- `in-review`：等待验收
- `accepted`：验收通过，可合并
- `done`：已合并/发布
- `archived`：放弃/合并到其他任务

## 使用规则

- 每个新需求先建任务文件夹，再建分支。
- 切换任务前更新行内“下一步”和对应 `STATUS.md`。
- 直接在主工作目录切换分支开发，**不使用 git worktree**（见 [ADR-0005](../decisions/ADR-0005-branch-only-workflow.md)）。
- 当前发布策略：已验收任务停在 `accepted`，暂不合并 `main`。

## 待登记

- 暂无。
