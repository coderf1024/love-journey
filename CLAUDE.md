# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, no-build vanilla-JS site (Chinese-language, personal project) deployed via GitHub Pages from the repo root. There is no package.json, bundler, test suite, or linter — the source files are the artifact.

The product is now framed as a **恋爱空间**: one space, exactly two members (a user and a chef/admin). Three pages:

- `index.html` — the scrapbook + the ordering module, mobile-first: fixed header, bottom tab bar (首页 / 点餐 / 恋爱卡), love timer, milestones, goals, China map, coupons, menu/cart/order tracking, wallet sheet.
- `admin.html` — passcode-gated 大厨端: coupons (恋爱卡) plus the 小灶 tab (order queue, wallet/发币, menu CRUD, overdraft limit).
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
  space.json                 # members (user/chef), settings, schemaVersion
  content/
    story.json               # loveStory (startDate, title, names)
    milestones.json          # { items: [...] } — bounded, read whole
    goals.json               # { items: [...] }
    cities.json              # { items: [...] }
  commerce/
    menu.json                # { categories, dishes } — admin-maintained
    wallet.json              # user wallet: balance, overdraftLimit, embedded entries[]
    counters.json            # { order, coupon } — best-effort sequence numbers
    orders/
      index.json             # read model: order summaries (status, items, total, thanks, nudges)
      <orderId>.json         # full order: items snapshot, payment, statusHistory, thanks, nudges
    coupons/
      index.json             # read model: full coupon objects (the site reads this)
      <couponId>.json        # source of truth for use.html / redemption
```

`js/oss-utils.js` exposes `dbGet/dbGetOrNull/dbPut/dbDelete/dbList` and `dbCollection(dir, summarize, compare)`. A collection keeps one document per record plus an `index.json` read model; the index is rebuilt from the documents if it is missing. `dbCollection.save/remove` update the document then the index.

`js/store.js` owns the domain:

- `loadAppData()` → assembles space/story/milestones/goals/cities/menu/wallet/orders index/coupons index + the latest full order.
- `placeOrder({ dishIds, note })` — validates the menu, blocks when another order is pending/prepping/cooking/served, enforces `balance + overdraftLimit`, allocates an order id, writes the order document then deducts the wallet (with rollback if the wallet write fails), and records the ledger entry inside `wallet.json`.
- `setOrderStatus(id, status, { by })` — pending → prepping → cooking → served → completed.
- `cancelOrder(id, { by, reason })` — pending/prepping for the user; any active status for the admin; refunds the full total into the wallet as a `refund` entry.
- `nudgeOrder` (5-minute cooldown), `thankChef`, `completeOrder`.
- `grantCoins(amount, note)`, `setOverdraftLimit(limit)`.
- `upsertDish`, `deleteDish`, `toggleDish`, `saveMenu`.
- `addCoupon`, `useCoupon`, `deleteCoupon` — the existing weekly gift flow now writes into `commerce/coupons/`.

The wallet is the user's only; the admin never spends. The embedded `entries[]` is the ledger. `balance` is denormalized; it is always written together with the entry that changed it.

### Order shape

```jsonc
{
  "id": 1,
  "status": "pending", // pending | prepping | cooking | served | completed | cancelled
  "items": [{ "dishId": "...", "name": "番茄炒蛋", "icon": "🍅", "price": 20, "prepMinutes": 15 }],
  "total": 35, "etaMinutes": 20, "note": "少辣",
  "placedAt": "YYYY-MM-DD HH:mm:ss", "updatedAt": "…",
  "statusHistory": [{ "status": "pending", "at": "…", "by": "user" }],
  "payment": { "amount": 35, "balanceAfter": 485, "transactionId": "tx_…", "refundedAt": null, "refundId": null },
  "thanks": null, "nudges": [], "cancelled": null
}
```

The order index stores summaries (including items, status, total, thanks, last nudge) so the user's order card and the chef's queue can render without fetching every order document.

## Front-end shell (index.html + app.js)

`js/app.js` is a classic top-level script. It boots on `DOMContentLoaded`: binds chrome, then `loadAppData()` → `renderDashboard()`.

- Hash routing `#home` / `#order` / `#coupons` with `history.pushState`; top nav at `≥820px`, bottom tab bar below.
- The order page: menu categories, dish cards, a fixed cart bar above the tab bar, a checkout bottom sheet, order tracking card with a 4-step stepper and status copy, and a wallet sheet. The active/served order blocks new orders until the user taps 吃完了 (completed) or cancels.
- The user's order page polls `refreshOrderData()` every 20s while an order is pending/prepping/cooking, and on `visibilitychange`. A full `refreshData()` (9 reads) runs when data is older than 30s on page switch/visibility.
- ECharts and qrcodejs are **lazy-loaded from jsdelivr on demand** (map near viewport / QR sheet open). The map defaults to `roam: false` behind a tap-to-explore guard so page scrolling is never trapped.
- Sheets lock body scroll with a fixed-body technique and restore the scroll position; Escape/backdrop/tap closes the topmost sheet.

