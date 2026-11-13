# LJ-20261110-001 · 实现方案（v1 已落地）

## 总体思路

把生理期拆成三层，互不依赖：

| 层 | 文件 | 职责 | 依赖 |
|---|---|---|---|
| 计算层 | `js/cycle.js` | 周期长度、加权中位数、走查回测、日历网格、排卵日。全部纯函数，无 DOM、无存储 | 无 |
| 存储层 | `js/store.js` 新增 `cycle` 段 | `cycle/periods.json` + `cycle/settings.json` 整份读写 | `oss-utils` |
| 界面层 | `js/cycle-ui.js` + `js/cycle-import.js` | 首页细条、空间子页、记录/日历/导入弹层、保存弹窗 | `cycle.js` + `store.js` |

计算层单独成文件，是为了以后能把同一份逻辑搬进 Cloudflare Worker（提醒只用它算「今天该不该推」）。

## 改动清单

| 文件 | 改动 |
|---|---|
| `js/cycle.js` | 新增：日期工具、周期归一化、`cyclePredict`、`cycleBacktest`、`cyclePickAlgorithm`、`cycleMonthCells`、`cycleOvulation` |
| `js/cycle-import.js` | 新增：CSV 解析、SheetJS 懒加载、表头猜列、两种形态（一次一行 / 一天一行）合并 |
| `js/cycle-ui.js` | 新增：首页细条、子页三视图、记录 sheet、日历 sheet、导入 sheet、保存弹窗 |
| `js/store.js` | 新增 `cycle` 段：`loadCycle / saveCycle / writeCycleRecords / addCyclePeriod / updateCyclePeriod / removeCyclePeriod / startCycleToday / endCycleToday / markCycleDay / importCyclePeriods / saveCycleSettings`；`loadAdminData` 附带 cycle |
| `js/app.js` | `openMeView` 允许 `cycle`；`renderMePage` 分发到 `CycleUI.onMeView` |
| `index.html` | 首页细条、空间菜单「生理期」行、四个 sheet、保存弹窗；引入三个新脚本；缓存 token → `20261111-01` |
| `admin.html` | 系统 → 生理期视图（阈值 / 提醒 / 四个开关 / 三个文案 / 只读数据 / 清空）；`switchView` 与 `VIEW_TITLES` 注册 `cycle`；缓存 token 同步 |
| `css/style.css` | 新增 `cycle-*` 样式与日历单元状态 |
| `assets/vendor/xlsx.mini.min.js` | SheetJS 0.20.3 mini，懒加载，仅 .xlsx 用 |

## 数据结构

见 `notes.md` 的「数据模型」：`cycle/periods.json` 顶部带 `prediction` 缓存（含 `asOf` / `range` / `backtest` / `dataVersion`），`cycle/settings.json` 由管理端写。

## 已实现的关键决策

- 预测**只在写成功后重算**（`writeCycleRecords`），读取永远用缓存。
- 过期不重算：`overdueDays > 0` 时只改文案和卡片配色，`range` 原样保留。
- 区间固定 3 天（`center ± 1`），不因波动放宽。
- 排卵日 = 下次预计开始日 − 14 天；排卵期 = 前 5 到后 1 天；青色，与经期粉色区分。
- 首页细条按需出现：`经期中` 或 `距下次 ≤ homeStripThresholdDays`，否则 `hidden`。
- 保存后弹窗：记了什么 / 和区间比 / 学习样本 / 算法 / 下次预测变化 / 撤销 + 知道了。
- 导入按开始日期去重；「预测」列默认忽略。
- 管理端「清空」需输入「清空」并在确认框确认。

## 验证情况（本地 db-test）

- `node --check` 全部 8 个 JS 通过；admin.html / index.html 的内联 script 也通过。
- 计算层用 Node 跑过：15 个周期样本 → 中心 29 天、区间 3 天、置信度高、回测 9/11；样本 < 3 返回 `few-samples`；> 90 天返回 `stale`；异常周期连续出现时置信度降为 low。
- 浏览器实测（localhost，db-test）：首页细条出现/隐藏随阈值变化；记录→弹窗→撤销；记录列表编辑流量/症状并落库；日历点日期合并相邻记录；管理端改设置后用户端立即生效；清空功能可用。
- 宽度 320 / 390 无横向溢出。

## 提醒 Worker（2026-11-12 新增）

`scripts/cycle-reminder-worker/`：

| 文件 | 内容 |
|---|---|
| `worker.js` | 单文件 Worker：读两个文档 → `decide()` 判断该不该推 → 发一条 Bark → 只把 `lastPush` 写回 `settings.json`。`export { decide }` 便于单测 |
| `wrangler.toml` | `crons = ["0 1 * * *"]`（UTC）= 北京时间 09:00 |
| `README.md` | 控制台粘贴版和 wrangler 版两套部署步骤、验证命令、排错表 |

判定逻辑（纯函数，已用 Node 跑 10 条用例）：提醒关闭 / 无可用预测 / 经期进行中 / 当天已推 → 跳过；`untilStart` 命中 `remindDaysBefore` → before 或 start；落在预测区间内 → 静默；过期天数命中 `overdueRemindDays` → overdue。

**Worker 不重算预测、不写 `periods.json`**，这一条在 README 和 CLAUDE.md 都写死了。

## 未做（按 brief 的二期）

照顾清单、厨房联动、一键求助、回顾页。原型里有占位屏，代码里没有入口。

## 未验证 / 待办

- 美柚真实导出文件（列名、形态）未拿到，导入器的猜列是按通用中文表头写的。
- Cloudflare Worker 代码已写（`scripts/cycle-reminder-worker/`），**尚未部署**；等人工按 README 操作。
- 真实 iPhone Safari 未测（只跑了 Chromium）。
