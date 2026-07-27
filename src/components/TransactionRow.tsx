import React from "react";
import { Text, View } from "react-native";
import { formatSignedGrams, formatSignedRupiah } from "../lib/format";
import type { Transaction } from "../lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { categoryLabel } from "../lib/categories";
import { useAppData } from "../state/AppDataContext";

interface Props {
  tx: Transaction;
  /** Badge kecil nama dompet (dipakai di Riwayat global) */
  walletTag?: string;
  walletTagColor?: string;
}

function SourceChip({ source }: { source: Transaction["source"] }) {
  if (source === "manual") {
    return (
      <View className="rounded-md bg-saldio-bg dark:bg-saldio-dark-bg px-1.5 py-0.5">
        <Text className="font-sans-medium text-[10px] text-saldio-soft dark:text-saldio-dark-soft">Manual</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center rounded-md bg-saldio-sky dark:bg-saldio-dark-sky px-1.5 py-0.5">
      <Text className="font-sans-medium text-[10px] text-saldio-blue dark:text-saldio-dark-blue">PDF</Text>
    </View>
  );
}

export function TransactionRow({ tx, walletTag, walletTagColor }: Props) {
  const { data } = useAppData();
  const isGold = tx.type === "buy_gold" || tx.type === "sell_gold";
  const isIncome = tx.type === "income";
  const amountText = isGold
    ? formatSignedGrams(tx.type === "buy_gold" ? tx.grams ?? 0 : -(tx.grams ?? 0))
    : formatSignedRupiah(isIncome ? tx.amount ?? 0 : -(tx.amount ?? 0));
  const amountColor = isGold
    ? tx.type === "buy_gold"
      ? "text-saldio-green dark:text-saldio-dark-green"
      : "text-saldio-red dark:text-saldio-dark-red"
    : isIncome
      ? "text-saldio-green dark:text-saldio-dark-green"
      : "text-saldio-red dark:text-saldio-dark-red";

  const category = isGold ? "Emas" : tx.category;
  const label = categoryLabel(category, data.customCategories);

  return (
    <View className="flex-row items-center gap-3 py-3">
      <CategoryIcon category={category} size={40} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink" numberOfLines={1}>
          {tx.note || label}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          {walletTag ? (
            <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: (walletTagColor ?? "#64748B") + "22" }}>
              <Text className="font-sans-bold text-[10px]" style={{ color: walletTagColor ?? "#64748B" }}>
                {walletTag}
              </Text>
            </View>
          ) : null}
          <Text className="font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">{label}</Text>
          <SourceChip source={tx.source} />
        </View>
      </View>
      <Text className={`font-mono-semibold text-[12px] ${amountColor}`}>{amountText}</Text>
    </View>
  );
}
