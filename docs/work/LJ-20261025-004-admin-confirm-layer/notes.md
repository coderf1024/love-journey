# LJ-20261025-004-admin-confirm-layer · 笔记

## 决策

- 2026-10-25：确认框统一使用 `z-index: 140`，高于 admin-modal（110）和 image-lightbox（130）。确认框是最高优先级的交互层。

## 发现

- 问题不只影响 Bark 测试：任何在 `.admin-modal` 内部调用 `adminConfirm` 的场景都会被遮挡。
- Escape 原顺序是先判断底层弹窗，导致确认框开着时按 Escape 关闭底下的模板弹窗。

## 遗留风险 / 后续任务

- 用户端 `index.html` 的 sheet/dialog 也有自己的层级体系，本次未改；如果出现同类遮挡，按相同思路处理。

## 发布记录

- 版本 token：不变（仅 admin.html 内联样式/事件）
- 发布时间：随下一个功能发布
- 线上验证：待人工
