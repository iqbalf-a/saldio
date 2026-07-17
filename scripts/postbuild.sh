#!/bin/bash
# postbuild.sh — inject PWA manifest link into Expo web export
set -e

DIST="dist"
MANIFEST_SRC="web/manifest.json"

# Copy manifest to dist/
cp "$MANIFEST_SRC" "$DIST/manifest.json"

# Inject <link rel="manifest"> into index.html before </head>
sed -i 's|</head>|<link rel="manifest" href="/manifest.json"></head>|' "$DIST/index.html"

echo "postbuild: manifest injected"
