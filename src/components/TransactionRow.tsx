import React from "react";
import { Text, View } from "react-native";
import { formatSignedGrams, formatSignedRupiah } from "../lib/format";
import type { Transaction } from "../lib/types";
import { CategoryIcon } from "./CategoryIcon";

interface Props {
  tx: Transaction;
  /** Badge kecil nama dompet (dipakai di Riwayat global) */
  walletTag?: string;
  walletTagColor?: string;
}

function SourceChip({ source }: { source: Transaction["source"] }) {
  if (source === "manual") {
    return (
      <View className="rounded-md bg-saldio-bg px-1.5 py-0.5">
        <Text className="font-sans-medium text-[10px] text-saldio-soft">Manual</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center rounded-md bg-saldio-sky px-1.5 py-0.5">
      <Text className="font-sans-medium text-[10px] text-saldio-blue">PDF</Text>
    </View>
  );
}

export function TransactionRow({ tx, walletTag, walletTagColor }: Props) {
  const isGold = tx.type === "buy_gold" || tx.type === "sell_gold";
  const isIncome = tx.type === "income";
  const amountText = isGold
    ? formatSignedGrams(tx.type === "buy_gold" ? tx.grams ?? 0 : -(tx.grams ?? 0))
    : formatSignedRupiah(isIncome ? tx.amount ?? 0 : -(tx.amount ?? 0));
  const amountColor = isGold
    ? tx.type === "buy_gold"
      ? "text-saldio-green"
      : "text-saldio-red"
    : isIncome
      ? "text-saldio-green"
      : "text-saldio-red";

  const category = isGold ? "Emas" : tx.category;

  return (
    <View className="flex-row items-center gap-3 py-3">
      <CategoryIcon category={category} />
      <View className="flex-1">
        <Text className="font-sans-semibold text-[15px] text-saldio-ink" numberOfLines={1}>
          {tx.note || category || "Transaksi"}
        </Text>
        <View className="mt-1 flex-row items-center gap-1.5">
          {walletTag ? (
            <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: (walletTagColor ?? "#64748B") + "22" }}>
              <Text className="font-sans-bold text-[10px]" style={{ color: walletTagColor ?? "#64748B" }}>
                {walletTag}
              </Text>
            </View>
          ) : null}
          <Text className="font-sans text-xs text-saldio-muted">{category ?? "Lainnya"}</Text>
          <SourceChip source={tx.source} />
        </View>
      </View>
      <Text className={`font-mono-semibold text-sm ${amountColor}`}>{amountText}</Text>
    </View>
  );
}
