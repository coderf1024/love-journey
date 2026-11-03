# LJ-20261102-001 · 状态

- 状态：accepted
- 分支：`feat/thank-chef-10-coins-announcement`
- 最后更新：2026-11-03 14:14
- 当前负责人：人（线上 smoke）

## 已完成

- 数据层：
  - `thankChef()` 首次返 10 币，`thanks_<orderId>` 幂等，失败回滚；
  - 钱包新增 `thanks` 流水，备注「谢谢大厨 + 哪一餐」；
  - `content/announcements.json` 读写 API，严格 `draft → published → offline → published` 状态机；
  - 公告读取使用 `fresh: true`，避免 OSS 无 Cache-Control 导致的读后写旧数据。
- 用户端：
  - 感谢按钮文案保持「谢谢大厨」，toast 显示返币；
  - 空间新增「更新公告」入口、未读红点、公告列表；
  - 首次打开弹最新未读公告，关闭 / 知道啦 / CTA 写入本地已读；
  - CTA 支持站内 tab 和 https 外链。
- 管理端：
  - 系统新增「更新公告」；
  - 列表动作矩阵：草稿（编辑 / 发布 / 删除）、已发布（编辑 / 下线）、已下线（编辑 / 重新发布 / 删除）；
  - 编辑器无状态字段，版本号只读显示「发布后自动生成」；
  - CTA 文案 + 跳转地址成对校验，快捷填入四个 tab；
  - 订单卡显示「已返 10 币」。
- 工程：
  - 缓存 token bump 到 `20261103-03`；
  - 钱包「谢谢大厨」图标统一为用户端同款（心形 + 圆点、无底色），管理端和用户端一致；
  - 字体子集重建（Noto Serif SC 188K → 191K）；
  - 架构文档、CHANGELOG、CLAUDE.md 已更新。

## 未完成 / 下一步

1. 人已批准合并 `main`；本次提交推送后触发 EdgeOne / GitHub Pages 部署。
2. 人做线上 smoke（用户端 / 管理端 / 公告入口）。
3. 线上 smoke 通过后把状态改为 `done`，并更新 `notes.md` 的发布记录。

## 阻塞

- 无。

## 已验证

- `node --check`：`js/store.js` / `js/app.js` / `js/oss-utils.js` / 三页内联脚本全部通过。
- store 桩测试：返币金额 / 幂等 / 0 币 / 14 位版本 / 状态流转 / CTA 校验全部通过。
- 测试库真实流程：草稿 → 发布 → 下线 → 删除通过，测试数据已清理。
- 测试库 E2E：发布公告 → 用户首次打开自动弹窗 → 关闭写入已读 → 清理通过。
- Chrome headless：用户弹窗、未读红点、CTA 跳转、管理端列表 / 编辑器、320/390/1280 溢出检查、console 无报错。

## 关键文件

- `js/store.js` — 返币 + 公告状态机
- `js/app.js` — 用户端公告 / 返币反馈
- `js/oss-utils.js` — `dbGet(..., { fresh: true })`
- `index.html` / `css/style.css` — 公告入口 / 弹窗 / 列表
- `admin.html` — 公告管理
- `docs/architecture/data-model.md` / `flows.md`
- `docs/design/thanks-reward-announcement-wireframe.html`
- `docs/work/LJ-20261102-001-thanks-reward-announcement/QA.md`

## 备注

- 未提交 commit；当前工作区为完整实现。
- 测试库公告文档保留为空列表。
- 首次公告发布依赖本次代码先上线。
