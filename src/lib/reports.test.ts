import { dailyNetChange } from "./reports";
import type { Transaction } from "./types";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    walletId: "w1",
    date: "2026-07-15",
    type: "expense",
    amount: 10000,
    source: "manual",
    ...overrides,
  };
}

test("dailyNetChange nets income and expense per day within the month", () => {
  const txs: Transaction[] = [
    tx({ id: "a", type: "income", amount: 100000, date: "2026-07-10" }),
    tx({ id: "b", type: "expense", amount: 30000, date: "2026-07-10" }),
    tx({ id: "c", type: "expense", amount: 20000, date: "2026-07-11" }),
    tx({ id: "d", type: "expense", amount: 999999, date: "2026-06-30" }), // different month, excluded
  ];
  expect(dailyNetChange(txs, "2026-07")).toEqual({
    "2026-07-10": 70000,
    "2026-07-11": -20000,
  });
});

test("dailyNetChange ignores gold transactions (no Rupiah amount)", () => {
  const txs: Transaction[] = [tx({ type: "buy_gold", amount: undefined, grams: 2, date: "2026-07-05" })];
  expect(dailyNetChange(txs, "2026-07")).toEqual({});
});
