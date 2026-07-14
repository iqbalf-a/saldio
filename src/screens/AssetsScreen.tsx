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
import { formatGrams, formatRupiah, monthShortLabel } from "../lib/format";
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
import type { MainTabsParamList } from "../navigation/types";

type Nav = BottomTabNavigationProp<MainTabsParamList>;

const DONUT_COLORS = ["#3D51E0", "#C9A227", "#8B5CF6", "#E8740C", "#94A3B8", "#16A34A", "#E23B3B", "#0EA5E9"];

export function AssetsScreen() {
  const navigation = useNavigation<Nav>();
  const { data } = useAppData();

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
      <Text className="mb-4 font-sans-bold text-xl text-saldio-ink">Semua Aset</Text>

      {data.wallets.length === 0 ? (
        <EmptyState
          icon="pie-chart"
          iconColor="#3D51E0"
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
            colors={["#1E2A78", "#3D51E0"]}
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
          <View className="mt-4 rounded-3xl bg-white p-5">
            <Text className="font-sans-bold text-base text-saldio-ink">Komposisi aset</Text>
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
                    <Text className="flex-1 font-sans text-xs text-saldio-soft" numberOfLines={1}>
                      {c.wallet.name}
                    </Text>
                    <Text className="font-mono-medium text-xs text-saldio-ink">{pct(c.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Tren kekayaan bersih */}
          <View className="mt-4 rounded-3xl bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-bold text-base text-saldio-ink">Tren kekayaan bersih</Text>
              <Text className="font-sans text-xs text-saldio-muted">6 bulan</Text>
            </View>
            <View className="mt-4">
              <TrendLine
                values={trend.map((t) => t.value)}
                labels={trend.map((t) => monthShortLabel(t.yearMonth))}
                color="#7C5CF6"
              />
            </View>
          </View>

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
                className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
              >
                <WalletBadge
                  name={c.wallet.name}
                  template={c.wallet.template}
                  type={c.wallet.type}
                  size={40}
                />
                <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">
                  {c.wallet.name}
                </Text>
                <Text className="font-mono-semibold text-sm text-saldio-ink">
                  {formatRupiah(c.value)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
