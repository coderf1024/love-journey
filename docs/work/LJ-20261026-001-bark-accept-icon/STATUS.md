# LJ-20261026-001-bark-accept-icon · 状态

- 状态：in-review
- 分支：`feat/LJ-20261026-001-bark-accept-icon`
- 最后更新：2026-10-26 09:30
- 当前负责人：人（验收）

## 已完成

- 新增 `accepted` Bark 事件和默认模板。
- `setOrderStatus` 在 pending → accepted 时推送用户。
- 所有推送附带 `space.avatar` 作为 `icon`。
- 管理端新增「接单」设置行和模板入口。
- 文档、CHANGELOG、缓存 token、字体已更新。

## 未完成 / 下一步

1. 真机验证接单通知和头像图标。
2. 线上保存一次通知设置，让 `events.accepted` 落库（可选，默认开启）。
3. 验收后合并 `feat/love-space-ordering`。

## 阻塞

- 无。

## 已验证

- `node --check js/store.js`、admin 内联脚本检查。
- Node 渲染 `accepted` 模板。
- Node 构造 `sendBark` payload，确认包含 `icon`。
- 无头 Chrome 加载管理端，确认「接单」行存在且无 JS 报错。

## 关键文件

- `js/store.js`
- `admin.html`
- `docs/runbooks/bark.md`
