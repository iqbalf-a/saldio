import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Screen } from "../components/Screen";
import { WalletBadge } from "../components/WalletBadge";
import { DonutChart } from "../components/charts/DonutChart";
import { TrendLine } from "../components/charts/TrendLine";
import { EmptyState } from "../components/EmptyState";
import { CategoryIcon } from "../components/CategoryIcon";
import { currentYearMonth, formatGrams, formatRupiah, monthShortLabel, toYearMonth } from "../lib/format";
import { categoryByKey } from "../lib/categories";
import {
  goldTotal,
  liquidTotal,
  netWorth,
  netWorthTrend,
  totalGoldGrams,
  walletBalance,
} from "../lib/balances";
import { useAppData } from "../state/AppDataContext";
import { HERO_SHADOW } from "../lib/ui";
import { useTheme } from "../components/ThemeProvider";
import type { MainTabsParamList } from "../navigation/types";

type Nav = BottomTabNavigationProp<MainTabsParamList>;

const DONUT_COLORS = ["#3D51E0", "#C9A227", "#8B5CF6", "#E8740C", "#94A3B8", "#16A34A", "#E23B3B", "#0EA5E9"];

const CATEGORY_COLORS: Record<string, string> = {
  Makanan: "#E86A33",
  Transportasi: "#2F6BFF",
  Belanja: "#8B5CF6",
  Tagihan: "#D9A400",
  Hiburan: "#E23B3B",
  Gaji: "#16A34A",
  Emas: "#B08415",
  Lainnya: "#64748B",
};

const GRADIENT_LIGHT = ["#1E2A78", "#3D51E0"] as const;
const GRADIENT_DARK = ["#131B54", "#2A3BAA"] as const;

