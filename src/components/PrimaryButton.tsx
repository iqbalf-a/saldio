import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "gold";
}

export function PrimaryButton({ label, onPress, disabled, loading, variant = "primary" }: Props) {
  const bg =
    disabled ? "bg-saldio-border dark:bg-saldio-dark-border" : variant === "gold" ? "bg-saldio-gold dark:bg-saldio-dark-gold" : "bg-saldio-blue dark:bg-saldio-dark-blue";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-[52px] items-center justify-center rounded-full ${bg} active:opacity-80`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`font-sans-semibold text-base ${disabled ? "text-saldio-muted dark:text-saldio-dark-muted" : "text-white"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
