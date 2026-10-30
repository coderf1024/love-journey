# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build vanilla-JS site (Chinese-language, personal project). The primary deployment is EdgeOne Makers at `https://coderf.site` (custom domain, Git integration on `main`); GitHub Pages (`https://coderf1024.github.io/love-journey/`) is kept as a fallback. Both deploy the repo root from `main`. There is no package.json, bundler, test suite, or linter — the source files are the artifact.

The product is a **恋爱空间**: one space, exactly two members (a user and a chef/admin). The kitchen only serves weekends, with reservations.

- `index.html` — the scrapbook + kitchen + wallet, mobile-first: fixed header, bottom tab bar (我们 / 小灶 / 恋爱卡 / 空间), love timer, milestones, goals, China map, coupons, weekend slot picker, menu/cart, "我想吃" dish request sheet, order tracking, wallet sheet, and a 空间 first-level menu with in-place sub-pages (orders / wallet / card ledger).
- `admin.html` — passcode-gated 管理端: workbench home, order queue, coupons + coins, system settings (menu, space profile, Bark, 催一催 toggle). Mobile bottom tabs 首页 / 订单 / 恋爱卡 / 系统; desktop sidebar grouped 经营 / 系统.
- `use.html?id=<couponId>` — QR-code redemption page, self-contained.

## Working model (read this before changing anything)

This repo is developed by **one human + one AI**, with several requirements able to run in parallel. The stable process lives in `docs/`; do not rely on chat memory.

### Session start

1. Read [docs/README.md](docs/README.md), [docs/glossary.md](docs/glossary.md), and [docs/work/BOARD.md](docs/work/BOARD.md).
2. Read the active task's `docs/work/<task-id>/brief.md`, `plan.md`, and `STATUS.md`.
3. If there is no task ID for the request, create/agree one before editing; copy `docs/work/_template/`.
4. Report current status, scope, next 1–3 actions, and open questions before code changes.

### One requirement = one branch

- Task IDs: `LJ-YYYYMMDD-NN-short-slug`.
- Branch: `feat/<task-id>`, `fix/<task-id>`, or `chore/<task-id>`, created from the current working branch.
- Work directly in the main checkout on that branch. **Do not create git worktrees.**
- Task docs: `docs/work/<task-id>/`.
- Update `STATUS.md` and `BOARD.md` before switching requirements or ending a session.

### Quality and release

- No new build/test toolchain: no package.json, Playwright, lint, or bundler unless a new ADR explicitly approves it.
- Manual gates: `node --check`, 320/390/1280 browser checks, console clean, and the task's `QA.md`.
- `main` is the deploy branch; functional branches merge only after human acceptance. Pushing `main` triggers both EdgeOne Makers (primary, `https://coderf.site`) and GitHub Pages (fallback). EdgeOne's default project/deployment domain is preview-only in mainland China (3-hour link, 401 after expiry); use the custom domain for public access.
- Follow [docs/runbooks/release.md](docs/runbooks/release.md) for cache-version bump, fonts, merge, and post-deploy smoke.
- Read [docs/runbooks/oss-data.md](docs/runbooks/oss-data.md) before any OSS write. Read-only first; destructive/data-migration actions need explicit human approval.

### Terminology (avoid ambiguity)

- User bottom tabs: **我们 / 小灶 / 恋爱卡 / 空间**; internal routes remain `home` / `order` / `coupons` / `me`.
- **我们** = the home/scrapbook tab; **空间** = the former “我们” profile/menu page.
- **管理端** = `admin.html`; **大厨** is the person/role, not the backend name. Never call the backend “大厨端”.
- “出餐” = status `served`; “完成” = `completed`.
- Dish `image` = main image, `images[]` = ordered gallery, order item `servedImage` = this order’s serving snapshot.

### Docs map

- Architecture / data / flows: [docs/architecture/](docs/architecture/)
- Runbooks: [docs/runbooks/](docs/runbooks/)
- Decisions: [docs/decisions/](docs/decisions/)
- Task workflow/templates: [docs/work/README.md](docs/work/README.md)
- Design prototypes: [docs/design/](docs/design/)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Commands

