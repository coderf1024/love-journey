# ADR-0006：EdgeOne Makers 主站 + GitHub Pages 备用

- 状态：已采纳
- 日期：2026-10-29
- 任务：`docs/work/LJ-20261029-003-deploy-edgeone/brief.md`

## 背景

- 站点是纯静态、无构建，原先部署在 GitHub Pages；国内访问慢，且会出现连接重置。
- Gitee Pages 已于 2024 年停服，无法作为国内托管。
- 已用 EdgeOne Makers 从 GitHub `main` 自动部署，并绑定自定义域名 `https://coderf.site`；项目为全球（不含中国大陆）加速区，自定义域名无需 ICP 备案。
- EdgeOne 的默认项目/部署域名在中国大陆网络必须使用系统预览链接（3 小时有效，过期 401），不能作为公开入口。

## 决定

使用 EdgeOne Makers + 自定义域名 `https://coderf.site` 作为主站；GitHub Pages 保留为备用。两套都从 `main` 自动部署，托管同一份静态文件、读写同一份生产 OSS 数据。线上 `space.settings.links` 指向 `coderf.site`。

## 取舍

- 优点：
  - 国内访问明显快于 GitHub Pages；
  - 无需 ICP 备案（全球不含中国大陆加速区）；
  - 无构建步骤，继续符合“源码即产物”；
  - 保留 GitHub Pages 作为回退和旧二维码兼容。
- 代价/风险：
  - 新增 EdgeOne 依赖，免费计划配额和条款可能调整；
  - 两套都跟 `main`，同一个坏提交会同时影响，不是独立回滚；
  - 默认项目域名在大陆不可公开访问，必须维护自定义域名；
  - 旧二维码、桌面图标和书签仍指向 GitHub Pages。
- 不选择的方案：
  - Gitee Pages：已停服；
  - 阿里云 OSS + CDN：需要备案域名和额外资源配置；
  - Cloudflare Pages 等免费默认域名：国内速度不确定；
  - 继续只用 GitHub Pages：无法解决国内慢和不稳定的问题。

## 影响

- 发布：push `main` 后同时等待 EdgeOne 和 GitHub Pages 部署；优先在 `coderf.site` 做 smoke。
- 运维：见 [EdgeOne 运维手册](../runbooks/edgeone.md)；不要分享 `*.edgeone.dev` / `*.edgeone.cool` 默认域名。
- 兼容：GitHub Pages 在旧二维码/书签彻底迁移前不要关闭；若关闭，需要重新生成所有二维码。
- 文档：README、CLAUDE.md、架构总览、发布手册、术语表需与本决策保持一致。
