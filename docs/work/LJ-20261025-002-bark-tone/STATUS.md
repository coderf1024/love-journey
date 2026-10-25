# LJ-20261025-002-bark-tone · 状态

- 状态：in-review
- 分支：`feat/LJ-20261025-002-bark-tone`
- worktree：`.claude/worktrees/LJ-20261025-002-bark-tone`
- 最后更新：2026-10-25 22:05
- 当前负责人：人（验收）

## 已完成

- 五条默认模板按收件人拆成两套口吻。
- 新增 `{userLabel}`、`{noteBlock}`、`{reasonBlock}` 派生变量。
- 出餐通知附带第一张 `servedImage` 成品图。
- 管理端变量面板与 `docs/runbooks/bark.md` 同步。
- 缓存 token 升级为 `20261025-01`。
- `node --check js/store.js` 通过；五条模板用样例数据渲染验证（含备注/原因为空）。

## 未完成 / 下一步

1. 线上 `space.settings.bark.templates` 只保存了 `newOrder` 一条旧模板（副标题「管理端」、正文含订单号），发布后需在管理端「系统 → 新单 → 模板 → 恢复默认 → 保存」；`userCancel` / `cooking` / `served` / `nudge` 未保存，会自动使用新默认。
2. 人工在管理端逐个事件打开「模板」，确认预览文案。
3. 真机验证出餐通知是否带成品图。
4. 验收通过后合并 `main` 并按发布手册部署。

## 阻塞

- 无。

## 已验证

- `node --check js/store.js`
- Node + vm 渲染样例：`newOrder` / `userCancel`（有/无备注、有/无原因）/ `nudge` / `cooking` / `served`，换行和空块符合预期。
- `sendBark()` 端到端 payload：出餐请求含 `image`，空原因不出现「原因：」，空备注不出现「备注：」。
- 管理端「发送测试」对出餐事件附带当前菜单第一张图作为样例成品图，可在没有真实订单时验证配图。
- 无头 Chrome 加载 `admin.html`：DOM 正常生成，console 仅有浏览器自身的 password/meta 提示，无 JS 报错。
- `firstServedImage()` 返回第一张 `servedImage`。

## 关键文件

- `js/store.js`
- `admin.html`
- `docs/runbooks/bark.md`
- `CHANGELOG.md`

## 备注

- 默认模板只对 `space.settings.bark.templates` 中未保存过的事件生效。
- 未改通知分组与 `{minutes}` 语义。
