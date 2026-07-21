#!/bin/bash
# postbuild.sh — inject PWA manifest link, service worker registration, desktop layout CSS
# (manifest.json, icon, sw.js dari public/ sudah disalin otomatis ke dist/ oleh expo export)
set -e

DIST="dist"

# Inject <link rel="manifest"> before </head>
sed -i 's|</head>|<link rel="manifest" href="/manifest.json"></head>|' "$DIST/index.html"

# Inject desktop max-width CSS + service worker registration before </body>
sed -i 's|</body>|<style>@media(min-width:640px){#root{max-width:430px;margin:0 auto;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;box-shadow:0 0 40px rgba(0,0,0,0.04)}}</style><script>"use strict";if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").then(function(r){r.update()}).catch(function(){})})}</script></body>|' "$DIST/index.html"

# Verifikasi injeksi
grep -q 'rel="manifest"' "$DIST/index.html"
grep -q 'serviceWorker' "$DIST/index.html"
grep -q 'max-width:430px' "$DIST/index.html"
test -f "$DIST/manifest.json"
test -f "$DIST/sw.js"

# Ganti placeholder BUILD_ID dengan timestamp agar SW ter-deteksi update antar deploy
sed -i "s|__BUILD_ID__|$(date +%s)|" "$DIST/sw.js"
grep -q 'CACHE_NAME = "saldio-' "$DIST/sw.js"

echo "postbuild: manifest + SW + desktop layout injected"
