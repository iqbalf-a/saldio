import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { ActionMenu } from "../components/ActionMenu";
import { WalletBadge } from "../components/WalletBadge";
import { MonthPicker } from "../components/MonthPicker";
import { CategoryIcon } from "../components/CategoryIcon";
import { EmptyState } from "../components/EmptyState";
import { DraggableSheet } from "../components/DraggableSheet";
import { formatDayLabel, formatRupiah, formatSignedGrams, formatSignedRupiah } from "../lib/format";
import { groupByDay, walletBalance } from "../lib/balances";
import { availableMonths, walletFeed } from "../lib/walletFeed";
import { walletSupportsPdfImport } from "../lib/templates";
import { categoryLabel } from "../lib/categories";
import { useConfirm } from "../components/ConfirmModal";
import { HERO_SHADOW } from "../lib/ui";
import { useAppData } from "../state/AppDataContext";
import type { HomeScreenProps } from "../navigation/types";
import type { Transaction } from "../lib/types";
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
      style={{ width: 76 }}
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-full ${
          primary ? "bg-saldio-blue" : "bg-white"
        }`}
      >
        <Ionicons name={icon as never} size={20} color={primary ? "white" : "#3D51E0"} />
      </View>
      <Text className="mt-1.5 font-sans-medium text-xs text-saldio-soft">{label}</Text>
    </Pressable>
  );
}

function WalletTxRow({
  tx,
  category,
  label,
  amountText,
  amountColor,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  category: string | undefined;
  label: string;
  amountText: string;
  amountColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View className="flex-row items-center gap-3 py-3">
      <CategoryIcon category={category} size={40} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm text-saldio-ink" numberOfLines={1}>
          {tx.note || label}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Text className="font-sans text-xs text-saldio-muted">{label}</Text>
          {tx.source !== "manual" ? (
            <View className="flex-row items-center rounded-md bg-saldio-sky px-1.5 py-0.5">
              <Text className="font-sans-medium text-[10px] text-saldio-blue">PDF</Text>
            </View>
          ) : null}
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

/** Tinggi default konten atas (kartu saldo + aksi) sebelum ter-ukur oleh onLayout. */
const DEFAULT_COLLAPSED_TOP = 260;

export function WalletDetailScreen({ route, navigation }: HomeScreenProps<"WalletDetail">) {
  const { data, deleteWallet, deleteTransaction } = useAppData();
  const confirm = useConfirm();
  const wallet = data.wallets.find((w) => w.id === route.params.walletId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsedTop, setCollapsedTop] = useState(DEFAULT_COLLAPSED_TOP);

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
  const canImportPdf = walletSupportsPdfImport(wallet);
  const balance = walletBalance(data, wallet);
  let inflow = 0;
  let outflow = 0;
  for (const t of feed) {
    if (t.date.startsWith(activeMonth)) {
      if (t.type === "income") inflow += t.amount ?? 0;
      else if (t.type === "expense") outflow += t.amount ?? 0;
    }
  }
  const monthFeed = feed.filter((t) => t.date.startsWith(activeMonth));
  const groups = groupByDay(monthFeed);
  const hasAny = feed.length > 0;

  const onDelete = () =>
    confirm({
      title: "Hapus dompet?",
      message: `"${wallet.name}" beserta seluruh transaksinya akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Hapus",
      onConfirm: () => {
        deleteWallet(wallet.id);
        navigation.goBack();
      },
    });

  return (
    <Screen scroll={false} padded={false}>
      <View className="px-5">
        <ScreenHeader
          leading={<WalletBadge name={wallet.name} template={wallet.template} type={wallet.type} size={36} />}
          title={wallet.name}
          right={
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} className="active:opacity-70">
              <Ionicons name="ellipsis-horizontal" size={20} color="#8A94A6" />
            </Pressable>
          }
        />

        <ActionMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Edit Dompet",
              icon: "pencil",
              onPress: () => {
                setMenuOpen(false);
                navigation.navigate("EditWallet", { walletId: wallet.id });
              },
            },
            {
              label: "Hapus Dompet",
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

      {/* Konten atas (kartu saldo + aksi) — tingginya diukur untuk posisi
          tertutup sheet Riwayat di bawah, supaya sheet pas di bawahnya. */}
      <View className="flex-1">
        <View
          className="px-5"
          onLayout={(e) => setCollapsedTop(e.nativeEvent.layout.height)}
        >
          {/* Kartu saldo */}
          <LinearGradient
            colors={["#1E2A78", "#3D51E0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1.2, y: 1.2 }}
            style={{ borderRadius: 24, padding: 20, ...HERO_SHADOW }}
          >
            <Text className="font-sans text-sm text-white/75">Saldo saat ini</Text>
            <Text className="mt-2 font-mono-bold text-3xl text-white">{formatRupiah(balance)}</Text>
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
            {canImportPdf ? (
              <ActionButton
                icon="document-text"
                label="Impor PDF"
                onPress={() => navigation.navigate("ImportPdf", { walletId: wallet.id })}
              />
            ) : null}
          </View>
          <View className="h-6" />
        </View>

        {/* Riwayat — sheet bisa diseret ke atas untuk memenuhi layar */}
        <DraggableSheet collapsedTop={collapsedTop}>
          <View className="mb-2 mt-1 flex-row items-center justify-between px-4">
            <Text className="font-sans-bold text-lg text-saldio-ink">Riwayat</Text>
            <MonthPicker value={activeMonth} options={months} onChange={setMonth} />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
          >
          {!hasAny ? (
            <EmptyState
          icon="receipt"
          title="Belum ada transaksi"
          description={
            canImportPdf
              ? "Catat transaksi pertamamu secara manual, atau impor mutasi PDF dari aplikasi bankmu."
              : "Catat transaksi pertamamu secara manual."
          }
          actionLabel="Tambah Transaksi"
          onAction={() => navigation.navigate("AddTransaction", { walletId: wallet.id })}
          secondaryLabel={canImportPdf ? "Impor Mutasi PDF" : undefined}
          onSecondary={
            canImportPdf
              ? () => navigation.navigate("ImportPdf", { walletId: wallet.id })
              : undefined
          }
        />
      ) : groups.length === 0 ? (
        <View className="items-center py-10">
          <Text className="font-sans text-sm text-saldio-muted">
            Tidak ada transaksi di bulan ini.
          </Text>
        </View>
      ) : (
        <View>
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
                const isGoldTx = t.type === "buy_gold" || t.type === "sell_gold";
                const isIncome = t.type === "income";
                const category = isGoldTx ? "Emas" : t.category;
                const label = categoryLabel(category, data.customCategories);
                const amountText = isGoldTx
                  ? formatSignedGrams(t.type === "buy_gold" ? t.grams ?? 0 : -(t.grams ?? 0))
                  : formatSignedRupiah(isIncome ? t.amount ?? 0 : -(t.amount ?? 0));
                const amountColor = isGoldTx
                  ? t.type === "buy_gold" ? "text-saldio-green" : "text-saldio-red"
                  : isIncome ? "text-saldio-green" : "text-saldio-red";
                return (
                  <WalletTxRow
                    key={t.id}
                    tx={t}
                    category={category}
                    label={label}
                    amountText={amountText}
                    amountColor={amountColor}
                    onEdit={() => navigation.navigate("AddTransaction", { walletId: wallet.id, transactionId: t.id })}
                    onDelete={() =>
                      confirm({
                        title: "Hapus transaksi?",
                        message: `"${t.note || label}" akan dihapus permanen.`,
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
          </ScrollView>
        </DraggableSheet>
      </View>
    </Screen>
  );
}
