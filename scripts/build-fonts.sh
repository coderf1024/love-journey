#!/usr/bin/env bash
# Rebuild the two self-hosted display-font subsets from the current copy.
#
# The site ships only the glyphs it actually uses: the character set is the
# union of the live OSS documents (space / story / milestones / goals / cities /
# menu / coupons / dish requests plus the legacy config.json), the text in the
# pages/scripts, and the extra characters in scripts/font-extra-chars.txt.
# Re-run this after adding milestones, goals, city notes, menu items or UI copy
# that uses characters not already covered. Missing characters fall back to the
# system serif/sans font.
#
# The extra character file only feeds Noto Serif SC (--font-display). Ma Shan
# Zheng keeps the narrower set: it is a decorative face and anything missing
# falls through to Noto in the --font-cute stack.
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
EXTRA_CHARS="scripts/font-extra-chars.txt"

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
python3 - "$TMP" "$EXTRA_CHARS" <<'PY'
import json, pathlib, sys

tmp = pathlib.Path(sys.argv[1])
extra_path = pathlib.Path(sys.argv[2])

chars = set()

def add(value):
    for ch in str(value):
        if ch.isprintable():
            chars.add(ch)

def walk(value):
    if isinstance(value, str):
        add(value)
    elif isinstance(value, list):
        for item in value:
            walk(item)
    elif isinstance(value, dict):
        for item in value.values():
            walk(item)

for doc in sorted((tmp / 'live').glob('*.json')):
    try:
        walk(json.loads(doc.read_text(encoding='utf-8') or '{}'))
    except Exception:
        pass

for name in ['index.html', 'use.html', 'admin.html', 'js/app.js', 'js/store.js', 'js/oss-utils.js', 'css/style.css', 'scripts/migrate-storage.js', 'scripts/menu-seed.js', 'scripts/serving-seed.js', 'scripts/update-schedule-menu.js']:
    for ch in pathlib.Path(name).read_text(encoding='utf-8'):
        if ord(ch) < 128 or '一' <= ch <= '鿿' or ch in '，。！？、；：""''《》…—·（）【】「」『』～':
            chars.add(ch)

for code in range(32, 127):
    chars.add(chr(code))

chars -= {'\n', '\r', '\t'}

extra = set()
if extra_path.exists():
    for line in extra_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        extra.update(line)
    extra = {ch for ch in extra if ch.isprintable() and ch not in '\n\r\t'}
else:
    print(f'! {extra_path} missing — Noto subset uses the base set only')

(tmp / 'chars-base.txt').write_text(''.join(sorted(chars)), encoding='utf-8')
(tmp / 'chars-noto.txt').write_text(''.join(sorted(chars | extra)), encoding='utf-8')
print(f'· base set {len(chars)} chars, Noto set {len(chars | extra)} chars')
PY

echo "· subsetting woff2"
mkdir -p assets/fonts
uvx --from fonttools --with brotli pyftsubset "$TMP/MaShanZheng-Regular.ttf" \
    --text-file="$TMP/chars-base.txt" --flavor=woff2 \
    --output-file=assets/fonts/mashanzheng-subset.woff2 \
    --layout-features='*' --no-hinting

uvx --from fonttools --with brotli pyftsubset "$TMP/NotoSerifSC-Bold.otf" \
    --text-file="$TMP/chars-noto.txt" --flavor=woff2 \
    --output-file=assets/fonts/notoserifsc-bold-subset.woff2 \
    --layout-features='*' --no-hinting --desubroutinize

ls -lh assets/fonts/*.woff2
