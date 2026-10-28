# 工程文档索引

这是「恋爱空间」的工程文档入口。项目是一个人 + 一个 AI 的端到端交付模式，所有需要跨会话保留的上下文都放在这里，而不是只留在聊天记录里。

## 每次开始工作先读

1. [术语表](./glossary.md) — 先统一称呼，避免「我们 / 空间 / 管理端」混用。
2. [架构总览](./architecture/overview.md) — 页面、数据层、运行时边界。
3. [任务看板](./work/BOARD.md) — 当前有哪些需求在跑。
4. 当前任务的 `docs/work/<task-id>/STATUS.md` — 上次做到哪、下一步是什么。
5. 需要发布时读 [发布手册](./runbooks/release.md)。

## 文档地图

| 文档 | 用途 |
|---|---|
| [术语表](./glossary.md) | 用户端/管理端、导航名称、订单状态、菜品图片等统一叫法 |
| [架构总览](./architecture/overview.md) | 无后端静态站、OSS 文档存储、页面职责 |
| [数据模型](./architecture/data-model.md) | `space/menu/orders/coupons` 等文档结构与约束 |
| [核心流程](./architecture/flows.md) | 预约、出餐图集、Bark、深链、发卡、核销 |
| [本地开发](./runbooks/local-development.md) | 本地预览、手动检查、字体和缓存版本 |
| [测试库](./runbooks/test-db.md) | 本地默认使用 db-test，克隆/切换/上传/Bark 隔离 |
| [发布手册](./runbooks/release.md) | 验收、合并 main、版本 bump、线上 smoke、回滚 |
| [OSS 数据安全](./runbooks/oss-data.md) | 读写顺序、索引、删除、迁移、竞态 |
| [Bark 通知](./runbooks/bark.md) | 双密钥、模板变量、事件开关、深链 |
| [GitHub Action](./runbooks/github-action.md) | 周更恋爱卡任务说明入口 |
| [参考文档](./reference/README.md) | Bark API、OSS 配置、Action 配置、菜品照片来源 |
| [需求流程](./work/README.md) | 一需求一分支、STATUS、验收和交接 |
| [任务看板](./work/BOARD.md) | 当前需求状态和下一步 |
| [决策记录](./decisions/README.md) | 已确认、会影响后续实现的 ADR |
| [设计原型](./design/README.md) | 历史线框和视觉方案 |

## 参考文档

- [参考文档索引](./reference/README.md) — Bark API、OSS 配置、GitHub Action、菜品照片来源。
- [OSS 配置](./reference/oss-config.md) — AccessKey 混淆和配置步骤。
- [Bark API 示例](./reference/bark-api.md) — 官方接口请求格式和参数示例。
- [GitHub Action 配置](./reference/github-action-setup.md) — 周更恋爱卡 Action 的 Secrets 配置。
- [菜品照片来源](./reference/dish-photo-credits.md) — 当前 mock 照片的来源和替换说明。

## 工作约定

- 需求说明、方案、状态、验收记录都写入 `docs/work/`，不依赖聊天记忆。
- 一个需求一个分支，直接在主工作目录切换分支开发；不使用 worktree。切换需求前先更新该任务的 `STATUS.md`。
- 线上以 `main` 为部署分支，功能分支验收后才合并。
- 项目不新增构建/测试工具链；质量闸门以手动检查和现有命令为主。具体规则见 [需求流程](./work/README.md)。
- 文档以中文为主；代码标识、字段名、命令保留英文。
