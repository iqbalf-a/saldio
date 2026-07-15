import type { AppData } from "../types";
import {
  walletBalance,
  goldGrams,
  latestGoldPrice,
  goldValue,
  liquidTotal,
  goldTotal,
  totalGoldGrams,
  netWorth,
  walletInOut,
  groupByDay,
  netWorthTrend,
} from "../balances";

/* ── Fixtures ─────────────────────────────────────────────── */

const bankWallet = {
  id: "w1",
  name: "Bank Jago",
  template: "bank_jago" as const,
  type: "bank" as const,
  initialBalance: 1_000_000,
  supportsPdfImport: true,
  createdAt: "2026-01-01",
};

const cashWallet = {
  id: "w2",
  name: "Dompet",
  template: "custom" as const,
  type: "cash" as const,
  initialBalance: 500_000,
  supportsPdfImport: false,
  createdAt: "2026-01-01",
};

const goldWallet = {
  id: "g1",
  name: "Emas",
  template: "custom" as const,
  type: "gold" as const,
  totalGrams: 10,
  supportsPdfImport: false,
  createdAt: "2026-01-01",
};

function tx(
  walletId: string,
  type: "income" | "expense" | "buy_gold" | "sell_gold",
  date: string,
  amount?: number,
  grams?: number,
) {
  return {
    id: `t-${Math.random().toString(36).slice(2, 7)}`,
    walletId,
    date,
    type,
    amount,
    grams,
    source: "manual" as const,
  };
}

const baseData: AppData = {
  wallets: [bankWallet, cashWallet, goldWallet],
  transactions: [
    tx("w1", "income", "2026-07-01", 2_000_000),
    tx("w1", "expense", "2026-07-02", 300_000),
    tx("w2", "income", "2026-07-03", 100_000),
    tx("g1", "buy_gold", "2026-07-01", undefined, 5),
    tx("g1", "sell_gold", "2026-07-05", undefined, 2),
  ],
  goldPriceLog: [
    { date: "2026-07-01", pricePerGram: 1_500_000 },
    { date: "2026-07-10", pricePerGram: 1_550_000 },
  ],
};

/* ── walletBalance ────────────────────────────────────────── */

describe("walletBalance", () => {
  it("menghitung saldo bank: initial + income - expense", () => {
    expect(walletBalance(baseData, bankWallet)).toBe(2_700_000);
  });

  it("menghitung saldo cash", () => {
    expect(walletBalance(baseData, cashWallet)).toBe(600_000);
  });

  it("dompet tanpa transaksi mengembalikan initialBalance", () => {
    const empty: AppData = { wallets: [], transactions: [], goldPriceLog: [] };
    expect(walletBalance(empty, bankWallet)).toBe(1_000_000);
  });

  it("dompet tanpa initialBalance dimulai dari 0", () => {
    const w = { ...bankWallet, initialBalance: undefined };
    expect(walletBalance(baseData, w)).toBe(1_700_000);
  });
});

/* ── goldGrams ────────────────────────────────────────────── */

describe("goldGrams", () => {
  it("menghitung gram: awal + buy - sell", () => {
    expect(goldGrams(baseData, goldWallet)).toBe(13);
  });

  it("dompet tanpa transaksi mengembalikan totalGrams awal", () => {
    const empty: AppData = { wallets: [], transactions: [], goldPriceLog: [] };
    expect(goldGrams(empty, goldWallet)).toBe(10);
  });

  it("dompet tanpa totalGrams dimulai dari 0", () => {
    const w = { ...goldWallet, totalGrams: undefined };
    expect(goldGrams(baseData, w)).toBe(3);
  });
});

/* ── latestGoldPrice ──────────────────────────────────────── */

describe("latestGoldPrice", () => {
  it("mengembalikan harga terbaru", () => {
    const result = latestGoldPrice(baseData);
    expect(result).toEqual({ date: "2026-07-10", pricePerGram: 1_550_000 });
  });

  it("mengembalikan null jika log kosong", () => {
    const empty: AppData = { wallets: [], transactions: [], goldPriceLog: [] };
    expect(latestGoldPrice(empty)).toBeNull();
  });
});

