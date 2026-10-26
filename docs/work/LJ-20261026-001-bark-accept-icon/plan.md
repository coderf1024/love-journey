# LJ-20261026-001-bark-accept-icon · 实现方案

## 总体思路

`accepted` 和 `cooking` / `served` 一样属于用户侧通知，直接复用现有事件模板机制，在 `setOrderStatus` 进入 `accepted` 时发送。图标在 `sendBark()` 统一处理，所有事件自动带上，不在每个调用点重复。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/store.js` | 新增 `accepted` 默认模板；`barkIcon()` 读取 `space.avatar`；`sendBark()` payload 增加 `icon`；`setOrderStatus` 在 `accepted` 时推送用户。 |
| `admin.html` | 新增「接单」设置行、`BARK_EVENT_LABELS.accepted`、更新通知说明文案。 |
| `docs/runbooks/bark.md` | 事件表、口吻、图标说明。 |
| `docs/architecture/flows.md` | Bark 事件表增加 `accepted` 和图标说明。 |
| `CLAUDE.md` / `CHANGELOG.md` | 同步约定与变更记录。 |
| `index.html` / `admin.html` / `use.html` / `css/style.css` / `js/app.js` | 缓存 token → `20261026-01`。 |
| `assets/fonts/*.woff2` | 按新增文案重建。 |

## 数据结构 / 兼容 / 迁移

- 不新增文档字段；`accepted` 只是 `space.settings.bark.events` / `templates` 的新 key。
- 旧数据没有 `accepted` 配置时：事件默认开启，模板使用代码默认值。
- 图标不改变任何存储；只在发送时读取 `space.avatar`。

## 分步任务

- [x] 1. 新增 `accepted` 模板和推送触发。
- [x] 2. 所有推送附带空间头像图标。
- [x] 3. 管理端设置行和文案。
- [x] 4. 文档、缓存版本、字体。
- [ ] 5. 人工真机验收。

## 手动 QA 重点

- 管理端接单 → 用户收到接单通知。
- 通知图标是否为空间头像。
- 关闭「接单」开关后不再推送。
- 原有新单 / 取消 / 开始制作 / 出餐 / 催一催不变。

## 风险与回滚

- 图标 URL 必须是 Bark 能访问的绝对地址；线上头像是 OSS HTTPS，满足。
- 回滚：移除 `accepted` 模板与触发、移除 `icon` 字段即可；不影响数据。
