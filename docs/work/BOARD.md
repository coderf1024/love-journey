# 任务看板

最后更新：2026-10-26

| ID | 需求 | 状态 | 分支 | 下一步 | 验收人 |
|---|---|---|---|---|---|
| LJ-20261025-001 | 工程规范与项目结构初始化 | in-review | `feat/love-space-ordering`（本次基线直接在当前分支完成） | 人工阅读 docs，确认规范后合并 | 人 |
| LJ-20261025-002 | 通知模板口吻拆分（大厨侧系统通知 / 用户侧男友口吻） | in-review | 已由 `feat/LJ-20261025-002-bark-tone` 合入 `feat/love-space-ordering`（merge `9dcccd6`） | 在 8888 验收；通过后合并 main；上线后保存新单默认模板 | 人 |
| LJ-20261025-003 | 开发规范改为只建分支、不使用 worktree | in-review | `chore/LJ-20261025-003-branch-only-workflow` | 合入 `feat/love-space-ordering`；人工确认后生效 | 人 |
| LJ-20261025-004 | 管理端测试确认框被模板弹窗遮挡 | in-review | `fix/LJ-20261025-004-admin-confirm-layer` | 人工复测「发送测试」确认框；通过后合入基线 | 人 |
| LJ-20261026-001 | 接单通知与空间头像图标 | in-review | `feat/LJ-20261026-001-bark-accept-icon` | 真机验证接单通知和头像图标；通过后合入基线 | 人 |
| LJ-20261026-002 | 我想吃：用户提交菜品申请，管理端审核上架 | in-review | `feat/LJ-20261026-002-dish-wish` | 真机验收三种图片方式和 Bark；通过后合入基线 | 人 |
| LJ-20261026-003 | 「我想吃」入口降到分类栏最右边 | in-review | `fix/LJ-20261026-003-wish-entry` | 人工确认视觉；通过后合入基线 | 人 |
| LJ-20261026-004 | 管理端确认框按钮配色与订单默认筛选 | in-review | `fix/LJ-20261026-004-admin-ui` | 人工确认确认框和订单默认 tab；通过后合入基线 | 人 |

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

## 待登记

- 暂无。
