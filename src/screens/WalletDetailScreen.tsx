import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { WalletBadge } from "../components/WalletBadge";
import { MonthPicker } from "../components/MonthPicker";
import { TransactionRow } from "../components/TransactionRow";
import { EmptyState } from "../components/EmptyState";
import { formatDayLabel, formatRupiah, formatSignedRupiah } from "../lib/format";
import { groupByDay, walletBalance, walletInOut } from "../lib/balances";
import { availableMonths, walletFeed } from "../lib/walletFeed";
import { confirmDestructive } from "../lib/confirm";
import { useAppData } from "../state/AppDataContext";
import type { RootScreenProps } from "../navigation/types";
import { GoldWalletView } from "./GoldWalletView";

function ActionButton({
  icon,
  label,
  onPress,
  primary,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center ${disabled ? "opacity-40" : "active:opacity-75"}`}
      style={{ width: 84 }}
    >
      <View
        className={`h-14 w-14 items-center justify-center rounded-full ${
          primary ? "bg-saldio-blue" : "bg-white"
        }`}
      >
        <Ionicons name={icon as never} size={22} color={primary ? "white" : "#3D51E0"} />
      </View>
      <Text className="mt-2 font-sans-medium text-xs text-saldio-soft">{label}</Text>
    </Pressable>
  );
}

export function WalletDetailScreen({ route, navigation }: RootScreenProps<"WalletDetail">) {
  const { data, deleteWallet } = useAppData();
  const wallet = data.wallets.find((w) => w.id === route.params.walletId);

  const feed = useMemo(
    () => (wallet ? walletFeed(data, wallet.id) : []),
    [data, wallet]
  );
  const months = useMemo(() => availableMonths(feed), [feed]);
  const [month, setMonth] = useState(months[0]);

  if (!wallet) {
    // Dompet baru saja dihapus — kembali.
    navigation.goBack();
    return null;
  }
  if (wallet.type === "gold") {
    return <GoldWalletView wallet={wallet} />;
  }

  const activeMonth = months.includes(month) ? month : months[0];
  const balance = walletBalance(data, wallet);
  const { inflow, outflow } = walletInOut(data, wallet.id, activeMonth);
  const monthFeed = feed.filter((t) => t.date.startsWith(activeMonth));
  const groups = groupByDay(monthFeed);
  const hasAny = feed.length > 0;

  const onDelete = () =>
    confirmDestructive(
      "Hapus dompet?",
      `"${wallet.name}" beserta seluruh transaksinya akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
      "Hapus",
      () => {
        deleteWallet(wallet.id);
        navigation.goBack();
      }
    );

  return (
    <Screen>
      <ScreenHeader
        leading={<WalletBadge name={wallet.name} template={wallet.template} type={wallet.type} size={36} />}
        title={wallet.name}
        right={
          <Pressable onPress={onDelete} hitSlop={8} className="active:opacity-70">
            <Ionicons name="ellipsis-horizontal" size={20} color="#8A94A6" />
          </Pressable>
        }
      />

      {/* Kartu saldo */}
      <LinearGradient
        colors={["#1E2A78", "#3D51E0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1.2, y: 1.2 }}
        style={{ borderRadius: 24, padding: 20 }}
      >
        <Text className="font-sans text-sm text-white/75">Saldo saat ini</Text>
        <Text className="mt-2 font-mono-bold text-[32px] text-white">{formatRupiah(balance)}</Text>
        {hasAny ? (
          <View className="mt-3 flex-row gap-4">
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-down" size={13} color="#7EE2A8" />
              <Text className="font-sans-medium text-xs text-white/90">
                Masuk {formatRupiah(inflow)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="arrow-up" size={13} color="#FFA8A8" />
              <Text className="font-sans-medium text-xs text-white/90">
                Keluar {formatRupiah(outflow)}
              </Text>
            </View>
          </View>
        ) : (
          <Text className="mt-3 font-sans text-xs text-white/70">
            Dompet baru dibuat · belum ada transaksi
          </Text>
        )}
      </LinearGradient>

      {/* Aksi */}
      <View className="mt-5 flex-row justify-start gap-2">
        <ActionButton
          icon="add"
          label="Transaksi"
          primary
          onPress={() => navigation.navigate("AddTransaction", { walletId: wallet.id })}
        />
        {wallet.supportsPdfImport ? (
          <ActionButton
            icon="document-text"
            label="Impor PDF"
            onPress={() => navigation.navigate("ImportPdf", { walletId: wallet.id })}
          />
        ) : null}
        <ActionButton
          icon="swap-horizontal"
          label="Transfer"
          disabled={data.wallets.filter((w) => w.type !== "gold").length < 2}
          onPress={() => navigation.navigate("Transfer", { fromWalletId: wallet.id })}
        />
      </View>

      {/* Riwayat */}
      <View className="mb-2 mt-6 flex-row items-center justify-between">
        <Text className="font-sans-bold text-lg text-saldio-ink">Riwayat</Text>
        <MonthPicker value={activeMonth} options={months} onChange={setMonth} />
      </View>

      {!hasAny ? (
        <EmptyState
          icon="receipt"
          title="Belum ada transaksi"
          description={
            wallet.supportsPdfImport
              ? "Catat transaksi pertamamu secara manual, atau impor mutasi PDF dari aplikasi bankmu."
              : "Catat transaksi pertamamu secara manual."
          }
          actionLabel="Tambah Transaksi"
          onAction={() => navigation.navigate("AddTransaction", { walletId: wallet.id })}
          secondaryLabel={wallet.supportsPdfImport ? "Impor Mutasi PDF" : undefined}
          onSecondary={
            wallet.supportsPdfImport
              ? () => navigation.navigate("ImportPdf", { walletId: wallet.id })
              : undefined
          }
        />
      ) : groups.length === 0 ? (
        <View className="items-center rounded-3xl bg-white px-8 py-10">
          <Text className="font-sans text-sm text-saldio-muted">
            Tidak ada transaksi di bulan ini.
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
              {g.items.map((t) => (
                <TransactionRow key={t.id} tx={t} />
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
