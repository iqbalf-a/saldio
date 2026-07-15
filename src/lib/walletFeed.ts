import type { AppData, Transaction } from "./types";

/**
 * Kembalikan transaksi untuk dompet tertentu.
 * Transfer dihapus karena ini aplikasi money management, bukan dompet ril.
 */
export function walletFeed(data: AppData, walletId: string): Transaction[] {
  return data.transactions.filter((t) => t.walletId === walletId);
}

/** Daftar bulan (YYYY-MM) yang punya data, terbaru dulu; selalu memuat bulan ini. */
export function availableMonths(items: Array<{ date: string }>): string[] {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const set = new Set<string>([current]);
  for (const it of items) set.add(it.date.slice(0, 7));
  return [...set].sort((a, b) => b.localeCompare(a));
}
