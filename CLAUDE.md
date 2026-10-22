# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build vanilla-JS site (Chinese-language, personal project) deployed via GitHub Pages from the repo root. There is no package.json, bundler, test suite, or linter — the source files are the artifact.

The product is a **恋爱空间**: one space, exactly two members (a user and a chef/admin). The kitchen only serves weekends, with reservations.

- `index.html` — the scrapbook + kitchen + wallet, mobile-first: fixed header, bottom tab bar (首页 / 点餐 / 恋爱卡 / 我的), love timer, milestones, goals, China map, coupons, weekend slot picker, menu/cart, order tracking, wallet sheet, and the 我的 page (upcoming orders, history, ledger, card-usage records).
- `admin.html` — passcode-gated 大厨端: coupons (恋爱卡) plus the 小灶 tab (reservation queue, wallet/发币, menu CRUD with images, overdraft limit).
- `use.html?id=<couponId>` — QR-code redemption page, self-contained.

## Commands

```bash
# Local preview — must be a real HTTP server, not file:// (app.js fetches assets/data/china-map.json)
python3 -m http.server 8888

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

# Encrypt a new AccessKey for js/oss-config.js — algorithm and snippet in docs/OSS_CONFIG_README.md
```

## Storage: OSS as a document database (v2)

There is no backend. The bucket is used as a small JSON document store under `OSS_CONFIG.dbRoot` (default `love-journey/db`). `js/oss-utils.js` is the low-level document API; `js/store.js` is the domain layer that every page uses.

```
love-journey/db/
  space.json                 # members (user/chef), settings, serving windows, schemaVersion
  content/
    story.json               # loveStory (startDate, title, names)
    milestones.json          # { items: [...] } — bounded, read whole
    goals.json               # { items: [...] }
    cities.json              # { items: [...] }
  commerce/
    menu.json                # { categories, dishes } — admin-maintained, two categories
    wallet.json              # user wallet: balance, overdraftLimit, embedded entries[]
    counters.json            # { coupon, order } — coupon counter only; order is legacy
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
- `nudgeOrder` (5-minute cooldown), `thankChef`, `completeOrder`.
- `grantCoins(amount, note)`, `setOverdraftLimit(limit)`.
- `upsertDish` (includes `image`), `deleteDish`, `toggleDish`, `saveMenu`.
- `addCoupon`, `useCoupon`, `deleteCoupon` — the existing weekly gift flow writes into `commerce/coupons/`.

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
  "items": [{ "dishId": "...", "name": "番茄炒蛋", "icon": "🍅", "price": 20, "prepMinutes": 15 }],
  "total": 35, "etaMinutes": 20, "note": "少辣",
  "placedAt": "YYYY-MM-DD HH:mm:ss", "updatedAt": "…",
  "statusHistory": [{ "status": "pending", "at": "…", "by": "user" }],
  "payment": { "amount": 35, "balanceAfter": 485, "transactionId": "tx_…", "refundedAt": null, "refundId": null },
  "thanks": null, "nudges": [], "cancelled": null
}
```

The order index stores summaries (including `slot`, status, items, total, thanks, last nudge) so the user's cards and the chef's queue render without fetching every order document.

## Front-end shell (index.html + app.js)

`js/app.js` is a classic top-level script. It boots on `DOMContentLoaded`: binds chrome, then `loadAppData()` → `refreshSelectedOrder()` → `renderDashboard()`.

- Hash routing `#home` / `#order` / `#coupons` / `#me` with `history.pushState`; top nav at `≥820px`, bottom tab bar below.
- Order page: slot picker with the next 8 meal slots (2 weekends), a selected-slot summary, tracking card or menu, a fixed cart bar, checkout sheet, dish detail sheet with a large photo/emoji fallback, and a wallet sheet. One order per slot; different slots can coexist. Booked slots show the tracking card instead of the menu; past-cutoff slots show “已截止预约”. Past active orders are appended as extra non-orderable slots so they can still be tracked.
- The user can cancel pending/accepted orders; after the chef starts prepping only the chef can cancel. All confirmations (cancel, switching slots with a cart) use the custom dialog component, not `alert/confirm`.
- 我的 page: upcoming reservations, history (with an order-detail sheet), full wallet ledger (up to 50 rows), and used-coupon records. Order rows for active reservations jump back to the order page with that slot selected.
- Polling: `refreshOrderData()` every 20s when an order is prepping/cooking/served or a pending/accepted order is within 12 hours; a full `refreshData()` (9 reads) runs when data is older than 30s on page switch/visibility.
- ECharts and qrcodejs are **lazy-loaded from jsdelivr on demand** (map near viewport / QR sheet open). The map defaults to `roam: false` behind a tap-to-explore guard so page scrolling is never trapped.
- Sheets lock body scroll with a fixed-body technique and restore the scroll position; Escape/backdrop/tap closes the topmost sheet.

## Admin (admin.html)

