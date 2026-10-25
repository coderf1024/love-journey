# 决策记录（ADR）

只记录会影响后续实现、且不容易从代码直接看出来的决定。新决定复制 `_template.md` 命名递增。

| ID | 决定 | 状态 |
|---|---|---|
| [ADR-0001](./ADR-0001-oss-document-store.md) | OSS 作为多文档数据库 | 已采纳 |
| [ADR-0002](./ADR-0002-worktree-per-requirement.md) | 一需求一 worktree + branch | 已被 ADR-0005 取代 |
| [ADR-0003](./ADR-0003-bark-client-side.md) | Bark 客户端发送，无 cron，模板可配 | 已采纳 |
| [ADR-0004](./ADR-0004-manual-qa.md) | 不新增构建/测试工具链，手动验收 | 已采纳 |
| [ADR-0005](./ADR-0005-branch-only-workflow.md) | 只建分支，不使用 worktree | 已采纳 |

模板：[`_template.md`](./_template.md)