function FinancialInsights({ data }: { data: import("../lib/types").AppData }) {
  const currentYM = currentYearMonth();
  const now = new Date();
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYM = toYearMonth(prevDate.toISOString());

  const currentMonthTxs = useMemo(
    () => data.transactions.filter((t) => t.date.startsWith(currentYM)),
    [data.transactions, currentYM]
  );
  const prevMonthTxs = useMemo(
    () => data.transactions.filter((t) => t.date.startsWith(prevYM)),
    [data.transactions, prevYM]
  );

  const currentMonth = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of currentMonthTxs) {
      if (t.type === "income") income += t.amount ?? 0;
      else if (t.type === "expense") expense += t.amount ?? 0;
    }
    return { income, expense };
  }, [currentMonthTxs]);

  const prevMonth = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of prevMonthTxs) {
      if (t.type === "income") income += t.amount ?? 0;
      else if (t.type === "expense") expense += t.amount ?? 0;
    }
    return { income, expense };
  }, [prevMonthTxs]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of currentMonthTxs) {
      if (t.type !== "expense") continue;
      const cat = t.category || "Lainnya";
      map.set(cat, (map.get(cat) ?? 0) + (t.amount ?? 0));
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [currentMonthTxs]);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const avgDaily = dayOfMonth > 0 ? currentMonth.expense / dayOfMonth : 0;

  const changePct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? null : null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const expenseChange = changePct(currentMonth.expense, prevMonth.expense);
  const incomeChange = changePct(currentMonth.income, prevMonth.income);

  return (
    <View className="mt-4 rounded-3xl bg-white dark:bg-saldio-dark-card p-5">
      <Text className="font-sans-bold text-base text-saldio-ink dark:text-saldio-dark-ink">Insight Keuangan</Text>
      <Text className="mt-0.5 font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">Bulan ini</Text>

      {/* Pemasukan vs Pengeluaran */}
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-saldio-green-bg dark:bg-saldio-dark-green-bg p-3.5">
          <View className="flex-row items-center gap-1">
            <Ionicons name="arrow-down" size={12} color="#16A34A" />
            <Text className="font-sans text-xs text-saldio-green dark:text-saldio-dark-green">Pemasukan</Text>
          </View>
          <Text className="mt-1 font-mono-semibold text-sm text-saldio-green dark:text-saldio-dark-green">
            {formatRupiah(currentMonth.income)}
          </Text>
          {incomeChange !== null ? (
            <Text className="mt-0.5 font-sans text-[10px] text-saldio-muted dark:text-saldio-dark-muted">
              {incomeChange >= 0 ? "+" : ""}{String(incomeChange).replace(".", ",")}% vs bulan lalu
            </Text>
          ) : null}
        </View>
        <View className="flex-1 rounded-2xl bg-saldio-red-bg dark:bg-saldio-dark-red-bg p-3.5">
          <View className="flex-row items-center gap-1">
            <Ionicons name="arrow-up" size={12} color="#E23B3B" />
            <Text className="font-sans text-xs text-saldio-red dark:text-saldio-dark-red">Pengeluaran</Text>
          </View>
          <Text className="mt-1 font-mono-semibold text-sm text-saldio-red dark:text-saldio-dark-red">
            {formatRupiah(currentMonth.expense)}
          </Text>
          {expenseChange !== null ? (
            <Text className="mt-0.5 font-sans text-[10px] text-saldio-muted dark:text-saldio-dark-muted">
              {expenseChange >= 0 ? "+" : ""}{String(expenseChange).replace(".", ",")}% vs bulan lalu
            </Text>
          ) : null}
        </View>
      </View>

      {/* Rata-rata pengeluaran harian */}
      <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border p-3.5">
        <Ionicons name="calendar" size={16} color="#5B6FE8" />
        <View className="flex-1">
          <Text className="font-sans text-xs text-saldio-soft dark:text-saldio-dark-soft">Rata-rata pengeluaran harian</Text>
          <Text className="mt-0.5 font-mono-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">
            {formatRupiah(avgDaily)}
          </Text>
        </View>
        <Text className="font-sans text-[10px] text-saldio-muted dark:text-saldio-dark-muted">
          {dayOfMonth}/{daysInMonth} hari
        </Text>
      </View>

      {/* Pengeluaran per kategori */}
      {categoryBreakdown.length > 0 ? (
        <View className="mt-4">
          <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">Pengeluaran per kategori</Text>
          <View className="mt-3 gap-2.5">
            {categoryBreakdown.map(([cat, amount]) => {
              const maxAmount = categoryBreakdown[0][1];
              const pctBar = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
              const catInfo = categoryByKey(cat, data.customCategories);
              const color = CATEGORY_COLORS[cat] || catInfo.color;
              return (
                <View key={cat}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <CategoryIcon category={cat} size={24} />
                      <Text className="font-sans text-xs text-saldio-ink dark:text-saldio-dark-ink">{catInfo.label}</Text>
                    </View>
                    <Text className="font-mono-medium text-xs text-saldio-ink dark:text-saldio-dark-ink">{formatRupiah(amount)}</Text>
                  </View>
                  <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border">
                    <View className="h-full rounded-full" style={{ width: `${pctBar}%`, backgroundColor: color }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Selisih */}
      <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-saldio-sky dark:bg-saldio-dark-sky p-3.5">
        <View className="flex-row items-center gap-2">
          <Ionicons name="wallet" size={16} color="#3D51E0" />
          <Text className="font-sans text-xs text-saldio-blue dark:text-saldio-dark-blue">Selisih bulan ini</Text>
        </View>
        <Text
          className={`font-mono-semibold text-sm ${
            currentMonth.income - currentMonth.expense >= 0 ? "text-saldio-green dark:text-saldio-dark-green" : "text-saldio-red dark:text-saldio-dark-red"
          }`}
        >
          {formatRupiah(currentMonth.income - currentMonth.expense)}
        </Text>
      </View>
    </View>
  );
}

export function AssetsScreen() {
  const navigation = useNavigation<Nav>();
  const { data } = useAppData();
  const { isDark } = useTheme();

  const total = netWorth(data);
  const liquid = liquidTotal(data);
  const gold = goldTotal(data);
  const grams = totalGoldGrams(data);

  const composition = useMemo(() => {
    return data.wallets
      .map((w) => ({ wallet: w, value: walletBalance(data, w) }))
      .sort((a, b) => b.value - a.value)
      .map((x, i) => ({ ...x, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  }, [data]);

  const trend = useMemo(() => netWorthTrend(data, 6), [data]);

  const pct = (value: number) => {
    if (total <= 0) return "0%";
    const p = Math.round((value / total) * 1000) / 10;
    return `${String(p).replace(".", ",")}%`;
  };

  return (
    <Screen>
      <Text className="mb-4 font-sans-bold text-xl text-saldio-ink dark:text-saldio-dark-ink">Semua Aset</Text>

      {data.wallets.length === 0 ? (
        <EmptyState
          icon="pie-chart"
          iconColor="#5B6FE8"
          iconBackground="#EAEFFB"
          title="Belum ada aset"
          description="Tambahkan dompet untuk melihat komposisi dan tren kekayaanmu."
          actionLabel="Tambah Dompet"
          onAction={() => navigation.navigate("Beranda", { screen: "AddWallet" })}
        />
      ) : (
        <>
          {/* Kartu total */}
          <LinearGradient
            colors={isDark ? [...GRADIENT_DARK] : [...GRADIENT_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1.2, y: 1.2 }}
            style={{ borderRadius: 24, padding: 20, ...HERO_SHADOW }}
          >
            <Text className="font-sans text-sm text-white/75">Total Aset + Emas</Text>
            <Text className="mt-2 font-mono-bold text-3xl text-white">{formatRupiah(total)}</Text>
            <View className="my-4 h-px bg-white/20" />
            <View className="flex-row justify-between">
              <View>
                <Text className="font-sans text-xs text-white/70">Aset Likuid</Text>
                <Text className="mt-1 font-mono-semibold text-sm text-white">
                  {formatRupiah(liquid)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-sans text-xs text-white/70">
                  🪙 Emas ({formatGrams(grams, false)} g)
                </Text>
                <Text className="mt-1 font-mono-semibold text-sm text-white">
                  {formatRupiah(gold)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Komposisi aset */}
          <View className="mt-4 rounded-3xl bg-white dark:bg-saldio-dark-card p-5">
            <Text className="font-sans-bold text-base text-saldio-ink dark:text-saldio-dark-ink">Komposisi aset</Text>
            <View className="mt-4 flex-row items-center gap-5">
              <DonutChart
                slices={composition.map((c) => ({
                  label: c.wallet.name,
                  value: Math.max(c.value, 0),
                  color: c.color,
                }))}
                centerTop={String(data.wallets.length)}
                centerBottom="dompet"
              />
              <View className="flex-1 gap-2.5">
                {composition.map((c) => (
                  <View key={c.wallet.id} className="flex-row items-center gap-2">
                    <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                    <Text className="flex-1 font-sans text-xs text-saldio-soft dark:text-saldio-dark-soft" numberOfLines={1}>
                      {c.wallet.name}
                    </Text>
                    <Text className="font-mono-medium text-xs text-saldio-ink dark:text-saldio-dark-ink">{pct(c.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Tren kekayaan bersih */}
          <View className="mt-4 rounded-3xl bg-white dark:bg-saldio-dark-card p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-bold text-base text-saldio-ink dark:text-saldio-dark-ink">Tren kekayaan bersih</Text>
              <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">6 bulan</Text>
            </View>
            <View className="mt-4">
              <TrendLine
                values={trend.map((t) => t.value)}
                labels={trend.map((t) => monthShortLabel(t.yearMonth))}
                color="#7C5CF6"
              />
            </View>
          </View>

          {/* Financial Insights */}
          <FinancialInsights data={data} />

          {/* Daftar dompet ringkas */}
          <View className="mt-4 gap-3">
            {composition.map((c) => (
              <Pressable
                key={c.wallet.id}
                onPress={() =>
                  navigation.navigate("Beranda", {
                    screen: "WalletDetail",
                    params: { walletId: c.wallet.id },
                  })
                }
                className="flex-row items-center gap-3 rounded-2xl bg-white dark:bg-saldio-dark-card p-4 active:opacity-80"
              >
                <WalletBadge
                  name={c.wallet.name}
                  template={c.wallet.template}
                  type={c.wallet.type}
                  size={40}
                />
                <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">
                  {c.wallet.name}
                </Text>
                <Text className="font-mono-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">
                  {formatRupiah(c.value)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#8892A6" />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}