import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { DatePickerField } from "../components/DatePickerField";
import { ReceiptPicker } from "../components/ReceiptPicker";
import { WalletBadge } from "../components/WalletBadge";
import { CATEGORIES, allCategories } from "../lib/categories";
import { toISODate } from "../lib/format";
import type { TransactionType } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import type { HomeScreenProps } from "../navigation/types";
import { useTheme } from '../components/ThemeProvider';

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}
function withDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function TypeToggle({
  options,
  value,
  onChange,
  activeColor = "bg-saldio-blue",
}: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
  activeColor?: string;
}) {
  return (
    <View className="flex-row rounded-full bg-white dark:bg-saldio-surface p-1">
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          className={`flex-1 items-center rounded-full py-2.5 ${value === o.key ? activeColor : ""}`}
        >
          <Text
            className={`font-sans-semibold text-sm ${
              value === o.key ? "text-white" : "text-saldio-soft dark:text-saldio-dark-soft"
            }`}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AddTransactionScreen({ route, navigation }: HomeScreenProps<"AddTransaction">) {
  const { data, addTransaction, updateTransaction } = useAppData();
  const { isDark } = useTheme();
  const isEdit = !!route.params?.transactionId;
  const existingTx = isEdit ? data.transactions.find((t) => t.id === route.params.transactionId) : null;
  const wallets = data.wallets;
  const [walletId, setWalletId] = useState(route.params?.walletId ?? existingTx?.walletId ?? wallets[0]?.id);
  const wallet = wallets.find((w) => w.id === walletId);
  const isGold = wallet?.type === "gold";

  const [txType, setTxType] = useState<string>(existingTx?.type ?? (isGold ? "buy_gold" : "expense"));
  const [amountDigits, setAmountDigits] = useState(existingTx?.amount ? String(existingTx.amount) : "");
  const [grams, setGrams] = useState(existingTx?.grams ? String(existingTx.grams) : "");
  const [category, setCategory] = useState(existingTx?.category ?? "Makanan");
  const [note, setNote] = useState(existingTx?.note ?? "");
  const [date, setDate] = useState(existingTx?.date ?? toISODate(new Date()));
  const [receiptImage, setReceiptImage] = useState<string | undefined>(existingTx?.receiptImage);

  const categories = useMemo(() => allCategories(data.customCategories).filter((c) => c.key !== "Emas" && c.key !== "Transfer"), [data.customCategories]);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSubmit =
    !!wallet && validDate && (isGold ? parseFloat(grams.replace(",", ".")) > 0 : parseInt(amountDigits || "0", 10) > 0);

  const submit = () => {
    if (!canSubmit || !wallet) return;
    const txData = isGold
      ? {
          walletId: wallet.id,
          date,
          type: (txType === "sell_gold" ? "sell_gold" : "buy_gold") as TransactionType,
          grams: parseFloat(grams.replace(",", ".")),
          note: note.trim() || undefined,
          source: "manual" as const,
        }
      : {
          walletId: wallet.id,
          date,
          type: (txType === "income" ? "income" : "expense") as TransactionType,
          amount: parseInt(amountDigits, 10),
          category,
          note: note.trim() || undefined,
          source: "manual" as const,
          receiptImage,
        };
    if (isEdit && existingTx) {
      updateTransaction(existingTx.id, txData);
    } else {
      addTransaction(txData);
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <ScreenHeader title={isEdit ? "Edit Transaksi" : isGold ? "Catat Transaksi Emas" : "Tambah Transaksi"} />

      {/* Pilih dompet (jika tidak dibuka dari dompet tertentu) */}
      {!route.params?.walletId ? (
        <View className="mb-4">
          <Text className="mb-2 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Dompet</Text>
          <View className="gap-2">
            {wallets.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => {
                  setWalletId(w.id);
                  setTxType(w.type === "gold" ? "buy_gold" : "expense");
                }}
                className={`flex-row items-center gap-3 rounded-2xl bg-white dark:bg-saldio-surface p-3 ${
                  w.id === walletId ? "border-2 border-saldio-blue" : "border-2 border-transparent"
                }`}
              >
                <WalletBadge name={w.name} template={w.template} type={w.type} size={36} />
                <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">{w.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text className="mb-2 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Jenis</Text>
      {isGold ? (
        <TypeToggle
          options={[
            { key: "buy_gold", label: "Beli Emas" },
            { key: "sell_gold", label: "Jual Emas" },
          ]}
          value={txType}
          onChange={setTxType}
          activeColor="bg-saldio-gold"
        />
      ) : (
        <TypeToggle
          options={[
            { key: "expense", label: "Pengeluaran" },
            { key: "income", label: "Pemasukan" },
          ]}
          value={txType}
          onChange={setTxType}
        />
      )}

      <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">
        {isGold ? "Berat (gram)" : "Nominal"}
      </Text>
      <View className="rounded-2xl bg-white dark:bg-saldio-surface px-4 py-3.5">
        {isGold ? (
          <TextInput
            value={grams}
            onChangeText={(v) => setGrams(v.replace(/[^0-9.,]/g, ""))}
            placeholder="0,5"
            keyboardType="decimal-pad"
            placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
            className="font-mono-semibold text-2xl text-saldio-ink dark:text-saldio-dark-ink"
          />
        ) : (
          <View className="flex-row items-center gap-1">
            <Text className="font-mono-semibold text-2xl text-saldio-ink dark:text-saldio-dark-ink">Rp</Text>
            <TextInput
              value={withDots(amountDigits)}
              onChangeText={(v) => setAmountDigits(digitsOnly(v))}
              placeholder="0"
              keyboardType="number-pad"
              placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
              className="flex-1 font-mono-semibold text-2xl text-saldio-ink dark:text-saldio-dark-ink"
            />
          </View>
        )}
      </View>

      {!isGold ? (
        <>
          <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Kategori</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                className={`rounded-full px-4 py-2 ${
                  category === c.key ? "bg-saldio-blue" : "bg-white dark:bg-saldio-surface"
                }`}
              >
                <Text
                  className={`font-sans-semibold text-xs ${
                    category === c.key ? "text-white" : "text-saldio-soft dark:text-saldio-dark-soft"
                  }`}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Catatan</Text>
      <View className="rounded-2xl bg-white dark:bg-saldio-surface px-4 py-3">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={isGold ? "mis. Beli emas Pegadaian" : "mis. Makan siang warteg"}
          placeholderTextColor={isDark ? '#9CA3AF' : '#8A94A6'}
          className="font-sans text-base text-saldio-ink dark:text-saldio-dark-ink"
        />
      </View>

      {!isGold ? (
        <>
          <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">
            Foto Struk (opsional)
          </Text>
          <ReceiptPicker value={receiptImage} onChange={setReceiptImage} />
        </>
      ) : null}

      <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft dark:text-saldio-dark-soft">Tanggal</Text>
      <DatePickerField value={date} onChange={setDate} accent={isGold ? "gold" : "blue"} />

      <View className="mt-8">
        <PrimaryButton
          label="Simpan Transaksi"
          onPress={submit}
          disabled={!canSubmit}
          variant={isGold ? "gold" : "primary"}
        />
      </View>
    </Screen>
  );
}
