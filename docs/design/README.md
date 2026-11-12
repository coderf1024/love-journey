# 设计原型

这里保存历史线框和视觉方案，方便回看设计意图。原型不是实现，实际行为以页面代码和 `docs/architecture/` 为准。

| 文件 | 内容 |
|---|---|
| [me-wireframe.html](./me-wireframe.html) | 「空间」页面一级菜单 + 子页面线框（导航已更新为 我们/小灶/恋爱卡/空间） |
| [admin-wireframe.html](./admin-wireframe.html) | 管理端 V4：首页/订单/恋爱卡/系统、出餐拍照、菜品图片集、用户端图集 |
| [milestone-admin-wireframe.html](./milestone-admin-wireframe.html) | 管理端「岁月留痕」配置：系统入口、列表、编辑弹窗、删除确认、桌面端布局；用户端卡片/详情读取封面图，无图或加载失败回退渐变 |
| [coupons-refresh-wireframe.html](./coupons-refresh-wireframe.html) | 恋爱卡刷新按钮位置方案 |
| [wallet-icons.html](./wallet-icons.html) | 钱包流水图标方案（已采用方案 A） |
| [home-map-wireframe.html](./home-map-wireframe.html) | 首页「山河共赏」地图改造：圆点 / 省份点亮 A/B 对比、同省归并、按大区配色、视野自适应、城市卡、境外足迹 |
| [admin-ux-wireframe.html](./admin-ux-wireframe.html) | 管理端体验优化（LJ-20261109-001）v3：首页顶部「用户端」入口、需要你处理口径（已接单仅饭点当天）、系统导航化 + 通知二级页 + 处理角标、输入字号原理与三种做法、回忆编辑保留 4:3 大图 + 日历弹层、订单详情二级页、8 个菜品标签（最多选 2 个）+ 菜单标签筛选 |
| [morning-greeting-wireframe.html](./morning-greeting-wireframe.html) | 每日早安问候（08:14 Bark 推送）：管理端「系统 → 通知」新增早安开关与收件人勾选、Cloudflare Cron → Worker → OSS 数据流、通知锁屏示例；待确认 5 个问题 |
| [thanks-reward-announcement-wireframe.html](./thanks-reward-announcement-wireframe.html) | 谢谢大厨返 10 恋爱币 + 新功能公告：用户端订单卡 / 钱包流水 / 公告弹窗与列表；管理端公告严格状态流转（草稿 → 发布 → 下线 → 重新发布）、发布版本号按时间自动生成（精确到秒）、纯文本条目、CTA 文案 + 跳转地址、代码先上线公告后发布 |

本地查看：

```bash
python3 -m http.server 8888
# http://localhost:8888/docs/design/admin-wireframe.html
```

注意：

- 原型中的文案、数据、按钮可能落后于当前实现。
- 修改产品行为时，不要只改原型；以 `docs/architecture/flows.md` 和实际代码为准。
- 新增原型也放在本目录，命名 `<feature>-wireframe.html`。
