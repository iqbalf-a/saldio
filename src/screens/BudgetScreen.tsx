import React, { useState, useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppData } from "../state/AppDataContext";
import { allCategories } from "../lib/categories";
import { currentYearMonth, formatRupiah } from "../lib/format";
import type { HomeScreenProps } from "../navigation/types";
import { useTheme } from '../components/ThemeProvider';

export function BudgetScreen({ navigation }: HomeScreenProps<"Budget">) {
  const { data, setCategoryBudget, removeCategoryBudget } = useAppData();
  const { isDark } = useTheme();
  const customCats = data.customCategories ?? [];
  const cats = useMemo(() => allCategories(customCats), [customCats]);
  const budgets = data.categoryBudgets ?? [];

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState("");

  const ym = currentYearMonth();

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of data.transactions ?? []) {
      if (tx.type !== "expense" || !tx.date.startsWith(ym)) continue;
      const key = tx.category ?? "";
      map[key] = (map[key] ?? 0) + (tx.amount ?? 0);
    }
    return map;
  }, [data.transactions ?? [], ym]);

  const handleSave = () => {
    if (!selectedCat) return;
    const lim = parseInt(limitInput.replace(/\D/g, ""), 10);
    if (!lim || lim <= 0) return;
    setCategoryBudget(selectedCat, lim);
    setSelectedCat(null);
    setLimitInput("");
  };

  const startSet = (catKey: string) => {
    const existing = budgets.find((b) => b.categoryKey === catKey);
    setSelectedCat(catKey);
    setLimitInput(existing ? String(existing.limit) : "");
  };

  const budgetCats = cats.filter(
    (c) => c.key !== "Emas" && c.key !== "Transfer" && (budgets.some((b) => b.categoryKey === c.key) || (spentMap[c.key] ?? 0) > 0)
  );

  return (
    <Screen>
      <ScreenHeader title="Budget Kategori" />

      <Text className="mb-4 font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
        {budgets.length} budget aktif · {ym}
      </Text>

      {/* Form set budget */}
      {selectedCat && (
        <View className="mb-5 rounded-2xl bg-white dark:bg-saldio-dark-card p-4">
          <Text className="mb-3 font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">
            Budget: {cats.find((c) => c.key === selectedCat)?.label ?? selectedCat}
          </Text>
          <Text className="mb-1.5 font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">Limit per bulan (Rp)</Text>
          <View className="mb-4 rounded-xl bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border px-3 py-2.5">
            <TextInput
              value={limitInput}
              onChangeText={setLimitInput}
              placeholder="mis. 500000"
              placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
              keyboardType="numeric"
              className="font-sans text-sm text-saldio-ink dark:text-saldio-dark-ink"
              autoFocus
            />
          </View>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => { setSelectedCat(null); setLimitInput(""); }}
              className="flex-1 h-[52px] items-center justify-center rounded-full bg-saldio-border dark:bg-saldio-dark-border active:opacity-80"
            >
              <Text className="font-sans-semibold text-base text-saldio-muted dark:text-saldio-dark-muted">Batal</Text>
            </Pressable>
            <View className="flex-1">
              <PrimaryButton
                label="Simpan"
                onPress={handleSave}
                disabled={!limitInput || !parseInt(limitInput.replace(/\D/g, ""), 10)}
              />
            </View>
          </View>
        </View>
      )}

      {budgetCats.length === 0 && (
        <View className="items-center rounded-2xl bg-white dark:bg-saldio-dark-card p-8">
          <Ionicons name="wallet-outline" size={40} color="#D0D5DD" />
          <Text className="mt-3 font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">Belum ada budget</Text>
          <Text className="mt-1 text-center font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
            Tetapkan budget bulanan per kategori untuk mengontrol pengeluaran.
          </Text>
        </View>
      )}

      <View className="gap-2">
        {budgetCats.map((cat) => {
          const budget = budgets.find((b) => b.categoryKey === cat.key);
          const spent = spentMap[cat.key] ?? 0;
          const limit = budget?.limit ?? 0;
          const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const over = limit > 0 && spent > limit;

          return (
            <View key={cat.key} className="rounded-2xl bg-white dark:bg-saldio-dark-card p-3">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: cat.background }}>
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={18} color={cat.color} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">{cat.label}</Text>
                  <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
                    {formatRupiah(spent)}{limit > 0 ? ` / ${formatRupiah(limit)}` : ""}
                  </Text>
                </View>
                {limit > 0 && (
                  <Text className={`font-sans-bold text-sm ${over ? "text-saldio-red dark:text-saldio-dark-red" : "text-saldio-blue dark:text-saldio-dark-blue"}`}>
                    {Math.round(pct)}%
                  </Text>
                )}
              </View>

              {limit > 0 && (
                <View className="mt-2 h-2 rounded-full bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border">
                  <View
                    className={`h-2 rounded-full ${over ? "bg-saldio-red dark:bg-saldio-dark-red" : "bg-saldio-blue dark:bg-saldio-dark-blue"}`}
                    style={{ width: `${pct}%` }}
                  />
                </View>
              )}

              <View className="mt-2 flex-row justify-end gap-2">
                <Pressable
                  onPress={() => startSet(cat.key)}
                  className="h-7 items-center justify-center rounded-lg bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border px-2 active:opacity-70"
                >
                  <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
                    {budget ? "Edit" : "Atur"}
                  </Text>
                </Pressable>
                {budget && (
                  <Pressable
                    onPress={() => removeCategoryBudget(cat.key)}
                    className="h-7 items-center justify-center rounded-lg bg-saldio-bg dark:bg-saldio-dark-bg dark:border-saldio-dark-border px-2 active:opacity-70"
                  >
                    <Ionicons name="close" size={12} color="#E23B3B" />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
