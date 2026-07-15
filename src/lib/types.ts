export type WalletType = "bank" | "cash" | "gold";

export type WalletTemplateKey =
  | "bank_jago"
  | "mandiri"
  | "bca"
  | "super_bank"
  | "neo_bank"
  | "custom";

export interface Wallet {
  id: string;
  name: string;
  template: WalletTemplateKey;
  type: WalletType;
  /** Saldo awal untuk dompet bank/tunai */
  initialBalance?: number;
  /** Gram awal untuk dompet emas */
  totalGrams?: number;
  supportsPdfImport: boolean;
  createdAt: string;
}

export type TransactionType = "income" | "expense" | "buy_gold" | "sell_gold";

export type TransactionSource =
  | "manual"
  | "import_pdf_bca"
  | "import_pdf_mandiri"
  | "import_pdf_bank_jago"
  | "import_pdf_neo_bank"
  | "import_pdf_super_bank";

export interface Transaction {
  id: string;
  walletId: string;
  /** ISO date, mis. 2026-07-10 */
  date: string;
  type: TransactionType;
  /** Rupiah — untuk income/expense */
  amount?: number;
  /** Gram — untuk buy_gold/sell_gold */
  grams?: number;
  category?: string;
  note?: string;
  source: TransactionSource;
  /** ID batch impor PDF — untuk undo per batch */
  importBatch?: string;
}

export interface GoldPriceEntry {
  date: string;
  pricePerGram: number;
}

export interface WalletTemplate {
  key: WalletTemplateKey;
  label: string;
  supportsPdfImport: boolean;
}

export interface AppData {
  wallets: Wallet[];
  transactions: Transaction[];
  goldPriceLog: GoldPriceEntry[];
  /** ISO timestamp kapan data terakhir diubah. Dipakai untuk deteksi konflik multi-perangkat. */
  lastModified?: string;
}

export const EMPTY_DATA: AppData = {
  wallets: [],
  transactions: [],
  goldPriceLog: [],
};

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}
