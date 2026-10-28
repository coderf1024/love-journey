# LJ-20261028-015 · 状态

- 状态：in-review
- 分支：`261028_space_fix`（从 `main` 拉出，按要求不合并 main）
- 最后更新：2026-10-28 12:10
- 当前负责人：人（验收）/ AI（开发完成）

## 已完成

- 登录态从 `sessionStorage` 改为 `localStorage`，有效期 12 小时 → 7 天。
- 滑动续期：每次成功加载管理端数据都重置计时。
- 过期记录自动清除。
- 恢复登录失败不再清掉登录态，改为提示刷新重试。
- 修复「已登录仍会闪一下登录页」：登录态判断与读写函数提前到 `<head>`，浏览器绘制前给 `<html>` 加 `admin-session-boot`，直接显示「正在打开管理端…」过渡态；面板数据加载完成后才收起过渡态。新增 `#admin-boot` 与配套样式，`openAdmin` / 退出登录 / 恢复失败三条路径都会收起它。另加 `preconnect` 到 OSS SDK 的 CDN，缩短阻塞时间。
- 内联脚本 `node --check` 通过；假 `localStorage` 用例全部通过（空、6 天有效、8 天过期并清除、退出清除）。

## 未完成 / 下一步

1. 人在本地 8888 验收关闭浏览器重开、退出登录、过期场景，以及首屏是否还会闪登录页。
2. 手机端（Safari / 微信）真机确认一次。
3. 验收通过后由人决定是否合并；本次按要求**不合入 main**。

## 阻塞

- 无。

## 已验证

- `node --check`：内联脚本语法通过。
- 逻辑用例：`readAdminSession` / `saveAdminSession` / `clearAdminSession` 6 项全过。
- 首屏探测用例：无会话不显示过渡态、新会话显示、6 天显示、8 天不显示且清除过期记录，5 项全过。
- 两段内联脚本分别通过 `node --check`。

## 关键文件

- `admin.html`：`<head>` 内登录态脚本与首屏探测、`#admin-boot` 与 `.admin-boot` 样式、`openAdmin`（数据就绪后收起过渡态）、退出登录与恢复失败分支。
- `docs/work/LJ-20261028-015-admin-remember-login/`。

## 备注

- 本次只改 `admin.html` 内联脚本，没有改 `js/*.js`、CSS、字体、音频，因此没有 bump `?v=` 缓存 token；如需合并发布，按 `docs/runbooks/release.md` 统一 bump 后再上线。
