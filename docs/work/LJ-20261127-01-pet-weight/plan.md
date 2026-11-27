# LJ-20261127-01 · 实现方案

- 原型：`docs/design/261127-61-weight.html`
- 分支：`work/261127-61-weight`
- 状态：in-review

## 数据结构

`content/pet.json` 新增 `weights[]`，按 `date` 升序保存：

```jsonc
{
  "id": "pw_20261127143012_ab3d",
  "date": "2026-11-27",
  "weight": 8.4,          // 斤，1 位小数
  "createdAt": "2026-11-27 14:30:12",
  "updatedAt": "2026-11-27 14:30:12"
}
```

- 单位固定斤，保留 1 位小数，范围 0.1–60.0。
- 一天一条：同一天再记覆盖原记录；编辑时改到已有日期也合并成一条。
- 缺失 `weights` 视为空数组，旧文档不需要迁移。

## 改动文件

### `js/store.js`

- `emptyPetDoc()` 增加 `weights: []`。
- 新增 `normalizePetWeightValue` / `normalizePetWeights`：校验日期、数值、范围，按日期去重并升序。
- `normalizePetDoc()` 读取并规范化 `weights`。
- 新增 `savePetWeight({ id, date, weight })`：读 fresh → 校验 → 按 id 或日期定位 → 覆盖/追加 → 整份写回。
- 新增 `deletePetWeight(id)`：读 fresh → 删除 → 写回。
- 导出到 `window` 的列表补上两个新函数。

### `index.html`

- 新增 `#pet-weight` 底部 sheet：标题、两个 tab、曲线容器、列表容器。
- 复用现有 `.sheet` / `.sheet-panel` / `data-close` 机制。

### `js/app.js`

- `renderMePet()`：有记录时在资料卡下渲染体重卡（最新体重 + 较上次变化 + 曲线图标）；无记录不渲染。
- 新增体重弹窗渲染：
  - tab：曲线 / 列表；范围：近 1 个月 / 近 3 个月 / 全部（默认近 3 个月）。
  - SVG 曲线：按记录日期过滤、按数值缩放、最后一点加粗标数值；不足 2 条时只显示一个点并给出提示。
  - 列表：按月倒序分组，每条显示相对上一条的增减。
- 颜色语义：上涨绿色（`--leaf`）、下降红色（`--stamp-deep`）、持平灰色。
- `initPetMoments()` 内绑定入口、tab、范围和遮罩关闭。

### `css/style.css`

- 用户端：体重入口卡、弹窗 tabs、摘要、曲线、列表明细、增减颜色、320 适配。
- 管理端样式放在 `admin.html` 内部（项目约定），不写进共享 CSS。

### `admin.html`

- 「系统 → 六一」右列新增「体重」段：摘要（最新值 + 迷你趋势线）、记录列表、`＋ 记一笔`。
- 录入用段内展开表单（不用弹窗）：日期（复用现有日历）+ 体重数字输入 + 保存/取消；点某条记录把日期和体重带回表单，删除需二次确认。
- 无记录时显示空状态；保存后 `loadPet({ fresh: true })` 重绘。
- 新增管理端体重样式与绑定。

## 版本与文档

- 缓存 token 统一 bump 到 `20261127-01`（三个页面、`css/style.css`、`js/app.js` 的 `MUSIC_SRC` / `MAP_SRC` / vendor URL、`CLAUDE.md`）。
- `CHANGELOG.md` 的 `Unreleased` 记录本次功能。
- 新增文案跑 `./scripts/build-fonts.sh`。
- 更新 `STATUS.md`、`BOARD.md`。

## 手动 QA

1. 管理端「系统 → 六一」无记录时显示空状态，用户端资料卡没有体重卡。
2. 记下第一条 → 用户端出现体重卡；点开弹窗默认曲线 tab、近 3 个月。
3. 曲线 / 列表切换；范围切换只按日期过滤；上涨绿色、下降红色、持平灰色。
4. 同日再记覆盖，列表条数不变；改日期到已有日期也合并。
5. 删除记录后两端同步；删除最后一条后用户端入口消失。
6. 320 / 390 / 1280 无横向溢出；iOS 聚焦体重输入不缩放（输入 16px 或数字键盘不触发）；console 无报错。
