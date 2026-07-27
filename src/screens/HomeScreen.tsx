import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Screen } from "../components/Screen";
import { WalletBadge } from "../components/WalletBadge";
import { EmptyState } from "../components/EmptyState";
import { ActionMenu } from "../components/ActionMenu";
import { formatGrams, formatRupiah } from "../lib/format";
import {
  goldGrams,
  goldTotal,
  latestGoldPrice,
  liquidTotal,
  netWorth,
  walletBalance,
} from "../lib/balances";
import { WALLET_TEMPLATES, walletSupportsPdfImport } from "../lib/templates";
import type { Wallet } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import { useAuth } from "../state/AuthContext";
import { CARD_SHADOW, HERO_SHADOW } from "../lib/ui";
import { useTheme } from "../components/ThemeProvider";
import type { HomeStackParamList, MainTabsParamList } from "../navigation/types";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<MainTabsParamList>
>;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

function walletSubtitle(wallet: Wallet): string {
  const label = WALLET_TEMPLATES.find((t) => t.key === wallet.template)?.label ?? wallet.template;
  if (wallet.type === "cash" || wallet.template === "custom") return `${label} · manual`;
  return `${label} · ${walletSupportsPdfImport(wallet) ? "impor PDF" : "manual"}`;
}

const GRADIENT_LIGHT = ["#1E2A78", "#3D51E0"] as const;
const GRADIENT_DARK = ["#131B54", "#2A3BAA"] as const;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { data, moveWallet } = useAppData();
  const { profile } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [walletMenuId, setWalletMenuId] = useState<string | null>(null);
  const { isDark } = useTheme();

  const total = netWorth(data);
  const liquid = liquidTotal(data);
  const gold = goldTotal(data);
  const price = latestGoldPrice(data);
  const mask = (s: string) => (hidden ? "Rp••••••••" : s);

  return (
    <View className="flex-1">
      <Screen>
        {/* Sapaan */}
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="font-sans text-sm text-saldio-soft dark:text-saldio-dark-soft">{greeting()}</Text>
            <Text className="mt-0.5 font-sans-bold text-xl text-saldio-ink dark:text-saldio-dark-ink">
              {profile?.name ?? "Pengguna"}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Profil")}
            className="h-11 w-11 items-center justify-center rounded-full bg-saldio-blue active:opacity-80"
          >
            <Ionicons name="person" size={20} color="#5B6FE8" />
          </Pressable>
        </View>

        {/* Kartu total saldo */}
        <LinearGradient
          colors={isDark ? [...GRADIENT_DARK] : [...GRADIENT_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.2, y: 1.2 }}
          style={{ borderRadius: 24, padding: 20, ...HERO_SHADOW }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-sm text-white/75">Total Saldo</Text>
            <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8}>
              <Ionicons name={hidden ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
          <Text className="mt-2 font-mono-bold text-3xl text-white">{mask(formatRupiah(total))}</Text>
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white/15 px-4 py-3.5">
              <Text className="font-sans text-xs text-white/75">Aset Likuid</Text>
              <Text className="mt-1 font-mono-semibold text-sm text-white">
                {mask(formatRupiah(liquid))}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/15 px-4 py-3.5">
              <Text className="font-sans text-xs text-white/75">🪙 Emas</Text>
              <Text className="mt-1 font-mono-semibold text-sm text-white">
                {mask(formatRupiah(gold))}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Daftar dompet */}
        <View className="mb-3.5 mt-7 flex-row items-end justify-between">
          <Text className="font-sans-bold text-lg text-saldio-ink dark:text-saldio-dark-ink">Dompet</Text>
          <Text className="font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
            {data.wallets.length} dompet
          </Text>
        </View>

        {data.wallets.length === 0 ? (
          <EmptyState
            icon="wallet"
            iconColor="#5B6FE8"
            iconBackground="#EAEFFB"
            title="Belum ada dompet"
            description="Buat dompet pertamamu — rekening bank, uang tunai, atau tabungan emas."
            actionLabel="Tambah Dompet"
            onAction={() => navigation.navigate("AddWallet")}
          />
        ) : (
          <View className="gap-3.5">
            {data.wallets.map((w, idx) => {
              const isGold = w.type === "gold";
              return (
                <View key={w.id}>
                  <Pressable
                    onPress={() => navigation.navigate("WalletDetail", { walletId: w.id })}
                    onLongPress={() => setWalletMenuId(w.id)}
                    style={CARD_SHADOW}
                    className={`flex-row items-center gap-3 rounded-[20px] p-4 active:opacity-80 ${
                      isGold
                        ? "bg-saldio-gold-bg dark:bg-saldio-dark-gold-bg"
                        : "bg-white dark:bg-saldio-dark-card"
                    }`}
                  >
                    <WalletBadge name={w.name} template={w.template} type={w.type} size={40} />
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">{w.name}</Text>
                      <Text className="mt-0.5 font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
                        {isGold
                          ? price
                            ? `${formatGrams(goldGrams(data, w), false)} gram · ${formatRupiah(price.pricePerGram)}/g`
                            : `${formatGrams(goldGrams(data, w), false)} gram · harga belum diatur`
                          : walletSubtitle(w)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-mono-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">
                        {mask(formatRupiah(walletBalance(data, w)))}
                      </Text>
                      {isGold ? (
                        <Text className="mt-0.5 font-sans text-[10px] text-saldio-gold-ink dark:text-saldio-dark-gold-ink">
                          ≈ nilai saat ini
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                  <ActionMenu
                    visible={walletMenuId === w.id}
                    onClose={() => setWalletMenuId(null)}
                    items={[
                      ...(idx > 0
                        ? [
                            {
                              label: "Pindah ke atas",
                              icon: "arrow-up",
                              onPress: () => {
                                moveWallet(w.id, "up");
                                setWalletMenuId(null);
                              },
                            },
                          ]
                        : []),
                      ...(idx < data.wallets.length - 1
                        ? [
                            {
                              label: "Pindah ke bawah",
                              icon: "arrow-down",
                              onPress: () => {
                                moveWallet(w.id, "down");
                                setWalletMenuId(null);
                              },
                            },
                          ]
                        : []),
                    ]}
                  />
                </View>
              );
            })}
          </View>
        )}
      </Screen>

      {/* FAB tambah dompet */}
      <Pressable
        onPress={() => navigation.navigate("AddWallet")}
        className="absolute bottom-6 right-5 h-[52px] w-[52px] items-center justify-center rounded-full bg-saldio-blue shadow-lg active:opacity-85"
      >
        <Ionicons name="add" size={26} color="white" />
      </Pressable>
    </View>
  );
}
