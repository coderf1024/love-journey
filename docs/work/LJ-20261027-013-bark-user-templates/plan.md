# LJ-20261027-013 · 实现方案

## 总体思路

只改 `js/store.js` 里的 `BARK_TEMPLATE_DEFAULTS` 三条用户侧模板，保持变量和发送逻辑不变；副标题继续用 `{slot}`，正文压到一行并保留菜名和耗时。管理端预览、恢复默认、线上发送都会自动跟着变；唯一例外是已经保存进 `space.settings.bark.templates` 的覆盖值。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `js/store.js` | `BARK_TEMPLATE_DEFAULTS.accepted / cooking / served` 换文案 |
| `index.html` / `admin.html` / `use.html` / `css/style.css` | 缓存 token `20261027-01` → `20261027-02` |
| `CHANGELOG.md` | Changed 一条 |
| `docs/work/BOARD.md` | 登记 013 |

## 数据结构 / 兼容 / 迁移

- 数据结构不变，仍为 `{ title, subtitle, body, url }`。
- 已保存的 `space.settings.bark.templates[event]` 优先级高于默认值，不会自动更新。

## 分步任务

- [ ] 1. 替换三条模板文案
- [ ] 2. 升级缓存 token
- [ ] 3. `node --check js/store.js`，本地预览模板预览
- [ ] 4. 更新 CHANGELOG / BOARD / STATUS

## 手动 QA 重点

- 管理端 → 系统 → 通知设置，三条用户模板的预览（含示例数据）文案正确。
- 「恢复默认」后标题/副标题/正文为新值。
- 真机收到一条接单或出餐通知，确认行数与深链不变。

## 风险与回滚

- 纯文案改动，回滚只需还原 `js/store.js` 与 token。
