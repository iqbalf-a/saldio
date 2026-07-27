import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  useSystemTheme,
  useThemePreference,
  type ThemeMode,
  type EffectiveTheme,
} from "../lib/useSystemTheme";
import { getStoredTheme, STORAGE_KEY } from "../lib/themeStorage";

export interface ThemeContextValue {
  /** Apakah tema efektif saat ini gelap (untuk conditional styling). */
  isDark: boolean;
  /** Preferensi user: "light" | "dark" | "system". */
  preference: ThemeMode;
  /** Set preferensi user — otomatis persist ke localStorage. */
  setPreference: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  preference: "system",
  setPreference: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider:
 * - Baca preferensi user dari localStorage (light/dark/system).
 * - Resolve tema efektif (light/dark) berdasarkan preferensi + prefers-color-scheme.
 * - Apply/remove class "dark" ke <html> root (web) untuk Tailwind dark: prefix.
 * - Sediakan `useTheme()` → { isDark, preference, setPreference }.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useThemePreference();
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("light");

  // Hook 1: ikut perubahan preferensi + system theme
  const systemTheme = useSystemTheme();

  useEffect(() => {
    if (preference !== "system") {
      setEffectiveTheme(preference);
    } else {
      setEffectiveTheme(systemTheme);
    }
  }, [preference, systemTheme]);

  const isDark = effectiveTheme === "dark";

  // Apply/remove class "dark" ke <html> root (web) untuk Tailwind dark: prefix
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  // Listen perubahan dari hook lain (synchronize ketika system berubah tanpa toggle manual)
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = () => {
      // force re-read preference dari localStorage (mungkin berubah dari tab lain?)
      setPreference(getStoredTheme());
      // useSystemTheme akan update otomatis via event listener
    };

    // Listen storage event untuk cross-tab sync
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const raw = e.newValue as ThemeMode | null;
        if (raw === "light" || raw === "dark" || raw === "system") {
          setPreference(raw);
        }
      }
    };

    window.addEventListener("storage", storageHandler);
    mq.addEventListener("change", handler);
    return () => {
      window.removeEventListener("storage", storageHandler);
      mq.removeEventListener("change", handler);
    };
  }, [setPreference]);

  return (
    <ThemeContext.Provider value={{ isDark, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