```bash
# Local preview — must be a real HTTP server, not file:// (app.js fetches assets/data/china-map.simplified.json)
# Localhost/private IP defaults to love-journey/db-test; add ?env=prod to inspect production data.
python3 -m http.server 8888

# Clone the production document store into the local test prefix (source is read-only).
# Without OSS_* it uses the shared js/oss-config.js credentials.
npm install ali-oss
node scripts/clone-test-db.js --dry-run
node scripts/clone-test-db.js --force

# One-off migration: legacy love-journey/config.json → love-journey/db/** documents.
# Reads with the OSS credentials in the environment; never modifies config.json.
# Use --dry-run to preview into /tmp/love-db-preview, --force to overwrite an existing db.
npm install ali-oss
OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
node scripts/migrate-storage.js [--dry-run] [--force]

# Existing DBs from the first kitchen release: add weekend serving, rewrite the
# menu/categories/mock images, remove legacy slot-less test orders, reset wallet.
npm install ali-oss
OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
node scripts/update-schedule-menu.js [--dry-run]

# Rebuild the self-hosted font subsets after changing copy or adding content
# (needs curl + uv; see the script header)
./scripts/build-fonts.sh

# Manually trigger the weekly coupon workflow (needs the OSS_* secrets configured)
gh workflow run auto-gift-massage.yml -f duration=10 -f title=按摩卡

# Run the gift script locally
npm install ali-oss
OSS_REGION=... OSS_BUCKET=... OSS_ACCESS_KEY_ID=... OSS_ACCESS_KEY_SECRET=... \
OSS_DB_ROOT=love-journey/db COUPON_DURATION=5 COUPON_TITLE='每周按摩卡' \
node scripts/auto-gift-massage.js

# Encrypt a new AccessKey for js/oss-config.js — algorithm and snippet in docs/reference/oss-config.md
```

## Storage: OSS as a document database (v2)

There is no backend. The bucket is used as a small JSON document store under `OSS_CONFIG.dbRoot` (default `love-journey/db`). `js/oss-utils.js` is the low-level document API; `js/store.js` is the domain layer that every page uses. Reads go through a plain anonymous `fetch` (the bucket is public-read, `Access-Control-Allow-Origin: *`), which keeps them CORS "simple requests" and avoids the preflight round trip — the bucket answers preflights with `Access-Control-Max-Age: 0`, so signed reads used to cost an extra OPTIONS per document. Do not add custom headers to `dbGet()`. Writes still use the OSS SDK, loaded on demand by `ensureOSS()`.

**Test isolation:** local and private-network hosts (`localhost`, `127.0.0.1`, `192.168.*`, `10.*`, `172.16-31.*`) use `OSS_CONFIG.testDbRoot` (`love-journey/db-test`) and uploads under `love-journey/uploads-test/`. Public hosts always use production, even with `?env=test`; a local `?env=prod` forces production. The test environment shows a 「测试库」 badge and suppresses Bark unless `?bark=on`; a local `?env=prod` shows a 「线上库」 badge. The query string survives tab navigation. `scripts/clone-test-db.js` copies production into `db-test` (read-only source; target must contain `test`) and disables Bark / 催一催 in the cloned `space.json`. See [docs/runbooks/test-db.md](docs/runbooks/test-db.md).

```
love-journey/db/
  space.json                 # name, avatar, members, settings (serving, bark, nudgeEnabled), schemaVersion
  content/
    story.json               # loveStory (startDate, title, names)
    milestones.json          # { items: [...] } — bounded, read whole
    goals.json               # { items: [...] }
    cities.json              # { items: [...] }
  commerce/
    menu.json                # { categories, dishes } — admin-maintained, two categories
    wallet.json              # user wallet: balance, overdraftLimit, embedded entries[]
    counters.json            # { coupon, order } — coupon counter only; order is legacy
    dish-requests/
      index.json             # read model: user "我想吃" submissions (name, image, status)
      <requestId>.json       # pending | approved | rejected; approved links a dishId
    orders/
      index.json             # read model: reservation summaries (slot, status, items, thanks, nudges)
      <orderId>.json         # full order: items, payment, statusHistory, thanks, nudges
    coupons/
      index.json             # read model: full coupon objects (the site reads this)
      <couponId>.json        # source of truth for use.html / redemption
```

