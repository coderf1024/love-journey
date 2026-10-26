# LJ-20261026-004-admin-ui · 笔记

## 决策

- 2026-10-26：确认框危险按钮由 `.accent` 提供底色和白字；`.admin-btn.danger` 只保留红色边框，不再设置文字颜色。

## 发现

- `adminConfirm` 会同时给同一个按钮加 `danger` 和 `accent`，任何给 `danger` 设置颜色的规则都会覆盖 `accent`。

## 发布记录

- 版本 token：不变（仅 admin.html 内联样式/脚本）
- 发布时间：随下一个功能发布
