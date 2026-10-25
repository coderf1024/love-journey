# LJ-20261025-003-branch-only-workflow · 开发规范改为只建分支

- 状态：in-review
- 提出人：人
- 日期：2026-10-25
- 分支：`chore/LJ-20261025-003-branch-only-workflow`

## 背景与目标

ADR-0002 要求每个需求一个 worktree。实际使用中 worktree 的隔离收益有限，反而增加目录切换、预览服务和清理成本。改成“一个需求一个分支，直接在主工作目录开发”。

## 范围

- 要做：
  - `CLAUDE.md`、`docs/README.md`、`docs/work/README.md`、发布手册、架构总览、看板统一去掉 worktree 规则。
  - 新增 ADR-0005，标记 ADR-0002 被取代。
  - 任务模板去掉 worktree 字段。
  - 关闭本仓库后台隔离的 worktree 要求（`.claude/settings.json`）。
- 不做（非目标）：
  - 不改变任务 ID、STATUS、QA、验收和合并 main 的流程。
  - 不删除历史任务文档里的 worktree 记录。

## 验收标准

1. 现行规范文档中不再要求创建 worktree。
2. `docs/work/_template/` 不再包含 worktree 字段。
3. 本仓库的 `.claude/settings.json` 设置 `worktree.bgIsolation = none`。
4. 新需求按“建分支 → 开发 → 合并回基线分支”执行。

## 涉及面

- 文档：规范、流程、发布、架构、ADR、看板、模板。
- 代码：无。
- 数据/通知：无。