`js/oss-utils.js` exposes `dbGet/dbGetOrNull/dbPut/dbDelete/dbList` and `dbCollection(dir, summarize, compare)`. A collection keeps one document per record plus an `index.json` read model; the index is rebuilt from the documents if it is missing. `dbCollection.save/remove` update the document then the index.

`js/store.js` owns the domain:

- `servingSettings(space)` / `upcomingSlots(space, now)` — reads `space.settings.serving`. Default: Sat/Sun 12:00 & 20:00, two weekends ahead, bookings close 60 minutes before the meal. Slots within the cutoff remain in the list with `orderable: false` for tracking.
- `placeOrder({ slotKey, dishIds, note })` — validates the slot is future/orderable, blocks a second order at the same slot (`SLOT_TAKEN`), allows different slots simultaneously, enforces `balance + overdraftLimit`, writes the order document then the wallet (rollback if the wallet write fails). Order id is `${slot.key}-${sequence}`, e.g. `20261024-1200-01`; the sequence counts all orders ever placed for that slot (including cancelled).
- `setOrderStatus(id, status, { by })` — pending → **accepted** → prepping → cooking → served → completed.
- `cancelOrder(id, { by })` — the user may cancel pending/accepted; the chef may cancel any active status; refunds the total into the wallet as a `refund` entry. A cancelled slot is orderable again.
- `nudgeOrder` (5-minute cooldown; rejects unless `space.settings.nudgeEnabled === true`), `thankChef`, `completeOrder`.
- `grantCoins(amount, note)`, `setOverdraftLimit(limit)`.
- `upsertDish` (includes `image`, `ingredients`; normalizes time/tag sets), `deleteDish`, `toggleDish`, `saveMenu`.
- `submitDishRequest({ name, image })`, `listDishRequests`, `approveDishRequest(id, dish)`, `rejectDishRequest(id)` — user "我想吃" submissions live in `commerce/dish-requests/`; approval creates a dish via `upsertDish` with `sourceRequestId` (retry-safe) and marks the request approved. Users never see request status.
- `addCoupon`, `useCoupon`, `deleteCoupon` — weekly gifts still write into `commerce/coupons/`; deletion is a real delete via the `deleteMulti` workaround described in the Admin section.

The wallet is the user's only; the admin never spends. The embedded `entries[]` is the ledger. `balance` is denormalized; it is always written together with the entry that changed it.

### Serving settings

```jsonc
"serving": {
  "slots": [
    { "id": "sat-lunch", "day": 6, "time": "12:00", "label": "午餐", "emoji": "☀️" },
    { "id": "sat-dinner", "day": 6, "time": "20:00", "label": "晚餐", "emoji": "🌙" },
    { "id": "sun-lunch", "day": 0, "time": "12:00", "label": "午餐", "emoji": "☀️" },
    { "id": "sun-dinner", "day": 0, "time": "20:00", "label": "晚餐", "emoji": "🌙" }
  ],
  "weeksAhead": 2,
  "cutoffMinutes": 60,
  "timezone": "Asia/Shanghai"
}
```

There is no admin UI for serving times yet; edit `space.json` (or the seed) if the schedule changes.

### Order shape

