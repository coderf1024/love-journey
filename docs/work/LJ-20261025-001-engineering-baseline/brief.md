# LJ-20261025-001 · 工程规范与项目结构初始化

- 状态：in-review
- 提出人：人
- 日期：2026-10-25
- 分支：`feat/love-space-ordering`（基线例外：不新建 worktree）
- worktree：当前工作目录

## 背景与目标

项目目前功能已基本齐备，但缺少一套适合「一个人 + 一个 AI、多需求并行切换」的工程结构。目标不是引入重型流程，而是让每次需求都有：

- 明确的范围和验收标准；
- 独立的分支/worktree 和任务文档；
- 可恢复的上下文（STATUS/notes）；
- 可重复的发布/数据安全流程；
- 统一的术语，避免导航名称和内部页面混用。

## 范围

- 建立 `docs/` 文档体系（架构、数据、流程、运维、决策、任务）。
- 建立任务模板和看板。
- 更新根 `CLAUDE.md` 的工作方式、术语和阅读顺序。
- 更新 `README.md` 的文档入口。
- 将原 `prototype/` 移入 `docs/design/`，修正资源相对路径。
- 将散落的 Bark API、OSS 配置、GitHub Action、菜品照片来源说明收进 `docs/reference/`。
- 增加 PR 模板和 `.editorconfig`。
- 记录本轮已确认的工程决策（worktree、Bark、手动 QA、OSS 文档库）。

## 非目标

- 不新增 package.json、构建步骤、Playwright/lint/测试框架。
- 不修改业务功能、数据结构或线上 OSS 数据。
- 不重写已有页面代码。

## 验收标准

1. 新成员/新 AI 会话能从 `docs/README.md` 找到架构、数据、流程、任务和发布规则。
2. `docs/glossary.md` 明确「我们 = 用户端首页」「空间 = 个人/空间页」「管理端 ≠ 大厨端」。
3. 存在可直接复制的任务模板、任务看板和 at least 一份示例任务记录。
4. 根 `CLAUDE.md` 在每次会话开始时强制读取看板/当前任务 STATUS，并写清 worktree 规则。
5. `docs/design/` 中的原型能正常打开，图片/CSS 路径正确。
6. 业务页面行为没有变化。

## 风险与开放问题

- 旧链接指向 `prototype/` 的会失效；已在文档中改为 `docs/design/`。
- 当前功能分支有大量未提交改动，所以基线暂不另开 worktree；后续任务严格执行。
