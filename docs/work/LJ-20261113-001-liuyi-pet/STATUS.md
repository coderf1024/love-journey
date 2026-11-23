# LJ-20261113-001 · 状态

- 状态：in-review（朋友圈式动态版已实现，等本地验收）
- 分支：`work/261113-cat-sixone`（worktree 沿用）
- 最后更新：2026-11-23 16:10
- 当前负责人：人（验收）

## 已完成

- 2026-11-13 口径确认：统一事件 + 自由标签 / 完整日期必填 / 我们页角落 + 空间子页 /
  我们页只放趴姿、睡姿放空间页 / 到家日即生日 / 事件照片至少 1 张可多张。
- 2026-11-13 原型 `docs/design/liuyi-pet-wireframe.html`（v3）。
- 2026-11-13 形象上线：我们页计时卡趴姿、空间页资料卡睡姿（`20261113-02` / `-03`）。
- 2026-11-21 一期功能实现并发布（缓存 token `20261121-01`）：
  - 存储：`content/pet.json` 单文档（资料 + 两张形象 + 内嵌事件数组），
    `loadPet / savePetProfile / savePetPose / savePetEvent / deletePetEvent / petHomeDays`。
  - 上传：`uploadPetImage()` 写入 `uploads/pet/`，PNG/WebP 保留 alpha，过大才缩到 1200px。
  - 用户端：pet 数据进入 `loadAppData` 首屏读取与 localStorage 快照；
    空间一级菜单新增「六一」行（到家天数 + 事件数 + 趴姿缩略图）；
    `meView = 'pet'` 只读子页：形象、到家日（生日同到家日）、多图事件时间线、页脚睡姿。
  - 管理端：系统导航新增「六一」+ 桌面侧栏一项；`adminView = 'pet'` 二级页
    （资料表单、两张形象预览、事件列表）；事件弹窗复用自绘日历，标签为自由输入 + 6 个快捷词，
    照片至少 1 张、可多图、可删。管理端读取走 `fresh: true`，保存后立即刷新。
  - 字体：`scripts/build-fonts.sh` 增加 `pet.json` 数据源；`--font-cute` 补「六一」。
  - 缓存 token `20261113-03 → 20261121-01`（三页 + CSS + app.js + `OSS_SDK_URL` + CLAUDE.md）。

## 已验证

- `node --check` 通过（store.js / app.js / oss-utils.js）。
- 用户端 320 / 390 / 1280：无横向溢出，console 无报错；六一子页渲染完整。
- 管理端 320 / 1280：无横向溢出，桌面为「资料与素材 ｜ 事件」两栏。
- 端到端（测试库 `db-test`）：管理端新增事件 → 写入 OSS → 列表立即出现；
  删除事件 → 确认框 → 列表回到 3 条。测试数据已删除，`db-test/content/pet.json` 已清理。
- 字体子集覆盖：新文案在 `--font-display` 全部存在；`--font-cute` 已含「六一」。

- 2026-11-23 用户改版：朋友圈式动态 + 高保真原型；管理端保存递归 bug 修复并实测写入成功。
  改版实现尚未开始，等原型确认。
- 2026-11-23 v3：六一页去掉头部、封面顶格；动态全部归属六一；生日与到家日拆成两个字段；
  编辑原地改、9 图上限、不清理、删除确认、头像仅管理端。
- 2026-11-23 v3.1：封面改 1:1；背景图上传后可拖动选择显示位置（百分比坐标），不再居中裁切。

- 2026-11-23 按 v3.1 原型完成实现（本地提交，未推送）：
  - `content/pet.json` 改为 `name / tagline / birthday / homeDate / avatar / cover{url,x,y} / moments[]`；
    旧 `events` 在读取时折叠成动态，不丢数据。
  - 用户端六一页改为整页封面：隐藏头部/返回条/底栏，1:1 封面按百分比还原位置，悬浮返回键，
    头像压封面左下，动态流支持纯图/纯文；右下角发动态、编辑、删除都在页面内完成。
  - 管理端「系统 → 六一」重做：生日与到家日两个日期选择器、背景图上传 + 拖动选位置、
    头像上传、动态列表与补发；管理端读取一律 `fresh`。
  - 缓存 token `20261121-01 → 20261123-01`；CHANGELOG、CLAUDE.md 已更新。
  - 实测（db-test）：用户端发动态（含真实 OSS 上传）、原地编辑（时间不变）、删除（二次确认）；
    管理端保存资料、拖动封面位置、补发动态均成功；320/390/1280 无横向溢出、console 干净。
  - 字体子集未能重建：构建时 GitHub/PyPI 网络失败；新文案主要走系统正文字体，游戏名「六一」已在子集内。

## 未完成 / 下一步

1. 人按 `QA.md` 在 320 / 390 / 1280 验收：六一页封面/动态、发动态/编辑/删除、管理端资料与封面位置。
2. **尚未推送、尚未部署**；确认后再合并 main 发布。
3. 发布前需要：在生产库保存一次六一资料（或写入 `content/pet.json`），否则空间页不显示六一入口。
4. 网络恢复后补跑 `./scripts/build-fonts.sh`（本次未成功）。

## 阻塞

- 无。

## 关键文件

- `js/store.js`（六一域 + `loadAppData` 字段）
- `js/oss-utils.js`（`uploadPetImage` / `compressAlphaImage`）
- `js/app.js`（`renderMePet`、菜单行、`meView = 'pet'`）
- `index.html`（菜单行 + 子页容器）、`css/style.css`（六一子页样式）
- `admin.html`（`data-panel="pet"`、事件弹窗、复用日历、`SUB_VIEWS`）
- `scripts/build-fonts.sh`、`scripts/font-cute-chars.txt`
- `docs/design/liuyi-pet-wireframe.html`

## 备注

- 形象素材是静态文件（`assets/media/cat/liuyi-lie.webp` / `liuyi-sleep.webp`），随代码发布；
  `pet.poses` 里存的是图片地址，用户在管理端看到的预览即来自这里。
- 「到家天数」实时计算（`petHomeDays`），不写库；生日直接展示为「同到家日」。
