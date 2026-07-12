import React, { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatMonthLabel } from "../lib/format";

interface Props {
  /** "2026-07" */
  value: string;
  /** Daftar bulan yang tersedia (dari data transaksi), terbaru dulu */
  options: string[];
  onChange: (yearMonth: string) => void;
}

/** Dropdown filter bulan ("Juli 2026 ⌄") dengan modal pilihan. */
export function MonthPicker({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const list = options.length > 0 ? options : [value];
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1 rounded-full bg-white px-4 py-2 active:opacity-70"
      >
        <Text className="font-sans-semibold text-sm text-saldio-ink">{formatMonthLabel(value)}</Text>
        <Ionicons name="chevron-down" size={14} color="#64748B" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/40 px-8" onPress={() => setOpen(false)}>
          <View className="max-h-96 rounded-3xl bg-white p-2">
            <FlatList
              data={list}
              keyExtractor={(m) => m}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className={`flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:bg-saldio-bg ${
                    item === value ? "bg-saldio-sky" : ""
                  }`}
                >
                  <Text
                    className={`font-sans-semibold text-[15px] ${
                      item === value ? "text-saldio-blue" : "text-saldio-ink"
                    }`}
                  >
                    {formatMonthLabel(item)}
                  </Text>
                  {item === value ? <Ionicons name="checkmark" size={18} color="#3D51E0" /> : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
