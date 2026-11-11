# LJ-20261109-001 · 状态

- 状态：accepted（代码完成并自查通过，按人指示合并 main）
- 分支：`feat/LJ-20261109-001-admin-ux`
- 最后更新：2026-11-11
- 当前负责人：人（验收）

## 已完成

原型（v1 → v3，方案已确认）：

- `docs/design/admin-ux-wireframe.html`，v3 含标签上限 2 个、iOS 输入字号原理。

实现（全部 8 条 + D 段方案 A）：

1. 首页顶部「用户端 ↗」：`userSiteUrl()` 优先 `space.settings.links.user`，本地测试库用相对 `index.html` + 当前 `?env`；新标签页打开。
2. 「需要你处理」= `homeAttentionOrders()`：pending / prepping / cooking / served + 超时 + 待审核菜品申请；accepted 只在 `sameDay(scheduledFor)` 时出现；排序 pending → accepted → prepping → cooking → served，再按饭点时间；超时/催单标红。
3. 系统页改为导航：内容（菜单 / 岁月留痕 / 更新公告）+ 设置（通知 / 空间资料）；Bark 整体迁到 `data-panel="notification"`，所有 `bark-*` / `link-*` id 未改；桌面侧栏把「系统设置」换成「通知」；菜单行显示待审核角标；通知行显示推送摘要。
4. 移动端输入：`.admin-input/.admin-select/.admin-textarea` 保持 16px 计算字号 + `scale(.875)` + `width:114.2857%`，视觉 14px；`admin.html` viewport 加 `maximum-scale=1, user-scalable=no`，body `touch-action: manipulation`；桌面仍 13px。
5. 回忆弹窗：封面保持 4:3 大图（`width:min(100%,266px)`，约 200px 高）；日期改为整行按钮 + 自绘日历（年切换 / 月视图 / 今天 / 清空 / 跨年）；「年份」只读框移除，改为日期下方说明；图片 URL 收进 `<details>`；删除降级到底部文字链接（仍走确认框）。
6. 订单详情二级页 `data-panel="order-detail"`：整卡可点（按钮不触发），`openOrderDetail` 记录来源页，返回回到来源；详情含菜品、本次出餐快照（可点大图）、备注、催单/答谢提醒、支付余额、状态时间线；底部操作复用 `changeOrderStatus` / `cancelAdminOrder`，出餐仍走拍照弹窗；导航高亮回落到「订单」。
7. 菜品标签 8 个：`DISH_TAG_OPTIONS`（js/store.js）与 `MENU_TAGS`（admin.html）同步；`normalizeDishTags()` 末尾 `.slice(0, 2)`；选择器选满 2 个后其余置灰；菜单新增标签筛选行（与分类、搜索 AND）。
8. 用户端「谢谢大厨」= 完成：`thankChef()` 在 `served` 时同时写 `completed` + `statusHistory`；返币仍用 `thanks_<orderId>` 幂等；toast 改为「一餐圆满，+N 恋爱币」。

- 缓存 token：`20261106-01` → `20261109-01`（三个页面 + CSS + app.js + oss-utils + CLAUDE）。
- 字体子集重建；`build-fonts.sh` 排除标签常量行（标签用 UI 字体）。
- CHANGELOG 已更新。

## 未完成 / 下一步

1. 人按 `QA.md` 在 320 / 390 / 1280 验收。
2. **iOS 真机验证 D 段方案 A**：聚焦输入框不放大、收键盘布局不跳、文字清晰度、光标对齐。有问题直接切方案 B（保持 16px 只收紧外观）。
3. 验收通过后合并 `main` 并线上 smoke。

## 阻塞

- 无（等人工验收）。

## 已验证（无头 Chromium）

- 390 宽：系统导航、通知、订单列表、订单详情、菜单、标签筛选、菜品弹窗、回忆弹窗、日历全部渲染正常；无横向溢出。
- 320 / 390 / 1280 菜单与岁月留痕：`scrollWidth === clientWidth`。
- 输入控件计算字号 16px、`transform: scale(.875)`、视觉宽度等于容器（159/160）。
- 标签规范化：3 个标签截断为前 2 个；未知标签被过滤；重复去重。
- 待办口径：accepted 当天保留、次日不出现；prepping/cooking 次日仍出现；completed/cancelled 排除。
- `thankChef` 存根测试：served → completed，`statusHistory` 追加 `completed/user`，返币 1 次，重复调用不再发币。
- 详情页 served 示例：本次出餐 2 张图、备注、催单提醒、时间线、底部操作都渲染。

## 关键文件

- `admin.html`（导航 / 首页 / 通知 / 订单详情 / 回忆弹窗 / 标签 / 输入字号）
- `js/store.js`（`DISH_TAG_OPTIONS`、`DISH_TAG_MAX`、`normalizeDishTags`、`thankChef`）
- `js/app.js`（谢谢大厨 toast）
- `scripts/build-fonts.sh`
- `CHANGELOG.md`、`CLAUDE.md`、`docs/design/admin-ux-wireframe.html`

## 备注

- 标签用 `--font-ui`，不进显示字体子集；本次新增标签没有给字体子集增加任何字形。
- 详情页返回逻辑：从首页待办进入返回首页，从订单列表进入返回订单。
