# 💕 恋爱时光

一个只属于两个人的恋爱空间：记录相爱时间、里程碑、旅行地图，也把周末的小灶做成了可预约的点餐流程。

## 📖 快速导航

- 📚 [工程文档索引](./docs/README.md) - 架构、数据、流程、运维和任务规范
- 🧭 [术语表](./docs/glossary.md) - 我们/空间/管理端/小灶等名称定义
- 🗂️ [任务流程与看板](./docs/work/README.md) - 一需求一 worktree/branch 的协作方式
- 🚢 [发布手册](./docs/runbooks/release.md) - 验收、合并 main、缓存版本和回滚
- 🔐 [OSS 配置说明](./docs/reference/oss-config.md) - 阿里云 OSS 配置详细教程

## ✨ 功能特性

- ⏰ **相爱时间计时器** - 实时显示已经相爱的天数、小时、分钟和秒数
- 🎯 **恋爱里程碑** - 横向翻阅小片段，也可以打开完整时间线
- 🍳 **周末小灶** - 只在周六/周日 12:00、20:00 开饭；用户预约饭点，大厨接单 → 备菜 → 制作 → 出餐，全程可追踪
- 🗓️ **空间页面** - 一级菜单收纳预约中的饭、历史订单、恋爱币流水，以及恋爱卡的获得与使用流水
- 🪙 **恋爱币钱包** - 大厨发币、点餐扣币、取消退款，支持可配置的赊账上限
- 💝 **恋爱券管理** - 发放、使用和管理按摩券，支持二维码核销
- 🗺️ **旅行地图** - 在中国地图上标记一起去过的城市
- 📱 **移动端优先** - 底部标签栏、底部弹层、安全区适配，也可以“添加到主屏幕”
- 🎨 **手帐风视觉** - 奶油纸张、手写标题、印章与票据元素
- ☁️ **OSS 文档存储** - 数据按空间/内容/订单/钱包拆分，不再把所有内容塞进一个 JSON

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/love-journey.git
cd love-journey
```

### 2. 配置 OSS

编辑 `js/oss-config.js` 文件，配置阿里云 OSS 信息。详细说明请查看 [OSS 配置说明](./docs/reference/oss-config.md)。

### 3. 初始化存储（从旧的 config.json 迁移）

数据现在按文档存放在 OSS 的 `love-journey/db/` 下。如果还没有初始化，运行一次迁移脚本（旧的 `config.json` 不会被修改）：

```bash
npm install ali-oss
OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
node scripts/migrate-storage.js
```

迁移会创建空间、内容、菜单、钱包、卡券等文档。菜单会先写入 14 道示例菜（快手菜 / 硬核菜），之后可以在管理端「系统 → 菜单」里增删改。

如果是从上一版升级，运行一次周末预约更新脚本（会写入 serving 配置、更新菜单图片和分类、清理旧的测试订单）：

```bash
npm install ali-oss
OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
node scripts/update-schedule-menu.js
```

### 4. 本地预览

```bash
# 使用 Python
python3 -m http.server 8888

# 或使用 Node.js
npx serve
```

然后在浏览器中访问 `http://localhost:8888`

### 5. 部署到 GitHub Pages

1. 将代码推送到 GitHub
2. 在仓库设置中启用 GitHub Pages
3. 选择 `main` 分支和 `/ (root)` 目录
4. 等待部署完成

## 📂 项目结构

