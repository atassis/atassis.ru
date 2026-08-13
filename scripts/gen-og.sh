#!/usr/bin/env bash
# Renders scripts/og.svg -> public/og.png (1200x630 link-preview card).
# The site's webfonts ship as woff2, which fontconfig can't read: decompress them
# into a scratch dir and point rsvg-convert at that dir alone, so a missing font
# fails loudly instead of silently falling back to a system serif.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FONTS="$(mktemp -d)"
trap 'rm -rf "$FONTS"' EXIT

for f in \
  inter/files/inter-latin-700-normal \
  ibm-plex-mono/files/ibm-plex-mono-latin-400-normal \
  source-serif-4/files/source-serif-4-latin-400-normal
do
  cp "$ROOT/node_modules/@fontsource/$f.woff2" "$FONTS/"
  woff2_decompress "$FONTS/$(basename "$f").woff2" >/dev/null
done

cat > "$FONTS/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>$FONTS</dir>
  <cachedir>$FONTS/cache</cachedir>
</fontconfig>
EOF

FONTCONFIG_FILE="$FONTS/fonts.conf" \
  rsvg-convert -w 1200 -h 630 "$ROOT/scripts/og.svg" -o "$ROOT/public/og.png"

echo "public/og.png: $(identify -format '%wx%h %b' "$ROOT/public/og.png")"
