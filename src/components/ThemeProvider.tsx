import React, { createContext, useContext, useEffect } from "react";
import { Platform } from "react-native";
import { useSystemTheme, type ThemeMode } from "../lib/useSystemTheme";

const ThemeContext = createContext<ThemeMode>("light");

export function useTheme(): ThemeMode {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider — detect preferensi sistem, apply class "dark" ke HTML root (web).
 * Native: cukup sediakan context, komponen pakai useTheme() untuk conditional styling.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSystemTheme();

  // Web: toggle class "dark" di <html> untuk Tailwind dark: prefix
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
