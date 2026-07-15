import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { downloadFromDrive, uploadToDrive } from "../lib/drive";
import { newId } from "../lib/ids";
import { loadData, saveData } from "../lib/storage";
import type {
  AppData,
  GoldPriceEntry,
  Transaction,
  Wallet,
} from "../lib/types";
import { EMPTY_DATA } from "../lib/types";
import { useAuth } from "./AuthContext";

interface AppDataState {
  data: AppData;
  loading: boolean;
  addWallet: (wallet: Omit<Wallet, "id" | "createdAt">) => Wallet;
  updateWallet: (id: string, wallet: Partial<Wallet>) => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  addTransactions: (txs: Array<Omit<Transaction, "id">>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactionsBySource: (source: Transaction["source"]) => void;
  deleteTransactionsByBatch: (batchId: string) => void;
  addGoldPrice: (entry: GoldPriceEntry) => void;
  deleteGoldPrice: (date: string) => void;
  deleteWallet: (walletId: string) => void;
  moveWallet: (walletId: string, direction: "up" | "down") => void;
  resetAll: () => void;
  /** Ganti seluruh data (dipakai Mode Tamu untuk memuat data contoh) */
  replaceAll: (next: AppData) => void;
}

const AppDataContext = createContext<AppDataState | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuth();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Muat cache lokal dulu (offline-first), lalu coba tarik dari Drive.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await loadData();
      if (!cancelled) {
        setData(local);
        setLoading(false);
      }
      if (accessToken) {
        try {
          const remote = await downloadFromDrive(accessToken);
          if (remote && !cancelled) {
            setData(remote);
            await saveData(remote);
          }
        } catch {
          // Offline atau token kedaluwarsa — pakai cache lokal.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const persist = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        saveData(next).catch(() => {});
        if (accessToken) {
          if (syncTimer.current) clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            uploadToDrive(accessToken, next).catch(() => {});
          }, 2000);
        }
        return next;
      });
    },
    [accessToken]
  );

  const addWallet = useCallback(
    (wallet: Omit<Wallet, "id" | "createdAt">): Wallet => {
      const full: Wallet = {
        ...wallet,
        id: newId("w"),
        createdAt: new Date().toISOString(),
      };
      persist((prev) => ({ ...prev, wallets: [...prev.wallets, full] }));
      return full;
    },
    [persist]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">) => {
      persist((prev) => ({
        ...prev,
        transactions: [...prev.transactions, { ...tx, id: newId("t") }],
      }));
    },
    [persist]
  );

  const addTransactions = useCallback(
    (txs: Array<Omit<Transaction, "id">>) => {
      persist((prev) => ({
        ...prev,
        transactions: [
          ...prev.transactions,
          ...txs.map((tx) => ({ ...tx, id: newId("t") })),
        ],
      }));
    },
    [persist]
  );

  const updateTransaction = useCallback(
    (id: string, tx: Partial<Transaction>) => {
      persist((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...tx } : t)),
      }));
    },
    [persist]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
    },
    [persist]
  );

  const deleteTransactionsBySource = useCallback(
    (source: Transaction["source"]) => {
      persist((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.source !== source),
      }));
    },
    [persist]
  );

  const deleteTransactionsByBatch = useCallback(
    (batchId: string) => {
      persist((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.importBatch !== batchId),
      }));
    },
    [persist]
  );

  const updateWallet = useCallback(
    (id: string, wallet: Partial<Wallet>) => {
      persist((prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === id ? { ...w, ...wallet } : w)),
      }));
    },
    [persist]
  );

  const addGoldPrice = useCallback(
    (entry: GoldPriceEntry) => {
      persist((prev) => ({
        ...prev,
        goldPriceLog: [
          ...prev.goldPriceLog.filter((p) => p.date !== entry.date),
          entry,
        ].sort((a, b) => a.date.localeCompare(b.date)),
      }));
    },
    [persist]
  );

  const deleteGoldPrice = useCallback(
    (date: string) => {
      persist((prev) => ({
        ...prev,
        goldPriceLog: prev.goldPriceLog.filter((p) => p.date !== date),
      }));
    },
    [persist]
  );

  const deleteWallet = useCallback(
    (walletId: string) => {
      persist((prev) => ({
        ...prev,
        wallets: prev.wallets.filter((w) => w.id !== walletId),
        transactions: prev.transactions.filter((t) => t.walletId !== walletId),
      }));
    },
    [persist]
  );

  const moveWallet = useCallback(
    (walletId: string, direction: "up" | "down") => {
      persist((prev) => {
        const idx = prev.wallets.findIndex((w) => w.id === walletId);
        if (idx === -1) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.wallets.length) return prev;
        const next = [...prev.wallets];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        return { ...prev, wallets: next };
      });
    },
    [persist]
  );

  const resetAll = useCallback(() => {
    persist(() => EMPTY_DATA);
  }, [persist]);

  const replaceAll = useCallback(
    (next: AppData) => {
      persist(() => next);
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      data,
      loading,
      addWallet,
      updateWallet,
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      deleteTransactionsBySource,
      deleteTransactionsByBatch,
      addGoldPrice,
      deleteGoldPrice,
      deleteWallet,
      moveWallet,
      resetAll,
      replaceAll,
    }),
    [data, loading, addWallet, updateWallet, addTransaction, addTransactions, updateTransaction, deleteTransaction, deleteTransactionsBySource, deleteTransactionsByBatch, addGoldPrice, deleteGoldPrice, deleteWallet, moveWallet, resetAll, replaceAll]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataState {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData harus dipakai di dalam AppDataProvider");
  return ctx;
}
