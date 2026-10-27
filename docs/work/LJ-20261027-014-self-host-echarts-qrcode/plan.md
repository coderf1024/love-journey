# LJ-20261027-014 · 实现方案

## 总体思路

把 `loadScript()` 的目标从 jsdelivr 换成同源 `assets/vendor/*.min.js`；懒加载时机、错误兜底、地图逻辑都不变。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `assets/vendor/echarts.min.js` | 新增，ECharts 5.4.3 官方 dist |
| `assets/vendor/qrcode.min.js` | 新增，qrcodejs 1.0.0 |
| `assets/vendor/README.md` | 记录版本与许可证 |
| `js/app.js` | `CDN` → `LIBS`，指向本地路径并带 token |
| `index.html` | 删除 jsdelivr preconnect |
| 全部页面 / `css/style.css` / `CLAUDE.md` | token `20261027-03` |
| `CHANGELOG.md`、`docs/work/BOARD.md` | 记录 |

## 数据结构 / 兼容 / 迁移

- 无数据结构变化。
- 老缓存页面仍引用旧 app.js；token 升级后拿到新脚本。

## 分步任务

- [ ] 1. 落库两个 vendor 文件与 README
- [ ] 2. 改 app.js 地址、删 preconnect、升 token
- [ ] 3. 本地阻断 jsdelivr 验证地图 / 二维码
- [ ] 4. 提交、合并 main、发布后微信复测

## 手动 QA 重点

- 阻断 jsdelivr 后地图 init 状态为 ready、canvas 有内容。
- 二维码弹层能出图。
- 首屏 Network 不出现 echarts。

## 风险与回滚

- 回滚：还原 `js/app.js` 两个地址并删除 vendor 文件即可。
