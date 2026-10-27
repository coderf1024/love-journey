# LJ-20261027-014 · 状态

- 状态：in-progress
- 分支：`fix/LJ-20261027-014-self-host-echarts-qrcode`
- 最后更新：2026-10-27
- 当前负责人：AI

## 已完成

- 下载 ECharts 5.4.3（1.02 MB）与 qrcodejs 1.0.0（20 KB）到 `assets/vendor/`。
- `js/app.js` 懒加载地址改为本地，`index.html` 移除 jsdelivr preconnect。
- 缓存 token 升到 `20261027-03`。

## 未完成 / 下一步

1. 本地阻断 jsdelivr 验证地图与二维码。
2. 合并 main、发布，微信内复测（必要时强刷）。

## 阻塞

- 无。

## 已验证

- 本地 CDP 阻断 `*cdn.jsdelivr.net*`，390×844 视口：`mapStatus: ready`、canvas 2 个、点击「轻触探索地图」可解锁；请求命中本地 `assets/vendor/echarts.min.js?v=20261027-03`。
- 同环境下 `loadScript(LIBS.qrcode)` 成功，`typeof QRCode === "function"`。
- `node --check js/app.js` 通过；token `20261027-03` 全站一致。

## 关键文件

- `js/app.js`、`index.html`
- `assets/vendor/echarts.min.js`、`assets/vendor/qrcode.min.js`

## 备注

- 旧版静态 `<script>` 引入 echarts 时，微信里可能是命中缓存才没暴露 jsdelivr 不可达；新版懒加载会发新请求。
