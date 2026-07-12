import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { WalletBadge } from "../components/WalletBadge";
import { formatRupiah, toISODate } from "../lib/format";
import { walletBalance } from "../lib/balances";
import { useAppData } from "../state/AppDataContext";
import type { RootScreenProps } from "../navigation/types";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}
function withDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function TransferScreen({ route, navigation }: RootScreenProps<"Transfer">) {
  const { data, addTransfer } = useAppData();
  // Transfer hanya antar dompet likuid (bank/tunai)
  const wallets = data.wallets.filter((w) => w.type !== "gold");

  const [fromId, setFromId] = useState(route.params?.fromWalletId ?? wallets[0]?.id);
  const [toId, setToId] = useState(wallets.find((w) => w.id !== (route.params?.fromWalletId ?? wallets[0]?.id))?.id);
  const [amountDigits, setAmountDigits] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");

  const amount = parseInt(amountDigits || "0", 10);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSubmit = !!fromId && !!toId && fromId !== toId && amount > 0 && validDate;

  const submit = () => {
    if (!canSubmit || !fromId || !toId) return;
    addTransfer({ fromWalletId: fromId, toWalletId: toId, amount, date, note: note.trim() || undefined });
    navigation.goBack();
  };

  const WalletPick = ({
    label,
    selectedId,
    onSelect,
    excludeId,
  }: {
    label: string;
    selectedId?: string;
    onSelect: (id: string) => void;
    excludeId?: string;
  }) => (
    <View className="mb-4">
      <Text className="mb-2 font-sans-semibold text-sm text-saldio-soft">{label}</Text>
      <View className="gap-2">
        {wallets
          .filter((w) => w.id !== excludeId)
          .map((w) => (
            <Pressable
              key={w.id}
              onPress={() => onSelect(w.id)}
              className={`flex-row items-center gap-3 rounded-2xl bg-white p-3 ${
                w.id === selectedId ? "border-2 border-saldio-blue" : "border-2 border-transparent"
              }`}
            >
              <WalletBadge name={w.name} template={w.template} type={w.type} size={36} />
              <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">{w.name}</Text>
              <Text className="font-mono-medium text-xs text-saldio-muted">
                {formatRupiah(walletBalance(data, w))}
              </Text>
            </Pressable>
          ))}
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Transfer Antar Dompet" />

      {wallets.length < 2 ? (
        <View className="items-center rounded-3xl bg-white px-8 py-12">
          <Ionicons name="swap-horizontal" size={32} color="#8A94A6" />
          <Text className="mt-4 text-center font-sans text-sm text-saldio-muted">
            Butuh minimal dua dompet bank/tunai untuk melakukan transfer.
          </Text>
        </View>
      ) : (
        <>
          <WalletPick label="Dari dompet" selectedId={fromId} onSelect={(id) => {
            setFromId(id);
            if (id === toId) setToId(wallets.find((w) => w.id !== id)?.id);
          }} />
          <View className="mb-4 items-center">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-saldio-sky">
              <Ionicons name="arrow-down" size={16} color="#3D51E0" />
            </View>
          </View>
          <WalletPick label="Ke dompet" selectedId={toId} onSelect={setToId} excludeId={fromId} />

          <Text className="mb-2 font-sans-semibold text-sm text-saldio-soft">Nominal</Text>
          <View className="rounded-2xl bg-white px-4 py-3.5">
            <View className="flex-row items-center gap-1">
              <Text className="font-mono-semibold text-2xl text-saldio-ink">Rp</Text>
              <TextInput
                value={withDots(amountDigits)}
                onChangeText={(v) => setAmountDigits(digitsOnly(v))}
                placeholder="0"
                keyboardType="number-pad"
                placeholderTextColor="#8A94A6"
                className="flex-1 font-mono-semibold text-2xl text-saldio-ink"
              />
            </View>
          </View>

          <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft">Tanggal (TTTT-BB-HH)</Text>
          <View className="rounded-2xl bg-white px-4 py-3">
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-07-12"
              placeholderTextColor="#8A94A6"
              className="font-mono-medium text-base text-saldio-ink"
            />
          </View>

          <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft">Catatan (opsional)</Text>
          <View className="rounded-2xl bg-white px-4 py-3">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="mis. Isi dompet tunai"
              placeholderTextColor="#8A94A6"
              className="font-sans text-base text-saldio-ink"
            />
          </View>

          <View className="mt-8">
            <PrimaryButton label="Transfer" onPress={submit} disabled={!canSubmit} />
          </View>
        </>
      )}
    </Screen>
  );
}
