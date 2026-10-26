# LJ-20261026-004-admin-ui · 实现方案

| 文件/模块 | 改动 |
|---|---|
| `admin.html` | `.admin-btn.danger` 去掉 `color`；`orderFilter` 默认 `all`；订单页说明改为「默认显示全部」。 |

## 细节

- `adminConfirm({ danger: true })` 同时给按钮加 `danger` 和 `accent`；去掉 `danger` 的 `color` 后，由 `.accent` 的 `color: #fff` 生效。
- 单独使用 `admin-btn danger` 的按钮保留红色边框，文字回落到默认 `--admin-ink`。

## 手动 QA

- 打开取消订单确认框，检查按钮文字可见。
- 订单页默认「全部」，点各筛选项正常。
