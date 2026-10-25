# LJ-20261025-003-branch-only-workflow · 状态

- 状态：in-review
- 分支：`chore/LJ-20261025-003-branch-only-workflow`
- 最后更新：2026-10-25 22:40
- 当前负责人：人（验收）

## 已完成

- 规范、流程、发布、架构、看板文档统一改为“只建分支，不使用 worktree”。
- 新增 ADR-0005，ADR-0002 标记为被取代。
- 任务模板去掉 worktree 字段。
- `.claude/settings.json` 设置 `worktree.bgIsolation = none`。
- 原任务 worktree `.claude/worktrees/LJ-20261025-002-bark-tone` 已删除。

## 未完成 / 下一步

1. 人工确认新流程。
2. 后续需求从当前基线分支拉新分支开发。

## 阻塞

- 无。

## 已验证

- `git worktree list` 只剩主工作目录。
- 现行规范文档中不再有创建 worktree 的指令。

## 关键文件

- `CLAUDE.md`
- `docs/work/README.md`
- `docs/decisions/ADR-0005-branch-only-workflow.md`
- `.claude/settings.json`
