# LJ-20261026-002-dish-wish · 状态

- 状态：in-review
- 分支：`feat/LJ-20261026-002-dish-wish`
- 最后更新：2026-10-26 11:30
- 当前负责人：人（验收）

## 已完成

- 用户小灶页「我想吃」入口和提交 sheet。
- 图片支持拍照、相册、直接填 URL。
- `commerce/dish-requests/` 申请集合和审核函数。
- 管理端菜单页待审核区、首页待办、审核/不采纳。
- `dishRequest` Bark 通知和设置项。
- 文档、缓存版本、字体。

## 未完成 / 下一步

1. 真机验收三种图片方式和 Bark。
2. 验收后合并 `feat/love-space-ordering`。

## 阻塞

- 无。

## 已验证

- `node --check`：`js/store.js`、`js/app.js`、`js/oss-utils.js`、admin 内联脚本均通过。
- Node + 内存桩：提交申请、非法图片地址、审核上架、不采纳全部通过；审核写入失败后重试只生成一道菜（`duplicateDishes: 1`）。
- Bark payload：`dishRequest` 标题/副标题/正文正确，带空间头像 `icon` 和申请图片 `image`，发往管理员 key。
- 无头 Chrome：用户端「我想吃」弹窗可打开，菜名/图片地址可提交（用桩验证，未写线上数据）；非法地址不提交。
- 无头 Chrome：管理端审核弹窗预填菜名/图片，显示申请来源，补价格后提交进入审核分支。
- 字体子集已重建，新文案无缺字。

## 关键文件

- `js/store.js`
- `js/oss-utils.js`
- `index.html`
- `js/app.js`
- `admin.html`
- `css/style.css`
