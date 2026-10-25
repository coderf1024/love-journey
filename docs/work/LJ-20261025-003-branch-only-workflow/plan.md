# LJ-20261025-003-branch-only-workflow · 实现方案

## 总体思路

保留分支隔离和任务文档，去掉 worktree 这一层目录隔离。所有规范文档统一成“一个需求一个分支，在主工作目录开发”。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `CLAUDE.md` | 工作模型改为“一需求一分支”，明确不使用 worktree |
| `docs/work/README.md` | 生命周期第 3 步改为建分支；清理步骤改为删分支 |
| `docs/README.md` / `docs/architecture/overview.md` / `docs/runbooks/release.md` | 同步去掉 worktree 描述 |
| `docs/decisions/ADR-0005-branch-only-workflow.md` | 新 ADR，取代 ADR-0002 |
| `docs/decisions/README.md` / `ADR-0002` | 标记取代关系 |
| `docs/work/BOARD.md` | 看板列改为“分支”，更新规则 |
| `docs/work/_template/brief.md` / `STATUS.md` | 去掉 worktree 字段 |
| `.claude/settings.json` | 关闭后台 worktree 隔离要求 |
| `CHANGELOG.md` | 记录规范变更 |

## 分步任务

- [x] 1. 更新规范与流程文档。
- [x] 2. 新增 ADR-0005，标记 ADR-0002。
- [x] 3. 更新模板与看板。
- [x] 4. 关闭本仓库的后台 worktree 隔离。
- [ ] 5. 人工确认新流程。

## 手动 QA 重点

- 搜索现行规范文档，确认不再要求创建 worktree。
- 新建任务模板不再出现 worktree 字段。
- 后续需求用一个分支完成并合并回基线分支。

## 风险与回滚

- 同一时间只能在主目录推进一个需求；切换前必须提交当前改动。
- 回滚：恢复 ADR-0002 文本和相关规范即可，不涉及数据。
