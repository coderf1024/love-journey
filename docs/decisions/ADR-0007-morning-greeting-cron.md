# ADR-0007：早安问候使用 Cloudflare Cron 与 Worker，仅限该 Worker 引入 wrangler

- 状态：已采纳
- 日期：2026-11-12
- 任务：`docs/work/LJ-20261112-001-morning-greeting/brief.md`

## 背景

需要每天北京时间 08:14 自动发送 Bark 早安。ADR-0003 的前提是「页面驱动、无定时任务」，早安要求无人打开页面也能按时发出，因此必须有定时触发。

约束：

- 站点本身仍是无构建、无后端的静态站（CLAUDE.md「No new build/test toolchain」）。
- 配置（是否发、发给谁、补发）必须在管理端维护并持久化到 OSS。
- 不引入第二个定时任务去监督第一个定时任务。

## 决定

- 早安由 Cloudflare Cron（`14 0 * * *` UTC，即北京 08:14）触发 Worker 执行，代码在 `workers/morning-greeting/`。
- 允许使用 wrangler 4.160.1 工具链，**仅限** `workers/morning-greeting/`；站点根目录仍不引入 package.json、打包或测试工具链。Worker 内允许使用 Node 自带 `node:test` 做内存 mock 回归，无额外测试依赖。
- Worker 的 OSS 密钥通过 Cloudflare Secret 注入，不新增明文密钥到仓库。2026-11-12 用户追加决定：复用当前站点的 RAM AccessKey；保持原权限，不改动现有管理端能力。代码只写 `love-journey/db/greeting/`，但共享 Key 的实际权限并未隔离到该目录。
- 失败处理分两层：Worker 发送失败当场用管理员密钥推「早安发送失败」；管理端 08:30 后打开时，若当天无已发送记录，首页待办提醒并提供补发。
- 补发在管理端浏览器里完成，不新增 Worker HTTP 入口。
- 发送记录写入 `love-journey/db/greeting/<YYYY-MM-DD>.json`，只用于判断当天是否已发和排查。
- ADR-0003 的「Bark 客户端发送、模板可配」仍然有效；只有「无 cron」这一条被本 ADR 取代。

## 取舍

- 优点：早安在无人打开页面时也能按时发出；失败当场告警；补发和配置仍在管理端，不增加站点的运行时。
- 代价 / 风险：
  - 多一个 Cloudflare 账号依赖，部署和密钥轮换通过 wrangler，账号授权与当前共享 RAM 密钥需可用。
  - 共享 Key 的权限范围与站点相同，Cloudflare Secret 只保护存储、不收窄 RAM 权限；完整 RAM 策略查询未获授权。将来可换成只允许 `greeting/` PutObject 的专用 Key。
  - Cron 可能有分钟级延迟，08:14 不保证准时。
  - 天气不可用时省略天气，仍发送早安；一句话不可用时记录失败、按开关告警，再由管理端补发。国内无代理可达性尚未证实。
- 不选择的方案：
  - 第二个定时任务监督早安任务：两个任务依赖同一套调度，同一故障可能同时失效，且增加维护面。
  - 第三方心跳服务（如 healthchecks.io）：能覆盖 Cron 完全未触发的情况，但多一个外部账号依赖。暂缓，记为方案 3，需人同意后再做。
  - Worker HTTP 补发入口：需要口令保护和 Worker 运行时的 OSS 调用，不如管理端直接发简单；国内直接调用 Worker 的可达性也未验证。
  - 站内定时扫描或 Actions 定时任务：本项目已有 GitHub Action 做周更发卡，但 Action 不适合每天精确发送推送，本次选择独立 Worker，与现有周更任务保持独立。

## 影响

- 新增通知事件时，先确认是否需要定时触发；若需要，只能通过 `workers/` 下的 Worker 实现，并更新本 ADR。
- 不要把 Bark key 或 OSS 密钥写进仓库、README、commit message 或 Worker 的 `[vars]`。
- 改 Cron 时间只改 `workers/morning-greeting/wrangler.toml` 的 `crons`，并重新 `wrangler deploy`；注意 UTC 换算。
- `greeting/<日期>.json` 是 Worker 与管理端补发共同写入的记录，不要手工修改。
- 运维步骤见 [早安问候运维手册](../runbooks/morning-greeting.md)。
