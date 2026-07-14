import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { DatePickerField } from "../components/DatePickerField";
import { formatRupiah, toISODate } from "../lib/format";
import { latestGoldPrice } from "../lib/balances";
import { useAppData } from "../state/AppDataContext";
import type { HomeScreenProps } from "../navigation/types";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}
function withDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function UpdateGoldPriceScreen({ navigation }: HomeScreenProps<"UpdateGoldPrice">) {
  const { data, addGoldPrice } = useAppData();
  const current = latestGoldPrice(data);
  const [priceDigits, setPriceDigits] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));

  const price = parseInt(priceDigits || "0", 10);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const canSubmit = price > 0 && validDate;

  return (
    <Screen>
      <ScreenHeader title="Perbarui Harga Emas" />

      {current ? (
        <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-saldio-gold-bg p-4">
          <Text className="font-sans text-sm text-saldio-gold-ink">Harga saat ini</Text>
          <Text className="font-mono-semibold text-base text-saldio-gold-ink">
            {formatRupiah(current.pricePerGram)}/g
          </Text>
        </View>
      ) : null}

      <Text className="mb-2 font-sans-semibold text-sm text-saldio-soft">Harga per gram</Text>
      <View className="rounded-2xl bg-white px-4 py-3.5">
        <View className="flex-row items-center gap-1">
          <Text className="font-mono-semibold text-2xl text-saldio-ink">Rp</Text>
          <TextInput
            value={withDots(priceDigits)}
            onChangeText={(v) => setPriceDigits(digitsOnly(v))}
            placeholder="1.485.000"
            keyboardType="number-pad"
            placeholderTextColor="#8A94A6"
            className="flex-1 font-mono-semibold text-2xl text-saldio-ink"
          />
        </View>
      </View>

      <Text className="mb-2 mt-5 font-sans-semibold text-sm text-saldio-soft">Tanggal</Text>
      <DatePickerField value={date} onChange={setDate} accent="gold" />

      <View className="mt-3 flex-row items-start gap-2 rounded-2xl bg-white p-4">
        <Ionicons name="information-circle" size={16} color="#B08415" />
        <Text className="flex-1 font-sans text-xs leading-4 text-saldio-soft">
          Masukkan harga per gram terbaru dari Pegadaian. Nilai seluruh dompet emasmu akan mengikuti
          harga ini, dan perubahannya tercatat di riwayat harga.
        </Text>
      </View>

      <View className="mt-8">
        <PrimaryButton
          label="Simpan Harga"
          variant="gold"
          disabled={!canSubmit}
          onPress={() => {
            addGoldPrice({ date, pricePerGram: price });
            navigation.goBack();
          }}
        />
      </View>
    </Screen>
  );
}
