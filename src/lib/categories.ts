import type { CustomCategory } from "./types";

export interface Category {
  key: string;
  label: string;
  /** Nama ikon Ionicons */
  icon: string;
  color: string;
  background: string;
}

export const CATEGORIES: Category[] = [
  { key: "Makanan", label: "Makanan", icon: "restaurant", color: "#E86A33", background: "#FDEEE4" },
  { key: "Transportasi", label: "Transportasi", icon: "bicycle", color: "#2F6BFF", background: "#E8F0FE" },
  { key: "Belanja", label: "Belanja", icon: "basket", color: "#8B5CF6", background: "#F1EAFE" },
  { key: "Tagihan", label: "Tagihan", icon: "flash", color: "#D9A400", background: "#FEF6DC" },
  { key: "Hiburan", label: "Hiburan", icon: "film", color: "#E23B3B", background: "#FDE8E8" },
  { key: "Gaji", label: "Gaji", icon: "briefcase", color: "#16A34A", background: "#E7F6EC" },
  { key: "Transfer", label: "Transfer", icon: "swap-horizontal", color: "#3D51E0", background: "#EAEFFB" },
  { key: "Emas", label: "Emas", icon: "server", color: "#B08415", background: "#FBF3DC" },
  { key: "Lainnya", label: "Lainnya", icon: "apps", color: "#64748B", background: "#EDF1F7" },
];

/** Gabungan kategori bawaan + kategori kustom. */
export function allCategories(custom?: CustomCategory[]): Category[] {
  const customList: Category[] = (custom ?? []).map((c) => ({
    key: c.key,
    label: c.label,
    icon: c.icon,
    color: c.color,
    background: c.background,
  }));
  return [...CATEGORIES, ...customList];
}

export function categoryByKey(key?: string, custom?: CustomCategory[]): Category {
  return allCategories(custom).find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Tebak kategori dari deskripsi transaksi hasil impor PDF. */
export function guessCategory(description: string): string {
  const d = description.toUpperCase();
  const rules: Array<[RegExp, string]> = [
    [/PAYROLL|GAJI|SALARY/, "Gaji"],
    [/KOPI|COFFEE|RESTO|WARTEG|FOOD|MCD|KFC|BAKSO|GEPREK|MAKAN|GORENGAN|JAJAN/, "Makanan"],
    [/GOJEK|GRAB|GORIDE|MRT|TRANSJAKARTA|KAI|PARKIR|BENSIN|PERTAMINA|SHELL/, "Transportasi"],
    [/ALFAMART|ALFAMIDI|MIDI_|INDOMARET|MINI ?MARKET|TOKOPEDIA|SHOPEE|LAZADA|BLIBLI|SUPERMARKET|E-COMMERCE/, "Belanja"],
    [/PLN|PRABAYAR|LISTRIK|PDAM|BPJS|TELKOM|INDIHOME|INTERNET|TAGIHAN|PULSA|BYU/, "Tagihan"],
    [/NETFLIX|SPOTIFY|DISNEY|VIDIO|CINEMA|CGV|XXI|GAME|STEAM/, "Hiburan"],
    [/TRSF|TRANSFER|BI ?-?FAST|KLIRING|SKN|POCKET MONEY|BETWEEN POCKETS|RDN|CELENGAN|PENGISIAN SAKU/, "Transfer"],
  ];
  for (const [re, cat] of rules) {
    if (re.test(d)) return cat;
  }
  return "Lainnya";
}
