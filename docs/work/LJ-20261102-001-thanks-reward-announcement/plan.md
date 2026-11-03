# LJ-20261102-001 · 实现方案

## 总体思路

### 感谢大厨返币

- 复用现有 `thankChef(orderId, note)`，在「感谢第一次落库」的同一次调用里返币。
- **按钮文案保持不变**：用户端仍然显示「谢谢大厨」，不在按钮上提示返币；奖励只通过 toast 和恋爱币流水体现。
- 采用「订单先写感谢 → 再写钱包」的顺序；钱包流水使用确定性 id `thanks_<orderId>`，重复调用时先查钱包里有没有这笔流水，避免部分失败导致重复发币。
- 如果钱包写入失败，回滚订单上的 `thanks` 字段并抛出错误，让用户能重新点；这是「宁可少发，不能重复发」的取舍。
- 返币金额从 `space.settings.thanksReward` 读取，缺省 10；设为 0 时只记录感谢、不返币。

### 新功能公告

- 公告单独放 `content/announcements.json`，不塞进 `space.json`，避免跟 Bark / 空间资料设置产生读改写竞争。
- 公告懒加载：首屏 `loadAppData()` 完成后才读公告，不增加首屏 9 个读请求的等待。
- **状态与内容分离**：公告状态使用 `draft / published / offline`，编辑器只负责内容，不提供状态下拉；新建固定为草稿，发布 / 下线 / 重新发布由列表上的独立动作推进。
- 公告条目只存纯文本字符串，不带图标；用户端统一渲染圆点，避免管理员输入 emoji 后字体 / 平台表现不一致。
- CTA 必须成对配置 `{ label, href }`；站内地址用 `index.html#order` 这类格式，也支持 https 外链。
- 已读状态只存 `localStorage`，key 包含 `dbRoot()`，测试库和线上库互不影响。

## 改动清单

| 文件 / 模块 | 改动 |
|---|---|
| `js/store.js` | `thankChef()` 增加返币与幂等；新增 `ANNOUNCEMENTS_PATH`、`listAnnouncements()`、`createAnnouncement()`、`saveAnnouncementContent()`、`publishAnnouncement()`、`unpublishAnnouncement()`、`deleteAnnouncement()`、`normalizeAnnouncement()`、`normalizeCta()`、`stampToVersion()` |
| `js/app.js` | 感谢按钮文案保持「谢谢大厨」、toast、防重复点击；钱包 `thanks` 图标与标签（备注 = 谢谢大厨 + 哪一餐）；懒加载公告；首次弹窗；空间公告入口与列表；已读 localStorage；CTA 跳转；展示公告 `version` |
| `index.html` | 公告 sheet 结构；空间菜单新增「更新公告」行 |
| `css/style.css` | `thanks` 流水配色、公告 sheet / 列表、未读红点；不新增奖励 chip |
| `admin.html` | 系统页新增「更新公告」入口；公告列表视图（状态动作与编辑分离）；公告编辑弹窗（无状态字段、版本号只读、CTA 文案 + 跳转地址）；订单卡展示「已返 10 币」 |
| `docs/architecture/data-model.md` | 补充 `content/announcements.json`、`order.thanks.reward`、钱包 `thanks` 类型 |
| `docs/architecture/flows.md` | 补充返币流程、公告状态流转和已读流程 |
| `CHANGELOG.md` | 本次变更 |
| 缓存版本 | 三页 + CSS / MUSIC / MAP / OSS SDK 统一 bump 到 `?v=20261103-03` |

## 数据结构 / 兼容 / 迁移

### 订单 `thanks`

```jsonc
"thanks": {
  "note": "谢谢大厨，超级好吃",
  "at": "2026-11-02 20:00:00",
  "reward": 10,
  "rewardTxId": "thanks_20261024-1200-01"
}
```

- 旧订单的 `thanks` 没有 `reward`：不补发，只显示感谢语。
- 取消 / 未出餐订单没有 `thanks`：不返币。

### 钱包流水

```jsonc
{
  "id": "thanks_20261024-1200-01",
  "type": "thanks",
  "amount": 10,
  "balanceAfter": 495,
  "note": "谢谢大厨 10.24 周六 午餐",
  "createdAt": "2026-11-02 20:00:00",
  "by": "user",
  "orderId": "20261024-1200-01"
}
```

