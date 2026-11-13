# LJ-20261113-001 · 实现方案（当前只到原型）

## 总体思路

一期把六一做成**真实照片抠图的静态形象 + 只读资料页 + 事件时间线**，不引入 3D、互动、提醒或任何计时/打卡逻辑。原型只验证导航、落点、字段和交互密度；**本阶段不写业务代码、不碰 OSS**。实现阶段再把原型里的结构搬到 `index.html` / `js/app.js` / `admin.html` / `js/store.js`。

形状与落点（2026-11-13 定稿）：**我们页只放趴姿**压在计时卡右下沿；**睡姿放空间页**；**不设生日字段**，只记到家日，用户端把到家日当生日展示；**事件照片至少 1 张、可多张**，第一张为主图。

关键约束（来自 CLAUDE.md 与 2026-11-13 确认）：

- 用户端仍是 4 个底栏（我们 / 小灶 / 恋爱卡 / 空间），六一**不是**第五个 tab。
- 「空间」一级菜单新增一组，点开是子页：隐藏底栏、左上返回、`state.meView` 增加 `pet`。
- 管理端「系统」仍是纯导航页，新增一行「六一」；编辑都在 `adminView = 'pet'` 子页，`SUB_VIEWS` / `VIEW_TITLES` / `switchView` 白名单 / `renderChrome` 高亮一起加。
- 选择项一律 `.choice-row` 分段按钮，不新增原生 `<select>`。
- 形象素材只来自用户提供的真实素材；未提供时用虚线占位，不画通用猫图、不推测毛色。

## 改动清单（原型阶段）

| 文件/模块 | 改动 |
|---|---|
| `docs/design/liuyi-pet-wireframe.html` | 新增原型：A 我们页两种落点、B 空间一级菜单、C 六一子页、D 管理端系统导航、E 管理端六一页、F 事件弹窗 + 日期校验态、G 1280 桌面两栏、H 320 子页、验收口径与待确认问题 |
| `docs/design/README.md` | 原型索引新增一行 |
| `docs/work/LJ-20261113-001-liuyi-pet/{plan,STATUS,QA,notes}.md` | 任务文档 |
| `docs/work/BOARD.md` | 任务行状态与下一步 |
| `assets/media/cat/0b7035a5fc9d5df21a03eb052ddeb76e.jpg` | 用户放入的真实抠图（**未提交也不要移动**），原型直接引用 |

## 改动清单（实现阶段，待人批准后展开）

| 文件/模块 | 改动 |
|---|---|
| `js/store.js` | 新增 `pet` 域：读 `content/pet.json`（资料 + 事件数组），或复用 `dbCollection` 做 `commerce` 之外的新集合；照片走 `uploadPetImage()` |
| `js/oss-utils.js` | 新增 `uploadPetImage(file)`，上传到 `uploads/pet/`，客户端压缩沿用 1600px / JPEG 0.82 |
| `index.html` + `js/app.js` | 我们页角落形象（有素材才渲染）、空间一级菜单行、`meView = 'pet'` 子页与时间线渲染 |
| `admin.html` | 系统导航行 + `data-panel="pet"` 子页（资料表单、两张素材、事件列表与弹窗） |
| 全局 | 缓存 token 递增、`scripts/build-fonts.sh` 重建（新文案含生字时） |

## 数据结构（提案，实现前需再确认）

```jsonc
// content/pet.json
{
  "name": "六一",
  "homeDate": "2023-07-01",          // 唯一日期字段；生日即此日
  "tagline": "睡在阳光里的小家伙",
  "poses": {
    "lie":   { "url": "…/uploads/pet/lie.webp",   "updatedAt": "…" },  // 我们页
    "sleep": { "url": "…/uploads/pet/sleep.webp", "updatedAt": "…" }   // 空间页
  },
  "events": [
    {
      "id": "pe_20261102_01",
      "date": "2026-11-02",
      "title": "第一次自己钻进被窝",
      "tag": "第一次",
      "note": "",
      "images": ["…/uploads/pet/ev_….webp"],   // 至少 1 张，[0] 为主图
      "createdAt": "…", "updatedAt": "…"
    }
  ],
  "updatedAt": "…"
}
```

- 一份文档搞定，事件是内嵌数组：事件量级是「几十条」，不需要分集合和索引，一次读就够；和个人资料同一次写入，避免两个文档不同步。
- 与 `milestones.json` 一样整份读写；保存前校验 `homeDate` 必填、事件的 `date` / `title` 必填、`images.length >= 1`。
- 日期继续用 `"YYYY-MM-DD"`（Safari 解析时 `replace(/-/g,'/')`），展示按 `YYYY.MM.DD`。

## 分步任务

- [x] 1. 简报 + 三项口径确认（统一事件 + 自由标签 / 完整日期必填 / 我们页角落 + 空间子页）。
- [x] 2. v2 原型（导航、落点、管理端二级页、事件弹窗、320/1280）。
- [x] 3. 任务文档补齐（plan / STATUS / QA / notes / BOARD / design README）。
- [x] 4. v3 修订：我们页只放趴姿、睡姿移空间页、去掉生日字段、事件多图。
- [x] 5. 趴姿重新抠图（Vision 前景分割 + 白底解混），输出透明底 `liuyi-lie.webp`。
- [ ] 6. 人审阅 v3 原型，回答 QA.md 里的 4 个待确认项。
- [ ] 7. 按 `image-prompts.md` 图生图，产出趴姿与睡姿原图。
- [ ] 8. 确认后写实现方案并开发（另起一段，不在本次范围）。

## 手动 QA 重点

- 导航口径：底栏数量不变；空间子页隐藏底栏、返回回到一级菜单；管理端二级页不新增底栏 tab。
- 两种落点在 320 / 390 / 1280 下不遮住计时卡数字、不横向溢出。
- 真实照片是白底 JPG，原型用 `mix-blend-mode: multiply` 近似抠图；正式实现必须换成透明底素材。
- 事件弹窗的必填校验态是否清晰；自由标签输入 + 快捷词是否符合预期。

## 风险与回滚

- **素材来源**：原图是 RGB 白底 JPG，已用 Vision 重新抠成透明底；后续每张新素材（尤其睡姿）都要走同一流程，不能直接把白底图塞进页面。
- **字体子集**：「六一」「趴姿」「睡姿」「驱蚊」等新文案若进标题字体，需要重建子集，否则回退 Songti SC 出现混排；实现时要跑 `./scripts/build-fonts.sh`。
- **我们页布局**：角落形象会压到计时卡下沿，若计时数字在小屏被遮，改为贴在计时卡右上角外侧或移到页面右下角（sleep 落点）。
- 原型零风险：不读写 OSS、不发 Bark、不写 localStorage，删文件即回滚。
