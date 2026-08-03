import type { Transaction } from "./types";

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
