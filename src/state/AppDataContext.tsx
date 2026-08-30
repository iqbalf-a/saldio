import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { downloadFromDrive, DriveAuthError, uploadToDrive } from "../lib/drive";
import { newId } from "../lib/ids";
import { toISODate } from "../lib/format";
import { loadData, loadLastSyncTimestamp, saveData, saveLastSyncTimestamp } from "../lib/storage";
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
  /** Pesan error sinkron manual terakhir (mis. gagal 403 dari Drive API), null jika tidak ada. */
  syncError: string | null;
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
  /**
   * Bersihkan cache LOKAL saja (tanpa upload ke Drive) — wajib dipanggil
   * sebelum signOut() agar ledger akun yang baru saja keluar tidak
   * "bocor" tampil di sesi akun Google lain yang login berikutnya di
   * browser yang sama (cache `saldio:data` bersifat global, tidak
   * terikat per-akun).
   */
  clearLocalData: () => void;
  /** Ganti seluruh data (dipakai Mode Tamu untuk memuat data contoh) */
  replaceAll: (next: AppData) => void;

  // --- Konflik multi-perangkat ---
  /** Data remote yang berkonflik dengan data lokal. null = tidak ada konflik. */
  conflictRemote: AppData | null;
  /** Selesaikan konflik: true = gunakan data lokal, false = gunakan data remote. */
  resolveConflict: (useLocal: boolean) => void;
}

const AppDataContext = createContext<AppDataState | null>(null);

const FOREGROUND_SYNC_COOLDOWN = 30_000;

/** Stamp lastModified ke AppData. */
function stampModified(d: AppData): AppData {
  return { ...d, lastModified: new Date().toISOString() };
}

