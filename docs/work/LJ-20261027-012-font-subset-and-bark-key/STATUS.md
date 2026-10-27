# LJ-20261027-012 · 状态

- 状态：done
- 分支：`fix/LJ-20261027-012-font-subset-and-bark-key`
- 最后更新：2026-10-27
- 当前负责人：人（验收）

## 已完成

- `scripts/build-fonts.sh` 改为只读拉取线上 OSS 文档：`space.json`、`content/{story,milestones,goals,cities}.json`、`commerce/menu.json`、`commerce/coupons/index.json`、`commerce/dish-requests/index.json`，与旧 `config.json`、页面源码、种子脚本一起生成字符集。
- 新增 `scripts/font-extra-chars.txt`（常用字 2500 + 餐饮词汇 321），只并入 Noto Serif SC 子集；Ma Shan Zheng 保持窄子集，缺字回退到 Noto。
- 重建字体：`notoserifsc-bold-subset.woff2` 200KB → 568KB / 2763 字；`mashanzheng-subset.woff2` 355KB → 367KB / 973 字。
- 缓存 token 升到 `20261027-02`（三页 + `css/style.css` + `MUSIC_SRC`，与 013 同批）。
- 管理端 `#bark-user-key`、`#bark-admin-key` 均改为 `type="text"`。
- CLAUDE.md、CHANGELOG 已更新。

## 未完成 / 下一步

1. 2026-10-27 合并 `main` 并发布；线上 smoke 通过后置 `done`。

## 阻塞

- 无。

## 已验证

- 线上 8 份 db 文档 + `config.json` 的全部非 ASCII 字符均已被 Noto 子集覆盖（仅剩 emoji / ∞ 等符号，由系统字体渲染）。
- 无头 Chrome 390×1800 截图：鲜虾面 / 西红柿炒鸡蛋 / 炸酱面 / 咖喱鸡 / 尖椒肉丝面等菜名统一为 Noto Serif SC Bold。
- 字体与样式 HTTP 200（`font/woff2`、`text/css`），新 token 生效。
- `node --check js/app.js` 通过。

## 关键文件

- `scripts/build-fonts.sh`
- `scripts/font-extra-chars.txt`
- `assets/fonts/mashanzheng-subset.woff2`、`assets/fonts/notoserifsc-bold-subset.woff2`
- `admin.html`、`css/style.css`、`index.html`、`use.html`、`js/app.js`
- `CLAUDE.md`、`CHANGELOG.md`

## 备注

- Noto 子集体积 +368KB（首次加载后走缓存）；如需瘦身，删除 `font-extra-chars.txt` 中常用字段落再重建。
- 字体子集仍是静态文件：管理端新增菜品若用到常用字/餐饮词之外的字，仍需补 `font-extra-chars.txt` 并重新构建。
- 当前工作区仍带着 LJ-20261026-011 的未提交改动，两者都动了 `admin.html` / `css/style.css` / token，提交时需分开提交（011 先提交）。

## 发布

- 2026-10-27 合并 `main` 并推送，GitHub Pages 部署；线上 smoke 通过（用户端 4 个 tab、小灶饭点/菜单、管理端登录页、静态资源 200、console 无报错）。
