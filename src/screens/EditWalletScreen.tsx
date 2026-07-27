import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { TEMPLATE_BADGES, WALLET_TEMPLATES } from "../lib/templates";
import { useAppData } from "../state/AppDataContext";
import type { HomeScreenProps } from "../navigation/types";
import { useDarkColor } from "../lib/darkColors";
import { useTheme } from '../components/ThemeProvider';

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function withDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function EditWalletScreen({ route, navigation }: HomeScreenProps<"EditWallet">) {
  const { data, updateWallet } = useAppData();
  const wallet = data.wallets.find((w) => w.id === route.params.walletId);
  const [name, setName] = useState(wallet?.name ?? "");
  const isGold = wallet?.type === "gold";
  const cardColor = useDarkColor("card");
  const { isDark } = useTheme();

  const [balanceDigits, setBalanceDigits] = useState(
    wallet?.initialBalance ? String(wallet.initialBalance) : ""
  );
  const [grams, setGrams] = useState(
    wallet?.totalGrams ? String(wallet.totalGrams) : ""
  );

  const canSubmit = name.trim().length > 0;

  if (!wallet) {
    navigation.goBack();
    return null;
  }

  const submit = () => {
    if (!canSubmit) return;
    updateWallet(wallet.id, {
      name: name.trim(),
      ...(isGold
        ? { totalGrams: parseFloat(grams.replace(",", ".")) || 0 }
        : { initialBalance: parseInt(balanceDigits || "0", 10) }),
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
              value={withDots(balanceDigits)}
              onChangeText={(v) => setBalanceDigits(digitsOnly(v))}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
              className="mt-0 flex-1 font-mono-semibold text-base text-saldio-ink dark:text-saldio-dark-ink"
            />
          </View>
        )}
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
