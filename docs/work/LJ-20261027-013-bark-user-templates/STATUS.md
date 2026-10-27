# LJ-20261027-013 · 状态

- 状态：accepted
- 分支：`fix/LJ-20261027-013-bark-user-templates`
- 最后更新：2026-10-27
- 当前负责人：AI

## 已完成

- 新建任务文档与分支。
- 用户侧三条模板改为：保留 `{items}`，副标题 `{slot}`，标题去口语化，正文压到一行。
- 缓存 token 升到 `20261027-02`（三页 + `css/style.css`）。

## 未完成 / 下一步

1. 2026-10-27 合并 `main` 并发布。
2. 线上 `space.settings.bark.templates` 已确认存过旧文案，需对三条分别「恢复默认」→「保存模板」，新默认模板才会生效。
3. 线上 smoke 通过后置 `done`。

## 阻塞

- 本地没有 OSS 凭证，无法读取线上 `space.json` 判断是否存过自定义模板。

## 已验证

- `node --check js/store.js` 通过。

## 关键文件

- `js/store.js`（`BARK_TEMPLATE_DEFAULTS`）
- `index.html`、`admin.html`、`use.html`、`css/style.css`（token）
- `CHANGELOG.md`、`docs/work/BOARD.md`

## 备注

- 管理端「恢复默认」只填表单，仍需点「保存模板」才会写入 OSS。
