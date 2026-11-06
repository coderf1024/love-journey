# LJ-20261106-001 · 记录

- 2026-11-06：人提出上线后优化——回忆详情照片希望能点开看原图。
- 从已发布的 `origin/main`（`a37b601`）拉分支；`main` 仍被另一个既有 worktree 占用，没有新建 worktree。
- 实现放在用户端：`#photo-viewer` 全屏层 + `openPhotoViewer/closePhotoViewer`，复用详情封面里的 `img` 地址，不新增数据结构。
- 点击判定复用已有 pointer 手势：位移 < 10px 视为点击，≥56px 横向才翻页；因此滑动不会误开查看层。
- 查看层打开时 `initMemorySheet` 的键盘 ← / → 直接 return，避免同时切回忆。
- 关闭路径：✕ / 点背景 / Esc；关闭后 `state.memoryIndex` 和 `#memory-sheet` 不变。
- 图片加载失败时隐藏图片并显示「图片加载失败，检查一下网络」，不出现空白层。
- 缓存 token `20261106-01`。
- 待确认：桌面滚轮缩放未做（目前点按/双击 1x-2x）。
