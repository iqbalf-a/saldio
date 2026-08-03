import { toISODate, toYearMonth } from "./format";
import type { AppData, Transaction, Wallet } from "./types";

/**
 * Apakah dompet ikut dihitung di Total Aset / komposisi / kalender ringkasan.
 * Default true bila field belum pernah diset (dompet lama sebelum fitur ini ada).
 * Satu-satunya tempat aturan "includeInTotal===false artinya dikecualikan"
 * didefinisikan — semua konsumen (balances, AssetsScreen, HistoryScreen) wajib
 * memanggil ini, bukan menulis ulang `!== false` sendiri.
 */
export function isIncludedInTotal(wallet: Wallet): boolean {
  return wallet.includeInTotal !== false;
}

/** Saldo dompet bank/tunai: saldo awal + pemasukan - pengeluaran. */
export function walletBalance(data: AppData, wallet: Wallet): number {
  if (wallet.type === "gold") return goldValue(data, wallet);
  let balance = wallet.initialBalance ?? 0;
  for (const t of data.transactions) {
    if (t.walletId !== wallet.id) continue;
    if (t.type === "income") balance += t.amount ?? 0;
    else if (t.type === "expense") balance -= t.amount ?? 0;
  }
  return balance;
}

/** Total gram emas dompet: gram awal + beli - jual. Simpan nilai asli tanpa pembulatan. */
export function goldGrams(data: AppData, wallet: Wallet): number {
  let grams = wallet.totalGrams ?? 0;
  for (const t of data.transactions) {
    if (t.walletId !== wallet.id) continue;
    if (t.type === "buy_gold") grams += t.grams ?? 0;
    else if (t.type === "sell_gold") grams -= t.grams ?? 0;
  }
  return grams;
}

export function latestGoldPrice(data: AppData): { pricePerGram: number; date: string } | null {
  if (data.goldPriceLog.length === 0) return null;
  const sorted = [...data.goldPriceLog].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0];
}

/** Nilai Rupiah dompet emas berdasarkan harga per gram terakhir. Simpan nilai asli. */
export function goldValue(data: AppData, wallet: Wallet): number {
  const price = latestGoldPrice(data);
  if (!price) return 0;
  return goldGrams(data, wallet) * price.pricePerGram;
}

/** Total aset likuid (bank + tunai). */
export function liquidTotal(data: AppData): number {
  return data.wallets
    .filter((w) => w.type !== "gold" && isIncludedInTotal(w))
    .reduce((sum, w) => sum + walletBalance(data, w), 0);
}

/** Total nilai emas seluruh dompet emas. */
export function goldTotal(data: AppData): number {
  return data.wallets
    .filter((w) => w.type === "gold" && isIncludedInTotal(w))
    .reduce((sum, w) => sum + goldValue(data, w), 0);
}

export function totalGoldGrams(data: AppData): number {
  const total = data.wallets
    .filter((w) => w.type === "gold" && isIncludedInTotal(w))
    .reduce((sum, w) => sum + goldGrams(data, w), 0);
  return total;
}

export function netWorth(data: AppData): number {
  return liquidTotal(data) + goldTotal(data);
}

/** Pemasukan & pengeluaran sebuah dompet (untuk header "Masuk / Keluar"). */
export function walletInOut(
  data: AppData,
  walletId: string,
  yearMonth?: string
): { inflow: number; outflow: number } {
  let inflow = 0;
  let outflow = 0;
  for (const t of data.transactions) {
    if (t.walletId !== walletId) continue;
    if (yearMonth && !t.date.startsWith(yearMonth)) continue;
    if (t.type === "income") inflow += t.amount ?? 0;
    else if (t.type === "expense") outflow += t.amount ?? 0;
  }
  return { inflow, outflow };
}

export interface DayGroup<T> {
  date: string;
  items: T[];
  /** Net Rupiah hari itu (transfer tidak dihitung sebagai net) */
  subtotal: number;
  /** Net gram hari itu (untuk transaksi emas) */
  gramSubtotal: number;
}

/** Kelompokkan transaksi per hari, terbaru dulu, dengan subtotal harian. */
export function groupByDay(transactions: Transaction[]): DayGroup<Transaction>[] {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = map.get(t.date) ?? [];
    list.push(t);
    map.set(t.date, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => {
      let subtotal = 0;
      let gramSubtotal = 0;
      for (const t of items) {
        if (t.type === "income") subtotal += t.amount ?? 0;
        else if (t.type === "expense") subtotal -= t.amount ?? 0;
        else if (t.type === "buy_gold") gramSubtotal += t.grams ?? 0;
        else if (t.type === "sell_gold") gramSubtotal -= t.grams ?? 0;
      }
      return { date, items, subtotal, gramSubtotal };
    });
}

/** Riwayat nilai kekayaan bersih per akhir bulan, n bulan terakhir. */
export function netWorthTrend(data: AppData, months = 6): Array<{ yearMonth: string; value: number }> {
  const now = new Date();
  const result: Array<{ yearMonth: string; value: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = toYearMonth(toISODate(d));
    result.push({ yearMonth: ym, value: netWorthUpTo(data, ym) });
  }
  return result;
}

function netWorthUpTo(data: AppData, yearMonth: string): number {
  const cutoff = `${yearMonth}-99`;
  let total = 0;
  for (const w of data.wallets) {
    if (!isIncludedInTotal(w)) continue;
    if (w.type === "gold") {
      let grams = w.totalGrams ?? 0;
      let gramValue = 0;
      for (const t of data.transactions) {
        if (t.walletId !== w.id || t.date > cutoff) continue;
        if (t.type === "buy_gold") {
          grams += t.grams ?? 0;
          const priceAtTx = data.goldPriceLog
            .filter((p) => p.date <= t.date)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          gramValue += (t.grams ?? 0) * (priceAtTx?.pricePerGram ?? 0);
        } else if (t.type === "sell_gold") {
          grams -= t.grams ?? 0;
          const priceAtTx = data.goldPriceLog
            .filter((p) => p.date <= t.date)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          gramValue -= (t.grams ?? 0) * (priceAtTx?.pricePerGram ?? 0);
        }
      }
      total += gramValue;
    } else {
      let balance = w.initialBalance ?? 0;
      for (const t of data.transactions) {
        if (t.walletId !== w.id || t.date > cutoff) continue;
        if (t.type === "income") balance += t.amount ?? 0;
        else if (t.type === "expense") balance -= t.amount ?? 0;
      }
      total += balance;
    }
  }
  return total;
}
