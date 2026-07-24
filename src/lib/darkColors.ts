/**
 * useDarkColor — Hook untuk resolve inline style colors berdasarkan tema aktif.
 *
 * Digunakan untuk style={{ color: ... }} yang tidak bisa pakai Tailwind class.
 * Warna resolve via CSS custom properties dari global.css (transisi otomatis).
 *
 * Contoh pakai:
 *   const ink = useDarkColor("ink");
 *   <Text style={{ color: ink }}>...</Text>
 */
import { useTheme } from "../components/ThemeProvider";

type ColorToken =
  | "bg"
  | "card"
  | "ink"
  | "muted"
  | "soft"
  | "border"
  | "sky"
  | "blue"
  | "navy"
  | "red"
  | "redBg"
  | "green"
  | "greenBg"
  | "gold"
  | "goldBg"
  | "goldInk";

const LIGHT: Record<ColorToken, string> = {
  bg: "#F1F4F9",
  card: "#FFFFFF",
  ink: "#101736",
  muted: "#8A94A6",
  soft: "#64748B",
  border: "#E6EAF2",
  sky: "#EAEFFB",
  blue: "#3D51E0",
  navy: "#1E2A78",
  red: "#E23B3B",
  redBg: "#FDECEC",
  green: "#16A34A",
  greenBg: "#E7F6EC",
  gold: "#B08415",
  goldBg: "#FBF3DC",
  goldInk: "#6B5308",
};

const DARK: Record<ColorToken, string> = {
  bg: "#0F1123",
  card: "#181E36",
  ink: "#E8ECF4",
  muted: "#8892A6",
  soft: "#6B7589",
  border: "#1E2540",
  sky: "#2A3FAF",
  blue: "#5B6FE8",
  navy: "#0F1B5E",
  red: "#F06060",
  redBg: "#3D1515",
  green: "#3DCE7E",
  greenBg: "#1A3D2A",
  gold: "#D4A843",
  goldBg: "#2E2610",
  goldInk: "#C4A44A",
};

/**
 * Resolve warna berdasarkan tema aktif.
 * Menggunakan getComputedStyle dari CSS custom properties di :root.
 * Fallback ke hardcoded LIGHT/DARK maps jika CSS vars tidak tersedia.
 */
export function useDarkColor(token: ColorToken): string {
  const { isDark } = useTheme();

  // Coba baca dari CSS variables dulu (lebih konsisten untuk transisi)
  if (typeof window !== "undefined") {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(`--saldio-${token === "redBg" ? "red-bg" : token === "greenBg" ? "green-bg" : token === "goldBg" ? "gold-bg" : token === "goldInk" ? "gold-ink" : token}`)
      .trim();
    if (raw) return raw;
  }

  return isDark ? DARK[token] : LIGHT[token];
}

/** Static — tanpa hook, return dark/light color berdasarkan isDark. */
export function resolveColor(token: ColorToken, isDark: boolean): string {
  if (typeof window !== "undefined") {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(`--saldio-${token === "redBg" ? "red-bg" : token === "greenBg" ? "green-bg" : token === "goldBg" ? "gold-bg" : token === "goldInk" ? "gold-ink" : token}`)
      .trim();
    if (raw) return raw;
  }
  return isDark ? DARK[token] : LIGHT[token];
}
