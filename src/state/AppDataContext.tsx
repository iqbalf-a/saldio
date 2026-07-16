import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { downloadFromDrive, DriveAuthError, uploadToDrive } from "../lib/drive";
import { newId } from "../lib/ids";
import { loadData, saveData } from "../lib/storage";
import type {
  AppData,
  GoldPriceEntry,
  CustomCategory,
  RecurringTransaction,
  CategoryBudget,
  Transaction,
  Wallet,
} from "../lib/types";
import { EMPTY_DATA } from "../lib/types";
import { useAuth } from "./AuthContext";

interface AppDataState {
  data: AppData;
  loading: boolean;
  /** Timestamp (ms) terakhir kali sinkronisasi dengan Drive berhasil, atau null jika belum pernah. */
  lastSyncTimestamp: number | null;
  /** True jika terdeteksi token Google Drive kedaluwarsa (HTTP 401). */
  authError: boolean;
  /** Reset flag authError setelah user menanggapi. */
  clearAuthError: () => void;
  /** Sinkronisasi manual — tarik data dari Drive sekarang. */
  manualSync: () => Promise<void>;
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
  addCustomCategory: (cat: Omit<CustomCategory, "key">) => void;
  updateCustomCategory: (key: string, patch: Partial<Omit<CustomCategory, "key">>) => void;
  removeCustomCategory: (key: string) => void;
  addRecurring: (r: Omit<RecurringTransaction, "id" | "createdAt">) => void;
  updateRecurring: (id: string, patch: Partial<RecurringTransaction>) => void;
  removeRecurring: (id: string) => void;
  /** Generate transaksi dari recurring yang sudah jatuh tempo. Return jumlah yang dibuat. */
  generateDueRecurring: () => number;
  setCategoryBudget: (categoryKey: string, limit: number) => void;
  removeCategoryBudget: (categoryKey: string) => void;
  resetAll: () => void;
  /** Ganti seluruh data (dipakai Mode Tamu untuk memuat data contoh) */
  replaceAll: (next: AppData) => void;

  // --- Konflik multi-perangkat ---
  /** Data remote yang berkonflik dengan data lokal. null = tidak ada konflik. */
  conflictRemote: AppData | null;
  /** Selesaikan konflik: true = gunakan data lokal, false = gunakan data remote. */
  resolveConflict: (useLocal: boolean) => void;
}

const AppDataContext = createContext<AppDataState | null>(null);

/** Stamp lastModified ke AppData. */
function stampModified(d: AppData): AppData {
  return { ...d, lastModified: new Date().toISOString() };
}

