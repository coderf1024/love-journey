# LJ-20261029-003 · 验收记录

## 环境

- 环境：文档审阅 + 线上只读检查
- 浏览器/设备：不涉及 UI
- 数据：线上 OSS（只读）

## 验收步骤

| # | 步骤 | 预期 | 结果 |
|---|---|---|---|
| 1 | 阅读 README 部署段 | 主站 `coderf.site`、备用 GitHub Pages、默认域名限制写清楚 | 待人工确认 |
| 2 | 阅读 `docs/runbooks/release.md` | 合并/部署/回滚/smoke 覆盖两套部署 | 待人工确认 |
| 3 | 阅读 `docs/runbooks/edgeone.md` | 3 小时预览、自定义域名、备案、排障可执行 | 待人工确认 |
| 4 | 检查 ADR-0006 / ADR 索引 / BOARD / CHANGELOG | 编号、链接、状态一致 | 待人工确认 |
| 5 | 检查文档无密钥/口令 | 无敏感信息 | 待人工确认 |
| 6 | 检查 `db-test/space.json` links | user/admin 均为 `coderf.site` | 通过（脚本读回） |

## 回归检查

- [x] 本次无代码/UI 变更，不需要 320/390/1280
- [x] 未改缓存 token / 字体
- [x] 未写 OSS
- [ ] 人工确认文档

## 备注

- 线上只读检查结果见 `STATUS.md`。