```
love-journey/
├── index.html           # 主页面
├── admin.html           # 管理端（首页 / 订单 / 恋爱卡·恋爱币 / 系统）
├── use.html            # 核销页面（扫描二维码使用）
├── css/                 # 样式文件
│   └── style.css      # 主样式文件
├── js/                  # JavaScript 文件
│   ├── app.js          # 我们/小灶/恋爱卡/空间逻辑
│   ├── store.js        # 恋爱空间领域层（钱包、菜单、订单、卡券）
│   ├── oss-utils.js    # OSS 文档存储 API
│   ├── oss-config.js    # OSS 配置（已加密）
│   └── crypto-utils.js  # 加密/解密工具
├── scripts/
│   ├── auto-gift-massage.js
│   ├── migrate-storage.js # 旧 config.json → 多文档存储
│   ├── update-schedule-menu.js # 周末预约 / 菜单图片 / 旧订单清理
│   ├── menu-seed.js    # 14 道示例菜 + 两个分类
│   ├── serving-seed.js # 周末饭点配置
│   └── build-fonts.sh   # 副本/内容变化后重建字体子集
├── assets/              # 资源文件
│   ├── data/           # 数据文件
│   │   └── china-map.json  # 地图数据
│   ├── fonts/          # 自托管中文显示字体（子集）
│   ├── media/          # 媒体文件
│   │   ├── xiaomeiman.mp3  # 背景音乐（96kbps，默认不加载）
│   │   └── dishes/     # 菜品 mock 照片（后续可替换成真实照片）
│   └── icon*.png|svg    # 主屏幕图标
├── manifest.webmanifest # “添加到主屏幕”配置
├── docs/
│   ├── README.md        # 工程文档索引
│   ├── glossary.md      # 术语表
│   ├── architecture/    # 架构、数据模型、核心流程
│   ├── runbooks/        # 本地开发、发布、OSS、Bark、Action
│   ├── decisions/       # ADR 决策记录
│   ├── work/            # 任务看板、模板、当前/历史任务
│   ├── design/          # 线框和设计原型
│   └── reference/       # Bark API、OSS 配置、Action、照片来源
├── .github/
│   ├── workflows/       # 周更恋爱卡 Action
│   └── pull_request_template.md
├── CHANGELOG.md
├── CLAUDE.md            # AI 工作入口和硬规则
└── .gitignore
```

## 💡 使用提示

- 我们：访问 `index.html`，底部有「我们 / 小灶 / 恋爱卡 / 空间」四个标签
- 小灶：先选一个周末饭点，再点菜；一餐一单，可以同时预约多个不同饭点；开饭前 1 小时关闭预约
- 管理端：访问 `admin.html`（口令在 `js/oss-config.js` 的 `adminPasscode`）；首页看下一餐和待办，订单里接单/备菜/制作/出餐（每道菜必须拍照上传成品图），恋爱卡里发卡，系统里维护菜单图片集、空间资料、Bark 和催一催开关
- 空间：一级菜单先看余额和入口，点进去分别是订单（全部 / 待接单 / 进行中 / 已完成 / 已取消）、恋爱币流水、恋爱卡流水（获得 / 使用）
- 菜品照片放在 `assets/media/dishes/`，也可以在管理端「系统 → 菜单」里上传；每道菜有主图和图片集，出餐拍的照片会自动追加，菜品详情页可以左右滑动查看。菜品时间只有 40 / 60 / 90 / 120 分钟四档，标签只有 下饭 / 香辣 / 酸甜
- 核销页面：访问 `use.html?id=券ID`
- 恋爱卡页筛选栏右侧的刷新按钮可手动同步；返回页面时也会自动刷新
- Bark 推送在管理端「系统 → 通知」里配置：用户/管理员各一把密钥、各端跳转地址、每类消息的发送时机和消息模板都可配，保存在 `space.json`；模板支持变量预览，确认后才发送测试；用户出餐通知会直接跳到对应饭点的小灶页，催一催和这些一起保存，默认关闭
- 所有内容都是静态的，无需后端服务器

## 🧑‍💻 工程化与协作

这个项目按「一个人 + 一个 AI、多需求并行」的方式开发：

- 每个需求有独立任务 ID、worktree、分支和 `docs/work/<task-id>/` 上下文。
- 开始工作先读 `docs/README.md`、`docs/work/BOARD.md` 和当前任务的 `STATUS.md`。
- 切换需求前先更新 `STATUS.md`，写清已完成、未完成和下一步。
- 功能分支人工验收后合并 `main`；`main` 是线上部署分支。
- 项目不新增构建/测试工具链；质量检查以手动验收、现有 `node --check` 和 `QA.md` 为准。
- 详细规则见 [需求工作流](./docs/work/README.md)；变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

## 🔐 安全说明

- OSS 配置文件中的敏感信息已加密处理
- 加密仅用于避免 GitHub 的自动安全扫描
- 不要将加密后的配置分享给他人
- 对于生产环境，建议使用后端代理来处理 OSS 操作

## 📝 许可证

本项目仅供个人使用，请根据需要修改配置文件。

---

💝 用爱记录每一个美好瞬间 💝
