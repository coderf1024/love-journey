# 参考文档

外部接口、配置步骤和历史素材说明。运行时行为仍以 `docs/architecture/` 和代码为准。

| 文档 | 用途 |
|---|---|
| [Bark API 示例](./bark-api.md) | Bark `POST /push` 的请求格式、参数和示例；含调试设备 key，分享前先脱敏 |
| [OSS 配置](./oss-config.md) | AccessKey 混淆算法、更新 `js/oss-config.js` 的步骤 |
| [GitHub Action 配置](./github-action-setup.md) | 周更恋爱卡 Action 的 Secrets、触发和排查 |
| [菜品照片来源](./dish-photo-credits.md) | 当前 mock 菜品照片的 Wikimedia/Unsplash 来源和替换说明 |

## 注意

- `bark-api.md` 是接口参考，不要把其中的调试 key 复制到代码、聊天或公开文档。
- 新增参考文档放本目录，并在 `docs/README.md` 和本页登记。