Two tabs after the passcode gate:

- **恋爱卡** — the original coupon issue/stats/delete UI, now reading `adminData.coupons`.
- **小灶** — reservation queue (接单 / 开始备菜 / 开始制作 / 出餐 / 完成 / 取消退款, sorted active-first, slot shown on every card), user wallet (balance, 发币, editable overdraft limit, ledger), and menu CRUD (add/edit/delete, image URL, availability, today's special). The kitchen tab polls orders every 15s while open. Destructive actions use the shared `.dialog` component from `css/style.css` instead of native `confirm`.

## Assets

- `assets/fonts/*.woff2` — subsets of Ma Shan Zheng + Noto Serif SC Bold generated from the current copy + the live config + `scripts/menu-seed.js`, `scripts/serving-seed.js`, `scripts/update-schedule-menu.js`. No Google Fonts (blocked/slow in China). Run `./scripts/build-fonts.sh` after copy/content edits; unseen characters fall back to system fonts.
- `assets/media/dishes/*.jpg` — **mock dish photos** (Wikimedia Commons / Unsplash) for the menu; credits in `assets/media/dishes/CREDITS.md`. Replace them via the admin `image` field (a local path or OSS URL) when real photos are available. Cards use the image with an emoji fallback; the dish detail sheet shows the large image.
- `assets/media/xiaomeiman.mp3` — 96 kbps (original 8.5 MB stays in git history). `preload="none"`, opt-in; preference in `localStorage` (`lj-music`).
- `assets/texture-noise.png`, `assets/icon.svg` + PNGs, `manifest.webmanifest`.

## Gotchas

- **No transactions**: order + wallet are two documents. `placeOrder` rolls the order back if the wallet write fails; `cancelOrder` restores the previous order document if the refund write fails. There is still a small window if the second write fails and the rollback also fails. Do not add a third independent write to this flow without thinking it through.
- **Indexes are derived**: every collection write updates `<dir>/index.json`. If an index is missing/stale, `dbCollection.list()` rebuilds it from the documents. A manual OSS write that bypasses the store can leave the index stale.
- **Read-modify-write races**: no locking or ETag. Two writers (user ordering while the chef changes status, or the weekly Action firing while the admin issues a card) can lose an update. Same-slot uniqueness is checked in `placeOrder` but is still an RMW check; two simultaneous orders for the same slot could race.
- **Single space**: `space.json` has exactly two members. The current build is not multi-tenant; the OSS AccessKey is in the deployed bundle, so multiple couples would require a backend/account system.
- **Legacy orders**: the update script removed the pre-reservation test orders. Legacy slot-less orders, if any remain, are shown as “旧订单（无预约时间）” and are not orderable.
- **Legacy config**: `love-journey/config.json` is still in the bucket as a backup and as the migration source. Nothing in the browser reads it. `OSS_CONFIG.configPath` is only used by the migration script.
- **Weekly Action**: `scripts/auto-gift-massage.js` reads/writes `commerce/coupons/` + `counters.json` under `OSS_DB_ROOT` (default `love-journey/db`). The schedule/duration/title logic is unchanged; only the storage target changed. The workflow no longer uses `OSS_CONFIG_PATH`.
- **Auth is cosmetic**: `adminPasscode` is plaintext in `js/oss-config.js`, and `CryptoUtils` is reversible obfuscation, not encryption. The credentials are effectively public in the bundle.
- **`CryptoUtils` uses `btoa`/`atob`**, which throw on non-ASCII — safe for keys, not Chinese text.
- **Cache versioning**: all local JS/CSS/font/texture/audio URLs carry `?v=20261022-5` in the three pages (and inside `css/style.css` / `MUSIC_SRC`). Bump that token whenever you change those files. If a stale `oss-utils.js` is mixed with a new `store.js`, the app shows “页面脚本版本不一致” instead of a raw ReferenceError; a hard refresh fixes it.
- **Date parsing**: `"YYYY-MM-DD HH:mm:ss"` is not ISO-8601 and fails in Safari. `js/app.js`, `admin.html` and `use.html` normalize with `new Date(str.replace(/-/g, '/'))` and leave `T` strings alone.
- **Font subsets are content-scoped**: the menu lives in `scripts/menu-seed.js` and the serving labels in `scripts/serving-seed.js`; the font build script includes both. If you add menu/copy text with unseen characters, run `./scripts/build-fonts.sh`.
- **Map framing** is tuned for the eastern half of China (mobile center `[112,34]`, zoom `1.8`; desktop `[110,34]`, `1.8`). Labels use `hideOverlap`.
- **No coin purchase of love cards yet**: the weekly gift remains; the user's 我的 page only records acquired/used cards. Adding coin purchases would need a price + wallet transaction flow.
- **Menu categories are fixed to 快手菜 / 硬核菜** in the seed; the admin edits dishes, not categories. Change categories in `menu-seed.js` / `menu.json` if needed.
