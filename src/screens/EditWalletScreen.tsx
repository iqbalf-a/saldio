import React, { useState } from "react";
import { Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { TEMPLATE_BADGES, WALLET_TEMPLATES } from "../lib/templates";
import { useAppData } from "../state/AppDataContext";
import type { HomeScreenProps } from "../navigation/types";
import { useDarkColor } from "../lib/darkColors";
import { useTheme } from '../components/ThemeProvider';

/** Format Rupiah input as user types: "1500000" → "1.500.000", "1500000,50" → "1.500.000,50" */
function formatRupiahInput(s: string): string {
  const cleaned = s.replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.length > 1 ? `${integerPart},${parts[1]}` : integerPart;
}

/** Parse formatted Rupiah input for storage: "1.500.000,50" → 1500000.50 */
function parseRupiahInput(s: string): number {
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function EditWalletScreen({ route, navigation }: HomeScreenProps<"EditWallet">) {
  const { data, updateWallet } = useAppData();
  const wallet = data.wallets.find((w) => w.id === route.params.walletId);
  const [name, setName] = useState(wallet?.name ?? "");
  const isGold = wallet?.type === "gold";
  const cardColor = useDarkColor("card");
  const { isDark } = useTheme();

  const [balanceInput, setBalanceInput] = useState(
    wallet?.initialBalance ? formatRupiahInput(String(wallet.initialBalance)) : ""
  );
  const [grams, setGrams] = useState(
    wallet?.totalGrams ? String(wallet.totalGrams) : ""
  );
  const [includeInTotal, setIncludeInTotal] = useState(wallet?.includeInTotal !== false);

  const canSubmit = name.trim().length > 0;

  if (!wallet) {
    navigation.goBack();
    return null;
  }

  const submit = () => {
    if (!canSubmit) return;
    updateWallet(wallet.id, {
      name: name.trim(),
      includeInTotal,
      ...(isGold
        ? { totalGrams: parseFloat(grams.replace(",", ".")) || 0 }
        : { initialBalance: parseRupiahInput(balanceInput) }),
    });
    navigation.goBack();
  };

  return (
    <Screen>
      <ScreenHeader title="Edit Dompet" />

      <View className="flex-row items-center gap-3 rounded-2xl bg-white dark:bg-saldio-surface p-4 mb-4">
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: TEMPLATE_BADGES[wallet.template]?.background ?? cardColor,
          }}
        >
          {wallet.type === "gold" ? (
            <Ionicons name="server" size={18} color="#B08415" />
          ) : wallet.template === "custom" ? (
            <Ionicons name="pencil" size={18} color="#64748B" />
          ) : (
            <Text
              className="font-sans-bold text-base"
              style={{ color: TEMPLATE_BADGES[wallet.template]?.color ?? "#64748B" }}
            >
              {TEMPLATE_BADGES[wallet.template]?.initials ?? "Ku"}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">{wallet.name}</Text>
          <Text className="mt-0.5 font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
            {isGold ? "Dompet emas" : wallet.type === "cash" ? "Uang tunai" : "Rekening bank"}
          </Text>
        </View>
      </View>

      <Text className="mb-3 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Nama dompet</Text>
      <View className="rounded-2xl border-2 border-saldio-blue bg-white dark:bg-saldio-surface px-4 py-3">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nama dompet"
          placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
          className="font-sans-semibold text-base text-saldio-ink dark:text-saldio-dark-ink"
        />
      </View>

      <Text className="mb-3 mt-6 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">
        {isGold ? "Gram awal" : "Saldo awal"}
      </Text>
      <View className="rounded-2xl bg-white dark:bg-saldio-surface px-4 py-3">
        <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
          {isGold ? "Masukkan jumlah gram emas" : "Masukkan saldo awal"}
        </Text>
        {isGold ? (
          <TextInput
            value={grams}
            onChangeText={(v) => setGrams(v.replace(/[^0-9.,]/g, ""))}
            placeholder="0"
            keyboardType="decimal-pad"
            placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
            className="mt-1 font-mono-semibold text-base text-saldio-ink dark:text-saldio-dark-ink"
          />
        ) : (
          <View className="flex-row items-center">
            <Text className="font-mono-semibold text-base text-saldio-ink dark:text-saldio-dark-ink">Rp</Text>
            <TextInput
              value={balanceInput}
              onChangeText={(v) => setBalanceInput(formatRupiahInput(v))}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
              className="mt-0 flex-1 font-mono-semibold text-base text-saldio-ink dark:text-saldio-dark-ink"
            />
          </View>
        )}
      </View>

      <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-white dark:bg-saldio-surface px-4 py-3">
        <View className="flex-1 pr-3">
          <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">
            Hitung ke Total Aset
          </Text>
          <Text className="mt-0.5 font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
            Matikan untuk dompet yang sumbernya sudah dihitung di dompet lain (mis. dompet
            pengeluaran harian), supaya tidak dobel di Total Aset.
          </Text>
        </View>
        <Switch value={includeInTotal} onValueChange={setIncludeInTotal} />
      </View>

      <View className="mt-8">
        <PrimaryButton
          label="Simpan Perubahan"
          onPress={submit}
          disabled={!canSubmit}
          variant={isGold ? "gold" : "primary"}
        />
      </View>
    </Screen>
  );
}
