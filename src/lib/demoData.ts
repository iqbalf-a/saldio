import { toISODate } from "./format";
import type { AppData } from "./types";

/**
 * Data contoh untuk Mode Tamu — mencerminkan mockup desain
 * (5 dompet, transaksi beberapa hari terakhir, emas 12,5 g).
 * Tanggal dihitung relatif hari ini agar grup "Hari ini/Kemarin" hidup.
 */
export function buildDemoData(): AppData {
  const d = (offsetDays: number) => toISODate(new Date(Date.now() - offsetDays * 86400000));
  const createdAt = new Date().toISOString();

  return {
    wallets: [
      {
        id: "demo_w_jago",
        name: "Jago Utama",
        template: "bank_jago",
        type: "bank",
        initialBalance: 4155000,
        supportsPdfImport: true,
        createdAt,
      },
      {
        id: "demo_w_mandiri",
        name: "Mandiri Tabungan",
        template: "mandiri",
        type: "bank",
        initialBalance: 15100000,
        supportsPdfImport: true,
        createdAt,
      },
      {
        id: "demo_w_bca",
        name: "BCA Payroll",
        template: "bca",
        type: "bank",
        initialBalance: 24928000,
        supportsPdfImport: true,
        createdAt,
      },
      {
        id: "demo_w_tunai",
        name: "Tunai",
        template: "custom",
        type: "cash",
        initialBalance: 650000,
        supportsPdfImport: false,
        createdAt,
      },
      {
        id: "demo_w_emas",
        name: "Emas Pegadaian",
        template: "custom",
        type: "gold",
        totalGrams: 11.3,
        supportsPdfImport: false,
        createdAt,
      },
    ],
    transactions: [
      // Hari ini
      { id: "demo_t1", walletId: "demo_w_jago", date: d(0), type: "expense", amount: 45000, category: "Makanan", note: "Makan siang warteg", source: "manual" },
      { id: "demo_t2", walletId: "demo_w_jago", date: d(0), type: "expense", amount: 22000, category: "Transportasi", note: "GoRide ke kantor", source: "manual" },
      { id: "demo_t3", walletId: "demo_w_jago", date: d(0), type: "expense", amount: 78000, category: "Belanja", note: "Belanja Indomaret", source: "manual" },
      { id: "demo_t4", walletId: "demo_w_bca", date: d(0), type: "expense", amount: 178000, category: "Belanja", note: "Belanja mingguan", source: "import_pdf_bca" },
      // Kemarin
      { id: "demo_t5", walletId: "demo_w_jago", date: d(1), type: "income", amount: 5000000, category: "Gaji", note: "Gaji bulanan — PT Maju", source: "import_pdf_bank_jago" },
      { id: "demo_t6", walletId: "demo_w_jago", date: d(1), type: "expense", amount: 250000, category: "Tagihan", note: "Listrik PLN", source: "import_pdf_bank_jago" },
      { id: "demo_t7", walletId: "demo_w_mandiri", date: d(1), type: "income", amount: 100000, category: "Lainnya", note: "Cashback merchant", source: "manual" },
      // Beberapa hari lalu
      { id: "demo_t8", walletId: "demo_w_jago", date: d(4), type: "expense", amount: 110000, category: "Hiburan", note: "Netflix bulanan", source: "manual" },
      // Emas
      { id: "demo_t9", walletId: "demo_w_emas", date: d(4), type: "buy_gold", grams: 1, note: "Beli emas Pegadaian", source: "manual" },
      { id: "demo_t10", walletId: "demo_w_emas", date: d(27), type: "buy_gold", grams: 0.5, note: "Beli emas Pegadaian", source: "manual" },
      { id: "demo_t11", walletId: "demo_w_emas", date: d(63), type: "sell_gold", grams: 0.3, note: "Jual sebagian", source: "manual" },
    ],
    goldPriceLog: [
      { date: d(32), pricePerGram: 1448000 },
      { date: d(18), pricePerGram: 1470000 },
      { date: d(4), pricePerGram: 1485000 },
    ],
  };
}
