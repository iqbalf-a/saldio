import { useEffect, useState } from "react";
import { Platform, useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark";

/**
 * Hook untuk detect preferensi tema sistem.
 * - Web: gunakan prefers-color-scheme media query
 * - Native: gunakan useColorScheme() dari React Native
 *
 * Return: "light" | "dark" berdasarkan preferensi sistem.
 */
export function useSystemTheme(): ThemeMode {
  const systemScheme = useColorScheme();
  const [webScheme, setWebScheme] = useState<ThemeMode>("light");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setWebScheme(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setWebScheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  if (Platform.OS === "web") return webScheme;
  return systemScheme === "dark" ? "dark" : "light";
}
