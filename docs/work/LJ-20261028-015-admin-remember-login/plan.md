# LJ-20261028-015 · 实现方案

## 总体思路

保留现有「时间戳 + 最大存活期」的模型，只换存储介质，并把「只在登录时写入」改成「每次成功加载都写入」，实现滑动续期。最小改动，不引入新 UI。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `admin.html` `readAdminSession` | `sessionStorage` → `localStorage`；过期时 `removeItem` 后返回 0 |
| `admin.html` `saveAdminSession` / `clearAdminSession` | `sessionStorage` → `localStorage` |
| `admin.html` `ADMIN_SESSION_MAX_AGE` | `12h` → `7d`（`7 * 24 * 60 * 60 * 1000`） |
| `admin.html` `loadAdmin` | 数据加载成功后调用 `saveAdminSession()`，滑动续期 |
| `admin.html` 启动恢复分支 | 失败时不再 `clearAdminSession()`；在 `#login-error` 提示「登录状态已保留」 |
| `admin.html` `handleLogin` | 口令错误时把 `#login-error` 文案复位为默认文案 |

## 数据结构 / 兼容 / 迁移

- key 不变：`lj-admin-session`，值仍是毫秒时间戳字符串。
- 老的 `sessionStorage` 记录不迁移：关窗口即消失，用户最多重登一次。
- 不涉及 OSS 文档、Index 或钱包数据。

## 分步任务

- [x] 1. 从 `main` 建 `261028_space_fix` 分支和任务文档。
- [x] 2. 改 `admin.html` 登录态读写与续期。
- [x] 3. 恢复失败分支保留登录态并提示。
- [x] 4. `node --check` 内联脚本；用假 `localStorage` 跑过期/续期/退出用例。
- [ ] 5. 人在 8888 和真机验收（见 `QA.md`）。

## 手动 QA 重点

- 关闭浏览器重开仍登录；
- 过期后要求重登；
- 退出登录后要求重登；
- 有效期内打开会续期；
- 手机 Safari 与常用浏览器各验一次。

## 风险与回滚

- 回滚：`git revert` 本分支提交即可，无数据迁移。
- 浏览器清存储（iOS 7 天不动 / 无痕模式）不可控，最差表现是回到「需要重新登录」，不会丢数据。
