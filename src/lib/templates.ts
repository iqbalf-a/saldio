import type { WalletTemplate, WalletTemplateKey } from "./types";

export const WALLET_TEMPLATES: WalletTemplate[] = [
  { key: "bank_jago", label: "Bank Jago", supportsPdfImport: true },
  { key: "mandiri", label: "Mandiri", supportsPdfImport: true },
  { key: "bca", label: "BCA", supportsPdfImport: true },
  { key: "super_bank", label: "Super Bank", supportsPdfImport: false },
  { key: "neo_bank", label: "Neo Bank", supportsPdfImport: false },
  { key: "custom", label: "Kustom", supportsPdfImport: false },
];

export interface BadgeStyle {
  initials: string;
  color: string;
  background: string;
}

/** Badge inisial berwarna per template — tanpa logo bank asli. */
export const TEMPLATE_BADGES: Record<WalletTemplateKey, BadgeStyle> = {
  bank_jago: { initials: "Jg", color: "#E8740C", background: "#FDEBD7" },
  mandiri: { initials: "Md", color: "#1E4FA3", background: "#E3ECFA" },
  bca: { initials: "BC", color: "#2456C4", background: "#E3ECFA" },
  super_bank: { initials: "Sb", color: "#8B5CF6", background: "#F1EAFE" },
  neo_bank: { initials: "Nb", color: "#B08415", background: "#FBF3DC" },
  custom: { initials: "Ku", color: "#64748B", background: "#EDF1F7" },
};

export function badgeForWallet(name: string, template: WalletTemplateKey): BadgeStyle {
  const base = TEMPLATE_BADGES[template];
  if (template !== "custom") return base;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return { ...base, initials: initials || "Ku" };
}
