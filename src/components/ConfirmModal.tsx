import React, { createContext, useCallback, useContext, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDarkColor } from "../lib/darkColors";

interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface ConfirmContextValue {
  confirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    visible: false,
    title: "",
    message: "",
    confirmLabel: "Hapus",
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      onConfirm: () => void;
    }) => {
      setState({
        visible: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? "Hapus",
        onConfirm: opts.onConfirm,
      });
    },
    []
  );

  const close = () => setState((s) => ({ ...s, visible: false }));

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        visible={state.visible}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        onConfirm={() => {
          close();
          state.onConfirm();
        }}
        onCancel={close}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm harus dipakai di dalam ConfirmProvider");
  return ctx.confirm;
}

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const dangerIconColor = useDarkColor("red");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/40 px-8"
        onPress={onCancel}
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Pressable className="w-full rounded-3xl bg-white dark:bg-saldio-dark-card p-6" onPress={() => {}}>
          <View className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-saldio-red-bg dark:bg-saldio-dark-red-bg">
              <Ionicons name="warning" size={28} color={dangerIconColor} />
            </View>
          </View>

          <Text className="mt-5 text-center font-sans-bold text-lg text-saldio-ink dark:text-saldio-dark-ink">{title}</Text>
          <Text className="mt-2 text-center font-sans text-sm leading-5 text-saldio-muted dark:text-saldio-dark-muted">
            {message}
          </Text>

          <View className="mt-6 gap-3">
            <Pressable
              onPress={onConfirm}
              className="h-[52px] items-center justify-center rounded-full bg-saldio-red dark:bg-saldio-dark-red active:opacity-80"
            >
              <Text className="font-sans-semibold text-base text-white">{confirmLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              className="h-[52px] items-center justify-center rounded-full bg-saldio-bg dark:bg-saldio-dark-bg active:opacity-80"
            >
              <Text className="font-sans-semibold text-base text-saldio-soft dark:text-saldio-dark-soft">Batal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}