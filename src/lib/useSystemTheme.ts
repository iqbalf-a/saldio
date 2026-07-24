import { useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";
import { getStoredTheme, setStoredTheme } from "./themeStorage";
import type { ThemeMode } from "./themeStorage";

export type { ThemeMode } from "./themeStorage";
export type EffectiveTheme = "light" | "dark";

/**
 * Hook untuk deteksi tema efektif (light/dark) yang sedang aktif.
 * - Web: baca preferensi dari localStorage, fallback ke prefers-color-scheme
 * - Native: gunakan useColorScheme()
 *
 * Return: "light" | "dark" — tema aktual setelah resolusi.
 */
export function useSystemTheme(): EffectiveTheme {
  const systemScheme = useColorScheme();
  const [effective, setEffective] = useState<EffectiveTheme>("light");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setEffective(systemScheme === "dark" ? "dark" : "light");
      return;
    }

    const preference = getStoredTheme();

    if (preference === "light") {
      setEffective("light");
      return;
    }
    if (preference === "dark") {
      setEffective("dark");
      return;
    }

    // preference === "system" — ikut prefers-color-scheme
    const updateFromSystem = () => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setEffective(mq.matches ? "dark" : "light");
    };
    updateFromSystem();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", updateFromSystem);
    return () => mq.removeEventListener("change", updateFromSystem);
  }, [systemScheme]);

  return effective;
}

/**
 * Hook untuk baca & set preferensi tema (light/dark/system).
 * Setter otomatis persist ke localStorage.
 * Gunakan ini di toggle UI.
 */
export function useThemePreference(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  const setAndStore = (m: ThemeMode) => {
    setMode(m);
    setStoredTheme(m);
  };

  return [mode, setAndStore];
}