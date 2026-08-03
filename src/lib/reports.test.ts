import { categorySpendForMonth, dailyNetChange, monthTotalExpense } from "./reports";
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

test("categorySpendForMonth sums expenses per category for the given month, sorted desc", () => {
  const txs: Transaction[] = [
    tx({ id: "a", category: "Makanan", amount: 50000 }),
    tx({ id: "b", category: "Makanan", amount: 20000 }),
    tx({ id: "c", category: "Transportasi", amount: 100000 }),
    tx({ id: "d", category: "Makanan", amount: 999999, date: "2026-06-01" }), // different month, excluded
    tx({ id: "e", type: "income", category: "Gaji", amount: 5000000 }), // not expense, excluded
  ];
  expect(categorySpendForMonth(txs, "2026-07")).toEqual([
    { categoryKey: "Transportasi", amount: 100000 },
    { categoryKey: "Makanan", amount: 70000 },
  ]);
});

test("categorySpendForMonth defaults missing category to 'Lainnya'", () => {
  const txs: Transaction[] = [tx({ category: undefined, amount: 15000 })];
  expect(categorySpendForMonth(txs, "2026-07")).toEqual([{ categoryKey: "Lainnya", amount: 15000 }]);
});

test("monthTotalExpense sums only expenses in the given month", () => {
  const txs: Transaction[] = [
    tx({ id: "a", amount: 50000, date: "2026-07-01" }),
    tx({ id: "b", amount: 20000, date: "2026-07-30" }),
    tx({ id: "c", amount: 999999, date: "2026-06-30" }),
    tx({ id: "d", type: "income", amount: 5000000, date: "2026-07-05" }),
  ];
  expect(monthTotalExpense(txs, "2026-07")).toBe(70000);
});
