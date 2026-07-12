import type { AppData, Transaction } from "./types";

/**
 * Gabungkan transaksi sebuah dompet dengan transfer yang melibatkannya,
 * sebagai baris Transaction sintetis (kategori "Transfer") agar bisa
 * dikelompokkan & dirender dengan komponen yang sama.
 */
export function walletFeed(data: AppData, walletId: string): Transaction[] {
  const walletName = (id: string) => data.wallets.find((w) => w.id === id)?.name ?? "Dompet lain";
  const txs = data.transactions.filter((t) => t.walletId === walletId);
  const transferRows: Transaction[] = [];
  for (const tr of data.transfers) {
    if (tr.fromWalletId === walletId) {
      transferRows.push({
        id: `${tr.id}_out`,
        walletId,
        date: tr.date,
        type: "expense",
        amount: tr.amount,
        category: "Transfer",
        note: tr.note || `Transfer ke ${walletName(tr.toWalletId)}`,
        source: "manual",
      });
    }
    if (tr.toWalletId === walletId) {
      transferRows.push({
        id: `${tr.id}_in`,
        walletId,
        date: tr.date,
        type: "income",
        amount: tr.amount,
        category: "Transfer",
        note: tr.note || `Transfer dari ${walletName(tr.fromWalletId)}`,
        source: "manual",
      });
    }
  }
  return [...txs, ...transferRows];
}

/** Daftar bulan (YYYY-MM) yang punya data, terbaru dulu; selalu memuat bulan ini. */
export function availableMonths(items: Array<{ date: string }>): string[] {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const set = new Set<string>([current]);
  for (const it of items) set.add(it.date.slice(0, 7));
  return [...set].sort((a, b) => b.localeCompare(a));
}
