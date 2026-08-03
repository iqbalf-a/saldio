import React, { useState, useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { MonthPicker } from "../components/MonthPicker";
import { DonutChart } from "../components/charts/DonutChart";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppData } from "../state/AppDataContext";
import { allCategories, categoryByKey } from "../lib/categories";
import { availableMonths } from "../lib/walletFeed";
import { categorySpendForMonth, monthTotalExpense } from "../lib/reports";
import { currentYearMonth, formatRupiah, toISODate, toYearMonth } from "../lib/format";
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

  const months = useMemo(() => availableMonths(data.transactions ?? []), [data.transactions]);
  const [ym, setYm] = useState(currentYearMonth());

  const categorySpend = useMemo(
    () => categorySpendForMonth(data.transactions ?? [], ym),
    [data.transactions, ym]
  );
  const spentMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of categorySpend) map[c.categoryKey] = c.amount;
    return map;
  }, [categorySpend]);

  const donutSlices = useMemo(
    () =>
      categorySpend.map((c) => ({
        label: cats.find((x) => x.key === c.categoryKey)?.label ?? c.categoryKey,
        value: c.amount,
        color: categoryByKey(c.categoryKey, customCats).color,
      })),
    [categorySpend, cats, customCats]
  );
  const monthTotal = useMemo(
    () => categorySpend.reduce((sum, c) => sum + c.amount, 0),
    [categorySpend]
  );

  const prevYm = useMemo(() => {
    const [y, m] = ym.split("-").map(Number);
    return toYearMonth(toISODate(new Date(y, m - 2, 1)));
  }, [ym]);
  const prevMonthTotal = useMemo(
    () => monthTotalExpense(data.transactions ?? [], prevYm),
    [data.transactions, prevYm]
  );
  const totalChangePct = useMemo(() => {
    if (prevMonthTotal === 0) return null;
    return Math.round(((monthTotal - prevMonthTotal) / prevMonthTotal) * 1000) / 10;
  }, [monthTotal, prevMonthTotal]);

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

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-sans text-sm text-saldio-muted dark:text-saldio-dark-muted">
          {budgets.length} budget aktif
        </Text>
        <MonthPicker value={ym} options={months} onChange={setYm} />
      </View>
      <Text className="mb-4 -mt-2 font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
        Limit budget berlaku sama untuk semua bulan — hanya realisasi (pengeluaran) yang berubah per bulan.
      </Text>

      {donutSlices.length > 0 && (
        <View className="mb-5 rounded-2xl bg-white dark:bg-saldio-dark-card p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">
              Pengeluaran per Kategori
            </Text>
            {totalChangePct !== null && (
              <Text
                className={`font-sans text-xs ${
                  totalChangePct > 0
                    ? "text-saldio-red dark:text-saldio-dark-red"
                    : "text-saldio-green dark:text-saldio-dark-green"
                }`}
              >
                {totalChangePct >= 0 ? "+" : ""}
                {String(totalChangePct).replace(".", ",")}% vs bulan lalu
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-4">
            <DonutChart
              slices={donutSlices}
              centerTop={formatRupiah(monthTotal).replace("Rp", "").trim()}
              centerBottom="total"
            />
            <View className="flex-1 gap-2">
              {donutSlices.slice(0, 6).map((s, i) => (
                <View key={i} className="flex-row items-center gap-2">
                  <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  <Text className="flex-1 font-sans text-xs text-saldio-soft dark:text-saldio-dark-soft" numberOfLines={1}>
                    {s.label}
                  </Text>
                  <Text className="font-mono-medium text-xs text-saldio-ink dark:text-saldio-dark-ink">
                    {formatRupiah(s.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

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
