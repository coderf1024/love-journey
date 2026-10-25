# 发布手册

## 模型

- `main` 是线上部署分支。
- 每个需求在自己的 worktree + 分支开发，人工验收通过后再合并。
- 不新增构建步骤；合并到 `main` 即发布静态文件。
- 线上没有 staging；需要预览时用本地 HTTP 服务验功能分支。

## 发布前检查

- [ ] 当前任务 `docs/work/<id>/STATUS.md` 已更新，状态为 `in-review` 或 `accepted`
- [ ] 需求验收人已在 `QA.md` 勾选
- [ ] 没有未处理的阻塞问题
- [ ] 没有把测试数据、临时脚本、密钥带进变更
- [ ] 用户端 320 / 390 / 1280 检查过
- [ ] 管理端侧栏和移动 tab 检查过
- [ ] 改动涉及 OSS 写入时，已做只读确认和回滚方案
- [ ] 改动涉及出餐图片时，已在移动端实机/模拟器验证相机链路

## 版本 bump

缓存 token 统一为 `YYYYMMDD-N`，同一天多次发布递增 `N`。每次改 JS/CSS/字体/音频都要更新：

- `index.html`
- `admin.html`
- `use.html`
- `css/style.css`（字体/纹理 URL）
- `js/app.js` 的 `MUSIC_SRC`
- `CLAUDE.md` 的缓存说明
- `docs/design/wallet-icons.html`（可选）
- `prototype` 已迁移到 `docs/design/`

建议用一次文本替换完成，然后全仓搜索旧 token 确认无残留：

```bash
grep -rn "20261025-" --include="*.html" --include="*.js" --include="*.css" --include="*.md" . | grep -v node_modules
```

同时更新 `CHANGELOG.md` 的 `Unreleased` 段。

## 字体

修改了文案/菜单/空间内容后：

```bash
./scripts/build-fonts.sh
```

确认新字形存在，再把字体 URL 的版本 token 更新到本次发布版本。

## 合并与部署

1. 功能分支最后一次检查 `git diff`，确认没有无关文件。
2. 合并到 `main`（一个人项目可用 fast-forward / squash，保持历史清晰）。
3. 推送 `main`，等待 GitHub Pages 部署。
4. 打开线上 `index.html` 和 `admin.html`，做发布后 smoke：
   - 用户端 4 个 tab 能切换；
   - 小灶页能加载饭点和菜单；
   - 管理端能登录、看订单；
   - 静态资源无 404、console 无报错。
5. 更新 `docs/work/BOARD.md` 和任务 `STATUS.md` 为 `done`。

## 回滚

- 页面/代码问题：`git revert` 合并提交，或重新部署上一个 `main` 提交。
- OSS 数据问题：不要用页面回滚覆盖数据；先只读确认，再按迁移脚本/人工修复，必要时从备份恢复。
- 图片/卡片删除等不可逆操作，必须在执行前确认。

## 发布后记录

在任务 `notes.md` 记录：

- 发布版本 token；
- 线上验证结果；
- 遗留风险/后续任务；
- 如需人工监控，写明观察点（Bark、某笔订单、某张卡）。