```jsonc
{
  "id": "20261024-1200-01",
  "slotKey": "20261024-1200",
  "scheduledFor": "2026-10-24 12:00",
  "slot": {
    "id": "sat-lunch", "key": "20261024-1200", "date": "2026-10-24", "time": "12:00",
    "label": "午餐", "emoji": "☀️", "weekday": "周六",
    "dateLabel": "10.24 周六", "scheduledFor": "2026-10-24 12:00"
  },
  "status": "pending", // pending | accepted | prepping | cooking | served | completed | cancelled
  "items": [{ "dishId": "...", "name": "番茄炒蛋", "icon": "🍅", "price": 20, "prepMinutes": 40 }],
  "total": 35, "etaMinutes": 20, "note": "少辣",
  "placedAt": "YYYY-MM-DD HH:mm:ss", "updatedAt": "…",
  "statusHistory": [{ "status": "pending", "at": "…", "by": "user" }],
  "payment": { "amount": 35, "balanceAfter": 485, "transactionId": "tx_…", "refundedAt": null, "refundId": null },
  "thanks": null, "nudges": [], "cancelled": null
}
```

The order index stores summaries (including `slot`, status, items, total, thanks, last nudge) so the user's cards and the chef's queue render without fetching every order document.

## Front-end shell (index.html + app.js)

`js/app.js` is a classic top-level script. It boots on `DOMContentLoaded`: binds chrome, paints the timer from the local fallback (`#days[data-start]`, also set by a tiny inline script in `index.html`), renders the last successful snapshot from `localStorage` if present, then runs `loadAppData()` → `refreshSelectedOrder()` → `renderDashboard()` to revalidate in the background. Inactive tabs render on first visit (`switchPage`); the 全部回忆 sheet renders when it opens.

- Hash routing `#home` / `#order` / `#coupons` / `#me` with `history.pushState`; top nav at `≥820px`, bottom tab bar below.
- Order page: slot picker with the next 8 meal slots (2 weekends), a selected-slot summary, tracking card or menu, a fixed cart bar, checkout sheet, dish detail sheet with a large photo/emoji fallback, and a wallet sheet. One order per slot; different slots can coexist. Booked slots show the tracking card instead of the menu; past-cutoff slots show “已截止预约”. Past active orders are appended as extra non-orderable slots so they can still be tracked.
- The user can cancel pending/accepted orders; after the chef starts prepping only the chef can cancel. All confirmations (cancel, switching slots with a cart) use the custom dialog component, not `alert/confirm`.
- The 恋爱卡 refresh action lives in the coupon toolbar (right of the 全部/未使用/已使用 tabs), not the global header; the header keeps only the music button. On narrow screens the refresh button is icon-only.
- 空间 page is a first-level menu (profile, wallet balance, order counts, card counts) whose rows open in-place sub-views instead of one long scroll: order list, wallet ledger, card ledger. Sub-views hide the bottom tab bar and use a sticky back header; `state.meView` (`menu` / `orders` / `wallet` / `cards` / `order-detail`) drives the swap.
- Order sub-view: five filters (全部 / 待接单 / 进行中 / 已完成 / 已取消), newest-first grouping with active orders first. Each row shows dish photos, dish name + `×1` + price, and a footer action. Active reservations jump back to the order page with that slot selected; completed/cancelled rows open the order detail sub-view (same `orderDetailHTML` as the legacy sheet).
- Wallet sub-view: balance, overdraft limit, and the full ledger (up to 200 rows). Card sub-view: a ledger built from every coupon's `acquiredDate` and `usedDate`, with 全部 / 获得 / 使用 tabs and a link to the 恋爱卡 tab.
- Polling: `refreshOrderData()` every 20s when an order is prepping/cooking/served or a pending/accepted order is within 12 hours; a full `refreshData()` (9 reads) runs when data is older than 30s on page switch/visibility. `loadAppData()` stores the last complete read in `localStorage` (key includes `dbRoot()`), which is what makes repeat visits paint before the network. A partial read never overwrites that snapshot: failed fields keep the cached value and the page shows a short toast, so a transient blip cannot blank the page or show 0 coins.
- 山河共赏 map: city records are grouped by province (`PROVINCE_OF` / `REGION_OF` in `js/app.js`); a province lights once if any city in it was visited, colored by one of 7 regions (华北 / 东北 / 华东 / 华南 / 华中 / 西南 / 西北) with same-region shades by visit time. Unvisited cities are not rendered at all. City dots and labels stay city-level; the tooltip lists the cities in a lit province. Overseas visits are excluded from the China map and shown as a corner passport stamp (latest overseas city); clicking it highlights the matching cell in the two-row horizontal city pager below (3 columns/page on phones, 4 on desktop, 2 under 360px; pages snap, with a 「最近在前 · 左右滑动」 hint). The pager includes overseas with a ✈ mark; clicking the stamp scrolls its cell into view. The badge shows the total city count only (no domestic/overseas split); the map legend and region-color legend are intentionally omitted. The map guard is a compact bottom-left 「探索地图」 pill with a compass icon and no sub-line; the 「锁定地图」 button shares the same bottom-left slot; the initial map shows the whole China map at zoom 1.3 / center [104,36] with a small margin (no visited-city bounding box); clicking a city cell zooms to 6x and re-anchors its tooltip after the geo transform finishes (`hideTip` → wait for `finished`/280ms → `showTip`). The focused city's tooltip is placed 22px below its point so it never covers the top-positioned city label; other cities may be covered. The map canvas is `min(46vh, 380px)` (min-height 260px) to keep the section compact. City cells are buttons laid out as name left / YY.MM right on one line: clicking a domestic cell centers and zooms the map and shows its tooltip, clicking an overseas cell pulses the stamp.
- ECharts and qrcodejs are **self-hosted in `assets/vendor/` and lazy-loaded on demand** (map within 200px of the viewport / QR sheet open); no jsdelivr dependency, which is unreliable inside WeChat. The map fetch uses the simplified GeoJSON and only starts after the app data has loaded, so it never competes with the first data reads. The map defaults to `roam: false` behind a tap-to-explore guard so page scrolling is never trapped.
- The OSS write SDK is lazy-loaded, and `warmOssSdk()` starts it in the background (idle callback) when 小灶 opens, after admin login and after a coupon renders — never on 首页. The first write therefore normally finds it ready; the confirm buttons still show 下单中… / 核销中… if it is not.
- Sheets lock body scroll with a fixed-body technique and restore the scroll position; Escape/backdrop/tap closes the topmost sheet.

