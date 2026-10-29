# LJ-20261029-003 · 笔记

## 决策

- 2026-10-29：主站改为 EdgeOne Makers + 自定义域名 `https://coderf.site`；GitHub Pages 保留为备用。原因：GitHub Pages 国内慢、偶发重置；Gitee Pages 已停服；EdgeOne 免费计划 + Git 自动部署 + 全球（不含中国大陆）加速免备案。
- 2026-10-29：测试库 `love-journey/db-test/space.json` 的 `settings.links` 同步为 `coderf.site`（写前备份）。
- 2026-10-29：暂不关闭 GitHub Pages。旧二维码、桌面图标和书签仍指向 `github.io`；等确认没有旧链接后再评估。
- 2026-10-29：两套部署都从 `main` 自动部署，作为镜像而不是独立回滚。如果需要真正的稳定回退，后续可把 GitHub Pages 改成从 `stable` 分支发布。

## 发现

- EdgeOne 默认项目/部署域名（`*.edgeone.dev` / `*.edgeone.cool`）在中国大陆网络必须使用系统预览链接，3 小时有效，过期返回 401；非大陆网络可直接访问。公开入口必须用自定义域名。
- 全球（不含中国大陆）加速区绑定自定义域名不需要 ICP 备案；中国大陆或全球（含中国大陆）需要备案。
- OSS CORS 为 `*`，两套站点都能直接读写生产库。
- Bark 模板只使用 `{adminUrl}` / `{userOrderUrl}`，没有硬编码域名；`links` 切换后自动生效。
- 二维码按当前域名生成；旧二维码不会自动切换。
- `coderf.site` 的 CSS/JS/地图使用 Brotli 压缩并命中 EdgeOne 缓存；HTML 为 `max-age=0,must-revalidate`，发布后能及时更新。

## 遗留风险 / 后续任务

- 旧二维码、桌面图标和书签仍指向 GitHub Pages。
- EdgeOne 免费计划条款/配额可能调整。
- 两套都跟 `main`，同一个坏提交会同时影响；不是独立回滚。
- 如果以后要关 GitHub Pages，需要先重新生成所有二维码并确认没有外部链接。

## 发布记录

- 版本 token：无变化（纯文档任务）
- 发布时间：待合并
- 线上验证：`coderf.site` 三份 HTML 与本地一致；资源 200；GitHub Pages 3 次 200。
