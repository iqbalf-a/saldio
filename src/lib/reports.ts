import type { Transaction } from "./types";

export interface CategorySpend {
  categoryKey: string;
  amount: number;
}

/** Total pengeluaran per kategori untuk satu bulan (YYYY-MM), terbesar dulu. */
export function categorySpendForMonth(transactions: Transaction[], yearMonth: string): CategorySpend[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.date.startsWith(yearMonth)) continue;
    const key = t.category || "Lainnya";
    map.set(key, (map.get(key) ?? 0) + (t.amount ?? 0));
  }
  return [...map.entries()]
    .map(([categoryKey, amount]) => ({ categoryKey, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Total pengeluaran (semua kategori) untuk satu bulan (YYYY-MM). */
export function monthTotalExpense(transactions: Transaction[], yearMonth: string): number {
  return transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
}

/** Net (pemasukan - pengeluaran) per hari (YYYY-MM-DD) dalam satu bulan. Emas diabaikan (tidak ada nilai Rupiah langsung). */
export function dailyNetChange(transactions: Transaction[], yearMonth: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (!t.date.startsWith(yearMonth)) continue;
    if (t.type === "income") map[t.date] = (map[t.date] ?? 0) + (t.amount ?? 0);
    else if (t.type === "expense") map[t.date] = (map[t.date] ?? 0) - (t.amount ?? 0);
  }
  return map;
}
