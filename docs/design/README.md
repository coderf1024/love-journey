# 设计原型

这里保存历史线框和视觉方案，方便回看设计意图。原型不是实现，实际行为以页面代码和 `docs/architecture/` 为准。

| 文件 | 内容 |
|---|---|
| [me-wireframe.html](./me-wireframe.html) | 「空间」页面一级菜单 + 子页面线框（导航已更新为 我们/小灶/恋爱卡/空间） |
| [admin-wireframe.html](./admin-wireframe.html) | 管理端 V4：首页/订单/恋爱卡/系统、出餐拍照、菜品图片集、用户端图集 |
| [coupons-refresh-wireframe.html](./coupons-refresh-wireframe.html) | 恋爱卡刷新按钮位置方案 |
| [wallet-icons.html](./wallet-icons.html) | 钱包流水图标方案（已采用方案 A） |
| [home-map-wireframe.html](./home-map-wireframe.html) | 首页「山河共赏」地图改造：圆点 / 省份点亮 A/B 对比、同省归并、按大区配色、视野自适应、城市卡、境外足迹 |

本地查看：

```bash
python3 -m http.server 8888
# http://localhost:8888/docs/design/admin-wireframe.html
```

注意：

- 原型中的文案、数据、按钮可能落后于当前实现。
- 修改产品行为时，不要只改原型；以 `docs/architecture/flows.md` 和实际代码为准。
- 新增原型也放在本目录，命名 `<feature>-wireframe.html`。