## Admin (admin.html)

The passcode gate opens a 管理端 shell: mobile bottom tabs 首页 / 订单 / 恋爱卡 / 系统; desktop a left sidebar grouped into 经营 (首页 / 订单 / 恋爱卡 / 恋爱币) and 系统 (菜单 / 空间资料). All views are in one page and toggled client-side.

- **首页** — next-meal context, a single “需要你处理” list (pending orders, served orders awaiting confirmation, overdue active orders), this-week stats, and quick actions for 发恋爱币 / 发恋爱卡. Do not add a second accept/cancel entry point on this page; order actions live in the queue.
- **订单** — status filters (待接单 / 进行中 / 已完成 / 已取消 / 全部), default 待接单; grouped by meal slot; each card has dish photos, note, total, status transition (接单 → 开始备菜 → 开始制作 → 出餐 → 完成) and cancel/refund. **出餐 is a two-step action**: it opens a serving modal that requires one photo per dish (`capture="environment"` opens the iOS camera; an album fallback is kept), uploads/compresses the photos, appends them to each dish's `images[]`, writes each order item's `servedImage` as the order snapshot, then marks the order served. User order cards/detail/history show dish images and a separate large “本次出餐” section for served photos; the dish detail carousel shows the accumulated `images[]`. The page polls orders/wallet every 15s while logged in.
- **恋爱卡 / 恋爱币** — the same view with a segmented control on mobile; desktop shows both columns. Coupons: stats, filters, manual issue and delete. Coins: balance, grant, overdraft limit, ledger. Weekly issuance still comes from the Action.
- **系统** — menu CRUD (modal editor + image-set manager including the 菜品申请 review queue), space profile (name + avatar), Bark settings (separate user/admin keys, test buttons), the `催一催` switch (default off, saved with the notification settings), and logout. The passcode is remembered in `sessionStorage` for 12 hours, so a refresh keeps the admin session but closing the tab does not. After login the page warms the OSS write SDK in the background (`warmOssSdk`) so the first save does not wait for it. Menu photos go through `uploadDishImage(file)`; user "我想吃" photos through `uploadDishRequestImage(file)`; space avatars through `uploadSpaceImage(file)` in `js/oss-utils.js` (client-side compression, max 1600px, JPEG 0.82) and land in `love-journey/uploads/dishes/`, `love-journey/uploads/requests/` or `love-journey/uploads/space/`. The add/edit dish form is a modal on both mobile and desktop; thumbnails and the square preview open a full-image lightbox.
- **Menu fields** — 菜名 / 图片（`image` 主图 + `images[]` 图片集） / 分类 (快手菜 / 硬核菜) / 价格 / 标签 (only 下饭 / 香辣 / 酸甜, optional multi-select) / 描述 / 预计时间 (only 40 / 60 / 90 / 120) / 食材清单 (admin-only, optional) / 上架. `images[]` is ordered: index 0 is the main image; the dish editor can delete, reorder, or promote any image to main. The photo preview is 1:1 to match the user dish card. `icon` and `todaySpecial` are legacy fields; the admin no longer edits either, and the user UI no longer renders 今日推荐. `upsertDish` normalizes time to the nearest bucket, filters tags to the three allowed values, and preserves `icon` on edit. The user cart also renders the real dish photo. Unavailable (下架) dishes are hidden from the user menu entirely; the admin menu still lists them so they can be re-enabled.
- **Bark** — settings live in `space.settings.bark` as `{ enabled, userKey, adminKey, events, templates, server }` plus `space.settings.links` (`{ user, admin }`), all edited in 系统, with a test button per key. The user key receives 接单 / 开始制作 / 出餐; the admin key receives 新单 / 菜品申请 / 用户取消 / 催一催. Each trigger has an `events` flag (default true) and an editable template with `title` / `subtitle` / `body` / `url`; defaults live in `BARK_TEMPLATE_DEFAULTS` in `js/store.js`. Defaults use two voices: admin events (`newOrder` / `dishRequest` / `userCancel` / `nudge`) are system notifications (event title, who/what/how much, no emoji, no order id); user events (`accepted` / `cooking` / `served`) are written as the chef speaking to the user (first person 我, no amounts or status enums). `noteBlock` / `reasonBlock` carry their own leading newline so empty notes/reasons disappear entirely. The served push attaches the first `servedImage` as Bark's `image`; every push uses `space.avatar` as Bark's `icon` (omitted when unset or SVG). Templates use `{variable}` substitution (`orderId`, `slot`, `slotKey`, `items`, `total`, `note`, `status`, `refund`, `reason`, `minutes`, `userUrl`, `userOrderUrl`, `adminUrl`, …); the default user-side click URL is `{userOrderUrl}`, which resolves to the 小灶 order page with `?slot=<slotKey>#order`. the editor modal shows a sample-data preview and only sends a test after a confirmation dialog. `sendBark()` in `js/store.js` uses the documented `POST /push` JSON payload (`device_key`, `group`, `isArchive`, `title`, `subtitle`, `body`, `url`, `icon`, `image`); the click URL comes from the rendered template URL, with `settings.links`/current-origin fallback. There is deliberately no in-app notification center and no cron; pushes happen only when the acting page is open. `催一催` is `space.settings.nudgeEnabled`, default false and saved with the notification settings; when false the user UI hides the button and `nudgeOrder()` rejects.
- **Coupon delete is a hard delete** — the bucket's browser CORS rule allows `GET/POST/PUT` but not `DELETE`, so `dbDelete()` uses `ossClient.deleteMulti([key])` (OSS `POST ?delete`) instead of `ossClient.delete()`. This keeps hard deletes working from the browser; do not switch `dbDelete()` back to `delete()` without adding DELETE to the bucket CORS.

