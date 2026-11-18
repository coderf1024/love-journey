# LJ-20261118-001 · 实现方案

## 总体思路

- 「你做的我都爱吃」是订单里的一项，不是菜单里的一道商品：菜单渲染时在列表首位插入一张虚拟卡，不写入 `menu.dishes`。
- 「随机选一道」是纯前端交互：读 `state.menu.dishes` 里当前分类可见的菜，随机抽一道，滚动 + 高亮，不写入任何数据。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/store.js` | `DEFAULT_CHEF_PICK = { enabled: true, price: 20 }`；`chefPickSettings(space)`；`placeOrder` 接受 `chefPick: true` 并禁止重复；`fillChefPick(orderId, dish)`；`setOrderStatus` 进入 `cooking` 前校验空位已填；`serveOrder` 照片键改按订单项下标，且 `kind === 'chefPick'` 的项**不**写菜品 `images[]`；`orderSummary` 带 `kind` / `pending`；`orderItemsText` 占位文案 |
| `js/app.js` | `renderMenu` 首位插入置顶卡（分类切换时保持第一）；`toggleCart` 支持 `chefPick`；随机按钮 + `pickRandomDish()`；购物车行、订单卡、订单详情、空间订单列表的占位与 `cooking` 后揭晓 |
| `css/style.css` | 置顶卡（整宽、带照片、与菜卡区分）、已选态、随机高亮动画、占位行、已揭晓标记 |
| `admin.html` | 订单卡空位行；`prepping → cooking` 时打开填菜面板（菜单选一 / 手写 + 可选图片）；菜单页顶部设置卡（开关 + 价格）；`NEXT_STATUS` 分支 |
| OSS `uploads/dishes/chef-choice-20261118040007.jpg` | 置顶卡海报底图（已上传，1024×1024，标题字在图里） |
| `space.settings.chefPick.image` | 置顶卡照片可覆盖路径；管理端设置卡上传后写这里 |
| `docs/` | 术语表、data-model、flows、CLAUDE.md、原型索引 |
| 发布 | 三处页面 `?v=` bump、`./scripts/build-fonts.sh` |

## 随机选一道

```js
// 只从当前分类、可见、可点的菜里抽；排除上一道，避免连抽两次同一道
function pickRandomDish() {
    const pool = visibleDishes();            // renderMenu 已经算过同一份
    const candidates = pool.filter(dish => dish.available !== false && dish.id !== lastPickedId);
    if (!candidates.length) return toast('这个分类还没有菜');
    const dish = candidates[Math.floor(Math.random() * candidates.length)];
    lastPickedId = dish.id;
    highlightDish(dish.id);                   // 滚动进视口 + 3 秒高亮 + toast「就它了：红烧肉」
}
```

- 不自动加购：随机只负责缩小范围，加购仍是用户明确的一下点击。
- 不做摇一摇（平台限制见 `notes.md`）。

## 数据结构 / 兼容 / 迁移

```jsonc
// order.items[] 空位（下单时）
{ "kind": "chefPick", "pending": true, "dishId": "", "name": "", "icon": "♡",
  "image": "https://love-config.oss-cn-beijing.aliyuncs.com/love-journey/uploads/dishes/chef-choice-20261118040007.jpg", "price": 20, "prepMinutes": 0, "servedImage": "" }

// 填上之后（同一项原地更新）
{ "kind": "chefPick", "pending": false, "dishId": "dish_braised_pork",
  "name": "红烧肉", "image": "…", "price": 20, "prepMinutes": 90,
  "pickedAt": "2026-11-21 20:01:00", "pickedBy": "admin", "servedImage": "" }

// space.settings
"chefPick": { "enabled": true, "price": 20 }
```

- 无迁移：旧订单没有 `kind`，按普通项渲染。
- `price` 是用户实付价，不跟菜单价结算。
- 手写项没有 `dishId`，出餐照只写订单项 `servedImage`。
- `kind === 'chefPick'` 的项无论菜单选还是手写，出餐照都**不**追加到菜品 `images[]`——这是与普通菜的唯一差别。
- 置顶卡照片：`space.settings.chefPick.image` 优先，缺省用已上传的 OSS 图 `https://love-config.oss-cn-beijing.aliyuncs.com/love-journey/uploads/dishes/chef-choice-20261118040007.jpg`；管理端设置卡可上传更换（复用 `uploadDishImage`）。

## 分步任务

- [x] 1. 置顶卡海报已生成并上传 OSS；设置卡接上传更换（随机功能海报可选，不影响功能）
- [ ] 2. `store.js`：设置、空位写入去重、填菜函数、状态门禁、照片分支
- [ ] 3. `app.js` + CSS：置顶卡、随机按钮、购物车、订单卡/详情/空间列表
- [ ] 4. `admin.html`：填菜面板、菜单页设置卡
- [ ] 5. Bark 文案核对（`cooking` 模板不改）
- [ ] 6. 字体子集、缓存版本、文档

## 手动 QA 重点

- 三个分类下置顶卡都在第一位且有照片；关闭开关后消失。
- 空位单独成单 / 与普通菜同单；重复添加被拦；下单后取消退款。
- 随机按钮：当前分类抽、结果高亮、不自动加购、连抽不重复、空分类提示。
- 开火前用户端所有入口都看不到菜名；备菜阶段点「开始制作」必须弹填菜面板。
- 填完通知正文是真实菜名、时长重算。
- 手写菜出餐：可拍照，`menu.dishes[*].images` 不变。

## 风险与回滚

- 填菜写订单 + 改状态是两次写；若状态写失败，菜已填但未进 `cooking`，重试按 `pending` 判断应幂等。
- 回滚：设置卡关闭开关即隐藏用户端入口；已产生的空位订单按普通订单继续处理。
