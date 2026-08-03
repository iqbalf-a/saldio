import { liquidTotal, goldTotal, netWorth } from "./balances";
import type { AppData, Wallet } from "./types";

function wallet(overrides: Partial<Wallet>): Wallet {
  return {
    id: "w1",
    name: "Test",
    template: "custom",
    type: "cash",
    supportsPdfImport: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    initialBalance: 100000,
    ...overrides,
  };
}

test("liquidTotal excludes wallets with includeInTotal false", () => {
  const data: AppData = {
    wallets: [
      wallet({ id: "a", initialBalance: 100000 }),
      wallet({ id: "b", initialBalance: 50000, includeInTotal: false }),
    ],
    transactions: [],
    goldPriceLog: [],
  };
  expect(liquidTotal(data)).toBe(100000);
});

test("liquidTotal includes wallets with includeInTotal undefined (legacy wallets)", () => {
  const data: AppData = {
    wallets: [wallet({ id: "a", initialBalance: 100000 })],
    transactions: [],
    goldPriceLog: [],
  };
  expect(liquidTotal(data)).toBe(100000);
});

test("goldTotal excludes gold wallets with includeInTotal false", () => {
  const data: AppData = {
    wallets: [
      wallet({ id: "g1", type: "gold", totalGrams: 10, includeInTotal: false }),
    ],
    transactions: [],
    goldPriceLog: [{ date: "2026-01-01", pricePerGram: 1000000 }],
  };
  expect(goldTotal(data)).toBe(0);
});

test("netWorth reflects excluded wallets across both liquid and gold", () => {
  const data: AppData = {
    wallets: [
      wallet({ id: "a", initialBalance: 100000 }),
      wallet({ id: "b", initialBalance: 50000, includeInTotal: false }),
    ],
    transactions: [],
    goldPriceLog: [],
  };
  expect(netWorth(data)).toBe(100000);
});
