import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { MonthPicker } from "../components/MonthPicker";
import { TransactionRow } from "../components/TransactionRow";
import { formatDayLabel, formatRupiah, formatSignedRupiah } from "../lib/format";
import { badgeForWallet } from "../lib/templates";
import { availableMonths, walletFeed } from "../lib/walletFeed";
import type { Transaction, Transfer } from "../lib/types";
import { useAppData } from "../state/AppDataContext";

type FeedItem =
  | { kind: "tx"; date: string; key: string; tx: Transaction }
  | { kind: "transfer"; date: string; key: string; tr: Transfer };

export function HistoryScreen() {
  const { data } = useAppData();
  const [walletFilter, setWalletFilter] = useState<string>("all");

  const allDates = useMemo(
    () => [...data.transactions, ...data.transfers],
    [data.transactions, data.transfers]
  );
  const months = useMemo(() => availableMonths(allDates), [allDates]);
  const [month, setMonth] = useState(months[0]);
  const activeMonth = months.includes(month) ? month : months[0];

  const walletName = (id: string) => data.wallets.find((w) => w.id === id)?.name ?? "?";

  // Feed bulan aktif: global menampilkan transfer sebagai satu baris netral;
  // filter per dompet memakai baris transfer masuk/keluar bertanda.
  const feed: FeedItem[] = useMemo(() => {
    if (walletFilter !== "all") {
      return walletFeed(data, walletFilter)
        .filter((t) => t.date.startsWith(activeMonth))
        .map((t) => ({ kind: "tx" as const, date: t.date, key: t.id, tx: t }));
    }
    const txs: FeedItem[] = data.transactions
      .filter((t) => t.date.startsWith(activeMonth))
      .map((t) => ({ kind: "tx" as const, date: t.date, key: t.id, tx: t }));
    const trs: FeedItem[] = data.transfers
      .filter((t) => t.date.startsWith(activeMonth))
      .map((t) => ({ kind: "transfer" as const, date: t.date, key: t.id, tr: t }));
    return [...txs, ...trs];
  }, [data, walletFilter, activeMonth]);

  const groups = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    for (const item of feed) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => {
        let subtotal = 0;
        for (const it of items) {
          if (it.kind === "tx") {
            if (it.tx.type === "income") subtotal += it.tx.amount ?? 0;
            else if (it.tx.type === "expense") subtotal -= it.tx.amount ?? 0;
          } else {
            subtotal -= it.tr.amount;
          }
        }
        return { date, items, subtotal };
      });
  }, [feed]);

  const { inflow, outflow } = useMemo(() => {
    let inn = 0;
    let out = 0;
    for (const it of feed) {
      if (it.kind !== "tx") continue;
      if (it.tx.type === "income") inn += it.tx.amount ?? 0;
      else if (it.tx.type === "expense") out += it.tx.amount ?? 0;
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

      {/* Filter dompet */}
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
        {/* Ringkasan masuk/keluar */}
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
                {g.items.map((item) => {
                  if (item.kind === "transfer") {
                    return (
                      <View key={item.key} className="flex-row items-center gap-3 py-3">
                        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-saldio-sky">
                          <Ionicons name="swap-horizontal" size={18} color="#3D51E0" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-sans-semibold text-sm text-saldio-ink" numberOfLines={1}>
                            Transfer {walletName(item.tr.fromWalletId).split(" ")[0]} →{" "}
                            {walletName(item.tr.toWalletId).split(" ")[0]}
                          </Text>
                          <View className="mt-1 flex-row items-center gap-1.5">
                            <Text className="font-sans text-xs text-saldio-muted">Transfer</Text>
                            <View className="rounded-md bg-saldio-bg px-1.5 py-0.5">
                              <Text className="font-sans-medium text-[10px] text-saldio-soft">Manual</Text>
                            </View>
                          </View>
                        </View>
                        <Text className="font-mono-semibold text-sm text-saldio-soft">
                          {formatRupiah(item.tr.amount)}
                        </Text>
                      </View>
                    );
                  }
                  const wallet = data.wallets.find((w) => w.id === item.tx.walletId);
                  const badge = wallet ? badgeForWallet(wallet.name, wallet.template) : null;
                  const isGoldWallet = wallet?.type === "gold";
                  return (
                    <TransactionRow
                      key={item.key}
                      tx={item.tx}
                      walletTag={
                        walletFilter === "all"
                          ? isGoldWallet
                            ? "Em"
                            : badge?.initials
                          : undefined
                      }
                      walletTagColor={isGoldWallet ? "#B08415" : badge?.color}
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
