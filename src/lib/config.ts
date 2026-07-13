/**
 * Konfigurasi Google OAuth (expo-auth-session).
 *
 * Buat credential di https://console.cloud.google.com/apis/credentials :
 *  - Web client ID     → untuk web (Vercel) dan Expo Go dev
 *  - Android client ID → untuk build APK (package name + SHA-1)
 *
 * Scope drive.appdata dipakai agar file data Saldio tersimpan di
 * appDataFolder milik user — tidak terlihat di Drive utama & tidak bisa
 * membaca file lain milik user.
 */
export const GOOGLE_OAUTH = {
  webClientId: "16801367088-7dg7j81f87cpjjgmmr0aae8u5csg86gf.apps.googleusercontent.com",
  androidClientId: "REPLACE_WITH_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  scopes: [
    "openid",
    "profile",
    "email",
    "https://www.googleapis.com/auth/drive.appdata",
  ],
};

export const DRIVE_DATA_FILENAME = "saldio-data.json";