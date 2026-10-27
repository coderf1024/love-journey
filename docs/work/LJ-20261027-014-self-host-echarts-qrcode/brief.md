# LJ-20261027-014 · 自托管 ECharts / qrcodejs，修复微信内地图打不开

- 状态：in-progress
- 提出人：人
- 日期：2026-10-27
- 分支：`fix/LJ-20261027-014-self-host-echarts-qrcode`

## 背景与目标

新版上线后，微信内置浏览器里「山河共赏」地图打不开。
地图唯一的运行依赖是懒加载的 `https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js`；`cdn.jsdelivr.net` 在国内移动网络 / 微信 X5 中经常不可达，加载失败后 `initMap()` 捕获异常，卡片停在「地图暂时打不开」。恋爱卡二维码同样依赖 jsdelivr 的 `qrcodejs`。

目标：把两个库改为站内自托管，去掉对 jsdelivr 的运行时依赖。

## 范围

- 要做：
  - 新增 `assets/vendor/echarts.min.js`（5.4.3，Apache-2.0）与 `assets/vendor/qrcode.min.js`（1.0.0，MIT）。
  - `js/app.js` 的懒加载地址改为本地相对路径，仍按需加载。
  - 移除 `index.html` 的 `cdn.jsdelivr.net` preconnect。
  - 缓存 token 升到 `20261027-03`，更新 CLAUDE.md / CHANGELOG / 看板。
- 不做（非目标）：
  - 不改地图视觉、交互、城市数据与 ECharts 版本。
  - 不引入构建流程。

## 验收标准

1. 断网 jsdelivr（或直接离线 CDN）时，地图仍能正常渲染，微信内不再出现「地图暂时打不开」。
2. 恋爱卡二维码弹层仍能生成二维码。
3. 首屏不加载 ECharts（仍在地图接近视口时才请求本地文件），`assets/vendor` 资源 HTTP 200。
4. 缓存 token `20261027-03` 全站一致。

## 涉及面

- 页面：`index.html`
- 数据/OSS：无
- 通知/Bark：无
- 管理端：无（`admin.html` 不加载 app.js）
- 兼容/迁移：无

## 风险与开放问题

- [ ] 仓库体积 +1.04 MB（仅在滚动到地图时下载）。
- [ ] 微信可能仍缓存旧 HTML；发布后需在微信里强制刷新一次。
