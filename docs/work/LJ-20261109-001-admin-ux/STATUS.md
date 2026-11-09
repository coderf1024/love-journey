# LJ-20261109-001 · 状态

- 状态：ready（原型 v2 已按确认更新，等待人复核；未复核前不改代码）
- 分支：`feat/LJ-20261109-001-admin-ux`
- 最后更新：2026-11-09 15:10
- 当前负责人：人（看原型 v2）

## 已完成

- 读完 `docs/` 与 `admin.html` 现状，确认 7 条需求对应的实现位置。
- 原型 v1：`docs/design/admin-ux-wireframe.html`。
- 人确认 8 项方案（答谢即完成、已接单当日显示、入口只放顶部、详情二级页、14px + 禁缩放、回忆保留大图、8 个标签、系统角标 + 菜单标签筛选）。
- 原型更新为 v2：以上 8 项全部画进原型；B3/C3/D3/F1 从「待选」改为「已确认」；新增 F4 菜单标签筛选、A2 系统角标。
- brief / plan / STATUS / notes / QA 同步。

## 未完成 / 下一步

1. 人复核 v2 原型。
2. 复核通过后按 plan 第 2–8 步改 `admin.html`。
3. 缓存版本 bump + 字体子集 + 手动 QA + 真机验证禁止缩放。

## 阻塞

- 等 v2 原型复核；未复核前不动代码。

## 已验证

- 原型在 1400 宽和 390 宽下截图检查，无横向溢出（移动端表格内部滚动，桌面框架横向滚动）。

## 关键文件

- `docs/design/admin-ux-wireframe.html`（原型 v2）
- `admin.html`（后续实现主文件）
- `js/store.js`（`DISH_TAG_OPTIONS`）
- `js/app.js`（谢谢大厨 = 完成）

## 备注

- 当前代码里「需要你处理」只过滤 `pending` / `served` / 超时订单，accepted / prepping / cooking 会漏。
- 现有 `space.settings.links.user` 已存在，用户端入口直接复用，不需要新配置。
