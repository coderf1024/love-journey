# 任务看板

最后更新：2026-10-25

| ID | 需求 | 状态 | 分支 / worktree | 下一步 | 验收人 |
|---|---|---|---|---|---|
| LJ-20261025-001 | 工程规范与项目结构初始化 | in-review | `feat/love-space-ordering`（本次基线直接在当前分支完成） | 人工阅读 docs，确认规范后合并 | 人 |
| LJ-20261025-002 | 通知模板口吻拆分（大厨侧系统通知 / 用户侧男友口吻） | in-review | `feat/LJ-20261025-002-bark-tone` · `.claude/worktrees/LJ-20261025-002-bark-tone` | 管理端逐个事件确认预览；线上已保存模板需恢复默认；真机验证出餐配图 | 人 |

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

- 每个新需求先建任务文件夹，再建 worktree 和分支。
- 切换任务前更新行内“下一步”和对应 `STATUS.md`。
- 当前 `feat/love-space-ordering` 上还有未提交的功能开发；本次规范基线先落在这个分支。**从下一个新需求开始，严格按一需求一 worktree 执行。**

## 待登记

- 暂无。
