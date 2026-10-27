# LJ-20261027-012 · 菜单字体子集覆盖线上菜品 + 管理端 Bark 用户密钥改为明文

- 状态：in-progress
- 提出人：人
- 日期：2026-10-27
- 分支：`fix/LJ-20261027-012-font-subset-and-bark-key`

## 背景与目标

1. 用户端菜名（`.dish-name`，`--font-display` → Noto Serif SC Bold 子集）部分字显示为系统宋体，同一个菜名里一个字是衬线展示体、另一个字是系统字体，看起来像“字体没加载”。
   原因：字体子集按“页面源码 + `scripts/menu-seed.js` + 旧版 `config.json`”生成，没有包含 OSS 上现成的菜品。线上菜单里由管理端新增的菜（鲜虾面、咖喱鸡、炸酱面……）含有子集外字符（虾、喱、酱、柿、擀、酥……），这些字回退到 `Songti SC`，与相邻字不一致。
2. 管理端「通知设置」里的 Bark 密钥输入框是 `type="password"`，查看/核对密钥时需要反复切换，用户密钥和管理员密钥都改成 `type="text"`。

## 范围

- 要做：
  - `scripts/build-fonts.sh` 生成字符集时读取 OSS 线上文档（`space.json`、`content/*`、`commerce/menu.json`、`commerce/coupons/index.json`、`commerce/dish-requests/index.json`），只读 GET。
  - 新增 `scripts/font-extra-chars.txt`（常用字 + 餐饮词汇），只并入 Noto Serif SC 子集，避免以后管理端新增菜名再次缺字。
  - 重建两份 woff2 子集，升级缓存 token。
  - 管理端 `#bark-user-key`、`#bark-admin-key` 改为 `type="text"`。
- 不做（非目标）：
  - 不改字体设计、不引入外部 CDN（国内访问不可靠）。
  - 不把常用字并入 Ma Shan Zheng（体积会到 1MB+，且缺字会回退到 Noto，视觉可接受）。

## 验收标准

1. 用户端菜单页所有线上菜名、描述、标签的字形都来自子集字体（无混排回退）。
2. 字体文件仍可正常加载（HTTP 200、`font/woff2`），首屏 console 无报错。
3. 管理端系统页两个 Bark 密钥输入框都是明文 `text`，移动端字号仍是 16px（不触发 iOS 缩放）。
4. 缓存 token 已升级，手机刷新后拿到新字体。

## 涉及面

- 页面：`index.html`、`admin.html`、`use.html`（缓存 token）、`css/style.css`（token）
- 数据/OSS：只读拉取 `love-journey/db/**` 与旧 `love-journey/config.json`，不写入
- 通知/Bark：无逻辑改动，仅输入框类型
- 管理端：`#bark-user-key`、`#bark-admin-key`
- 兼容/迁移：无

## 风险与开放问题

- [ ] Noto 子集体积从约 200KB 增至约 550KB（首次加载一次，之后走缓存）；如在意可只保留线上文档字符。
- [ ] 字体子集仍是静态的：管理端新增菜名若用到常用字/餐饮词之外的字，仍需重新执行 `./scripts/build-fonts.sh`。