## Assets

- `assets/fonts/*.woff2` — subsets of Ma Shan Zheng + Noto Serif SC Bold generated from the current copy and the live OSS documents, scoped to the characters each face actually renders: `--font-cute` gets the short decorative strings (`scripts/font-cute-chars.txt` + space/story/coupon/member names), `--font-display` gets title-like content (milestone/goal/city/dish/coupon titles), UI copy, digits and punctuation. Long-form descriptions stay in the body sans font and are deliberately excluded. No Google Fonts (blocked/slow in China). Run `./scripts/build-fonts.sh` after copy/content edits; unseen characters fall back to Songti SC. `scripts/font-extra-chars.txt` is retired and no longer read by the build.
- `assets/media/dishes/*.jpg` — **mock dish photos** (Wikimedia Commons / Unsplash) for the menu; credits in `docs/reference/dish-photo-credits.md`. Replace them via the admin photo upload (stored under `love-journey/uploads/dishes/`) or an `image` path/URL when real photos are available. Cards use the image with an emoji fallback; the dish detail sheet shows the large image.
- `assets/media/xiaomeiman.mp3` — 96 kbps (original 8.5 MB stays in git history). `preload="none"`, strictly click-to-play: no autoplay and no resume-on-first-tap; the `lj-music` preference is no longer used.
- `assets/vendor/echarts.min.js` (ECharts 5.4.3, Apache-2.0), `assets/vendor/qrcode.min.js` (qrcodejs 1.0.0, MIT) and `assets/vendor/aliyun-oss-sdk-6.18.0.min.js` (Aliyun OSS SDK, MIT) — self-hosted third-party libraries, lazy-loaded by `loadScript()` / `loadOssSdk()`; do not swap them back to a CDN.
- `assets/data/china-map.json` — full-resolution source map (~580KB); `assets/data/china-map.simplified.json` is the one the app fetches (rounded + Douglas-Peucker 0.02°, ~209KB / ~60KB gzip). Rebuild with `node scripts/build-map.js`; both files stay in the repo so the source can be re-simplified.
- `assets/texture-noise.png`, `assets/icon.svg` + PNGs, `manifest.webmanifest`.

