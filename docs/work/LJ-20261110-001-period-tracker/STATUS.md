# LJ-20261110-001 · 状态

- 状态：in-review（v1 已实现，等人工验收）
- 分支：`work/261110-dym-tracker`
- 最后更新：2026-11-19
- 当前负责人：人（验收）/ 待交接给新的 AI 会话

## 已完成

- **v1 代码已实现**（见 `plan.md` 改动清单）：`js/cycle.js` / `js/cycle-import.js` / `js/cycle-ui.js` 三个新文件，`store.js` 新增 cycle 段，`index.html` 首页细条 + 空间子页，`admin.html` 系统 → 生理期
- 本地 db-test 实测通过：记录 / 结束 / 补记 / 编辑流量症状 / 删除 / 日历点日合并 / 导入 CSV 两种形态 / 管理端改阈值即时生效 / 清空
- 原型 v1 按人的 4 条决定更新完毕（方案 A、提醒模板可配置、区间上限 3 天、不自动结束）
- 原型新增第 05 节「预测什么时候算、算多远」：唯一触发点（数据变更才重算）、两个被否掉的触发点（过期不重算 / Worker 不补算）、过期后改状态不改数字、一次只预测下一个周期、四条不预测的边界
- v4 追加：过期补录提醒固定在第 3 / 5 / 7 / 10 天各一次（只提醒、不重算）；日历新增排卵期色带与排卵日（青色），点开标明「推算值、不可用于避孕或备孕」，可关闭
- v3 修正（人的判断）：预测只在数据变更时重算；过期后卡片褪色显示「已过 N 天」，区间原样保留；Worker 降级为纯只读闹钟，不写 OSS
- 原型升级 v2（人的 4 条新意见）：首页细条改按需出现（≤7 天/经期中）、保存反馈改弹窗、新增日历视图（第 04 节）、新增用户端/管理端分工（第 09 节，含管理端两个线框）
- 全部 8 个待确认问题已闭环（4 条人定 + 4 条按推荐）
- 补充「预测是固定算法还是 AI」的论证：固定算法族 27 组合 + 走查式回测选参数，不上 AI；原型「预测依据」卡露出算法行
- 定时方案已定：Cloudflare Workers Cron
- 原型 v1：`docs/design/period-tracker-wireframe.html`（8 个分组：首页入口 A/B、空间入口与子页、记录动作、美柚导入三步、提醒/到达/失败兜底、边界与二期占位、桌面端、待确认表）
- 美柚缺点调研（App Store / Google Play / 搜索摘要）
- 范围按人的反馈收窄：核心=记录+预测；照顾闭环/厨房/求助/回顾 → 二期；社区不做
- 美柚导出路径调研：「记录 → 分析 → 导出数据」→ Excel（经期/体重/症状）
- 预测算法 v1 设计（加权中位数 + 区间 + 自检回测）
- 定时方案对比（GitHub Action / Cloudflare Workers / iOS 快捷指令 / Vercel / 阿里云 FC / cron-job.org / 自建）

## 未完成 / 下一步

1. **启用前必须先关掉提醒开关**（人 2026-11-18 要求）。生产库目前没有 `cycle/settings.json`，Worker 因此 fail closed、不会推送；但一旦在管理端保存过生理期设置，就会按表单的值写入。启用前先确认「提醒总开关」是关的。
2. 人提供美柚导出文件，确认文件形态（xlsx/csv、一天一行还是一次一行、日期格式）。
3. 人工验收整套生理期功能（本地 db-test 已自测通过）。
4. ~~合并 main~~ 2026-11-13 完成；~~部署 Worker~~ 2026-11-18 完成（`love-cycle-reminder`，版本 `eb1ad017`，cron `0 1 * * *`，两个 Secret；无公开 URL）。

## 交接说明（2026-11-19）

已合并 `origin/main` 的最新进展（六一形象、你做的我都爱吃 + 随机选一道）。
本分支相对 main 的差异只剩生理期相关文件，可以直接交给新会话继续。

**接手前必读**：
1. `docs/work/LJ-20261110-001-period-tracker/brief.md` — 范围与验收标准
2. 同目录 `plan.md` — 实现结构；`notes.md` — 所有决策的理由（尤其「预测不重算」和 3 天窗口）
3. `QA.md` — 已验证 / 待验证清单
4. `docs/runbooks/cycle-reminder.md` — Worker 部署状态与安全默认

**最容易踩的坑**：
- 预测只在写成功后重算（`writeCycleRecords`）；读永远用缓存。不要让「过期」触发重算。
- 区间永远 3 天，不因周期不规律放宽。
- Worker 只写 `settings.lastPush`，不碰 `periods.json`，且没有公网 URL。
- 管理端不加载 `css/style.css`，样式要写在 `admin.html` 的 `<style>` 里。
- 改任何 JS/CSS 都要 bump 三个页面 + `css/style.css` + `js/app.js` + `js/oss-utils.js` 的 `?v=`。

## 阻塞

- 无阻塞。美柚导出文件未到，导入器暂按通用表头猜列。
- ~~提醒 Worker 等待部署~~ 已于 2026-11-18 部署；20 条单测通过。
- 2026-11-18 修正：取消 `workers_dev` 和 `/run` 入口（`fetch()` 一律 404），与早安一致；`RUN_TOKEN` 已从 Cloudflare 删除。
- 2026-11-18 补：管理端「系统 → 生理期 → 发送测试」，与早安同一套思路；只验证文案，不验证定时，不写 `lastPush`。已验证三种文案渲染正确、实际发出带 `[测试]` 前缀、`lastPush` 内存与磁盘均未被改动。
- 2026-11-13：已合并 origin/main，Worker 从 `scripts/` 迁到 `workers/`，目录与工具链对齐 `workers/morning-greeting/`。

## 已验证

- 未动代码，无验证。

## 关键文件

- `docs/work/LJ-20261110-001-period-tracker/brief.md`
- `docs/work/LJ-20261110-001-period-tracker/notes.md`

## 备注

- 2026-11-10 只做调研与方案，未改页面或数据。
- 定时方案已定 Cloudflare Workers Cron；实现时新增 `workers/cycle-reminder/`，不参与站点构建。
