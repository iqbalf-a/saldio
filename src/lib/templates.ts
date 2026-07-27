import type { WalletTemplate, WalletTemplateKey } from "./types";

export const WALLET_TEMPLATES: WalletTemplate[] = [
  { key: "bank_jago", label: "Bank Jago", supportsPdfImport: true },
  { key: "mandiri", label: "Mandiri", supportsPdfImport: true },
  { key: "bca", label: "BCA", supportsPdfImport: true },
  { key: "super_bank", label: "Super Bank", supportsPdfImport: true },
  { key: "neo_bank", label: "Neo Bank", supportsPdfImport: true },
  { key: "custom", label: "Kustom", supportsPdfImport: false },
];

/**
 * Kemampuan impor PDF ditentukan dari template terkini, bukan flag yang
 * tersimpan di dompet — agar dompet lama ikut mendapat parser baru
 * (mis. Neo Bank/Super Bank yang awalnya manual saja).
 */
export function walletSupportsPdfImport(wallet: {
  template: WalletTemplateKey;
  supportsPdfImport: boolean;
  type?: string;
}): boolean {
  if (wallet.type === "gold") return false;
  const template = WALLET_TEMPLATES.find((t) => t.key === wallet.template);
  return template ? template.supportsPdfImport : wallet.supportsPdfImport;
}

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

const TEMPLATE_BADGES_DARK: Record<WalletTemplateKey, BadgeStyle> = {
  bank_jago: { initials: "Jg", color: "#F59E0B", background: "#3D2A14" },
  mandiri: { initials: "Md", color: "#6B9BFF", background: "#1A2744" },
  bca: { initials: "BC", color: "#6B9BFF", background: "#1A2744" },
  super_bank: { initials: "Sb", color: "#A78BFA", background: "#2A1F40" },
  neo_bank: { initials: "Nb", color: "#D4A843", background: "#3A2E10" },
  custom: { initials: "Ku", color: "#94A3B8", background: "#2A3456" },
};

export function badgeForWallet(
  name: string,
  template: WalletTemplateKey,
  isDark?: boolean,
): BadgeStyle {
  const base = isDark ? TEMPLATE_BADGES_DARK[template] : TEMPLATE_BADGES[template];
  if (template !== "custom") return base;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return { ...base, initials: initials || "Ku" };
}
