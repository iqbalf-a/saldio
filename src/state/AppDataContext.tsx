import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { downloadFromDrive, uploadToDrive } from "../lib/drive";
import { newId } from "../lib/ids";
import { loadData, saveData } from "../lib/storage";
import type {
  AppData,
  GoldPriceEntry,
  Transaction,
  Transfer,
  Wallet,
} from "../lib/types";
import { EMPTY_DATA } from "../lib/types";
import { useAuth } from "./AuthContext";

interface AppDataState {
  data: AppData;
  loading: boolean;
  addWallet: (wallet: Omit<Wallet, "id" | "createdAt">) => Wallet;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  addTransactions: (txs: Array<Omit<Transaction, "id">>) => void;
  addTransfer: (transfer: Omit<Transfer, "id">) => void;
  addGoldPrice: (entry: GoldPriceEntry) => void;
  deleteWallet: (walletId: string) => void;
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

  const addTransfer = useCallback(
    (transfer: Omit<Transfer, "id">) => {
      persist((prev) => ({
        ...prev,
        transfers: [...prev.transfers, { ...transfer, id: newId("tr") }],
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

  const deleteWallet = useCallback(
    (walletId: string) => {
      persist((prev) => ({
        ...prev,
        wallets: prev.wallets.filter((w) => w.id !== walletId),
        transactions: prev.transactions.filter((t) => t.walletId !== walletId),
        transfers: prev.transfers.filter(
          (tr) => tr.fromWalletId !== walletId && tr.toWalletId !== walletId
        ),
      }));
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
      addTransaction,
      addTransactions,
      addTransfer,
      addGoldPrice,
      deleteWallet,
      resetAll,
      replaceAll,
    }),
    [data, loading, addWallet, addTransaction, addTransactions, addTransfer, addGoldPrice, deleteWallet, resetAll, replaceAll]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataState {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData harus dipakai di dalam AppDataProvider");
  return ctx;
}
