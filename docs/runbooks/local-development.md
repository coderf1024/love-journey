# 本地开发

## 启动

必须用 HTTP 服务，不能直接打开 `file://`（页面会请求地图/字体等资源）：

```bash
python3 -m http.server 8888
# 用户端   http://localhost:8888/index.html
# 管理端   http://localhost:8888/admin.html
# 核销页   http://localhost:8888/use.html?id=<couponId>
```

## 基本检查

项目没有 package.json、构建步骤或自动测试工具。最低限度做：

```bash
node --check js/app.js
node --check js/store.js
node --check js/oss-utils.js
node --check js/crypto-utils.js
```

再在浏览器里检查：

- 320 / 390 / 1280 宽度无横向溢出；
- console 无报错；
- 用户端四个 tab（我们 / 小灶 / 恋爱卡 / 空间）和页面标题正确；
- 管理端侧栏/底部 tab、订单筛选、菜单弹窗、出餐弹窗可打开；
- 管理端操作订单后，用户端轮询/刷新能看到新状态；
- 出餐流程必须在移动端实机或模拟器中确认「拍照」直接打开相机。

## 缓存版本

所有本地 JS/CSS/字体/音频 URL 都带 `?v=YYYYMMDD-N`。修改这些文件后必须统一 bump，否则用户会读到旧脚本。

当前 token 同时存在于：

- `index.html` / `admin.html` / `use.html`
- `css/style.css`（字体、纹理）
- `js/app.js` 的 `MUSIC_SRC`
- `CLAUDE.md` 的版本说明
- `docs/design/wallet-icons.html`（原型可选同步）

发布前按 [发布手册](./release.md) 的清单检查。

## 字体

新增文案/菜单/空间内容后，如果包含字体子集没有的汉字，运行：

```bash
./scripts/build-fonts.sh
```

脚本会下载字体源、扫描页面和内容、重建 `assets/fonts/*.woff2`。重建后再 bump 字体 URL 的版本。

## 敏感信息

- 不要打印或提交 OSS AccessKey、Bark device key、管理口令。
- `js/oss-config.js` 是混淆不是加密；不要把新的真实 secret 写进文档或截图。
- 调试 Bark 时只在管理端系统页填写，不要把 key 复制到聊天。

## 数据操作

本地页面连接的是线上 OSS 文档库。任何会写数据的动作（下单、取消、出餐、发卡、发币、删除）都会立即影响线上。

- 读操作优先；
- 测试写入用临时数据并在测试后清理；
- 不确定时先停下来问，不要批量删除或重置。
