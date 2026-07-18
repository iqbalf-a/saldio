#!/bin/bash
# postbuild.sh — inject PWA manifest link into Expo web export
# (manifest.json & icon dari public/ sudah disalin otomatis ke dist/ oleh expo export)
set -e

DIST="dist"

# Inject <link rel="manifest"> into index.html before </head>
sed -i 's|</head>|<link rel="manifest" href="/manifest.json"></head>|' "$DIST/index.html"

# sed tetap exit 0 walau pola tak cocok — verifikasi hasil injeksi & file manifest
grep -q 'rel="manifest"' "$DIST/index.html"
test -f "$DIST/manifest.json"

echo "postbuild: manifest injected"
