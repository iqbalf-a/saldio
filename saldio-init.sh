#!/bin/bash
# Saldio — Project Init Script
# Run this locally on your machine (not in this sandbox), inside the folder where you want the project created.

# 1. Create Expo project with TypeScript template (supports Web + Android + iOS from one codebase)
npx create-expo-app@latest saldio --template blank-typescript

cd saldio

# 2. Add React Native Web support (needed for Vercel web deployment)
npx expo install react-native-web react-dom @expo/metro-runtime

# 3. Navigation
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# 4. Google OAuth login
npx expo install expo-auth-session expo-web-browser expo-crypto

# 5. Google Drive API access (for JSON data storage) — via plain fetch to Drive REST API,
#    no extra package strictly required, but useful for local caching:
npm install @react-native-async-storage/async-storage

# 6. Styling — Tailwind via NativeWind (works across mobile + web)
npm install nativewind
npm install --save-dev tailwindcss@^3
npx tailwindcss init
# Then configure:
# - tailwind.config.js: set content paths to ["./App.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"]
# - babel.config.js: add "nativewind/babel" to plugins
# - Create a global.css (or nativewind-env.d.ts) as needed per NativeWind v2/v4 setup docs

# 7. Charts (for Net Worth trend line + donut chart)
npm install react-native-svg
npx expo install react-native-svg
npm install victory-native
# (Victory Native works across mobile + web when paired with react-native-svg)

# 8. PDF parsing (client-side, for Mutation Import feature — BCA/Mandiri/Bank Jago)
npm install pdfjs-dist

# 9. Fonts — Geist Sans & Geist Mono
npx expo install expo-font
mkdir -p assets/fonts
# Download Geist font files from https://vercel.com/font and place .ttf/.otf files into assets/fonts/
# (GeistSans-Regular.ttf, GeistSans-Bold.ttf, GeistMono-Regular.ttf, etc.)

# 10. Dev dependencies
npm install --save-dev typescript @types/react @types/react-native

# 11. Vercel deployment config (web export)
# After building screens, deploy with:
#   npx expo export -p web
#   npx vercel --prod
# (or connect the GitHub repo directly to Vercel for auto-deploy)

# 12. Relax TypeScript strictness for now (easier onboarding into TS)
#    Edit tsconfig.json and set:
#      "strict": false
#    You can tighten this back to "strict": true later once more comfortable with TS —
#    for now this avoids fighting the compiler on every small mistake while learning.

echo "Saldio project initialized. Next: open in Claude Code and paste the Saldio build prompt."