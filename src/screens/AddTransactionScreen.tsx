import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { DatePickerField } from "../components/DatePickerField";
import { WalletBadge } from "../components/WalletBadge";
import { CATEGORIES } from "../lib/categories";
import { toISODate } from "../lib/format";
import type { TransactionType } from "../lib/types";
import { useAppData } from "../state/AppDataContext";
import type { HomeScreenProps } from "../navigation/types";

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
    <View className="flex-row rounded-full bg-white p-1">
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          className={`flex-1 items-center rounded-full py-2.5 ${value === o.key ? activeColor : ""}`}
        >
          <Text
            className={`font-sans-semibold text-sm ${
              value === o.key ? "text-white" : "text-saldio-soft"
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
  const { data, addTransaction } = useAppData();
  const wallets = data.wallets;
  const [walletId, setWalletId] = useState(route.params?.walletId ?? wallets[0]?.id);
  const wallet = wallets.find((w) => w.id === walletId);
  const isGold = wallet?.type === "gold";

  const [txType, setTxType] = useState<string>(isGold ? "buy_gold" : "expense");
  const [amountDigits, setAmountDigits] = useState("");
  const [grams, setGrams] = useState("");
  const [category, setCategory] = useState("Makanan");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));

  const categories = useMemo(() => CATEGORIES.filter((c) => c.key !== "Emas" && c.key !== "Transfer"), []);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSubmit =
    !!wallet && validDate && (isGold ? parseFloat(grams.replace(",", ".")) > 0 : parseInt(amountDigits || "0", 10) > 0);

  const submit = () => {
    if (!canSubmit || !wallet) return;
    if (isGold) {
      addTransaction({
        walletId: wallet.id,
        date,
        type: (txType === "sell_gold" ? "sell_gold" : "buy_gold") as TransactionType,
        grams: parseFloat(grams.replace(",", ".")),
        note: note.trim() || undefined,
        source: "manual",
      });
    } else {
      addTransaction({
        walletId: wallet.id,
        date,
        type: (txType === "income" ? "income" : "expense") as TransactionType,
        amount: parseInt(amountDigits, 10),
        category,
        note: note.trim() || undefined,
        source: "manual",
      });
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <ScreenHeader title={isGold ? "Catat Transaksi Emas" : "Tambah Transaksi"} />

      {/* Pilih dompet (jika tidak dibuka dari dompet tertentu) */}
      {!route.params?.walletId ? (
        <View className="mb-4">
          <Text className="mb-2 font-sans-semibold text-sm text-saldio-soft">Dompet</Text>
          <View className="gap-2">
            {wallets.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => {
                  setWalletId(w.id);
                  setTxType(w.type === "gold" ? "buy_gold" : "expense");
                }}
                className={`flex-row items-center gap-3 rounded-2xl bg-white p-3 ${
                  w.id === walletId ? "border-2 border-saldio-blue" : "border-2 border-transparent"
                }`}
              >
                <WalletBadge name={w.name} template={w.template} type={w.type} size={36} />
                <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">{w.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text className="mb-2 font-sans-semibold text-sm text-saldio-soft">Jenis</Text>
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

      <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft">
        {isGold ? "Berat (gram)" : "Nominal"}
      </Text>
      <View className="rounded-2xl bg-white px-4 py-3.5">
        {isGold ? (
          <TextInput
            value={grams}
            onChangeText={(v) => setGrams(v.replace(/[^0-9.,]/g, ""))}
            placeholder="0,5"
            keyboardType="decimal-pad"
            placeholderTextColor="#8A94A6"
            className="font-mono-semibold text-2xl text-saldio-ink"
          />
        ) : (
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
        )}
      </View>

      {!isGold ? (
        <>
          <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft">Kategori</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                className={`rounded-full px-4 py-2 ${
                  category === c.key ? "bg-saldio-blue" : "bg-white"
                }`}
              >
                <Text
                  className={`font-sans-semibold text-xs ${
                    category === c.key ? "text-white" : "text-saldio-soft"
                  }`}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft">Catatan</Text>
      <View className="rounded-2xl bg-white px-4 py-3">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={isGold ? "mis. Beli emas Pegadaian" : "mis. Makan siang warteg"}
          placeholderTextColor="#8A94A6"
          className="font-sans text-base text-saldio-ink"
        />
      </View>

      <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft">Tanggal</Text>
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
