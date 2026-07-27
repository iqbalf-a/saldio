/**
 * useDarkColor — Hook untuk resolve inline style colors berdasarkan tema aktif.
 *
 * Digunakan untuk style={{ color: ... }} / prop color={...} (mis. Ionicons)
 * yang tidak bisa pakai Tailwind class.
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
  | "goldDeep"
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
  goldDeep: "#8A6A10",
  goldBg: "#FBF3DC",
  goldInk: "#6B5308",
};

// Harus sinkron dengan blok "dark-*" di tailwind.config.js — kalau salah satu
// diubah, ubah juga yang lain (tidak ada mekanisme yang memaksa keduanya sinkron).
const DARK: Record<ColorToken, string> = {
  bg: "#0F1123",
  card: "#181E36",
  ink: "#E8ECF4",
  muted: "#8892A6",
  soft: "#6B7589",
  border: "#1E2540",
  sky: "#1C2541",
  blue: "#5B6FE8",
  navy: "#0F1B5E",
  red: "#F06060",
  redBg: "#3D1515",
  green: "#3DCE7E",
  greenBg: "#1A3D2A",
  gold: "#D4A843",
  goldDeep: "#B8923E",
  goldBg: "#2E2610",
  goldInk: "#C4A44A",
};

/** Resolve warna berdasarkan tema aktif — baca langsung dari map statis (tanpa DOM read). */
export function useDarkColor(token: ColorToken): string {
  const { isDark } = useTheme();
  return isDark ? DARK[token] : LIGHT[token];
}
