# 架构总览

## 产品与运行时

- 无后端、无构建步骤；主站部署在 EdgeOne Makers（`https://coderf.site`，GitHub `main` 自动部署），GitHub Pages 作为备用，两套都直接托管仓库根目录。
- 三个入口：
  - `index.html`：用户端（我们 / 小灶 / 恋爱卡 / 空间）
  - `admin.html`：管理端（首页 / 订单 / 恋爱卡 / 系统）
  - `use.html?id=<couponId>`：恋爱卡核销页
- 浏览器直接读取 OSS 上的 JSON 文档库，写入也由浏览器或脚本完成。
- 通知是 Bark 站外推送，没有站内消息中心；周更恋爱卡由 GitHub Action 写入 OSS。

## 代码分层

| 文件 | 职责 |
|---|---|
| `js/oss-config.js` | OSS bucket、路径、混淆后的 AccessKey、管理口令 |
| `js/crypto-utils.js` | AccessKey 的可逆混淆（不是加密） |
| `js/oss-utils.js` | 低层文档 API：`dbGet/dbPut/dbDelete/dbList/dbCollection`，图片上传 |
| `js/store.js` | 领域层：空间、菜单、订单、钱包、恋爱卡、Bark；所有页面共享 |
| `js/app.js` | 用户端 UI 与交互 |
| `admin.html` | 管理端自包含页面：内联样式、管理端 UI 与操作逻辑 |
| `css/style.css` | 用户端设计 token、组件和页面样式 |

管理端不依赖 `css/style.css`（避免类名冲突），只共享 `js/store.js` 和 `js/oss-utils.js`。

## 数据流

```text
页面事件
  → js/store.js 领域函数
    → js/oss-utils.js 文档 API
      → Aliyun OSS (love-journey/db/**.json)
  → 重新渲染 / 通知
```

- `loadAppData()` 并行读取空间、内容、菜单、钱包、订单索引、恋爱卡索引。
- 写操作通常是 read-modify-write；没有锁、没有事务、没有 ETag。
- 订单和钱包是两份文档；`placeOrder`/`cancelOrder` 失败时有回滚逻辑。
- `serveOrder` 先写菜单图片集，再写订单；失败重试按图片 URL 去重。

## 通知

- `js/store.js` 的 `sendBark()` 从 `space.settings.bark` 读取用户/管理员 key 和模板。
- 事件：新单、用户取消、开始制作、出餐、催一催；每个事件可在管理端开关。
- 默认用户端点击地址是 `{userOrderUrl}`，带 `?slot=<slotKey>#order` 深链。
- 没有定时通知任务；只有动作发生时由当前页面直接发送。

## 部署

- `main` 是线上部署分支；功能分支直接在主工作目录开发（不使用 worktree），人工验收后合并。
- 没有 CI 构建；页面上线即静态文件。
- 推送 `main` 会同时触发：
  - **EdgeOne Makers 主站**（`https://coderf.site`）：Git 集成、自定义域名、全球（不含中国大陆）加速区，无需 ICP 备案；
  - **GitHub Pages 备用**（`https://coderf1024.github.io/love-journey/`）。
- EdgeOne 的默认项目/部署域名在中国大陆网络只能使用 3 小时预览链接（过期 401），不作为公开入口；公开访问只使用 `coderf.site`。
- 每次修改 JS/CSS/字体/音频都要 bump 缓存版本，详见 [发布手册](../runbooks/release.md)。
- EdgeOne 绑定、验证和排障见 [EdgeOne 运维手册](../runbooks/edgeone.md)。

## 约束

- 不引入构建步骤和运行时框架；线上保持 vanilla JS。
- 不新增测试工具链（按项目决策），质量靠手动验收 + 现有 `node --check` 等基础检查。
- 不把 Bark key、OSS secret、管理口令打印到聊天或文档。
- 线上 OSS 数据写入必须先只读确认，危险操作需要明确授权。
