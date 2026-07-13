import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen, ScreenHeader } from "../components/Screen";
import { WalletBadge } from "../components/WalletBadge";
import { EmptyState } from "../components/EmptyState";
import { TrendLine } from "../components/charts/TrendLine";
import {
  formatGrams,
  formatMediumDate,
  formatRupiah,
  formatSignedGrams,
  formatSignedRupiah,
  parseISODate,
} from "../lib/format";
import { goldGrams, goldValue, latestGoldPrice } from "../lib/balances";
import { confirmDestructive } from "../lib/confirm";
import type { Wallet } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import type { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TxFilter = "Semua" | "Beli" | "Jual";

export function GoldWalletView({ wallet }: { wallet: Wallet }) {
  const navigation = useNavigation<Nav>();
  const { data, deleteWallet } = useAppData();
  const [filter, setFilter] = useState<TxFilter>("Semua");

  const grams = goldGrams(data, wallet);
  const value = goldValue(data, wallet);
  const price = latestGoldPrice(data);

  const priceLog = useMemo(
    () => [...data.goldPriceLog].sort((a, b) => b.date.localeCompare(a.date)),
    [data.goldPriceLog]
  );

  // Perubahan 30 hari: harga terbaru vs entri terdekat ≥30 hari sebelumnya.
  const change30 = useMemo(() => {
    if (priceLog.length < 2) return null;
    const latest = priceLog[0];
    const cutoff = parseISODate(latest.date).getTime() - 30 * 86400000;
    const base =
      [...priceLog].reverse().find((p) => parseISODate(p.date).getTime() <= cutoff) ??
      priceLog[priceLog.length - 1];
    if (base.pricePerGram === 0) return null;
    const pct = ((latest.pricePerGram - base.pricePerGram) / base.pricePerGram) * 100;
    return Math.round(pct * 10) / 10;
  }, [priceLog]);

  const goldTxs = useMemo(
    () =>
      data.transactions
        .filter((t) => t.walletId === wallet.id && (t.type === "buy_gold" || t.type === "sell_gold"))
        .filter((t) => {
          if (filter === "Beli") return t.type === "buy_gold";
          if (filter === "Jual") return t.type === "sell_gold";
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.transactions, wallet.id, filter]
  );

  const onDelete = () =>
    confirmDestructive(
      "Hapus dompet?",
      `"${wallet.name}" beserta seluruh catatan emasnya akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
      "Hapus",
      () => {
        deleteWallet(wallet.id);
        navigation.goBack();
      }
    );

  const cycleFilter = () =>
    setFilter((f) => (f === "Semua" ? "Beli" : f === "Beli" ? "Jual" : "Semua"));

  return (
    <Screen scroll={false}>
      <ScreenHeader
        leading={<WalletBadge name={wallet.name} template={wallet.template} type="gold" size={36} />}
        title={wallet.name}
        right={
          <Pressable onPress={onDelete} hitSlop={8} className="active:opacity-70">
            <Ionicons name="ellipsis-horizontal" size={20} color="#8A94A6" />
          </Pressable>
        }
      />

      {/* Kartu emas */}
      <LinearGradient
        colors={["#C9A227", "#8A6A10"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1.4 }}
        style={{ borderRadius: 24, padding: 20 }}
      >
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="font-sans text-sm text-white/80">Total emas</Text>
            <View className="mt-1 flex-row items-baseline gap-1.5">
              <Text className="font-mono-bold text-[34px] text-white">{formatGrams(grams, false)}</Text>
              <Text className="font-sans-semibold text-lg text-white/80">g</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="font-sans text-sm text-white/80">Nilai saat ini</Text>
            <Text className="mt-1 font-mono-bold text-lg text-white">
              {price ? formatRupiah(value) : "—"}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white/20 p-3.5">
          <View className="flex-1 pr-3">
            <Text className="font-sans text-xs text-white/80">
              {price ? `Harga per gram · diperbarui ${formatMediumDate(price.date)}` : "Harga per gram"}
            </Text>
            <Text className="mt-0.5 font-mono-bold text-base text-white">
              {price ? formatRupiah(price.pricePerGram) : "Belum diatur"}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("UpdateGoldPrice", { walletId: wallet.id })}
            className="flex-row items-center gap-1.5 rounded-full bg-white px-4 py-2.5 active:opacity-80"
          >
            <Ionicons name="pencil" size={13} color="#8A6A10" />
            <Text className="font-sans-semibold text-xs text-saldio-gold-deep">
              {price ? "Perbarui Harga" : "Atur Harga"}
            </Text>
          </Pressable>
        </View>

        {!price ? (
          <View className="mt-3 flex-row items-start gap-2">
            <Ionicons name="information-circle" size={14} color="rgba(255,255,255,0.85)" />
            <Text className="flex-1 font-sans text-xs leading-4 text-white/85">
              Masukkan harga per gram terbaru dari Pegadaian agar nilai emasmu bisa dihitung.
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Konten di bawah kartu emas di-scroll terpisah */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
      {/* Riwayat harga */}
      <View className="mt-4 rounded-3xl bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-bold text-base text-saldio-ink">Riwayat harga</Text>
          {change30 !== null ? (
            <View className="flex-row items-center gap-1">
              <Ionicons
                name={change30 >= 0 ? "trending-up" : "trending-down"}
                size={14}
                color={change30 >= 0 ? "#16A34A" : "#E23B3B"}
              />
              <Text
                className={`font-sans-semibold text-xs ${
                  change30 >= 0 ? "text-saldio-green" : "text-saldio-red"
                }`}
              >
                {change30 >= 0 ? "+" : ""}
                {String(change30).replace(".", ",")}% / 30 hari
              </Text>
            </View>
          ) : null}
        </View>

        {priceLog.length === 0 ? (
          <View className="mt-4 items-center rounded-2xl border-2 border-dashed border-saldio-gold/40 px-6 py-8">
            <Text className="font-sans-semibold text-sm text-saldio-gold-ink">
              Belum ada catatan harga
            </Text>
            <Text className="mt-1.5 text-center font-sans text-xs leading-4 text-saldio-muted">
              Setiap kali harga Pegadaian berubah, catat di sini — riwayatnya akan tampil sebagai
              grafik.
            </Text>
          </View>
        ) : (
          <>
            {priceLog.length > 1 ? (
              <View className="mt-3">
                <TrendLine
                  values={[...priceLog].reverse().map((p) => p.pricePerGram)}
                  color="#C9A227"
                />
              </View>
            ) : null}
            <View className="mt-2">
              {priceLog.slice(0, 3).map((p, i) => {
                const prev = priceLog[i + 1];
                const delta = prev ? p.pricePerGram - prev.pricePerGram : null;
                return (
                  <View key={p.date} className="flex-row items-center justify-between py-2">
                    <Text className="w-24 font-sans text-xs text-saldio-soft">
                      {formatMediumDate(p.date)}
                    </Text>
                    <Text className="flex-1 text-center font-mono-medium text-sm text-saldio-ink">
                      {formatRupiah(p.pricePerGram)}
                    </Text>
                    <Text
                      className={`w-20 text-right font-mono-medium text-xs ${
                        delta === null
                          ? "text-saldio-muted"
                          : delta >= 0
                            ? "text-saldio-green"
                            : "text-saldio-red"
                      }`}
                    >
                      {delta === null ? "" : formatSignedRupiah(delta).replace("Rp", "")}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Transaksi emas */}
      <View className="mb-2 mt-6 flex-row items-center justify-between">
        <Text className="font-sans-bold text-lg text-saldio-ink">Transaksi emas</Text>
        <Pressable
          onPress={cycleFilter}
          className="flex-row items-center gap-1 rounded-full bg-white px-4 py-2 active:opacity-70"
        >
          <Text className="font-sans-semibold text-sm text-saldio-ink">{filter}</Text>
          <Ionicons name="chevron-down" size={14} color="#64748B" />
        </Pressable>
      </View>

      {goldTxs.length === 0 && filter === "Semua" ? (
        <EmptyState
          icon="server"
          iconColor="#B08415"
          iconBackground="#FBF3DC"
          title="Belum ada emas"
          description={'Catat pembelian pertamamu dalam gram, misalnya "Beli 0,5 g".'}
          actionLabel="Catat Pembelian Emas"
          actionVariant="gold"
          onAction={() => navigation.navigate("AddTransaction", { walletId: wallet.id })}
        />
      ) : (
        <View className="rounded-3xl bg-white px-4 py-1">
          {goldTxs.length === 0 ? (
            <Text className="py-8 text-center font-sans text-sm text-saldio-muted">
              Tidak ada transaksi {filter.toLowerCase()}.
            </Text>
          ) : (
            goldTxs.map((t) => {
              const isBuy = t.type === "buy_gold";
              return (
                <View key={t.id} className="flex-row items-center gap-3 py-3">
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-2xl ${
                      isBuy ? "bg-saldio-gold-bg" : "bg-saldio-red-bg"
                    }`}
                  >
                    <Ionicons name={isBuy ? "cart" : "hand-left"} size={18} color={isBuy ? "#B08415" : "#E23B3B"} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-semibold text-[15px] text-saldio-ink" numberOfLines={1}>
                      {t.note || (isBuy ? "Beli emas" : "Jual emas")}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Text className="font-sans text-xs text-saldio-muted">
                        {formatMediumDate(t.date)}
                      </Text>
                      <View className="rounded-md bg-saldio-bg px-1.5 py-0.5">
                        <Text className="font-sans-medium text-[10px] text-saldio-soft">Manual</Text>
                      </View>
                    </View>
                  </View>
                  <Text
                    className={`font-mono-semibold text-sm ${
                      isBuy ? "text-saldio-green" : "text-saldio-red"
                    }`}
                  >
                    {formatSignedGrams(isBuy ? t.grams ?? 0 : -(t.grams ?? 0))}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Tombol tambah transaksi emas */}
      {goldTxs.length > 0 || filter !== "Semua" ? (
        <Pressable
          onPress={() => navigation.navigate("AddTransaction", { walletId: wallet.id })}
          className="mt-4 h-12 items-center justify-center rounded-full bg-saldio-gold active:opacity-80"
        >
          <Text className="font-sans-semibold text-sm text-white">Catat Transaksi Emas</Text>
        </Pressable>
      ) : null}
      </ScrollView>
    </Screen>
  );
}