- `note` 用订单 slot 的 `dateLabel` + `label` 拼出「谢谢大厨 10.24 周六 午餐」；旧订单没有 slot 时退回「谢谢大厨」。
- `id` 由订单 id 推导，保证同一单只有一条返币流水。
- 钱包写入前先检查 `entries.some(e => e.id === rewardTxId)`；已存在则只补订单 `thanks`，不再加钱。
- 用户端流水标签仍显示「谢谢大厨」，主文案展示具体哪一餐。

### 公告文档

```jsonc
// love-journey/db/content/announcements.json
{
  "items": [
    {
      "id": "an_20261102_thanks",
      "title": "谢谢大厨，能返恋爱币啦",
      "summary": "吃完饭说声谢谢，钱包里会多 10 枚恋爱币。",
      "items": [
        "出餐后点「谢谢大厨」，每单返一次",
        "返币会记在「空间 → 恋爱币」流水里，随时能查"
      ],
      "cta": {
        "label": "去小灶看看",
        "href": "index.html#order"
      },
      "status": "draft",
      "version": null,
      "publishedAt": null,
      "createdAt": "2026-11-02 19:40:00",
      "updatedAt": "2026-11-02 19:40:00"
    }
  ],
  "updatedAt": "2026-11-02 19:40:00"
}
```

- 文档不存在 → 按 `{ items: [] }` 处理，不需要迁移。
- 状态：`draft` / `published` / `offline`。新建固定 `draft`；`publishedAt` 在每次进入 `published` 时写入当前时间。
- 版本号：发布时写入 `version = publishedAt` 去掉 `-` / `:` / 空格后的 14 位数字（`YYYYMMDDHHmmss`，如 `20261103120210`）；草稿为 `null`，列表 / 弹窗显示「未发布」。排序仍按 `publishedAt`。
- 约束：最多 20 条公告；每条最多 6 个条目；标题 ≤ 30 字、简介 ≤ 80 字、条目 ≤ 80 字。
- CTA：`label` 和 `href` 要么都为空，要么都填写。`href` 只允许：
  - 站内：`#home` / `#order` / `#coupons` / `#me`，统一规范成 `index.html#<page>`；
  - 外部：`https://`（首版不开放 `http://`、`javascript:`、`data:`）。
- 条目 `items` 是字符串数组，不存图标字段。

### 公告状态流转

```text
draft ──发布──▶ published ──下线──▶ offline
  ▲                                  │
  └──────────── 不允许 ──────────────┘
                                     │
offline ──重新发布──▶ published
```

- `createAnnouncement()`：永远写入 `draft`，忽略调用方传入的 status。
- `saveAnnouncementContent()`：只改内容，不改状态；已发布公告保存后仍是 `published`。
- `publishAnnouncement(id)`：只允许 `draft` 或 `offline`；写入 `status: published`、`publishedAt: now`、`version: now` 的 14 位数字。
- `unpublishAnnouncement(id)`：只允许 `published`；写入 `status: offline`。
- `deleteAnnouncement(id)`：只允许 `draft` 或 `offline`；已发布必须先下线。
- `listAnnouncements({ includeAll })`：用户端只返回 `published`，按 `publishedAt` 倒序；管理端返回全部。

## 发布顺序

1. **先合并代码**：推送 `main`，bump 缓存 token（如 `20261103-03`），等 EdgeOne / GitHub Pages 部署完成。
2. **线上 smoke**：人确认新功能可用（返币、公告弹窗、空间入口）。
3. **再建公告草稿**：管理端新建公告，填标题 / 条目 / CTA，保存草稿。
4. **最后发布**：确认代码已上线后，在列表点「发布」。

首次上线时，公告 UI 本身也依赖这次代码部署，所以必须先部署代码、再发布公告。以后公告 UI 已在线，草稿可以提前写，但仍然等代码上线后再点发布。

## 分步任务

