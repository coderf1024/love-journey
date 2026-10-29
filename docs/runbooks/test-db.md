# 测试库

## 结论

本地和私有网络默认使用 **`love-journey/db-test`**，线上域名始终使用 **`love-journey/db`**。测试库不是另一个 bucket，而是同一 bucket 下的独立前缀；测试上传走 `love-journey/uploads-test/`。

这样本地下单、发卡、改状态、传图都不会写进线上数据。

## 打开方式

```bash
python3 -m http.server 8888
# 默认：测试库
open http://localhost:8888/index.html

# 需要查看线上数据时（只读浏览也可以）：
open 'http://localhost:8888/index.html?env=prod'
```

判定规则：

- `localhost` / `127.0.0.1` / `::1` / `192.168.*` / `10.*` / `172.16-31.*` → 测试库；
- 其他域名（包括 `coderf.site`、GitHub Pages）→ 生产库，**`?env=test` 也不会切到测试库**；
- 本地 `?env=prod` → 生产库；
- 查询参数会在 tab 切换时保留；
- 本地测试库显示「测试库」角标；本地 `?env=prod` 显示「线上库」角标；线上域名不显示角标。

## 第一次使用：克隆

测试库为空时，页面会显示空数据。先从生产库复制一份（只读源库）：

```bash
npm install ali-oss

# 不带 OSS_* 时使用仓库里的 js/oss-config.js 共享配置
node scripts/clone-test-db.js --dry-run

# 确认输出后正式执行
node scripts/clone-test-db.js --force
```

如果不想用仓库配置，也可以显式传 `OSS_REGION` / `OSS_BUCKET` / `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET`（四个必须同时给）。

脚本行为：

- 只读 `love-journey/db`，只写 `love-journey/db-test`；
- 目标路径必须包含 `test`，且不能等于源；
- 目标非空时必须加 `--force`，`--force` 只清理目标测试库；
- 复制 `space.json` 时把 `settings.bark.enabled` 和 `settings.nudgeEnabled` 置为 `false`；
- 不复制图片；测试环境新上传的图片进 `love-journey/uploads-test/`。

## Bark

测试环境 `sendBark()` 默认直接返回 `false`，不会推送到真实账号。确实要测试推送时：

```text
http://localhost:8888/index.html?env=test&bark=on
```

测试库的 `space.settings.bark.enabled` 也被克隆脚本关闭，两层保护。

## 重置

重跑克隆脚本即可：

```bash
node scripts/clone-test-db.js --force
```

## 注意

- 不要把 `db-test` 写进生产发布配置；线上域名不会选它。
- 不要手动批量删生产库；测试库可以随时重建。
- AccessKey 仍来自环境变量，不写进脚本或文档。
