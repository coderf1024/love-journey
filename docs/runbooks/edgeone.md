# EdgeOne 运维手册

## 线上地址

- **主站**：`https://coderf.site`（EdgeOne Makers，Git 集成 `main`，push 自动部署）
- **备用**：`https://coderf1024.github.io/love-journey/`（GitHub Pages，同样跟随 `main`）
- **不要分享** EdgeOne 默认项目域名（`*.edgeone.dev` / `*.edgeone.cool`）。

## 为什么必须用自定义域名

EdgeOne Makers 的**项目域名 / 部署域名**在中国大陆网络有合规限制：

- 必须使用系统生成的预览链接访问，链接有效期 **3 小时**，超时返回 `401`；
- 非中国大陆网络可直接访问；
- 控制台「项目概览」右上角的「预览」按钮可以生成新的临时链接。

因此默认域名只用于测试和临时预览，公开访问一律使用 `coderf.site`。

## 加速区域与备案

- 当前项目：**全球可用区（不含中国大陆）**（以控制台显示为准），绑定自定义域名**不需要 ICP 备案**。
- 如果改成「中国大陆可用区」或「全球可用区（含中国大陆）」，自定义域名需要 ICP 备案。
- 修改加速区域前先确认影响；不要为了“更快”随意切到大陆区。

## Git 自动部署

- 项目从 GitHub `coderf1024/love-journey` 导入，生产分支 `main`。
- push `main` 后 EdgeOne 自动拉取并部署；GitHub Pages 也会同时部署。
- 只有「导入 Git 仓库」类型的项目支持自动部署；「直接上传」项目不能切换成 Git 集成，需要新建项目。
- 构建配置：`Other` / 根目录 `./` / 构建命令留空 / 输出目录 `/`。
- 仓库没有 `package.json`、没有构建步骤；不要为了 EdgeOne 新增构建工具链。

## 自定义域名

- 控制台 → 项目 → **域名管理** → **添加自定义域名**。
- 域名：`coderf.site`，环境选**生产环境**。
- 归属验证：按控制台给出的 TXT/CNAME 值，在 DNS 服务商原样添加。
- CNAME：指向 EdgeOne 控制台给出的目标。
- HTTPS：域名管理 → **HTTPS 配置** → **申请免费证书**或上传证书。
- 如果 DNS 在 Cloudflare，CNAME 必须设为 **DNS only（灰色云朵）**，否则验证和证书会失败。
- 根域名做 CNAME 需要 DNS 服务商支持 CNAME/ALIAS/ANAME；当前 `coderf.site` 已生效。

## 发布后检查

```bash
curl -I https://coderf.site/
curl -I https://coderf.site/admin.html
curl -I https://coderf.site/use.html
curl -I 'https://coderf.site/js/app.js?v=<当前 token>'
```

- 三份 HTML 应与本地 `main` 逐字节一致；
- 菜单、地图、恋爱卡数据能从 OSS 正常加载；
- `space.settings.links` 应为：
  - `https://coderf.site/index.html`
  - `https://coderf.site/admin.html`
- Bark 深链应为 `https://coderf.site/index.html?slot=<slotKey>#order`。

## 排障

| 现象 | 可能原因 | 处理 |
|---|---|---|
| `401 eo_time missing` / `Access Restricted` | 访问的是默认项目域名，且在大陆网络 | 改用 `coderf.site`；或在控制台点「预览」生成 3 小时临时链接 |
| `404` | 输出目录/根目录不对，或 `index.html` 不在根目录 | 构建配置改为根目录 `./`、输出 `/` |
| 证书一直 pending | CNAME 未生效，或 Cloudflare 代理开启 | 检查 DNS；Cloudflare 改为 DNS only |
| 推送后页面没更新 | 部署失败或缓存 | 查看控制台构建部署记录；强制刷新；确认 `?v=` token 已 bump |
| 数据加载失败 | OSS CORS 或凭证问题 | 确认 CORS 允许当前 origin（当前为 `*`）；查看 console |

## 回滚

- 代码问题：`git revert` 后 push `main`，两套部署都会回到上一个提交。
- EdgeOne 控制台「构建部署」可对上一个成功部署点「重新部署」。
- GitHub Pages 跟随 `main`，无需单独操作。

## 相关

- [发布手册](./release.md)
- [ADR-0006：EdgeOne Makers 主站 + GitHub Pages 备用](../decisions/ADR-0006-edgeone-primary-hosting.md)
- [测试库](./test-db.md)
