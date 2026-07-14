import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface ActionMenuItem {
  label: string;
  icon: string;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
}

/** Menu aksi (dibuka tombol "⋯") — lembar pilihan di bagian bawah layar. */
export function ActionMenu({ visible, onClose, items }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <View className="mx-4 mb-6 rounded-3xl bg-white p-2">
          {items.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:bg-saldio-bg"
            >
              <Ionicons
                name={item.icon as never}
                size={18}
                color={item.destructive ? "#E23B3B" : "#3D51E0"}
              />
              <Text
                className={`font-sans-semibold text-base ${
                  item.destructive ? "text-saldio-red" : "text-saldio-ink"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            className="mt-1 items-center rounded-2xl border-t border-saldio-border px-4 py-3.5 active:bg-saldio-bg"
          >
            <Text className="font-sans-semibold text-base text-saldio-soft">Batal</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
