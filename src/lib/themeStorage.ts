import { Platform } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "saldio-theme-preference";

/** Baca tema tersimpan dari localStorage (web) atau default "system". */
export function getStoredTheme(): ThemeMode {
  if (Platform.OS !== "web" || typeof window === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {}
  return "system";
}

/** Simpan preferensi tema ke localStorage. */
export function setStoredTheme(mode: ThemeMode): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
}
