#!/usr/bin/env bash
# Rebuild the two self-hosted display-font subsets from the current copy.
#
# The site ships only the glyphs it actually renders in each face:
#
#   --font-cute (Ma Shan Zheng)
#     Short decorative strings only: the space name, the story title, coupon
#     titles, page titles, the footer script and a few labels. See
#     scripts/font-cute-chars.txt for the exact positions.
#
#   --font-display (Noto Serif SC Bold)
#     Title-like content and UI copy: milestone titles, goal titles, city
#     names, dish names, coupon titles, space/story names, all static page
#     copy, digits and punctuation.
#
# Long-form content (milestone descriptions, city notes, dish descriptions)
# renders in the body sans font, so its characters are deliberately not
# included. That is what makes the display font small.
#
# Missing characters fall back to Songti SC / STSong. Re-run this after adding
# content with characters that are not covered yet.
#
# Requires: curl, python3, uv (https://docs.astral.sh/uv/)
set -euo pipefail
cd "$(dirname "$0")/.."

OSS_BASE="https://love-config.oss-cn-beijing.aliyuncs.com"
CONFIG_PATH="love-journey/config.json"
# Read-only: these are the documents that carry admin/user-authored copy.
DB_DOCS=(
    "love-journey/db/space.json"
    "love-journey/db/content/story.json"
    "love-journey/db/content/milestones.json"
    "love-journey/db/content/goals.json"
    "love-journey/db/content/cities.json"
    "love-journey/db/commerce/menu.json"
    "love-journey/db/commerce/coupons/index.json"
    "love-journey/db/commerce/dish-requests/index.json"
)
CUTE_CHARS="scripts/font-cute-chars.txt"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "· downloading font sources"
curl -fL --retry 3 -o "$TMP/MaShanZheng-Regular.ttf" \
    "https://github.com/google/fonts/raw/main/ofl/mashanzheng/MaShanZheng-Regular.ttf"
curl -fL --retry 3 -o "$TMP/NotoSerifSC-Bold.otf" \
    "https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-Bold.otf"

mkdir -p "$TMP/live"
if curl -fsSL "$OSS_BASE/$CONFIG_PATH" -o "$TMP/live/config.json"; then
    echo "· using live config.json content"
else
    echo "! could not fetch config.json — subsetting from page copy only"
fi

for doc in "${DB_DOCS[@]}"; do
    out="$TMP/live/$(printf '%s' "$doc" | tr '/' '_')"
    if curl -fsSL "$OSS_BASE/$doc" -o "$out"; then
        echo "· read $doc"
    else
        rm -f "$out"
        echo "! could not fetch $doc — skipped"
    fi
done

echo "· collecting characters"
python3 - "$TMP" "$CUTE_CHARS" <<'PY'
import json, pathlib, sys

tmp = pathlib.Path(sys.argv[1])
cute_path = pathlib.Path(sys.argv[2])

PUNCT = '，。！？、；：""''《》…—·（）【】「」『』～'
# Symbols the layout renders in the display/cute faces (arrows, marks, the
# timer's infinity watermark). Emoji are system-rendered and need no subset.
SYMBOLS = '∞♡✶✈‹›→←✕♥·'
ASCII = {chr(code) for code in range(32, 127)}


def add(chars, value):
    for ch in str(value or ''):
        if ch.isprintable():
            chars.add(ch)


def walk(chars, value):
    if value is None:
        return
    if isinstance(value, str):
        add(chars, value)
    elif isinstance(value, list):
        for item in value:
            walk(chars, item)
    elif isinstance(value, dict):
        for item in value.values():
            walk(chars, item)


def live(rel):
    path = tmp / 'live' / ('love-journey_db_' + rel.replace('/', '_'))
    try:
        return json.loads(path.read_text(encoding='utf-8') or '{}')
    except Exception:
        return {}


# --- static copy from the pages and scripts -------------------------------
static = set()
for name in [
    'index.html', 'use.html', 'admin.html',
    'js/app.js', 'js/store.js', 'js/oss-utils.js', 'css/style.css',
    'scripts/migrate-storage.js', 'scripts/menu-seed.js',
    'scripts/serving-seed.js', 'scripts/update-schedule-menu.js',
]:
    try:
        text = pathlib.Path(name).read_text(encoding='utf-8')
    except OSError:
        continue
    for ch in text:
        if ord(ch) < 128 or '一' <= ch <= '鿿' or ch in PUNCT:
            static.add(ch)

# --- live documents -------------------------------------------------------
space = live('space.json')
story = live('content/story.json')
milestones = live('content/milestones.json')
goals = live('content/goals.json')
cities = live('content/cities.json')
menu = live('commerce/menu.json')
coupons = live('commerce/coupons/index.json')
requests = live('commerce/dish-requests/index.json')

members = [member.get('name') for member in space.get('members', []) if isinstance(member, dict)]
coupon_titles = [coupon.get('title') for coupon in coupons.get('items', []) if isinstance(coupon, dict)]

# --- --font-display: title-like content + all UI copy ---------------------
display = set(static)
for value in (
    space.get('name'),
    members,
    story.get('title'),
    [item.get('title') for item in milestones.get('items', []) if isinstance(item, dict)],
    [item.get('title') for item in goals.get('items', []) if isinstance(item, dict)],
    [item.get('name') for item in cities.get('items', []) if isinstance(item, dict)],
    [item.get('name') for item in menu.get('dishes', []) if isinstance(item, dict)],
    [item.get('name') for item in menu.get('categories', []) if isinstance(item, dict)],
    coupon_titles,
    [item.get('name') for item in requests.get('items', []) if isinstance(item, dict)],
):
    walk(display, value)
display |= ASCII
display |= set(PUNCT)
display |= set(SYMBOLS)

# --- --font-cute: only the strings rendered in the decorative face --------
cute = set()
if cute_path.exists():
    for line in cute_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        add(cute, line)
else:
    print(f'! {cute_path} missing — using live strings only')

for value in (space.get('name'), members, story.get('title'), coupon_titles):
    walk(cute, value)
cute |= ASCII
cute |= set(PUNCT)
cute |= set(SYMBOLS)

noto = display | cute

(tmp / 'chars-cute.txt').write_text(''.join(sorted(cute)), encoding='utf-8')
(tmp / 'chars-noto.txt').write_text(''.join(sorted(noto)), encoding='utf-8')
print(f'· cute set {len(cute)} chars, display set {len(noto)} chars')
PY

echo "· subsetting woff2"
mkdir -p assets/fonts
uvx --from fonttools --with brotli pyftsubset "$TMP/MaShanZheng-Regular.ttf" \
    --text-file="$TMP/chars-cute.txt" --flavor=woff2 \
    --output-file=assets/fonts/mashanzheng-subset.woff2 \
    --layout-features='*' --no-hinting

uvx --from fonttools --with brotli pyftsubset "$TMP/NotoSerifSC-Bold.otf" \
    --text-file="$TMP/chars-noto.txt" --flavor=woff2 \
    --output-file=assets/fonts/notoserifsc-bold-subset.woff2 \
    --layout-features='*' --no-hinting --desubroutinize

ls -lh assets/fonts/*.woff2
