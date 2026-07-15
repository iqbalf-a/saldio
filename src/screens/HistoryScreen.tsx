import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { MonthPicker } from "../components/MonthPicker";
import { CategoryIcon } from "../components/CategoryIcon";
import { ActionMenu } from "../components/ActionMenu";
import { formatDayLabel, formatRupiah, formatSignedGrams, formatSignedRupiah } from "../lib/format";
import { badgeForWallet } from "../lib/templates";
import { availableMonths } from "../lib/walletFeed";
import type { Transaction } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import { useConfirm } from "../components/ConfirmModal";
import type { MainTabsParamList } from "../navigation/types";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

type Nav = BottomTabScreenProps<MainTabsParamList, "Riwayat">;

function SourceChip({ source }: { source: Transaction["source"] }) {
  if (source === "manual") {
    return (
      <View className="rounded-md bg-saldio-bg px-1.5 py-0.5">
        <Text className="font-sans-medium text-[10px] text-saldio-soft">Manual</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center rounded-md bg-saldio-sky px-1.5 py-0.5">
      <Text className="font-sans-medium text-[10px] text-saldio-blue">PDF</Text>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const isGold = tx.type === "buy_gold" || tx.type === "sell_gold";
  const isIncome = tx.type === "income";
  const category = isGold ? "Emas" : tx.category;
  const amountText = isGold
    ? formatSignedGrams(tx.type === "buy_gold" ? tx.grams ?? 0 : -(tx.grams ?? 0))
    : formatSignedRupiah(isIncome ? tx.amount ?? 0 : -(tx.amount ?? 0));
  const amountColor = isGold
    ? tx.type === "buy_gold" ? "text-saldio-green" : "text-saldio-red"
    : isIncome ? "text-saldio-green" : "text-saldio-red";

  return (
    <View className="flex-row items-center gap-3 py-3">
      <CategoryIcon category={category} size={40} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm text-saldio-ink" numberOfLines={1}>
          {tx.note || category || "Transaksi"}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          {walletTag ? (
            <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: (walletTagColor ?? "#64748B") + "22" }}>
              <Text className="font-sans-bold text-[10px]" style={{ color: walletTagColor ?? "#64748B" }}>
                {walletTag}
              </Text>
            </View>
          ) : null}
          <Text className="font-sans text-xs text-saldio-muted">{category ?? "Lainnya"}</Text>
          <SourceChip source={tx.source} />
        </View>
      </View>
      <Text className={`font-mono-semibold text-[12px] ${amountColor}`}>{amountText}</Text>
      <Pressable
        onPress={() => setMenuOpen(true)}
        className="h-8 w-8 items-center justify-center rounded-full bg-saldio-bg active:opacity-70"
      >
        <Ionicons name="ellipsis-horizontal" size={16} color="#8A94A6" />
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
  const { data, deleteTransaction } = useAppData();
  const confirm = useConfirm();
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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
        const category = (t.category || "").toLowerCase();
        const amount = t.amount ? String(t.amount) : "";
        const grams = t.grams ? String(t.grams) : "";
        return note.includes(q) || category.includes(q) || amount.includes(q) || grams.includes(q);
      });
    }
    return base;
  }, [data, activeMonth, walletFilter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of feed) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => {
        let subtotal = 0;
        for (const t of items) {
          if (t.type === "income") subtotal += t.amount ?? 0;
          else if (t.type === "expense") subtotal -= t.amount ?? 0;
        }
        return { date, items, subtotal };
      });
  }, [feed]);

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
          <Text className="font-sans-bold text-xl text-saldio-ink">Riwayat Transaksi</Text>
          <MonthPicker value={activeMonth} options={months} onChange={setMonth} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 grow-0 pl-5">
        <View className="flex-row gap-2 pr-5">
          {filters.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setWalletFilter(f.id)}
              className={`rounded-full px-4 py-2 ${
                walletFilter === f.id ? "bg-saldio-blue" : "bg-white"
              }`}
            >
              <Text
                className={`font-sans-semibold text-sm ${
                  walletFilter === f.id ? "text-white" : "text-saldio-soft"
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View className="px-5">
        <View className="mb-4 flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3">
          <Ionicons name="search" size={18} color="#8A94A6" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari transaksi..."
            placeholderTextColor="#8A94A6"
            className="flex-1 font-sans text-sm text-saldio-ink"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#8A94A6" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="px-5">
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white p-4">
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-down" size={13} color="#16A34A" />
              <Text className="font-sans text-xs text-saldio-soft">Masuk</Text>
            </View>
            <Text className="mt-1 font-mono-semibold text-sm text-saldio-green">
              {formatRupiah(inflow)}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white p-4">
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-up" size={13} color="#E23B3B" />
              <Text className="font-sans text-xs text-saldio-soft">Keluar</Text>
            </View>
            <Text className="mt-1 font-mono-semibold text-sm text-saldio-red">
              {formatRupiah(outflow)}
            </Text>
          </View>
        </View>

        {groups.length === 0 ? (
          <View className="items-center rounded-3xl bg-white px-8 py-12">
            <Ionicons name="receipt" size={32} color="#8A94A6" />
            <Text className="mt-4 text-center font-sans text-sm text-saldio-muted">
              Belum ada transaksi di bulan ini.
            </Text>
          </View>
        ) : (
          <View className="rounded-3xl bg-white px-4">
            {groups.map((g) => (
              <View key={g.date}>
                <View className="flex-row items-center justify-between border-b border-saldio-border py-3">
                  <Text className="font-sans-semibold text-xs text-saldio-soft">
                    {formatDayLabel(g.date)}
                  </Text>
                  <Text
                    className={`font-mono-semibold text-xs ${
                      g.subtotal >= 0 ? "text-saldio-green" : "text-saldio-red"
                    }`}
                  >
                    {formatSignedRupiah(g.subtotal)}
                  </Text>
                </View>
                {g.items.map((t) => {
                  const wallet = data.wallets.find((w) => w.id === t.walletId);
                  const badge = wallet ? badgeForWallet(wallet.name, wallet.template) : null;
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
                          message: `"${t.note || t.category || "Transaksi"}" akan dihapus permanen.`,
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
    </Screen>
  );
}
