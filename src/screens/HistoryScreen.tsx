import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { MonthPicker } from "../components/MonthPicker";
import { CategoryIcon } from "../components/CategoryIcon";
import { ActionMenu } from "../components/ActionMenu";
import { ExpenseCalendar } from "../components/charts/ExpenseCalendar";
import { formatDayLabel, formatRupiah, formatSignedGrams, formatSignedRupiah } from "../lib/format";
import { badgeForWallet } from "../lib/templates";
import { availableMonths } from "../lib/walletFeed";
import { groupByDay } from "../lib/balances";
import { dailyNetChange } from "../lib/reports";
import type { Transaction } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import { useConfirm } from "../components/ConfirmModal";
import { useDarkColor } from "../lib/darkColors";
import { useTheme } from "../components/ThemeProvider";
import type { MainTabsParamList } from "../navigation/types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { categoryLabel } from "../lib/categories";

type Nav = BottomTabScreenProps<MainTabsParamList, "Riwayat">;

function SourceChip({ source }: { source: Transaction["source"] }) {
  const muted = useDarkColor("muted");
  const blue = useDarkColor("blue");

  if (source === "manual") {
    return (
      <View className="rounded-md bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border px-1.5 py-0.5">
        <Text className="font-sans-medium text-[10px] text-saldio-soft dark:text-saldio-dark-soft">Manual</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center rounded-md bg-saldio-sky dark:bg-saldio-dark-sky px-1.5 py-0.5">
      <Text className="font-sans-medium text-[10px] text-saldio-blue dark:text-saldio-dark-blue">PDF</Text>
    </View>
  );
}

function HistoryTxRow({
  tx,
  walletTag,
  walletTagColor,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  walletTag?: string;
  walletTagColor?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const muted = useDarkColor("muted");
  const isGold = tx.type === "buy_gold" || tx.type === "sell_gold";
  const isIncome = tx.type === "income";
  const category = isGold ? "Emas" : tx.category;
  const label = categoryLabel(category, data.customCategories);
  const amountText = isGold
    ? formatSignedGrams(tx.type === "buy_gold" ? tx.grams ?? 0 : -(tx.grams ?? 0))
    : formatSignedRupiah(isIncome ? tx.amount ?? 0 : -(tx.amount ?? 0));
  const amountColor = isGold
    ? tx.type === "buy_gold" ? "text-saldio-green dark:text-saldio-dark-green" : "text-saldio-red dark:text-saldio-dark-red"
    : isIncome ? "text-saldio-green dark:text-saldio-dark-green" : "text-saldio-red dark:text-saldio-dark-red";

  return (
    <View className="flex-row items-center gap-3 py-3">
      <CategoryIcon category={category} size={40} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink" numberOfLines={1}>
          {tx.note || label}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          {walletTag ? (
            <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: (walletTagColor ?? "#64748B") + "22" }}>
              <Text className="font-sans-bold text-[10px]" style={{ color: walletTagColor ?? "#64748B" }}>
                {walletTag}
              </Text>
            </View>
          ) : null}
          <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">{label}</Text>
          <SourceChip source={tx.source} />
          {tx.receiptImage ? <Ionicons name="image" size={11} color={muted} /> : null}
        </View>
      </View>
      <Text className={`font-mono-semibold text-[12px] ${amountColor}`}>{amountText}</Text>
      <Pressable
        onPress={() => setMenuOpen(true)}
        className="h-8 w-8 items-center justify-center rounded-full bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border active:opacity-70"
      >
        <Ionicons name="ellipsis-horizontal" size={16} color={muted} />
      </Pressable>
      <ActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={[
          {
            label: "Edit",
            icon: "pencil",
            onPress: () => {
              setMenuOpen(false);
              onEdit();
            },
          },
          {
            label: "Hapus",
            icon: "trash",
            destructive: true,
            onPress: () => {
              setMenuOpen(false);
              onDelete();
            },
          },
        ]}
      />
    </View>
  );
}

