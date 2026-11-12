# LJ-20261112-001 · 验收记录

本地开发验证完成；Worker 已部署，线上推送和真人手机尚未验收。OSS 数据写入仅发生在测试库，并已恢复；本次另外完成 Cloudflare Worker / Cron / Secret 配置。

## 已执行（2026-11-12）

| 项目 | 方法 | 结果 |
|---|---|---|
| Worker + 浏览器领域层 | `cd workers/morning-greeting && npm test`；Node 自带 runner，全内存 mock | 27/27 通过 |
| 正常发送、sent/resent 跳过、实际补发后延迟 job 不再推送、partial 仅重试失败人 | Mock Bark / OSS | 通过 |
| 天气失败 / 超时降级，一句话超长 / 超时封顶 | Mock | 通过 |
| 失败告警、关闭告警、缺 Secret、OSS 读写失败、无配置 | Mock | 通过；配置不可读时无从获取告警收件人，运行报错 |
| 无消息内容快照、独立测试不写记录、测试环境禁发 | Mock | 通过 |
| OSS V1 签名 | 与 Node 独立 HMAC 对照 | 通过；未做生产签名写入 |
| Wrangler | deploy --dry-run | 通过；后续已正式部署 |
| JS 与内联脚本 | node --check | 全部通过 |
| 管理端 320 / 390 / 1280 | Headless Chrome，真实 DOM 操作，Bark / greeting 文档为内存 mock | 无横向溢出、console 错误、JS 异常 |
| 草稿 / 保存、空收件人校验、测试选择独立、确认取消 | 三个宽度的 DOM 联调 | 通过 |
| 首页 partial 文案、只补失败人、补发立即清待办、北京时间显示 | DOM 联调 | 通过 |
| 跨北京零点 / 08:20 / 08:30 / 读失败 | 浏览器模拟时间 | 通过；08:20 不提前报漏发 |
| 真实配置持久化 | 管理端写入 db-test/space.json，鲜读验证并重载 | 通过；恢复原始文档后逐字段一致 |
| 用户端我们 / 小灶 / 恋爱卡 / 空间 | 三个宽度，实际测试库只读 | 均可切换，无溢出 / console 错误 / JS 异常 |
| 字体 / 缓存 | build-fonts + token 搜索 | 完成，20261112-02 |
| Open-Meteo | 带 Origin 的 curl，--noproxy 3 次 | CORS *、3/3 HTTP 200、约 1 秒；代理假 IP，不能证明大陆无代理稳定 |
| Cloudflare 登录 | 重新 OAuth 授权后 wrangler whoami | 通过；已部署 Worker，secret list 确认两项 secret_text，deployments list 确认最新版本 100% |

测试脚本：Worker / 领域回归已保留在 `workers/morning-greeting/test/greeting.test.js`；临时 Chrome 驱动与遮盖密钥的截图在本机 `/tmp/lj-greet-shot/`。未发真实 Bark、未写生产库、未修改订单 / 钱包 / 恋爱卡。

注意：真实今天无记录时，OSS 返回预期 404，浏览器网络控制台可能显示红字；这是缺对象响应，页面正确按未发送处理。不得因此把读取改为需要更高权限的 bucket 列表操作。

## 用户验收

2026-11-12 用户明确批准合并 main 发布，并要求不打开早安开关；真实手机推送留待用户启用后验收。

发布后检查已通过：主站 390px、备用站 1280px，管理端登录 / 订单 / 每日早安入口和用户端四个 tab 正常，console 无错误；开关 false、收件人 0。三份 HTML 和 store.js 与发布文件逐字节一致，详见 [发布记录](./notes.md)。

打开 [本地管理端](http://localhost:8889/admin.html) 或 [手机局域网管理端](http://172.20.10.12:8889/admin.html)，进入「系统 → 通知 → 每日早安」。

- [ ] 检查开关、长期收件人、测试收件人、待办 / 补发文案与操作符合预期。
- [ ] 真机 iOS Safari 验证布局与输入行为。
- [x] 恢复 Wrangler 授权并验证登录。
- [x] 按用户追加决定复用现有 RAM Key，注入 Cloudflare Secret；保持原权限，不声明仅限 greeting 前缀。
- [ ] 部署后在测试接收人明确选择并确认的前提下验证 Bark 标题、副标题、正文、图标和跳转。
- [ ] 下一次北京 08:14 实际推送并写 sent 记录，08:30 管理端无漏发待办。
- [ ] 手机关闭代理验证天气与一句话接口；天气不可达时仍能发送不含天气的早安。

发布前遵循 [运维手册](../../runbooks/morning-greeting.md) 与现有 main 验收流程。外部心跳方案 3 未接入。
