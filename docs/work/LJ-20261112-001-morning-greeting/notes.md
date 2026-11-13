# 发布记录 · 2026-11-12

- 用户明确授权合并 main 发布，并要求早安开关由本人自行开启。
- 功能提交：`433695e0bde8ca28fa49e6a360e43a279a463160`；从当前 work 分支 fast-forward 合并 main，无冲突，已推送 origin/main。
- 缓存版本：`20261112-02`。
- [EdgeOne 主站](https://coderf.site/admin.html) 与 [GitHub Pages 备用站](https://coderf1024.github.io/love-journey/admin.html) 均已上线。三份 HTML 和 js/store.js 与本地发布文件逐字节一致。
- [GitHub Pages 构建](https://github.com/coderf1024/love-journey/actions/runs/43203141802) 成功。
- 线上只读 Chrome smoke：主站 390px、备用站 1280px；管理端登录、订单列表、每日早安设置、用户端四个 tab 均正常，无横向溢出、console 错误或 JS 异常。测试驱动主动阻止非 GET / HEAD 请求，未触发任何写入或推送。
- 发布前后生产 morningGreeting 均未配置；线上开关 false，长期收件人 0。没有保存配置、开启早安或发送真实 Bark。
- Worker 版本：`0fbff0a9-1169-4582-8a50-bac489a11bc2`；两项共享 OSS Secret 已配置，Cron 为 UTC `14 0 * * *`。任务会按时运行，但早安关闭时跳过。
- 本地回归 27/27 通过；三个页面内联脚本与站点 JS、Worker 语法检查通过；字体已重建，三种宽度的完整本地联调记录见 QA.md。

后续由用户在管理端「系统 → 通知 → 每日早安」选择收件人并开启。首次实际推送、iOS 真机表现及国内无代理天气访问仍留待实际使用确认。天气超时降级、告警和并发边界见运维手册。

## 2026-11-13：标题与跳转调整

- 用户要求标题改为「宝宝早呀，在一起的第 N 天！」，只有早安不再跳转网页。标题模板仍在代码里，N 使用 OSS 中的恋爱开始日期计算。
- 功能提交 `0072d7c` 已合入 main 并推送；缓存版本 `20261113-01`。Worker 已部署到 `e3f46320-03ff-4232-8bd9-137469d8c7d2`。
- 定时、测试、补发早安均不再发送 Bark `url`；头像、天气、一句话不变。其他 Bark 通知以及失败告警的跳转地址保留。
- 28 项 mock 回归与 JS 语法检查通过；验证了早安无跳转、其他通知保留跳转。两站三份 HTML 与 store.js 均为 HTTP 200，逐字节匹配本地发布版本。[Pages 部署成功](https://github.com/coderf1024/love-journey/actions/runs/43351302186)。
- 只读确认用户已开启早安，收件人为 user / admin；本轮没有修改 OSS 配置或发送真实推送。
