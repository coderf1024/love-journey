#!/usr/bin/env bash
# Rebuild the two self-hosted display-font subsets from the current copy.
#
# The site ships only the glyphs it actually uses: the character set is the
# union of the live config.json content and the text in the pages/scripts.
# Re-run this after adding milestones, goals, city notes or UI copy that uses
# characters not already covered. Missing characters fall back to the system
# serif/sans font.
#
# Requires: curl, python3, uv (https://docs.astral.sh/uv/)
set -euo pipefail
cd "$(dirname "$0")/.."

CONFIG_URL="https://love-config.oss-cn-beijing.aliyuncs.com/love-journey/config.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "· downloading font sources"
curl -fL --retry 3 -o "$TMP/MaShanZheng-Regular.ttf" \
    "https://github.com/google/fonts/raw/main/ofl/mashanzheng/MaShanZheng-Regular.ttf"
curl -fL --retry 3 -o "$TMP/NotoSerifSC-Bold.otf" \
    "https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-Bold.otf"

if curl -fsSL "$CONFIG_URL" -o "$TMP/config.json"; then
    echo "· using live config.json content"
else
    echo "! could not fetch config.json — subsetting from page copy only"
    : > "$TMP/config.json"
fi

echo "· collecting characters"
python3 - "$TMP/config.json" <<'PY' > "$TMP/chars.txt"
import json, pathlib, sys

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

try:
    walk(json.loads(pathlib.Path(sys.argv[1]).read_text() or '{}'))
except Exception:
    pass

for name in ['index.html', 'use.html', 'admin.html', 'js/app.js', 'js/store.js', 'js/oss-utils.js', 'css/style.css', 'scripts/migrate-storage.js', 'scripts/menu-seed.js', 'scripts/serving-seed.js', 'scripts/update-schedule-menu.js']:
    for ch in pathlib.Path(name).read_text():
        if ord(ch) < 128 or '一' <= ch <= '鿿' or ch in '，。！？、；：""''《》…—·（）【】「」『』～':
            chars.add(ch)

for code in range(32, 127):
    chars.add(chr(code))

chars -= {'\n', '\r', '\t'}
sys.stdout.write(''.join(sorted(chars)))
PY

echo "· subsetting woff2"
mkdir -p assets/fonts
uvx --from fonttools --with brotli pyftsubset "$TMP/MaShanZheng-Regular.ttf" \
    --text-file="$TMP/chars.txt" --flavor=woff2 \
    --output-file=assets/fonts/mashanzheng-subset.woff2 \
    --layout-features='*' --no-hinting

uvx --from fonttools --with brotli pyftsubset "$TMP/NotoSerifSC-Bold.otf" \
    --text-file="$TMP/chars.txt" --flavor=woff2 \
    --output-file=assets/fonts/notoserifsc-bold-subset.woff2 \
    --layout-features='*' --no-hinting --desubroutinize

ls -lh assets/fonts/*.woff2
