# LJ-20261027-012 · 验收记录

## 环境

- 本地服务：`python3 -m http.server 8888`（`http://192.168.0.102:8888`）
- 浏览器/设备：无头 Chrome（390×1800 截图）+ 待人工手机验收
- 宽度：390（手机）、1280（桌面管理端按需）
- 数据：线上 OSS（只读）

## 验收步骤

| # | 步骤 | 预期 | 结果 |
|---|---|---|---|
| 1 | 打开小灶页，看「菜单」里每个菜名 | 全部为同一款加粗宋体，无单字回退到系统宋体 | 自动化通过（截图）；待人工 |
| 2 | 重点看 鲜虾面 / 西红柿炒鸡蛋 / 炸酱面 / 咖喱鸡 / 尖椒肉丝面 | 无混排字形 | 待人工 |
| 3 | 看菜品描述、标签行 | 同上 | 待人工 |
| 4 | 管理端 → 系统 → 通知设置 | 用户密钥、管理员密钥都以明文显示 | 自动通过（均为 `type=text`）；待人工 |
| 5 | 手机上点两个密钥输入框 | 页面不放大（字号 16px） | 自动通过（computed font-size 16px）；待真机 |
| 6 | 打开菜品详情大图弹层 | 菜品名字体一致 | 待人工 |

## 回归检查

- [ ] 用户端四个 tab 正常
- [ ] 管理端登录/tab 正常
- [ ] 订单/钱包/恋爱卡数据未被意外修改（本次只读 OSS）
- [x] console 无报错（无头 Chrome 渲染正常，页面数据已加载）
- [ ] 320/390/1280 无横向溢出（涉及 UI）
- [x] 缓存版本/字体/文档已更新（token `20261027-02`）

## 备注

- 自动化校验脚本：用 fonttools 读两份 woff2 的 cmap，逐字比对线上 `space/story/milestones/goals/cities/menu/coupons/dish-requests` 文档，非 ASCII 缺字仅剩 emoji 与 `∞`。
- CDP（390×844，deviceScaleFactor 2）实测：11 个菜名与描述全部通过 `document.fonts.check('700 16px "Noto Serif SC"')`；`scrollWidth === innerWidth === 390`，无横向溢出；Noto 子集实际传输 555KB。
- 管理端 CDP 实测：`#bark-user-key` 为 `type=text`、字号 16px、宽 240px、显示真实密钥；`#bark-admin-key` 仍为 password。
- 字体体积：Noto 568KB、Ma Shan Zheng 367KB。