/** Cek apakah data berubah sejak timestamp tertentu. */
function modifiedSince(d: AppData, since: number | null): boolean {
  if (!since) return true; // pertama kali — anggap berubah
  if (!d.lastModified) return false; // data lama tanpa lastModified — tidak dianggap berubah
  return new Date(d.lastModified).getTime() > since;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  // Konflik state — simpan data remote saat konflik terdeteksi
  const [conflictRemote, setConflictRemote] = useState<AppData | null>(null);
  // Simpan snapshot data lokal saat konflik agar bisa restore jika user pilih remote
  const conflictLocalRef = useRef<AppData>(EMPTY_DATA);
  const { accessToken } = useAuth();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuthError = useCallback(() => setAuthError(false), []);

  // --- Conflict resolution ---
  const resolveConflict = useCallback(
    (useLocal: boolean) => {
      if (!conflictRemote) return;
      if (useLocal) {
        // User pilih data lokal — upload ke Drive
        const local = conflictLocalRef.current;
        setData(local);
        if (accessToken) {
          uploadToDrive(accessToken, local).then(() => {
            setLastSyncTimestamp(Date.now());
          }).catch(() => {});
        }
      } else {
        // User pilih data remote — timpa lokal
        setData(conflictRemote);
        saveData(conflictRemote).catch(() => {});
        setLastSyncTimestamp(Date.now());
      }
      setConflictRemote(null);
    },
    [conflictRemote, accessToken],
  );

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
            const localChanged = modifiedSince(local, lastSyncTimestamp);
            const remoteChanged = modifiedSince(remote, lastSyncTimestamp);
            if (localChanged && remoteChanged && lastSyncTimestamp !== null) {
              // Konflik: keduanya berubah sejak sync terakhir
              conflictLocalRef.current = local;
              setConflictRemote(remote);
            } else if (remoteChanged || !localChanged) {
              // Remote berubah atau lokal tidak berubah — pakai remote
              setData(remote);
              setLastSyncTimestamp(Date.now());
              await saveData(remote);
            }
            // else: lokal berubah, remote tidak — tetap pakai lokal (akan di-upload nanti)
          }
        } catch (e) {
          if (e instanceof DriveAuthError && !cancelled) {
            setAuthError(true);
          }
          // Offline atau error lainnya — pakai cache lokal.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = stampModified(updater(prev));
        saveData(next).catch(() => {});
        if (accessToken) {
          if (syncTimer.current) clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            uploadToDrive(accessToken, next).then(() => {
              setLastSyncTimestamp(Date.now());
            }).catch((e) => {
              if (e instanceof DriveAuthError) setAuthError(true);
            });
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

  const addCustomCategory = useCallback(
    (cat: Omit<CustomCategory, "key">) => {
      const key = cat.label.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      persist((prev) => ({
        ...prev,
        customCategories: [...(prev.customCategories ?? []), { ...cat, key }],
      }));
    },
    [persist],
  );

  const updateCustomCategory = useCallback(
    (key: string, patch: Partial<Omit<CustomCategory, "key">>) => {
      persist((prev) => ({
        ...prev,
        customCategories: (prev.customCategories ?? []).map((c) =>
          c.key === key ? { ...c, ...patch } : c,
        ),
      }));
    },
    [persist],
  );

  const removeCustomCategory = useCallback(
    (key: string) => {
      persist((prev) => ({
        ...prev,
        customCategories: (prev.customCategories ?? []).filter((c) => c.key !== key),
      }));
    },
    [persist]
  );

  // --- Transaksi berulang ---

  const addRecurring = useCallback(
    (r: Omit<RecurringTransaction, "id" | "createdAt">) => {
      persist((prev) => ({
        ...prev,
        recurringTransactions: [
          ...(prev.recurringTransactions ?? []),
          { ...r, id: newId("recurring"), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [persist]
  );

  const updateRecurring = useCallback(
    (id: string, patch: Partial<RecurringTransaction>) => {
      persist((prev) => ({
        ...prev,
        recurringTransactions: (prev.recurringTransactions ?? []).map((r) =>
          r.id === id ? { ...r, ...patch } : r
        ),
      }));
    },
    [persist]
  );

  const removeRecurring = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        recurringTransactions: (prev.recurringTransactions ?? []).filter((r) => r.id !== id),
      }));
    },
    [persist]
  );

  function advanceDue(current: string, freq: RecurringTransaction["frequency"]): string {
    const d = new Date(current);
    if (freq === "weekly") d.setDate(d.getDate() + 7);
    else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  const generateDueRecurring = useCallback((): number => {
    const today = new Date().toISOString().slice(0, 10);
    let count = 0;
    persist((prev) => {
      const list = prev.recurringTransactions ?? [];
      const newTxs: Transaction[] = [];
      const updated = list.map((r) => {
        if (!r.active || r.nextDue > today) return r;
        newTxs.push({
          id: newId("tx"),
          walletId: r.walletId,
          date: r.nextDue,
          type: "expense",
          amount: r.amount,
          category: r.category,
          note: r.title,
          source: "manual",
        });
        count++;
        return { ...r, nextDue: advanceDue(r.nextDue, r.frequency) };
      });
      if (newTxs.length === 0) return prev;
      return {
        ...prev,
        transactions: [...prev.transactions, ...newTxs],
        recurringTransactions: updated,
      };
    });
    return count;
  }, [persist]);

  // --- Budget per kategori ---

  const setCategoryBudget = useCallback(
    (categoryKey: string, limit: number) => {
      persist((prev) => {
        const budgets = prev.categoryBudgets ?? [];
        const existing = budgets.findIndex((b) => b.categoryKey === categoryKey);
        const next = [...budgets];
        if (existing >= 0) {
          next[existing] = { categoryKey, limit };
        } else {
          next.push({ categoryKey, limit });
        }
        return { ...prev, categoryBudgets: next };
      });
    },
    [persist]
  );

  const removeCategoryBudget = useCallback(
    (categoryKey: string) => {
      persist((prev) => ({
        ...prev,
        categoryBudgets: (prev.categoryBudgets ?? []).filter((b) => b.categoryKey !== categoryKey),
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

  const manualSync = useCallback(async () => {
    if (!accessToken) return;
    try {
      const local = await loadData();
      const remote = await downloadFromDrive(accessToken);
      if (remote) {
        const localChanged = modifiedSince(local, lastSyncTimestamp);
        const remoteChanged = modifiedSince(remote, lastSyncTimestamp);
        if (localChanged && remoteChanged && lastSyncTimestamp !== null) {
          conflictLocalRef.current = local;
          setConflictRemote(remote);
        } else {
          setData(remote);
          setLastSyncTimestamp(Date.now());
          await saveData(remote);
        }
      }
    } catch (e) {
      if (e instanceof DriveAuthError) setAuthError(true);
    }
  }, [accessToken, lastSyncTimestamp]);

  const value = useMemo(
    () => ({
      data,
      loading,
      lastSyncTimestamp,
      authError,
      clearAuthError,
      manualSync,
      conflictRemote,
      resolveConflict,
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
      addCustomCategory,
      updateCustomCategory,
      removeCustomCategory,
      addRecurring,
      updateRecurring,
      removeRecurring,
      generateDueRecurring,
      setCategoryBudget,
      removeCategoryBudget,
      resetAll,
      replaceAll,
    }),
    [data, loading, lastSyncTimestamp, authError, clearAuthError, manualSync, conflictRemote, resolveConflict, addWallet, updateWallet, addTransaction, addTransactions, updateTransaction, deleteTransaction, deleteTransactionsBySource, deleteTransactionsByBatch, addGoldPrice, deleteGoldPrice, deleteWallet, moveWallet, addCustomCategory, updateCustomCategory, removeCustomCategory, addRecurring, updateRecurring, removeRecurring, generateDueRecurring, setCategoryBudget, removeCategoryBudget, resetAll, replaceAll]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataState {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData harus dipakai di dalam AppDataProvider");
  return ctx;
}
