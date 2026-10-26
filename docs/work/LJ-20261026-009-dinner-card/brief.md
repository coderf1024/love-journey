# LJ-20261026-009-dinner-card · 首页晚餐卡片调整

- 状态：in-review
- 提出人：人
- 日期：2026-10-26
- 分支：`fix/LJ-20261026-009-dinner-card`

## 背景与目标

首页 `dinner-card` 左侧的 `dinner-emoji` 去掉；背景水印 `.dinner-card::after` 调整到 `right: 70px; top: 3px`。

## 范围

- 要做：
  - 删除 `dinner-emoji` 的 HTML、CSS、JS 引用和赋值。
  - 更新 `.dinner-card::after` 定位。
- 不做：
  - 不改卡片文案、跳转和其他布局。

## 验收标准

1. 晚餐卡片左侧不再显示 emoji 方块。
2. 标题、描述、余额和 CTA 正常渲染。
3. “小灶”水印位于 `right: 70px; top: 3px`。