/** Cek apakah data berubah sejak timestamp tertentu. */
function modifiedSince(d: AppData, since: number | null): boolean {
  if (since === null) return true; // pertama kali — anggap berubah
  if (!d.lastModified) return false; // data lama tanpa lastModified — tidak dianggap berubah
  return new Date(d.lastModified).getTime() > since;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  // Konflik state — simpan data remote saat konflik terdeteksi
  const [conflictRemote, setConflictRemote] = useState<AppData | null>(null);
  // Simpan snapshot data lokal saat konflik agar bisa restore jika user pilih remote
  const conflictLocalRef = useRef<AppData>(EMPTY_DATA);
  const { accessToken } = useAuth();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref untuk menghindari stale closure di async handler
  const accessTokenRef = useRef<string | null>(null);
  const dataRef = useRef<AppData>(EMPTY_DATA);
  const loadingRef = useRef(true);
  const lastSyncTimestampRef = useRef<number | null>(null);
  const isBackgroundUploadingRef = useRef(false);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { lastSyncTimestampRef.current = lastSyncTimestamp; }, [lastSyncTimestamp]);

  const clearAuthError = useCallback(() => setAuthError(false), []);

  const persistSyncTimestamp = useCallback((ts: number) => {
    setLastSyncTimestamp(ts);
    saveLastSyncTimestamp(ts).catch(() => {});
  }, []);

  // --- Conflict resolution ---
  const resolveConflict = useCallback(
    (useLocal: boolean) => {
      if (!conflictRemote) return;
      if (useLocal) {
        // User pilih data lokal — upload ke Drive
        const local = conflictLocalRef.current;
        setData(local);
        const token = accessTokenRef.current;
        if (token) {
          uploadToDrive(token, local).then(() => {
            persistSyncTimestamp(Date.now());
          }).catch((e) => {
            if (e instanceof DriveAuthError) setAuthError(true);
          });
        }
      } else {
        // User pilih data remote — timpa lokal
        setData(conflictRemote);
        saveData(conflictRemote).catch(() => {});
        persistSyncTimestamp(Date.now());
      }
      setConflictRemote(null);
    },
    [conflictRemote, persistSyncTimestamp],
  );

  // Muat cache lokal dulu (offline-first), lalu coba tarik dari Drive.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [local, syncTs] = await Promise.all([loadData(), loadLastSyncTimestamp()]);
      if (!cancelled) {
        setData(local);
        setLastSyncTimestamp(syncTs); // null saat pertama kali atau setelah sign-out
        setLoading(false);
      }
      if (accessToken) {
        try {
          const remote = await downloadFromDrive(accessToken);
          if (remote && !cancelled) {
            const localChanged = modifiedSince(local, syncTs);
            const remoteChanged = modifiedSince(remote, syncTs);
            if (localChanged && remoteChanged && syncTs !== null) {
              // Konflik: keduanya berubah sejak sync terakhir
              conflictLocalRef.current = local;
              setConflictRemote(remote);
            } else if (remoteChanged || !localChanged) {
              // Remote berubah atau lokal tidak berubah — pakai remote
              setData(remote);
              persistSyncTimestamp(Date.now());
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
        if (accessTokenRef.current) {
          if (syncTimer.current) clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            const token = accessTokenRef.current;
            if (!token) return;
            uploadToDrive(token, next).then(() => {
              persistSyncTimestamp(Date.now());
            }).catch((e) => {
              if (e instanceof DriveAuthError) setAuthError(true);
            });
          }, 2000);
        }
        return next;
      });
    },
    [persistSyncTimestamp]
  );

  // Cancel debounce timer saat unmount agar tidak ada state update ke komponen yang sudah mati
  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  // AppState listener — flush upload sebelum background, pull saat foreground kembali
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        // Guard: cegah double-upload pada iOS (inactive → background dua event)
        if (isBackgroundUploadingRef.current) return;
        isBackgroundUploadingRef.current = true;
        // Flush debounced upload segera sebelum app masuk background
        if (syncTimer.current) {
          clearTimeout(syncTimer.current);
          syncTimer.current = null;
        }
        const token = accessTokenRef.current;
        if (token) {
          try {
            await uploadToDrive(token, dataRef.current);
            persistSyncTimestamp(Date.now());
          } catch {
            // Offline — tidak ada yang bisa dilakukan
          }
        }
        isBackgroundUploadingRef.current = false;
      } else if (nextState === "active") {
        isBackgroundUploadingRef.current = false;
        // Skip jika init load belum selesai (hindari race dengan EMPTY_DATA)
        if (loadingRef.current) return;
        const token = accessTokenRef.current;
        if (!token) return;
        // Cooldown: hindari hammering Drive API saat rapid app-switch
        const lastSync = lastSyncTimestampRef.current;
        if (lastSync !== null && Date.now() - lastSync < FOREGROUND_SYNC_COOLDOWN) return;
        // Pull data terbaru dari Drive
        try {
          const remote = await downloadFromDrive(token);
          if (!remote) return;
          const syncTs = lastSyncTimestampRef.current;
          const localData = dataRef.current;
          const localChanged = modifiedSince(localData, syncTs);
          const remoteChanged = modifiedSince(remote, syncTs);
          if (localChanged && remoteChanged && syncTs !== null) {
            conflictLocalRef.current = localData;
            setConflictRemote(remote);
          } else if (remoteChanged || !localChanged) {
            setData(remote);
            persistSyncTimestamp(Date.now());
            saveData(remote).catch(() => {});
          }
        } catch (e) {
          if (e instanceof DriveAuthError) setAuthError(true);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [persistSyncTimestamp]);

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

  /** Format tanggal lokal YYYY-MM-DD (bukan UTC). */
  /** Majukan due date sesuai frekuensi, handle month-end drift. */
  function advanceDue(current: string, freq: RecurringTransaction["frequency"]): string {
    const [y, m, d] = current.split("-").map(Number);
    if (freq === "weekly") {
      return toISODate(new Date(y, m - 1, d + 7));
    } else if (freq === "monthly") {
      // Clamp ke hari terakhir bulan tujuan (Jan 31 → Feb 28; setelah ter-clamp,
      // hari jangkar tidak dikembalikan — jadwal lanjut di tanggal 28).
      const targetDay = Math.min(d, new Date(y, m + 1, 0).getDate());
      return toISODate(new Date(y, m, targetDay));
    } else {
      return toISODate(new Date(y + 1, m - 1, d));
    }
  }

  const generateDueRecurring = useCallback((): number => {
    const today = toISODate(new Date());
    // Hitung semua transaksi baru & update nextDue di luar updater (tanpa side-effect).
    const list = data.recurringTransactions ?? [];
    const newTxs: Transaction[] = [];
    const nextDueMap = new Map<string, string>();

    for (const r of list) {
      if (!r.active || r.nextDue > today) continue;
      // Loop untuk kejadian yang terlewat (misal: app tidak dibuka 5 hari, daily → 5 tx).
      let due = r.nextDue;
      let safety = 0;
      while (due <= today && safety < 366) {
        newTxs.push({
          id: newId("tx"),
          walletId: r.walletId,
          date: due,
          type: "expense",
          amount: r.amount,
          category: r.category,
          note: r.title,
          source: "manual",
        });
        due = advanceDue(due, r.frequency);
        safety++;
      }
      nextDueMap.set(r.id, due);
    }

    if (newTxs.length === 0) return 0;

    persist((prev) => ({
      ...prev,
      transactions: [...prev.transactions, ...newTxs],
      recurringTransactions: (prev.recurringTransactions ?? []).map((r) => {
        const next = nextDueMap.get(r.id);
        return next ? { ...r, nextDue: next } : r;
      }),
    }));

    return newTxs.length;
  }, [data.recurringTransactions, persist]);

  // Generate transaksi berulang yang sudah jatuh tempo saat data pertama kali siap.
  const recurringRan = useRef(false);
  useEffect(() => {
    if (!loading && !recurringRan.current) {
      recurringRan.current = true;
      generateDueRecurring();
    }
  }, [loading, generateDueRecurring]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const clearLocalData = useCallback(() => {
    // Sengaja TIDAK lewat persist()/uploadToDrive — ini hanya membersihkan
    // cache perangkat, bukan menghapus backup Drive milik akun yang masih
    // aktif. Batalkan juga upload debounce yang mungkin masih tertunda agar
    // tidak menimpa Drive akun lama dengan EMPTY_DATA setelah token berganti.
    if (syncTimer.current) clearTimeout(syncTimer.current);
    setConflictRemote(null);
    setAuthError(false);
    setSyncError(null);
    setData(EMPTY_DATA);
    saveData(EMPTY_DATA).catch(() => {});
  }, []);

  const replaceAll = useCallback(
    (next: AppData) => {
      persist(() => next);
    },
    [persist]
  );

  const manualSync = useCallback(async () => {
    if (!accessToken) return;
    setSyncError(null);
    try {
      const [local, storedSyncTs] = await Promise.all([loadData(), loadLastSyncTimestamp()]);
      const remote = await downloadFromDrive(accessToken);
      if (remote) {
        const localChanged = modifiedSince(local, storedSyncTs);
        const remoteChanged = modifiedSince(remote, storedSyncTs);
        if (localChanged && remoteChanged && storedSyncTs !== null) {
          conflictLocalRef.current = local;
          setConflictRemote(remote);
        } else {
          setData(remote);
          persistSyncTimestamp(Date.now());
          await saveData(remote);
        }
      } else {
        // remote null: file belum ada di Drive (device ini belum pernah upload)
        setSyncError("Belum ada data di Drive untuk akun ini — coba tambah data dulu di device manapun.");
      }
    } catch (e) {
      if (e instanceof DriveAuthError) {
        setAuthError(true);
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setSyncError(msg);
        console.error("[manualSync] gagal:", e);
      }
    }
  }, [accessToken, persistSyncTimestamp]);

  const value = useMemo(
    () => ({
      data,
      loading,
      lastSyncTimestamp,
      authError,
      clearAuthError,
      syncError,
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
      clearLocalData,
      replaceAll,
    }),
    [data, loading, lastSyncTimestamp, authError, clearAuthError, syncError, manualSync, conflictRemote, resolveConflict, addWallet, updateWallet, addTransaction, addTransactions, updateTransaction, deleteTransaction, deleteTransactionsBySource, deleteTransactionsByBatch, addGoldPrice, deleteGoldPrice, deleteWallet, moveWallet, addCustomCategory, updateCustomCategory, removeCustomCategory, addRecurring, updateRecurring, removeRecurring, generateDueRecurring, setCategoryBudget, removeCategoryBudget, resetAll, clearLocalData, replaceAll]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataState {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData harus dipakai di dalam AppDataProvider");
  return ctx;
}
