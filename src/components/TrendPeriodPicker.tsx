import React, { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDarkColor } from "../lib/darkColors";

interface Props {
  /** Jangka waktu terpilih, dalam bulan. */
  value: number;
  onChange: (months: number) => void;
}

const PRESETS = [3, 6, 12, 24];
const MIN_MONTHS = 2;
const MAX_MONTHS = 60;

/** Dropdown filter jangka waktu tren ("6 bulan ⌄") — preset cepat + custom bulan. */
export function TrendPeriodPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState(String(value));
  const soft = useDarkColor("soft");
  const muted = useDarkColor("muted");

  const openPicker = () => {
    setCustomInput(String(value));
    setOpen(true);
  };

  const applyCustom = () => {
    const n = parseInt(customInput.replace(/\D/g, ""), 10);
    if (!n) return;
    const clamped = Math.min(Math.max(n, MIN_MONTHS), MAX_MONTHS);
    onChange(clamped);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        className="flex-row items-center gap-1 rounded-full bg-white dark:bg-saldio-dark-card px-4 py-2 active:opacity-70"
      >
        <Text className="font-sans-semibold text-sm text-saldio-ink dark:text-saldio-dark-ink">{value} bulan</Text>
        <Ionicons name="chevron-down" size={14} color={soft} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="mx-4 mb-6 rounded-3xl bg-white dark:bg-saldio-dark-card p-5" onPress={() => {}}>
            <Text className="mb-3 font-sans-bold text-base text-saldio-ink dark:text-saldio-dark-ink">
              Jangka waktu tren
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {PRESETS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                  className={`rounded-full px-4 py-2.5 ${
                    m === value ? "bg-saldio-blue dark:bg-saldio-dark-blue" : "bg-saldio-bg dark:bg-saldio-dark-bg"
                  }`}
                >
                  <Text
                    className={`font-sans-semibold text-sm ${
                      m === value ? "text-white" : "text-saldio-ink dark:text-saldio-dark-ink"
                    }`}
                  >
                    {m} bulan
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="my-4 h-px bg-saldio-border dark:bg-saldio-dark-border" />

            <Text className="mb-2 font-sans-medium text-xs text-saldio-muted dark:text-saldio-dark-muted">
              Atau tentukan sendiri (2–60 bulan)
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 rounded-2xl bg-saldio-bg dark:bg-saldio-dark-bg px-4 py-3">
                <TextInput
                  value={customInput}
                  onChangeText={(v) => setCustomInput(v.replace(/\D/g, ""))}
                  placeholder="mis. 18"
                  placeholderTextColor={muted}
                  keyboardType="number-pad"
                  className="font-mono-semibold text-base text-saldio-ink dark:text-saldio-dark-ink"
                />
              </View>
              <Pressable
                onPress={applyCustom}
                className="h-[52px] items-center justify-center rounded-2xl bg-saldio-blue dark:bg-saldio-dark-blue px-5 active:opacity-80"
              >
                <Text className="font-sans-semibold text-sm text-white">Terapkan</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