- [ ] 1. `store.js`：返币逻辑 + 公告读写 / 状态流转 API；用 `node --check` 检查。
- [ ] 2. `app.js`：谢谢按钮 / toast / 钱包流水；公告懒加载、首次弹窗、空间入口与列表；已读 localStorage；CTA 跳转。
- [ ] 3. `index.html` + `css/style.css`：公告 sheet、菜单行、未读红点、`thanks` 流水样式；不新增奖励 chip。
- [ ] 4. `admin.html`：系统入口、公告列表（草稿 / 已发布 / 已下线动作矩阵）、编辑器（无状态字段，CTA 文案 + 跳转地址）、订单卡感谢标记。
- [ ] 5. 本地 320 / 390 / 1280 手动检查；测试库造一条公告和一笔感谢单。
- [ ] 6. 缓存版本 bump、字体重建、文档和 CHANGELOG 更新。

## 管理端动作矩阵

| 当前状态 | 可编辑 | 可发布 | 可下线 | 可删除 | 列表主操作 |
|---|---|---|---|---|---|
| 草稿 `draft` | 是 | 是 | 否 | 是 | 编辑 / 发布 / 删除 |
| 已发布 `published` | 是（保存后仍发布） | 否 | 是 | 否（先下线） | 编辑 / 预览 / 下线 |
| 已下线 `offline` | 是 | 是（重新发布） | 否 | 是 | 编辑 / 重新发布 / 删除 |

编辑器底部按钮：

- 新建：`取消` / `保存草稿`；不存在「保存并发布」。
- 编辑草稿：`取消` / `保存草稿`。
- 编辑已发布：`取消` / `保存修改`；状态不变。
- 编辑已下线：`取消` / `保存修改`；状态不变。
- 版本号不提供输入框：编辑页只读显示「发布后自动生成」；发布后展示 `version`（14 位，精确到秒）。

## 手动 QA 重点

- 按钮文案仍是「谢谢大厨」，点完 toast 显示 `+10`；订单卡没有额外奖励标记。
- 同一单连续点两次「谢谢大厨」：只加一次币。
- 点完刷新 / 重新进入订单：按钮是「已谢谢大厨」，钱包流水仍只有一条。
- 流水文案是「谢谢大厨 10.24 周六 午餐」，不是「返 10 恋爱币」。
- 把 `space.settings.thanksReward` 设为 0：点完不返币，流水不新增。
- 旧订单（有 `thanks` 无 `reward`）：正常显示感谢语，不补币。
- 钱包写入失败（DevTools 断网 / 拦截 PUT）：提示失败，订单感谢被回滚，重试可以成功。
- 新建公告：保存后是草稿；编辑器没有状态字段；列表上才能发布。
- 公告版本号：新建 / 编辑时没有输入框；草稿显示「未发布」；发布后显示发布时间的 14 位数字（如 `20261103120210`）。
- 发布顺序：代码上线 + smoke 后再发布公告；首次上线先部署公告 UI，再发布第一条公告。
- 非法流转：已发布不能直接删除；草稿不能从编辑器直接发布；接口调用也要拒绝。
- 公告 CTA：只填文案或只填地址时保存报错；填 `index.html#order` 能跳到小灶；外部 https 能打开。
- 公告条目无图标，用户端统一圆点。
- 公告首次打开：只弹最新一条；关闭 / 知道啦 / 去看看后都不再自动弹。
- 清掉 localStorage 后重新打开：再弹一次。
- 空间入口：未读红点、列表、进入后红点消失、下线公告不出现。
- 320 / 390 / 1280 无横向溢出；console 无报错。

## 风险与回滚

- **非原子写**：订单和钱包仍是两个文档。确定性流水 id 能挡住「钱包已写、订单失败」的重复发币，但两个并发点击仍可能竞争；用户端按钮加 in-flight 禁用，降低概率。
- **公告状态竞争**：管理端是单管理员；状态动作仍先读后写，两个标签页同时操作可能丢失一次状态推进。首版接受，后续可加 `updatedAt` 校验。
- **已读只在本设备**：换手机、清缓存会再弹一次；这是首版接受的成本，不引入用户账号 / 服务端已读。
- **公告内容安全**：只渲染纯文本字段；CTA 链接白名单校验，禁止 `javascript:`。
- **回滚**：两个功能都是增量数据；回滚代码后旧订单 / 钱包多出的 `thanks` 流水不影响读取，公告文档可保留。若只回滚公告，删除「更新公告」入口即可。
