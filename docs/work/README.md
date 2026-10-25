# 需求工作流

## 核心原则

**一个需求 = 一个任务 ID = 一个 worktree = 一个分支 = 一个 `docs/work/<task-id>/` 文件夹。**

一个人 + 一个 AI 的模式下，真正的风险不是“代码写不出来”，而是：

- 同时开了几个需求，改到一半切走，回来不知道做到哪；
- 未完成的改动混在一起，无法单独验收/回滚；
- AI 在新会话里丢失上下文；
- 线上数据被误改，没有记录。

这套流程就是为了消除这四件事。

## 任务 ID

格式：`LJ-YYYYMMDD-NN-short-slug`

示例：

```text
LJ-20261025-001-engineering-baseline
LJ-20261026-001-serving-gallery
LJ-20261026-002-bark-templates
```

同一天多个任务递增 `NN`。任务 ID 同时用于分支、worktree 和文档目录。

## 状态

任务 `STATUS.md` 使用以下状态：

| 状态 | 含义 |
|---|---|
| `draft` | 想法/需求草稿，还没确认范围 |
| `ready` | 人已确认 brief，准备开发 |
| `in-progress` | AI 正在实现 |
| `blocked` | 等待人/外部条件/另一个任务 |
| `in-review` | 实现完成，等待人工验收 |
| `accepted` | 人验收通过，可以合并 |
| `done` | 已合并 main 并完成发布 |
| `archived` | 放弃或合并到其他任务 |

## 生命周期

### 1. 登记需求

人给一句话需求，AI 先写 `brief.md`，不要直接写代码：

- 背景与目标
- 范围 / 非目标
- 验收标准（人怎么判断完成）
- 涉及页面/数据/通知/权限
- 风险与开放问题

人确认 brief 后状态改为 `ready`。

### 2. 方案

AI 写 `plan.md`：

- 改动文件/模块
- 数据结构变化
- 迁移/兼容策略
- 分步任务清单
- 手动 QA 要点

方案有重大取舍时，补一份 ADR。

### 3. 建 worktree

```bash
git fetch origin
git worktree add .claude/worktrees/<task-id> -b feat/<task-id> origin/main
cd .claude/worktrees/<task-id>
```

如果是修复：`fix/<task-id>`；纯工程/文档：`chore/<task-id>`。

从 `docs/work/_template/` 复制任务文件夹：

```bash
mkdir -p docs/work/<task-id>
cp docs/work/_template/*.md docs/work/<task-id>/
```

更新 `STATUS.md`：状态 `in-progress`、分支、worktree 路径、开始时间。

### 4. 开发

- 每个可验收的小步提交一次，commit message 带任务 ID。
- 修改线上数据前先只读确认；数据迁移先 dry-run。
- 不把其他任务的改动带进这个 worktree。
- 不新增构建/测试工具链；按 `QA.md` 手动检查。
- 每次决定/发现写入 `notes.md`，不要只留在聊天里。

### 5. 切换需求前

必须先做：

1. 更新当前任务 `STATUS.md`：已完成、未完成、关键文件、下一步、阻塞。
2. 提交/保存当前改动（至少 commit 到功能分支）。
3. 更新 `docs/work/BOARD.md` 的状态和下一步。
4. 再进入另一个 worktree。

AI 在新会话开始时应先读 `BOARD.md` 和当前任务 `STATUS.md`，不要凭上次记忆直接改。

### 6. 验收

- `STATUS.md` 改为 `in-review`。
- 在 `QA.md` 写清：
  - 测试环境/宽度；
  - 实际步骤；
  - 通过/失败；
  - 截图或关键输出（不包含 key/secret）。
- 人做最终验收。人确认后改为 `accepted`。

### 7. 合并与发布

- 按 [发布手册](../runbooks/release.md) bump 缓存版本、更新 CHANGELOG、合并 main。
- 发布后线上 smoke，`STATUS.md` 改为 `done`。
- 在 `notes.md` 记录发布版本和遗留风险。

## 人和 AI 的分工

**人负责：**

- 决定做什么、不做什么；
- 确认方案、交互和视觉；
- 最终验收；
- 明确授权线上数据写入/删除/迁移。

**AI 负责：**

- 把模糊需求整理成 brief/plan；
- 写代码、文档、迁移脚本；
- 更新 STATUS/QA/BOARD；
- 执行可逆的开发步骤；
- 在切换或结束前写清交接。

## Definition of Done

- [ ] `brief.md` 的验收标准全部满足
- [ ] `plan.md` 的步骤完成，偏差记录在 `notes.md`
- [ ] `STATUS.md` 更新为 `in-review`/`accepted`/`done`，下一步明确
- [ ] `QA.md` 有人工验收记录
- [ ] 没有 console 报错；320/390/1280 检查（涉及 UI 时）
- [ ] 缓存版本已 bump；字体改动已重建
- [ ] 没有密钥/测试数据/临时脚本进入提交
- [ ] 涉及线上数据时已完成只读确认和清理
- [ ] 文档中的导航名称、数据字段与实际一致

## 给 AI 的开场提示（可直接复制）

```text
任务 ID：LJ-YYYYMMDD-NN-slug

请先读：
- docs/README.md
- docs/work/BOARD.md
- docs/work/<task-id>/brief.md
- docs/work/<task-id>/plan.md
- docs/work/<task-id>/STATUS.md

在开始改代码前，先向我汇报：当前状态、你理解的范围、下一步 1-3 件事、需要我确认的开放问题。
不要修改其他任务的文件；不要动线上 OSS 数据，除非我明确授权。
```

## worktree 清理

合并完成后：

```bash
git worktree remove .claude/worktrees/<task-id>
git branch -d feat/<task-id>
```

任务文件夹保留在 `docs/work/` 作为历史记录，不随 worktree 删除。
