# LJ-20261118-001 · 状态

- 状态：done（已合并 main 并推送）
- 分支：`work/261113-cook-random`（worktree 当前分支，不另建）
- 最后更新：2026-11-18
- 当前负责人：AI

## 已完成

- 2026-11-17 人确认：名称「你做的我都爱吃」、固定 20 币、列表置顶、只在开始制作时填、设置放菜单页顶部、点 + 不弹说明、不额外推送、不做摇一摇。
- 2026-11-18 人确认：置顶卡就是**普通菜卡**（海报只指缩略图风格）、随机按钮用方案 A 但**只有图标**、随机结果走**弹窗 + 礼盒动画**、池子是**全部在售菜**。
- 置顶卡海报已生成并上传 OSS（1024×1024，215KB），临时文件已清理。
- 原型 v4：`docs/design/chef-choice-wireframe.html`（普通置顶卡、图标按钮、礼盒抽奖 demo、管理端填菜/设置、素材清理说明）。
- 清理本地 mock 图：`assets/media/dishes/` 14 张已删，种子脚本 image 字段清空，三份历史原型改引用 OSS 图，credits 文档删除。

### 2026-11-18 开发完成

- store：`chefPickSettings` / `chefPickDish` / `chefPickOrderItem` / `fillChefPick` / `pendingChefPickItem`；`placeOrder` 支持 `chef_choice`；`setOrderStatus` 进入 cooking 前门禁；`serveOrder` 按订单项下标取图且置顶项不写菜品图集；`orderSummary` 带 `kind/pending/chefPickImage`。
- app.js：菜单虚拟置顶卡、购物车行、订单卡/空间列表/详情的统一项渲染、揭晓遮罩、随机抽奖（礼盒 0.8s + 18 颗碎屑）、`prefers-reduced-motion` 回退。
- admin.html：订单卡/待办/详情文案与遮罩、填菜面板（菜单选一 / 手写 / 可选拍照）、菜单页设置卡（开关 / 固定价 / 卡片图）。
- 动画按人要求缩到约 0.8s 并加大碎屑；「正在抽…」改为「正在选取…」且用 UI 字体（非展示字体）；随机按钮 27px 纯图标。
- 缓存版本 bump 到 `20261118-01`；字体子集已重建。

## 未完成 / 下一步

1. 线上真机复看：抽奖手感、置顶卡缩略图可读性（代码已上线，由人复核）。
2. 如需调整随机按钮样式，只改 `css/style.css` 的 `.menu-random` 三项（底色 / 描边 / 圆角）。

## 阻塞

- 等原型确认。

## 已验证

- 线上 JS/HTML 未改；OSS 只新增一张上传图，未动任何文档。
- 原型在 500 / 820 / 1280 宽度无横向溢出，DOM 结构自检通过。
- 抽奖 demo：打开 → 抽中 → 再抽 → 加购，全流程在无头浏览器跑通；礼盒动画用一个冻结帧核对过。
- 原型里 9 个 OSS 图片 URL 全部 200。

## 关键文件

- `docs/design/chef-choice-wireframe.html`
- `js/store.js`（`placeOrder` 938、`setOrderStatus` 1051、`serveOrder` 1099）
- `js/app.js`（`renderMenu` 2128、订单卡 2070、订单详情 3148）
- `admin.html`（订单卡 2440、`NEXT_STATUS` 1778、出餐弹层 1720）

## 备注

- 用户实付固定 20 币，与所选菜成本无关；差价当作大厨请客。
- 随机只负责「帮用户挑」，加购仍是明确的一下点击。
