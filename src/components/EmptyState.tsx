import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  icon: string;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: "primary" | "gold";
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  icon,
  iconColor = "#8A94A6",
  iconBackground = "#EDF1F7",
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = "primary",
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <View className="items-center rounded-3xl bg-white px-8 py-12">
      <View
        className="h-20 w-20 items-center justify-center rounded-3xl"
        style={{ backgroundColor: iconBackground }}
      >
        <Ionicons name={icon as never} size={36} color={iconColor} />
      </View>
      <Text className="mt-6 font-sans-bold text-base text-saldio-ink">{title}</Text>
      <Text className="mt-2 text-center font-sans text-sm leading-5 text-saldio-muted">
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className={`mt-6 h-12 items-center justify-center rounded-full px-8 active:opacity-80 ${
            actionVariant === "gold" ? "bg-saldio-gold" : "bg-saldio-blue"
          }`}
        >
          <Text className="font-sans-semibold text-sm text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Pressable onPress={onSecondary} className="mt-4 flex-row items-center gap-1 active:opacity-70">
          <Ionicons name="document-text" size={14} color="#3D51E0" />
          <Text className="font-sans-semibold text-sm text-saldio-blue">{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
