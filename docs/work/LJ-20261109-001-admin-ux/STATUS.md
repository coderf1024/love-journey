# LJ-20261109-001 · 状态

- 状态：ready（原型完成，等待人确认方案后再改代码）
- 分支：`feat/LJ-20261109-001-admin-ux`
- 最后更新：2026-11-09 14:30
- 当前负责人：人（看原型）

## 已完成

- 读完 `docs/` 与 `admin.html` 现状，确认 7 条需求对应的实现位置。
- 输出原型 `docs/design/admin-ux-wireframe.html`，覆盖 A 信息架构、B 首页、C 订单详情、D 输入字号、E 回忆弹窗、F 标签、G 补充建议。
- 写了 brief / plan / STATUS / notes。

## 未完成 / 下一步

1. 人看原型，确认 brief 的 7 个开放问题。
2. 确认后按 plan 第 2–8 步改 `admin.html`。
3. 缓存版本 bump + 字体子集 + 手动 QA。

## 阻塞

- 等原型确认；未确认前不动代码。

## 已验证

- 原型在 1400 宽和 390 宽下截图检查，无横向溢出（移动端表格内部滚动，桌面框架横向滚动）。

## 关键文件

- `docs/design/admin-ux-wireframe.html`（原型）
- `admin.html`（后续实现主文件）
- `js/store.js`（`DISH_TAG_OPTIONS`）
- `js/app.js`（仅「谢谢大厨 = 完成」需要改）

## 备注

- 当前代码里「需要你处理」只过滤 `pending` / `served` / 超时订单，accepted / prepping / cooking 会漏。
- 现有 `space.settings.links.user` 已存在，用户端入口直接复用，不需要新配置。