## Gotchas

- **Deployment**: primary is EdgeOne Makers at `https://coderf.site` (Git integration on `main`, Global-excluding-mainland acceleration, no ICP filing); GitHub Pages remains a fallback. EdgeOne's default `*.edgeone.dev` / `*.edgeone.cool` domain is not a public URL in mainland China — it requires a system preview link valid for 3 hours and returns 401 after expiry. `space.settings.links` points to `coderf.site`; Bark templates use `{userUrl}` / `{userOrderUrl}` / `{adminUrl}`. QR codes generated on GitHub Pages still point at github.io, so keep GitHub Pages until old codes are retired. See [docs/runbooks/edgeone.md](docs/runbooks/edgeone.md).
- **Test DB safety**: `isTestEnv()` is based on the hostname, not a stored flag. Public hosts never select `db-test`. `dbRoot()` / `uploadsRoot()` are the only places that choose the prefix; do not hardcode `love-journey/uploads/` or `love-journey/db/` elsewhere. Test Bark is suppressed unless `?bark=on`; the clone script disables it in `space.json` too.
- **City → province map**: `PROVINCE_OF` in `js/app.js` covers the names in `cityCoordinates`; a visited city outside that table has no map dot/province fill but still appears in the city grid. Same-province cities light one province; the color uses the earliest visit. Overseas cities are excluded by the built-in `OVERSEAS_CITY_NAMES` fallback until `cities.json` records get an `overseas` / `country` field.
- **No transactions**: order + wallet are two documents. `placeOrder` rolls the order back if the wallet write fails; `cancelOrder` restores the previous order document if the refund write fails. There is still a small window if the second write fails and the rollback also fails. Do not add a third independent write to this flow without thinking it through. `serveOrder` writes the menu image set first, then the order; if the order write fails the photo may remain in the dish gallery (retry dedupes by URL). `approveDishRequest` writes the menu first, then the request; retries dedupe by `dish.sourceRequestId`.
- **Indexes are derived**: every collection write updates `<dir>/index.json`. If an index is missing/stale, `dbCollection.list()` rebuilds it from the documents. A manual OSS write that bypasses the store can leave the index stale.
- **Read-modify-write races**: no locking or ETag. Two writers (user ordering while the chef changes status, or the weekly Action firing while the admin issues a card) can lose an update. Same-slot uniqueness is checked in `placeOrder` but is still an RMW check; two simultaneous orders for the same slot could race.
- **Single space**: `space.json` has exactly two members. The current build is not multi-tenant; the OSS AccessKey is in the deployed bundle, so multiple couples would require a backend/account system.
- **Legacy orders**: the update script removed the pre-reservation test orders. Legacy slot-less orders, if any remain, are shown as “旧订单（无预约时间）” and are not orderable.
- **Legacy config**: `love-journey/config.json` is still in the bucket as a backup and as the migration source. Nothing in the browser reads it. `OSS_CONFIG.configPath` is only used by the migration script.
- **Weekly Action**: `scripts/auto-gift-massage.js` reads/writes `commerce/coupons/` + `counters.json` under `OSS_DB_ROOT` (default `love-journey/db`). The schedule/duration/title logic is unchanged; only the storage target changed. The workflow no longer uses `OSS_CONFIG_PATH`.
- **Auth is cosmetic**: `adminPasscode` is plaintext in `js/oss-config.js`, and `CryptoUtils` is reversible obfuscation, not encryption. The credentials are effectively public in the bundle.
- **`CryptoUtils` uses `btoa`/`atob`**, which throw on non-ASCII — safe for keys, not Chinese text.
- **Cache versioning**: all local JS/CSS/font/texture/audio URLs carry `?v=20261030-01` in the three pages (and inside `css/style.css` / `MUSIC_SRC` / `MAP_SRC` / `OSS_SDK_URL`). Bump that token whenever you change those files. If a stale `oss-utils.js` is mixed with a new `store.js`, the app shows “页面脚本版本不一致” instead of a raw ReferenceError; a hard refresh fixes it.
- **Date parsing**: `"YYYY-MM-DD HH:mm:ss"` is not ISO-8601 and fails in Safari. `js/app.js`, `admin.html` and `use.html` normalize with `new Date(str.replace(/-/g, '/'))` and leave `T` strings alone.
- **Font subsets follow font usage, not all content**: `scripts/build-fonts.sh` reads the live OSS documents read-only (`space`, `content/*`, `commerce/menu`, `commerce/coupons/index`, `commerce/dish-requests/index`, plus the legacy `config.json`) and the page/script copy. `--font-cute` only receives the strings listed in `scripts/font-cute-chars.txt` plus space/member/story/coupon names; `--font-display` receives title-like fields and UI copy, not milestone/city/dish descriptions. If you add menu/copy text with unseen characters, run `./scripts/build-fonts.sh`; otherwise the glyph falls back to `Songti SC` and a single dish name can render in two fonts. `scripts/font-extra-chars.txt` is no longer used.
- **Map framing** is tuned for the eastern half of China (mobile center `[112,34]`, zoom `1.8`; desktop `[110,34]`, `1.8`). Labels use `hideOverlap`.
- **No coin purchase of love cards yet**: the weekly gift remains; the user's 空间 page only records acquired/used cards. Adding coin purchases would need a price + wallet transaction flow.
- **Menu categories and dish values are fixed**: categories are 快手菜 / 硬核菜; dish time is one of 40 / 60 / 90 / 120 minutes; tags are only 下饭 / 香辣 / 酸甜. `upsertDish` enforces the time/tag sets, so changing the options requires updating `DISH_TIME_OPTIONS` / `DISH_TAG_OPTIONS` in `js/store.js` and the admin form in `admin.html` together. Change categories in `menu-seed.js` / `menu.json` if needed.
