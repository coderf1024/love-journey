# LJ-20261029-003 · 部署迁移：EdgeOne Makers 主站 + GitHub Pages 备用

- 状态：in-review（文档已更新，待人工确认）
- 提出人：人
- 日期：2026-10-29
- 分支：`chore/LJ-20261029-003-deploy-edgeone`

## 背景与目标

GitHub Pages 在国内访问慢，且偶发连接重置；Gitee Pages 已于 2024 年停服，不能作为迁移目标。站点是纯静态、无构建，已用 EdgeOne Makers 从 GitHub `main` 自动部署，并绑定自定义域名 `https://coderf.site`；GitHub Pages 继续保留为备用。

本任务只同步仓库文档，使发布、运维和后续 AI 会话与线上实际一致；不改运行时代码。

## 范围

- 要做：
  - 更新 README、CLAUDE.md、架构总览、发布手册、OSS 配置、Action 参考、测试库说明、术语表、CHANGELOG、BOARD；
  - 新增 EdgeOne 运维手册和 ADR-0006；
  - 记录线上只读核对结果（HTML 一致、links 已切换、CORS 为 `*`）。
- 不做（非目标）：
  - 不改页面代码、不改缓存 token、不改 OSS 数据结构；
  - 不关闭 GitHub Pages；
  - 不改 Bark 模板内容；
  - 不写生产 OSS 数据。

## 验收标准

1. 文档明确主站为 `https://coderf.site`（EdgeOne Makers，push `main` 自动部署），GitHub Pages 为备用。
2. 文档明确 EdgeOne 默认项目域名在大陆只能 3 小时预览、必须使用自定义域名；全球（不含中国大陆）加速区无需 ICP 备案。
3. 发布手册的部署、回滚和 smoke 步骤同时覆盖两套部署。
4. BOARD、STATUS、CHANGELOG 已更新，任务可追溯。

## 涉及面

- 页面：无
- 数据/OSS：只读确认 `space.settings.links` 已指向 `coderf.site`；本任务不写 OSS
- 通知/Bark：模板使用 `{userUrl}` / `{userOrderUrl}` / `{adminUrl}`，随 links 生效
- 管理端：无代码改动
- 兼容/迁移：旧二维码仍指向 GitHub Pages，保留 GitHub Pages 作为回退

## 风险与开放问题

- [x] 测试库 `love-journey/db-test/space.json` 的 links 已于 2026-10-29 同步为 `coderf.site`。
- [ ] 旧二维码、桌面图标和书签仍指向 GitHub Pages；关闭 GitHub Pages 前需要重新生成/迁移。
- [ ] EdgeOne 免费计划的配额和条款可能调整（官方称长期提供，Limits 文档注明商业化后可能调整）。
