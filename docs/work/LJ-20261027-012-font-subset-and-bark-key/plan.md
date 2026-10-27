# LJ-20261027-012 · 实现方案

## 总体思路

字体子集是内容相关的静态文件，而菜品名是管理端可随时新增的动态内容。修复分两层：

1. **补当前缺字**：构建脚本把线上 OSS 文档的字符并进字符集，当前菜单一次覆盖。
2. **降低再犯概率**：把常用汉字 + 餐饮词汇放进 `scripts/font-extra-chars.txt`，只并入 Noto Serif SC（展示字体）。

## 改动清单

| 文件/模块 | 改动 |
|---|---|
| `scripts/build-fonts.sh` | 新增线上 db 文档只读拉取；字符集合并 `scripts/font-extra-chars.txt`（仅 Noto） |
| `scripts/font-extra-chars.txt` | 新增：常用字 2500 + 餐饮词汇 |
| `assets/fonts/*.woff2` | 重建 |
| `index.html` / `admin.html` / `use.html` / `css/style.css` / `js/app.js` | 缓存 token → `20261027-02` |
| `admin.html` | `#bark-user-key`、`#bark-admin-key` 由 `type="password"` 改为 `type="text"` |
| `CLAUDE.md` / `CHANGELOG.md` | 记录字体子集来源与 token |

## 数据结构 / 兼容 / 迁移

- 只读 OSS，无写入；拉取失败时脚本继续（与现有 `config.json` 兜底一致）。
- 字体 URL 带 token，旧缓存自然失效。

## 分步任务

- [x] 1. 确认线上菜单缺字
- [x] 2. 生成 `scripts/font-extra-chars.txt`
- [x] 3. 改 `build-fonts.sh` 并重建子集
- [x] 4. 升级缓存 token、改管理端输入框
- [x] 5. 校验：子集覆盖线上菜单全部字符、字体 HTTP/console、`node --check`

## 手动 QA 重点

- 手机打开小灶页，逐个看菜名/描述是否有混排宋体。
- 管理端 → 系统 → 通知设置，两个密钥都可见明文，聚焦不放大。

## 风险与回滚

- 体积增大：回滚 `font-extra-chars.txt` 的并入即可恢复约 200KB。
- 回滚方式：`git revert` 对应提交，重新执行 `./scripts/build-fonts.sh`。