/* ── goldValue ────────────────────────────────────────────── */

describe("goldValue", () => {
  it("menghitung nilai Rupiah: gram × harga terbaru", () => {
    expect(goldValue(baseData, goldWallet)).toBe(13 * 1_550_000);
  });

  it("mengembalikan 0 jika tidak ada harga", () => {
    const empty: AppData = { wallets: [], transactions: [], goldPriceLog: [] };
    expect(goldValue(empty, goldWallet)).toBe(0);
  });
});

/* ── liquidTotal ──────────────────────────────────────────── */

describe("liquidTotal", () => {
  it("total aset bank + cash", () => {
    expect(liquidTotal(baseData)).toBe(2_700_000 + 600_000);
  });
});

/* ── goldTotal ────────────────────────────────────────────── */

describe("goldTotal", () => {
  it("total nilai emas semua dompet emas", () => {
    expect(goldTotal(baseData)).toBe(13 * 1_550_000);
  });
});

/* ── totalGoldGrams ───────────────────────────────────────── */

describe("totalGoldGrams", () => {
  it("total gram semua dompet emas", () => {
    expect(totalGoldGrams(baseData)).toBe(13);
  });
});

/* ── netWorth ─────────────────────────────────────────────── */

describe("netWorth", () => {
  it("liquid + gold", () => {
    expect(netWorth(baseData)).toBe(liquidTotal(baseData) + goldTotal(baseData));
  });
});

/* ── walletInOut ──────────────────────────────────────────── */

describe("walletInOut", () => {
  it("tanpa filter bulan", () => {
    expect(walletInOut(baseData, "w1")).toEqual({
      inflow: 2_000_000,
      outflow: 300_000,
    });
  });

  it("dengan filter yearMonth", () => {
    expect(walletInOut(baseData, "w1", "2026-07")).toEqual({
      inflow: 2_000_000,
      outflow: 300_000,
    });
  });

  it("filter bulan kosong", () => {
    expect(walletInOut(baseData, "w1", "2026-01")).toEqual({
      inflow: 0,
      outflow: 0,
    });
  });
});

/* ── groupByDay ───────────────────────────────────────────── */

describe("groupByDay", () => {
  it("mengelompokkan transaksi per hari", () => {
    const groups = groupByDay(baseData.transactions);
    // 4 tanggal berbeda
    expect(groups).toHaveLength(4);
    // urutan terbaru dulu
    expect(groups[0].date).toBe("2026-07-05");
    expect(groups[3].date).toBe("2026-07-01");
  });

  it("subtotal per hari benar", () => {
    const groups = groupByDay(baseData.transactions);
    // 2026-07-05: sell_gold → gramSubtotal = -2
    const jul5 = groups.find((g) => g.date === "2026-07-05")!;
    expect(jul5.subtotal).toBe(0);
    expect(jul5.gramSubtotal).toBe(-2);

    // 2026-07-01: income w1 2_000_000 + buy_gold g1 5g
    const jul1 = groups.find((g) => g.date === "2026-07-01")!;
    expect(jul1.subtotal).toBe(2_000_000);
    expect(jul1.gramSubtotal).toBe(5);
  });
});

/* ── netWorthTrend ────────────────────────────────────────── */

describe("netWorthTrend", () => {
  it("mengembalikan array sepanjang months (default 6)", () => {
    const trend = netWorthTrend(baseData);
    expect(trend).toHaveLength(6);
  });

  it("format yearMonth benar", () => {
    const trend = netWorthTrend(baseData, 2);
    for (const { yearMonth } of trend) {
      expect(yearMonth).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it("semua item punya value numerik", () => {
    const trend = netWorthTrend(baseData, 3);
    for (const { value } of trend) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
