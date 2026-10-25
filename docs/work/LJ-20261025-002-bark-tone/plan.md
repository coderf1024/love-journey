# LJ-20261025-002-bark-tone · 实现方案

## 总体思路

模板默认值按收件人分两组：大厨侧保持系统通知的结构化、可扫读；用户侧改成第一人称的男友口吻。Bark 模板没有条件语法，所以把「备注 / 原因」做成自带换行的块变量，为空时整块消失，避免悬空标签。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/store.js` | 重写 `BARK_TEMPLATE_DEFAULTS`；`barkVariables()` 增加 `userLabel` / `noteBlock` / `reasonBlock` 并让 `sendBark()` 把 variables 传入；新增 `firstServedImage()`，`serveOrder()` 与 `setOrderStatus('served')` 推送配图。 |
| `admin.html` | 模板变量面板新增三个变量。 |
| `index.html` / `admin.html` / `use.html` / `css/style.css` / `js/app.js` | 缓存 token `20261023-25` → `20261025-01`。 |
| `docs/runbooks/bark.md` | 写入两套口吻规则、新变量、出餐配图和默认值优先级说明。 |
| `CHANGELOG.md` | 记录用户可感知变更。 |

## 数据结构 / 兼容 / 迁移

- 不新增文档字段，只新增渲染变量。
- `barkTemplate()` 仍是「默认值 + `space.settings.bark.templates` 覆盖」。已保存的旧模板不会被代码默认值替换。
- `noteBlock` / `reasonBlock` 自带前导换行，模板里直接接在上一行后面；为空时渲染为空字符串。
- 出餐配图取 `items[]` 中第一张非空 `servedImage`；没有图时不传 `image`，推送照常发送。

## 分步任务

- [x] 1. 重写五条默认模板。
- [x] 2. 增加派生变量并调整 `sendBark()` 的变量合并。
- [x] 3. 出餐消息附带成品图。
- [x] 4. 管理端变量面板与文档同步。
- [x] 5. 缓存 token 升级。
- [ ] 6. 人工在管理端确认模板并处理线上已保存值。

## 手动 QA 重点

- 管理端 → 系统 → 每个事件的「模板」弹窗，看样例预览的语气和换行。
- 备注为空 / 有备注、原因为空 / 有原因两种情况。
- 出餐测试推送是否带图。
- 320 / 390 / 1280 宽度下变量面板和预览不溢出。

## 风险与回滚

- 回滚：还原 `BARK_TEMPLATE_DEFAULTS` 与变量即可；不涉及数据结构。
- 线上已保存模板不会自动变化，回滚影响面仅限未保存过的事件。
- Bark 配图拉取失败只影响通知图片，不影响推送与订单流程。
