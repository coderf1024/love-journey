# LJ-20261109-001 · 笔记

## 决策

- 2026-11-09（人确认）：
  - 「谢谢大厨」= 完成订单（方案 A），`thankChef()` 成功后调 `completeOrder(id, 'user')`；返币仍靠 `thanks_<orderId>` 幂等。
  - 「已接单」只在饭点当天进「需要你处理」；提前几天接的单不打扰。
  - 用户端入口只放首页顶部右侧，快捷操作保持 3 格。
  - 订单详情用二级页（`adminView = order-detail`），不用弹层。
  - 输入框视觉全局 14px，并禁止页面缩放（iOS 聚焦放大也要解决）。
  - 新增回忆保留 4:3 大图，只限宽 `min(100%, 266px)`，不做缩略图。
  - 菜品标签最终 8 个：下饭 / 香辣 / 酸甜 / 咸鲜 / 拿手菜 / 酱香 / 暖胃 / 红烧。
  - 采纳：系统导航行处理角标、菜单按标签筛选。
- 2026-11-09（人再确认）：
  - 酱香、红烧两个标签都保留。
  - 标签上限 **2 个**。理由：用户卡和详情都只显示 2 个，选 3 个没有展示位。线上 29 道菜最多只有 2 个标签（只读抓取 `commerce/menu.json` 确认：1 个的 19 道、2 个的 4 道、0 个的 6 道），所以加限制不会截断任何现有数据；实现上在 `normalizeDishTags()` 末尾 `.slice(0, 2)`。

- 2026-11-09：原型先出，不先改代码（人明确要求「需要先更新下原型我看看」）。
- 2026-11-09：订单详情选二级页而不是弹层，理由是移动端要放时间线和出餐大图，且能复用现有子页模式。
- 2026-11-09：通知页只迁移 Bark，不改模板、事件、保存逻辑；所有 `bark-*` / `link-*` id 保持原样。
- 2026-11-09：标签扩展采用「只加不减」，因为 `normalizeDishTags()` 会过滤白名单外的值，删标签会让线上旧菜丢标签。
- 2026-11-09：iOS 聚焦放大看的是**计算 font-size < 16px**，与 viewport 无关（`user-scalable=no` 在 iOS 10+ Safari 被忽略）。所以现状 16px 才不放大；直接写 14px 一定会放大。可选：A 16px 计算 + `scale(.875)` + `width:114.29%`（视觉 14px 不放大，需真机验证清晰度/光标）、B 保持 16px 只收紧内边距、C 直接 14px 接受放大。

## 发现

- `renderHome()` 的待办过滤：`['pending','served'].includes(status) || (overdue && ADMIN_ORDER_ACTIVE.includes(status))`，accepted/prepping/cooking 只有超时才出现。
- 移动端输入框 16px 来自 `@media (max-width:899px)` 的整体覆盖，不是单个组件。
- 回忆弹窗的 4:3 预览是 `.photo-preview.milestone-preview { width:100%; max-width:none; aspect-ratio:4/3 }`。
- 用户端菜品卡只取 `dish.tags.slice(0,2)`，详情页取全部。
- `adminView` 子页通过 `document.body.classList.toggle('admin-subpage', [...].includes(view))` 隐藏 tabbar；新增页要同时加进 `switchView` 白名单、`renderChrome` 的返回按钮列表和 `VIEW_TITLES`。

## 遗留风险 / 后续任务

- 首页待办变长后可能需要折叠，原型暂未做。
- 自绘日历是纯手写，需要处理跨年、闰年、月份起始星期。
- 「谢谢大厨 = 完成」会改用户端行为，需要真机验证返币只发一次。

## 发布记录

- 版本 token：待实现后 bump
- 发布时间：—
- 线上验证：—

## 实现记录（2026-11-09）

- 系统页改成导航后，`renderSettings()` 仍然一次渲染通知页的所有控件；`renderNotificationSummary()` 只读 `space.settings`，不额外请求。
- 订单详情从首页待办进入时返回首页，从订单列表进入时返回订单；`orderDetailReturn` 记录来源。
- 订单详情打开时，15s 轮询（`refreshAdminOrders`）会顺带刷新详情，避免详情停在旧状态。
- 移动端输入控件的缩放方案：`font-size:16px` + `scale(.875)` + `width:114.2857%`；`transform-origin: left top`。钱包卡的「最多可欠」单独用 `scale(.8)` + `96px`。
- 标签字用 `--font-ui`，不属于显示字体；`build-fonts.sh` 现在整行排除 `DISH_TAG_OPTIONS` / `MENU_TAGS`。
- 回忆日历是手写的：年列表从「今年 + 1」往前 12 年；月视图周一开头，42 格；今天有描边，选中是深色实心。
- `thankChef` 多写 completed 仍在同一次 `orderCollection.save` 内，不增加写次数；`statusHistory` 加了数组保护。
