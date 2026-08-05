import React, { useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { TEMPLATE_BADGES, WALLET_TEMPLATES } from "../lib/templates";
import type { WalletTemplateKey } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import type { HomeScreenProps } from "../navigation/types";
import { useTheme } from '../components/ThemeProvider';

type Selection = WalletTemplateKey | "gold";

const GRID_ORDER: WalletTemplateKey[] = ["bank_jago", "mandiri", "bca", "super_bank", "neo_bank", "custom"];

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function withDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function AddWalletScreen({ navigation }: HomeScreenProps<"AddWallet">) {
  const { addWallet } = useAppData();
  const { isDark } = useTheme();
  const [selected, setSelected] = useState<Selection>("bank_jago");
  const [name, setName] = useState("");
  const [balanceDigits, setBalanceDigits] = useState("");
  const [grams, setGrams] = useState("");
  const [includeInTotal, setIncludeInTotal] = useState(true);

  const isGold = selected === "gold";
  const template = isGold ? null : WALLET_TEMPLATES.find((t) => t.key === selected)!;
  const placeholderName = isGold ? "mis. Emas Pegadaian" : `mis. ${template!.label} Utama`;
  const canSubmit = name.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const wallet = addWallet(
      isGold
        ? {
            name: name.trim(),
            template: "custom",
            type: "gold",
            totalGrams: parseFloat(grams.replace(",", ".")) || 0,
            supportsPdfImport: false,
            includeInTotal,
          }
        : {
            name: name.trim(),
            template: template!.key,
            type: template!.key === "custom" ? "cash" : "bank",
            initialBalance: parseInt(balanceDigits || "0", 10),
            supportsPdfImport: template!.supportsPdfImport,
            includeInTotal,
          }
    );
    navigation.replace("WalletDetail", { walletId: wallet.id });
  };

  return (
    <Screen>
      <ScreenHeader title="Tambah Dompet" />

      <Text className="mb-3 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Pilih template</Text>
      <View className="flex-row flex-wrap justify-between">
        {GRID_ORDER.map((key) => {
          const t = WALLET_TEMPLATES.find((x) => x.key === key)!;
          const badge = TEMPLATE_BADGES[key];
          const active = selected === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(key)}
              className={`mb-3 w-[48.5%] rounded-2xl bg-white dark:bg-saldio-surface p-4 active:opacity-80 ${
                active ? "border-2 border-saldio-blue" : "border-2 border-transparent"
              }`}
            >
              <View className="flex-row items-start justify-between">
                <View
                  className="h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: badge.background }}
                >
                  {key === "custom" ? (
                    <Ionicons name="pencil" size={18} color={badge.color} />
                  ) : (
                    <Text className="font-sans-bold text-base" style={{ color: badge.color }}>
                      {badge.initials}
                    </Text>
                  )}
                </View>
                {active ? (
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-saldio-blue">
                    <Ionicons name="checkmark" size={14} color="white" />
                  </View>
                ) : null}
              </View>
              <Text className="mt-3 font-sans-semibold text-base text-saldio-ink dark:text-saldio-dark-ink">
                {key === "custom" ? "Kustom" : t.label}
              </Text>
              <View className="mt-2 self-start">
                {key === "custom" ? (
                  <View className="rounded-md bg-saldio-bg dark:bg-saldio-dark-bg px-2 py-1">
                    <Text className="font-sans-medium text-[10px] text-saldio-soft dark:text-saldio-dark-soft">Nama & ikon bebas</Text>
                  </View>
                ) : t.supportsPdfImport ? (
                  <View className="flex-row items-center gap-1 rounded-md bg-saldio-green-bg dark:bg-saldio-dark-green-bg px-2 py-1">
                    <Ionicons name="document-text" size={10} color="#16A34A" />
                    <Text className="font-sans-medium text-[10px] text-saldio-green dark:text-saldio-dark-green">Impor PDF</Text>
                  </View>
                ) : (
                  <View className="rounded-md bg-saldio-bg dark:bg-saldio-dark-bg px-2 py-1">
                    <Text className="font-sans-medium text-[10px] text-saldio-soft dark:text-saldio-dark-soft">Manual saja</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Opsi dompet emas */}
      <Pressable
        onPress={() => setSelected("gold")}
        className={`flex-row items-center gap-3 rounded-2xl bg-saldio-gold-bg dark:bg-saldio-dark-gold-bg p-4 active:opacity-80 ${
          isGold ? "border-2 border-saldio-gold" : "border-2 border-transparent"
        }`}
      >
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/70 dark:bg-saldio-surface/70">
          <Ionicons name="server" size={18} color="#B08415" />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-base text-saldio-gold-ink dark:text-saldio-dark-gold-ink">Emas</Text>
          <Text className="mt-0.5 font-sans text-xs text-saldio-gold-ink/80">
            Dicatat dalam gram, nilai mengikuti harga per gram
          </Text>
        </View>
        {isGold ? (
          <View className="h-6 w-6 items-center justify-center rounded-full bg-saldio-gold">
            <Ionicons name="checkmark" size={14} color="white" />
          </View>
        ) : null}
      </Pressable>

      {/* Detail dompet */}
      <Text className="mb-3 mt-6 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Detail dompet</Text>
      <View className="rounded-2xl border-2 border-saldio-blue bg-white dark:bg-saldio-surface px-4 py-3">
        <Text className="font-sans text-xs text-saldio-blue">Nama dompet</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={placeholderName}
          placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
          className="mt-1 font-sans-semibold text-base text-saldio-ink dark:text-saldio-dark-ink"
        />
      </View>

      <View className="mt-3 rounded-2xl bg-white dark:bg-saldio-surface px-4 py-3">
        <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
          {isGold ? "Gram awal (opsional)" : "Saldo awal"}
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

      <View className="mt-6">
        <PrimaryButton
          label="Buat Dompet"
          onPress={submit}
          disabled={!canSubmit}
          variant={isGold ? "gold" : "primary"}
        />
      </View>
    </Screen>
  );
}
