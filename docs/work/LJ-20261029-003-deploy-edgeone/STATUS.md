# LJ-20261029-003 · 状态

- 状态：in-review
- 分支：`chore/LJ-20261029-003-deploy-edgeone`
- 最后更新：2026-10-29 18:03
- 当前负责人：AI / 人

## 已完成

- 线上事实核对：`coderf.site` 三份 HTML 与本地 `main` 逐字节一致；资源 200；版本 token `20261029-04`。
- 生产 `space.settings.links` = `https://coderf.site/index.html` / `https://coderf.site/admin.html`。
- 测试库 `love-journey/db-test/space.json` 的 links 已同步为 `coderf.site`（写前备份到 `/tmp`）。
- Bark 模板无硬编码 `github.io`；`userOrderUrl` 生成 `https://coderf.site/index.html?slot=<slotKey>#order`。
- OSS CORS 为 `*`（只读确认，未改动）。
- 更新 README、CLAUDE.md、架构总览、发布手册、OSS 配置、Action 参考、测试库说明、术语表、CHANGELOG、BOARD。
- 新增 `docs/runbooks/edgeone.md`、`docs/decisions/ADR-0006-edgeone-primary-hosting.md`。
- 完成任务文档。

## 未完成 / 下一步

1. 人工确认文档措辞和“主站/备用”定位。
2. 合并 `main` 后按发布手册做一次双站 smoke。

## 阻塞

- 无

## 已验证

- `https://coderf.site/`、`/admin.html`、`/use.html`、CSS/JS/字体/ECharts/地图 JSON 均 200。
- `coderf.site` 三份 HTML 与本地 `main` SHA-256 一致。
- GitHub Pages 连续 3 次 200；之前的 `Connection reset` 为偶发网络问题。
- 生产 `space.settings.links` 已指向 `coderf.site`。

## 关键文件

- `README.md`
- `CLAUDE.md`
- `docs/architecture/overview.md`
- `docs/runbooks/release.md`
- `docs/runbooks/edgeone.md`
- `docs/decisions/ADR-0006-edgeone-primary-hosting.md`
- `docs/work/BOARD.md`
- `CHANGELOG.md`

## 备注

- 本任务不改代码、不改缓存 token、不写生产 OSS。
- 旧二维码/桌面图标仍是遗留项，见 `notes.md`。