## Admin (admin.html)

Two tabs after the passcode gate:

- **恋爱卡** — the original coupon issue/stats/delete UI, now reading `adminData.coupons`.
- **小灶** — order queue (接单 / 开始做菜 / 出餐 / 完成 / 拒单退款, sorted active-first), user wallet (balance, 发币, editable overdraft limit, ledger), and menu CRUD (add/edit/delete, availability, today's special). The kitchen tab polls orders every 15s while open.

## Assets

- `assets/fonts/*.woff2` — subsets of Ma Shan Zheng + Noto Serif SC Bold generated from the current copy + the live config + `scripts/migrate-storage.js` (menu seed). No Google Fonts (blocked/slow in China). Run `./scripts/build-fonts.sh` after copy/content edits; unseen characters fall back to system fonts.
- `assets/media/xiaomeiman.mp3` — 96 kbps (original 8.5 MB stays in git history). `preload="none"`, opt-in; preference in `localStorage` (`lj-music`).
- `assets/texture-noise.png`, `assets/icon.svg` + PNGs, `manifest.webmanifest`.

## Gotchas

- **No transactions**: order + wallet are two documents. `placeOrder` rolls the order back if the wallet write fails; `cancelOrder` restores the previous order document if the refund write fails. There is still a small window if the second write fails and the rollback also fails. Do not add a third independent write to this flow without thinking it through.
- **Indexes are derived**: every collection write updates `<dir>/index.json`. If an index is missing/stale, `dbCollection.list()` rebuilds it from the documents. A manual OSS write that bypasses the store can leave the index stale.
- **Read-modify-write races**: no locking or ETag. Two writers (user ordering while the chef changes status, or the weekly Action firing while the admin issues a card) can lose an update. For one couple the window is small; a multi-space product needs a backend.
- **Single space**: `space.json` has exactly two members. The current build is not multi-tenant; the OSS AccessKey is in the deployed bundle, so multiple couples would require a backend/account system.
- **Legacy config**: `love-journey/config.json` is still in the bucket as a backup and as the migration source. Nothing in the browser reads it. `OSS_CONFIG.configPath` is only used by the migration script.
- **Weekly Action**: `scripts/auto-gift-massage.js` reads/writes `commerce/coupons/` + `counters.json` under `OSS_DB_ROOT` (default `love-journey/db`). The schedule/duration/title logic is unchanged; only the storage target changed. The workflow no longer uses `OSS_CONFIG_PATH`.
- **Auth is cosmetic**: `adminPasscode` is plaintext in `js/oss-config.js`, and `CryptoUtils` is reversible obfuscation, not encryption. The credentials are effectively public in the bundle.
- **`CryptoUtils` uses `btoa`/`atob`**, which throw on non-ASCII — safe for keys, not Chinese text.
- **Cache versioning**: all local JS/CSS/font/texture/audio URLs carry `?v=20261022-3` in the three pages (and inside `css/style.css` / `MUSIC_SRC`). Bump that token whenever you change those files. If a stale `oss-utils.js` is mixed with a new `store.js`, the app shows “页面脚本版本不一致” instead of a raw ReferenceError; a hard refresh fixes it.
- **Date parsing**: `"YYYY-MM-DD HH:mm:ss"` is not ISO-8601 and fails in Safari. `js/app.js`, `admin.html` and `use.html` normalize with `new Date(str.replace(/-/g, '/'))` and leave `T` strings alone.
- **Font subsets are content-scoped**: the menu seed lives in `scripts/migrate-storage.js`, so the font build script includes it. If you add menu/copy text with unseen characters, run `./scripts/build-fonts.sh`.
- **Dish/milestone images**: milestone images are external Unsplash URLs and can fail in China; the UI removes broken images and falls back to colored year covers. Menu items use emoji tiles; there are no menu images.
- **Map framing** is tuned for the eastern half of China (mobile center `[112,34]`, zoom `1.8`; desktop `[110,34]`, `1.8`). Labels use `hideOverlap`.
