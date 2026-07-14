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
    disabled ? "bg-saldio-border" : variant === "gold" ? "bg-saldio-gold" : "bg-saldio-blue";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-[52px] items-center justify-center rounded-full ${bg} active:opacity-80`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`font-sans-semibold text-base ${disabled ? "text-saldio-muted" : "text-white"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
