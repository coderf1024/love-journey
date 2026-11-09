# LJ-20261109-001 · 实现方案

## 总体思路

全部改动落在 `admin.html`（结构 + 内联 CSS + 内联脚本），只在被确认的情况下动 `js/app.js`（谢谢大厨完成订单）和 `js/store.js`（标签白名单）。`adminView` 增加两个二级页：`notification`、`order-detail`，沿用现有「隐藏 tabbar + 左上返回」的子页模式。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `admin.html` 导航 | 系统页改成导航行；新增 `data-panel="notification"`；`VIEW_TITLES` 增加「通知」；`switchView` 白名单增加 `notification`、`order-detail`；桌面侧栏把「系统设置」换成「通知」并去掉重复入口 |
| `admin.html` 首页 | 顶部导航加「用户端 ↗」；快捷操作从 3 格改 4 格；`renderHome()` 的 todos 过滤改为 `ADMIN_ORDER_ACTIVE`（含 accepted/prepping/cooking）+ 超时 + 菜品申请；`NEXT_STATUS` 已覆盖全部状态，直接复用 |
| `admin.html` 用户端链接 | 新增 `userSiteUrl()`：`space.settings.links.user` 优先；本地/测试库用相对 `index.html` 并保留当前 `?env`；统一给顶部按钮和快捷格用 |
| `admin.html` 通知页 | 把 `system` 面板里的 Bark 区块整体迁到 `notification` 面板并分组（推送与密钥 / 推给用户 / 推给我 / 用户端）；`renderSettings()`、`saveBarkSettings()`、模板弹窗、测试按钮的 id 全部保持不变，只挪 DOM |
| `admin.html` 字号 | `@media (max-width:899px)` 的输入框 16px 改为 14px；新增 `:focus { font-size: 16px }`，避免 iOS 聚焦缩放；桌面端保持 13px |
| `admin.html` 回忆弹窗 | `.photo-preview.milestone-preview` 从整宽 4:3 改成 84×63 缩略图行；日期从 `input[type=date]` 改为只读按钮 + 自绘日历弹层（年切换 / 月视图 / 今天 / 清空）；年份只读框改成日期下方说明；删除按钮移到正文底部文字链接，仍走 `adminConfirm` |
| `admin.html` 订单详情 | `orderCardHTML` 增加 `data-order-open`；新增 `renderOrderDetail()` / `openOrderDetail()`；详情展示菜品、`servedImage`、备注、支付、催单、`statusHistory`；底部操作条复用 `changeOrderStatus` / `cancelAdminOrder` |
| `js/store.js` | `DISH_TAG_OPTIONS` 扩展（最终名单待人确认）；`admin.html` 的 `MENU_TAGS` 同步 |
| `js/app.js` | 仅当确认方案 A：`thankChef` 成功后调 `completeOrder`；否则不动 |
| `index.html` / `css/style.css` | 缓存版本 bump（只改 admin 时仍需 bump `admin.html` 内的 `?v=`） |
| `scripts/build-fonts.sh` | 新增标签文案后跑一次字体子集 |

## 数据结构 / 兼容 / 迁移

- 不新增字段、不改文档结构。
- 标签扩展是白名单扩展：`normalizeDishTags()` 会过滤白名单外的值，因此「只加不减」；旧菜品的三个旧标签继续有效。
- 订单详情只读既有 `statusHistory` / `payment` / `nudges` / `thanks` 字段，无需新写入。
- 回忆日期仍存 `YYYY-MM-DD` 字符串；清空就是 `''`，与现有「旧时光」行为一致。

## 分步任务

- [ ] 1. 确认原型里 7 个开放问题（尤其「谢谢大厨 = 完成」和标签名单）。
- [ ] 2. 导航：系统 → 导航页 + 通知二级页 + 桌面侧栏。
- [ ] 3. 首页：用户端入口 + 待办口径 + 排序/标红。
- [ ] 4. 订单详情二级页 + 卡片入口 + 操作条。
- [ ] 5. 输入字号调整（移动端 14px / 聚焦 16px）。
- [ ] 6. 回忆弹窗重排 + 自绘日历。
- [ ] 7. 标签白名单扩展 + 用户端只展示前两个的回归。
- [ ] 8. 缓存版本 bump、字体子集、QA、文档更新。

## 手动 QA 重点

- 320 / 390 / 1280 三档宽度：系统导航页、通知页、首页、订单详情、回忆弹窗无横向溢出。
- 登录后刷新是否保持登录；二级页返回是否回到来源页。
- 通知设置保存 / 测试推送 / 模板编辑在迁移 DOM 后仍正常。
- 出餐流程（拍照 → 确认出餐）在详情页触发时行为与列表一致。
- 回忆日期：选日期、清空、跨年、旧数据（无日期）编辑保存。
- 标签：旧菜品打开编辑不被清空；新标签保存后用户端详情能显示。

## 风险与回滚

- 通知设置整块迁移 DOM 时若漏 id，会让保存/测试静默失效 —— 迁移后用 `grep` 对照所有 `bark-*` / `link-*` id。
- 自绘日历替代原生 `input[type=date]` 后，如需回退直接恢复原生控件即可，无数据变化。
- 回滚方式：本次只动 `admin.html`（+ 可选的 `js/app.js` / `js/store.js`），`git revert` 单个提交即可。
