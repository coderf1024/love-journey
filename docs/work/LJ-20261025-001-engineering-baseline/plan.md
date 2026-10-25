# LJ-20261025-001 · 实现方案

## 总体思路

把“架构细节”从根 CLAUDE.md 的部分段落抽到 `docs/architecture/`，把“怎么做需求”沉淀为 `docs/work/`，把“怎么发布/怎么安全动数据”放进 `docs/runbooks/`。根 `CLAUDE.md` 变成 AI 的入口和硬规则，细节通过链接读取。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `docs/README.md` | 文档索引和每次开始工作的阅读顺序 |
| `docs/glossary.md` | 产品、导航、订单、图片、通知术语 |
| `docs/architecture/*` | 总览、数据模型、核心流程 |
| `docs/runbooks/*` | 本地开发、发布、OSS 数据、Bark、GitHub Action |
| `docs/decisions/*` | 4 条已确认 ADR + 模板 |
| `docs/work/*` | 流程说明、看板、模板、本次任务记录 |
| `docs/design/*` | 从 `prototype/` 迁入并修正相对路径 |
| `docs/reference/*` | 收纳 Bark API、OSS 配置、Action、菜品照片来源 |
| `CLAUDE.md` | 会话开场检查、工作模型、worktree、术语、文档链接、质量闸门 |
| `README.md` | 文档入口和开发协作说明 |
| `CHANGELOG.md` | 初始变更记录 |
| `.github/pull_request_template.md` | 任务、QA、数据影响检查 |
| `.editorconfig` | 统一编码/缩进/换行 |

## 数据结构 / 兼容 / 迁移

- 不修改 `space/menu/orders/coupons` 结构。
- 不写线上 OSS 数据。
- `prototype/` → `docs/design/` 只改文档资源路径（`../assets` → `../../assets`，`../css` → `../../css`）。

## 分步任务

- [x] 建立 `docs/` 目录和文档索引
- [x] 写术语表
- [x] 写架构/数据/流程文档
- [x] 写本地开发/发布/OSS/Bark/Action runbook
- [x] 写 ADR 和任务模板/看板/示例任务
- [x] 迁移设计原型并修正路径
- [x] 更新根 CLAUDE.md 和 README.md
- [x] 加 PR 模板和 EditorConfig
- [ ] 人工验收文档链接和术语一致性

## 手动 QA 重点

- `docs/README.md` 的所有相对链接能打开。
- `docs/design/*.html` 能加载图片和 CSS。
- 用户端导航仍是我们 / 小灶 / 恋爱卡 / 空间；没有业务行为变化。
- `docs/work/BOARD.md` 能看出当前任务和下一步。
- 根 CLAUDE.md 的规则与新文档不冲突。

## 风险与回滚

- 纯文档/路径变更，不改业务代码；回滚只需撤销本次文档提交。
- 旧 `prototype/` 路径失效；文档已统一指向 `docs/design/`。