export function HistoryScreen({ navigation }: Nav) {
  const { isDark } = useTheme();
  const { data, deleteTransaction } = useAppData();
  const confirm = useConfirm();
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const muted = useDarkColor("muted");
  const ink = useDarkColor("ink");

  const allDates = useMemo(() => data.transactions, [data.transactions]);
  const months = useMemo(() => availableMonths(allDates), [allDates]);
  const [month, setMonth] = useState(months[0]);
  const activeMonth = months.includes(month) ? month : months[0];

  const feed: Transaction[] = useMemo(() => {
    let base = data.transactions
      .filter((t) => t.date.startsWith(activeMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (walletFilter !== "all") {
      base = base.filter((t) => t.walletId === walletFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((t) => {
        const note = (t.note || "").toLowerCase();
        const category = categoryLabel(t.category, data.customCategories).toLowerCase();
        const amount = t.amount ? String(t.amount) : "";
        const grams = t.grams ? String(t.grams) : "";
        return note.includes(q) || category.includes(q) || amount.includes(q) || grams.includes(q);
      });
    }
    return base;
  }, [data, activeMonth, walletFilter, search]);

  // Kalender & daftar-per-tanggal diturunkan dari `feed` yang sama (bulan +
  // filter dompet + pencarian) agar warna sel kalender selalu konsisten
  // dengan transaksi yang muncul saat tanggalnya diketuk. `includeInTotal`
  // sengaja tidak dipakai di sini — itu konsep Total Aset (lihat Aset),
  // bukan aturan tampilan Riwayat.
  const dailyTotals = useMemo(
    () => dailyNetChange(feed, activeMonth),
    [feed, activeMonth]
  );

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    return feed.filter((t) => t.date === selectedDate);
  }, [feed, selectedDate]);

  useEffect(() => {
    setSelectedDate(null);
  }, [activeMonth, walletFilter]);

  const groups = useMemo(() => groupByDay(feed), [feed]);

  const { inflow, outflow } = useMemo(() => {
    let inn = 0;
    let out = 0;
    for (const t of feed) {
      if (t.type === "income") inn += t.amount ?? 0;
      else if (t.type === "expense") out += t.amount ?? 0;
    }
    return { inflow: inn, outflow: out };
  }, [feed]);

  const filters = [{ id: "all", label: "Semua" }].concat(
    data.wallets.map((w) => ({ id: w.id, label: w.name.split(" ")[0] }))
  );

  return (
    <Screen padded={false}>
      <View className="px-5">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-sans-bold text-xl text-saldio-ink dark:text-saldio-dark-ink">Riwayat Transaksi</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
              className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-saldio-dark-card active:opacity-70"
            >
              <Ionicons name={viewMode === "list" ? "calendar-outline" : "list-outline"} size={17} color={muted} />
            </Pressable>
            <MonthPicker value={activeMonth} options={months} onChange={setMonth} />
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 grow-0 pl-5">
        <View className="flex-row gap-2 pr-5">
          {filters.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setWalletFilter(f.id)}
              className={`rounded-full px-4 py-2 ${
                walletFilter === f.id ? "bg-saldio-blue dark:bg-saldio-dark-blue" : "bg-white dark:bg-saldio-dark-card"
              }`}
            >
              <Text
                className={`font-sans-semibold text-sm ${
                  walletFilter === f.id ? "text-white" : "text-saldio-soft dark:text-saldio-dark-soft"
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View className="px-5">
        <View className="mb-4 flex-row items-center gap-2 rounded-2xl bg-white dark:bg-saldio-dark-card px-4 py-3">
          <Ionicons name="search" size={18} color={muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari transaksi..."
            placeholderTextColor={muted}
            className="flex-1 font-sans text-sm text-saldio-ink dark:text-saldio-dark-ink"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {viewMode === "calendar" ? (
        <View className="px-5">
          <ExpenseCalendar
            yearMonth={activeMonth}
            dailyTotals={dailyTotals}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <View className="mt-4">
            {!selectedDate ? (
              <View className="items-center rounded-3xl bg-white dark:bg-saldio-dark-card px-8 py-10">
                <Ionicons name="calendar" size={28} color={muted} />
                <Text className="mt-3 text-center font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
                  Ketuk salah satu tanggal untuk lihat transaksinya.
                </Text>
              </View>
            ) : selectedDayItems.length === 0 ? (
              <View className="items-center rounded-3xl bg-white dark:bg-saldio-dark-card px-8 py-10">
                <Text className="text-center font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
                  Tidak ada transaksi di tanggal ini.
                </Text>
              </View>
            ) : (
              <View className="rounded-3xl bg-white dark:bg-saldio-dark-card px-4">
                {selectedDayItems.map((t) => {
                  const wallet = data.wallets.find((w) => w.id === t.walletId);
                  const badge = wallet ? badgeForWallet(wallet.name, wallet.template, isDark) : null;
                  const isGoldWallet = wallet?.type === "gold";
                  return (
                    <HistoryTxRow
                      key={t.id}
                      tx={t}
                      walletTag={walletFilter === "all" ? (isGoldWallet ? "Em" : badge?.initials) : undefined}
                      walletTagColor={isGoldWallet ? "#B08415" : badge?.color}
                      onEdit={() =>
                        navigation.navigate("Beranda", {
                          screen: "AddTransaction",
                          params: { walletId: t.walletId, transactionId: t.id },
                        })
                      }
                      onDelete={() =>
                        confirm({
                          title: "Hapus transaksi?",
                          message: `"${t.note || categoryLabel(t.category, data.customCategories)}" akan dihapus permanen.`,
                          confirmLabel: "Hapus",
                          onConfirm: () => deleteTransaction(t.id),
                        })
                      }
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      ) : (
        <View className="px-5">
          <View className="mb-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white dark:bg-saldio-dark-card p-4">
              <View className="flex-row items-center gap-1">
                <Ionicons name="arrow-down" size={13} color="#16A34A" />
                <Text className="font-sans text-xs text-saldio-soft dark:text-saldio-dark-soft">Masuk</Text>
              </View>
              <Text className="mt-1 font-mono-semibold text-sm text-saldio-green dark:text-saldio-dark-green">
                {formatRupiah(inflow)}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white dark:bg-saldio-dark-card p-4">
              <View className="flex-row items-center gap-1">
                <Ionicons name="arrow-up" size={13} color="#E23B3B" />
                <Text className="font-sans text-xs text-saldio-soft dark:text-saldio-dark-soft">Keluar</Text>
              </View>
              <Text className="mt-1 font-mono-semibold text-sm text-saldio-red dark:text-saldio-dark-red">
                {formatRupiah(outflow)}
              </Text>
            </View>
          </View>

          {groups.length === 0 ? (
            <View className="items-center rounded-3xl bg-white dark:bg-saldio-dark-card px-8 py-12">
              <Ionicons name="receipt" size={32} color={muted} />
              <Text className="mt-4 text-center font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
                Belum ada transaksi di bulan ini.
              </Text>
            </View>
          ) : (
            <View className="rounded-3xl bg-white dark:bg-saldio-dark-card px-4">
              {groups.map((g) => (
                <View key={g.date}>
                  <View className="flex-row items-center justify-between border-b border-saldio-border dark:border-saldio-dark-border py-3">
                    <Text className="font-sans-semibold text-xs text-saldio-soft dark:text-saldio-dark-soft">
                      {formatDayLabel(g.date)}
                    </Text>
                    <Text
                      className={`font-mono-semibold text-xs ${
                        g.subtotal >= 0 ? "text-saldio-green dark:text-saldio-dark-green" : "text-saldio-red dark:text-saldio-dark-red"
                      }`}
                    >
                      {formatSignedRupiah(g.subtotal)}
                    </Text>
                  </View>
                  {g.items.map((t) => {
                    const wallet = data.wallets.find((w) => w.id === t.walletId);
                    const badge = wallet ? badgeForWallet(wallet.name, wallet.template, isDark) : null;
                    const isGoldWallet = wallet?.type === "gold";
                    return (
                      <HistoryTxRow
                        key={t.id}
                        tx={t}
                        walletTag={
                          walletFilter === "all"
                            ? isGoldWallet ? "Em" : badge?.initials
                            : undefined
                        }
                        walletTagColor={isGoldWallet ? "#B08415" : badge?.color}
                        onEdit={() => navigation.navigate("Beranda", {
                          screen: "AddTransaction",
                          params: { walletId: t.walletId, transactionId: t.id },
                        })}
                        onDelete={() =>
                          confirm({
                            title: "Hapus transaksi?",
                            message: `"${t.note || categoryLabel(t.category, data.customCategories)}" akan dihapus permanen.`,
                            confirmLabel: "Hapus",
                            onConfirm: () => deleteTransaction(t.id),
                          })
                        }
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}