# LJ-20261029-003 · 实现方案

## 总体思路

只改文档，不改运行时代码。以线上已验证的事实为准：

- `coderf.site` 的 `index.html` / `admin.html` / `use.html` 与本地 `main` 逐字节一致；
- 生产 `space.settings.links` 已指向 `coderf.site`；
- Bark 模板没有硬编码域名，`userOrderUrl` 会生成 `https://coderf.site/index.html?slot=<slotKey>#order`；
- OSS CORS 为 `*`，两套站点都能直接读写生产库；
- EdgeOne 默认项目域名在大陆需要 3 小时预览链接，公开入口必须用自定义域名。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `README.md` | 部署段改为 EdgeOne 主站 + GitHub Pages 备用；修正 worktree 旧说法 |
| `CLAUDE.md` | 首段部署说明、发布约定、Gotchas 增加 EdgeOne 规则 |
| `docs/architecture/overview.md` | 运行时与部署段更新 |
| `docs/runbooks/release.md` | 合并/部署/回滚/smoke 改为双部署 |
| `docs/runbooks/edgeone.md` | 新增：EdgeOne 运维手册 |
| `docs/decisions/ADR-0006-edgeone-primary-hosting.md` | 新增：托管决策记录 |
| `docs/decisions/README.md` | ADR 索引 |
| `docs/README.md` | 线上环境、文档地图、部署约定更新 |
| `docs/reference/oss-config.md` | 部署段更新 |
| `docs/reference/github-action-setup.md` | “不影响 Pages 部署”改为“不影响站点部署” |
| `docs/runbooks/test-db.md` | 公网域名示例加入 `coderf.site` |
| `docs/glossary.md` | 增加主站/备用站/默认项目域名 |
| `CHANGELOG.md` | Unreleased 记录 |
| `docs/work/BOARD.md` | 登记本任务 |

## 数据结构 / 兼容 / 迁移

- 无数据结构变化。
- 线上 `space.settings.links` 已由人改为：
  - `https://coderf.site/index.html`
  - `https://coderf.site/admin.html`
- 测试库 links 已于 2026-10-29 同步为 `coderf.site`。
- 旧二维码/书签仍指向 GitHub Pages，因此本任务不关闭 GitHub Pages。

## 分步任务

- [x] 1. 建任务文档和分支
- [x] 2. 更新 README / CLAUDE / 架构 / 发布手册
- [x] 3. 新增 EdgeOne 手册和 ADR，更新索引
- [x] 4. 更新测试库说明、术语表、CHANGELOG、BOARD
- [ ] 5. 人工确认文档后合并 `main`

## 手动 QA 重点

- 文档中的 URL、状态码、3 小时规则与实际一致；
- `space.settings.links` 的值不写错；
- 不把密钥、口令写入文档；
- 发布手册步骤可直接执行。

## 风险与回滚

- 纯文档变更，回滚为 revert 本任务提交。
- 不触及线上数据和代码。
