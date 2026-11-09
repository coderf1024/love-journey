# LJ-20261109-001 · 实现方案

## 总体思路

改动集中在 `admin.html`（结构 + 内联 CSS + 内联脚本）；用户端只动 `js/store.js`（标签白名单 + 答谢即完成）和 `js/app.js`（谢谢大厨 toast）。`adminView` 新增两个二级页 `notification`、`order-detail`，沿用现有「隐藏 tabbar + 左上返回」的子页模式。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `admin.html` 导航 | 系统页改成导航行（内容 / 设置）；新增 `data-panel="notification"`、`data-panel="order-detail"`；`VIEW_TITLES` 增加两项；`SUB_VIEWS` 统一维护子页列表；桌面侧栏去掉「系统设置」换成「通知」；订单详情时导航高亮回落到「订单」 |
| `admin.html` 首页 | 顶部新增「用户端 ↗」（`#open-user-site`）；`homeAttentionOrders()` 统一待办口径；accepted 用 `sameDay()` 过滤；超时/催单标红；`userSiteUrl()` 处理测试库相对地址 |
| `admin.html` 通知页 | Bark 整块迁到 `notification` 面板并分组（推送与密钥 / 推给用户 / 推给我 / 用户端）；跳转地址收进折叠块；顶部与底部各一个保存按钮；`renderNotificationSummary()` 供系统导航页显示摘要 |
| `admin.html` 输入字号 | 移动端 `.admin-input/.admin-select/.admin-textarea` 16px 计算字号 + `scale(.875)` + `width:114.2857%`；`viewport` 加 `maximum-scale=1, user-scalable=no`；`touch-action: manipulation`；桌面 13px 不变 |
| `admin.html` 回忆弹窗 | 封面 `width:min(100%,266px)` 保持 4:3；日期改整行按钮 + 自绘日历 `#milestone-calendar`；`syncMilestoneDate` / `renderMilestoneCalendar` / `pickMilestoneDay`；图片 URL 进 `<details>`；删除改为底部文字链接 |
| `admin.html` 订单详情 | `orderCardHTML` 加 `data-order-open` 和 `›`；`openOrderDetail` / `loadOrderDetail` / `renderOrderDetail`；详情样式（hero / 菜品 / 出餐图 / 备注 / 提醒 / 支付 / 时间线 / 底部操作条） |
| `admin.html` 菜单 | `MENU_TAGS` 扩到 8 个、`MENU_TAG_MAX = 2`；标签选择器选满置灰；菜单新增 `#menu-tag-filters`，与分类、搜索 AND |
| `js/store.js` | `DISH_TAG_OPTIONS` 扩到 8；新增 `DISH_TAG_MAX`；`normalizeDishTags()` 末尾 `.slice(0, 2)`；`thankChef()` 在 served 时同时写 completed |
| `js/app.js` | 谢谢大厨 toast 改为「一餐圆满…」 |
| `scripts/build-fonts.sh` | 排除 `DISH_TAG_OPTIONS` / `MENU_TAGS` 常量行（标签用 UI 字体） |
| 全局 | 缓存 token `20261106-01` → `20261109-01`（三个页面 + CSS + app.js + oss-utils + CLAUDE） |

## 数据结构 / 兼容 / 迁移

- 不新增字段、不改文档结构。
- 标签是白名单扩展：`normalizeDishTags()` 过滤白名单外的值，只加不减；线上 29 道菜最多 2 个标签（只读核对），加 2 个上限不会截断数据。
- 订单详情只读既有 `statusHistory` / `payment` / `nudges` / `thanks`，无新写入。
- 回忆日期仍是 `YYYY-MM-DD`；清空为 `''`，与「旧时光」行为一致。
- `thankChef` 在 served 时多写一次 `completed` 状态，仍在同一次 `orderCollection.save` 里，不增加写次数。

## 分步任务

- [x] 1. 人确认 8 项方案 + 标签上限 2 个 + 输入字号方案 A（2026-11-09）。
- [x] 2. 导航：系统导航页 + 通知二级页 + 桌面侧栏 + 角标。
- [x] 3. 首页：用户端入口 + 待办口径 + 排序/标红。
- [x] 4. 订单详情二级页 + 卡片入口 + 操作条。
- [x] 5. 输入字号：16px 计算 + 缩放 + viewport。
- [x] 6. 回忆弹窗重排 + 自绘日历。
- [x] 7. 标签扩展到 8 个 + 上限 2 + 菜单标签筛选。
- [x] 8. 缓存版本 bump、字体子集、文档更新；QA 待人工。

## 手动 QA 重点

- 320 / 390 / 1280：系统导航页、通知页、首页、订单详情、回忆弹窗、菜单标签行无横向溢出。
- 登录后刷新保持登录；二级页返回回到来源页；详情页 20s 轮询保持最新。
- 通知设置保存 / 测试推送 / 模板编辑在迁 DOM 后仍正常（id 未变）。
- 出餐流程在详情页触发时与列表一致（拍照 → 确认出餐 → 详情刷新）。
- 回忆日期：选日期、清空、跨年、旧数据（无日期）编辑保存。
- 标签：旧菜品编辑不被清空；新标签保存后用户端详情显示。
- **iOS 真机**：聚焦输入不放大、收键盘不跳、文字清晰、光标对齐。

## 风险与回滚

- 输入缩放方案在个别 iOS 版本可能文字发虚、光标偏移 → 回退方案 B（`.admin-input` 保持 16px，只收紧内边距/圆角）。改的是移动端媒体查询里的一段 CSS，不动结构。
- 通知设置整块迁移已核对全部 `bark-*` / `link-*` id。
- 自绘日历替代原生 `input[type=date]` 后如需回退，恢复原生控件即可，无数据变化。
- `thankChef` 多写 completed 属于行为变更；如需回退删掉那 5 行即可。
