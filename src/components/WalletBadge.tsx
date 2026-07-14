import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { badgeForWallet } from "../lib/templates";
import type { WalletTemplateKey, WalletType } from "../lib/types";

interface Props {
  name: string;
  template: WalletTemplateKey;
  type?: WalletType;
  size?: number;
}

/** Badge inisial berwarna berbentuk lingkaran; dompet emas memakai "Em". */
export function WalletBadge({ name, template, type, size = 44 }: Props) {
  if (type === "gold") {
    return (
      <View
        className="items-center justify-center rounded-full bg-saldio-gold-bg"
        style={{ width: size, height: size }}
      >
        <Text className="font-sans-bold" style={{ color: "#B08415", fontSize: size * 0.34 }}>
          Em
        </Text>
      </View>
    );
  }
  if (type === "cash" || (template === "custom" && type !== "bank")) {
    return (
      <View
        className="items-center justify-center rounded-full bg-saldio-bg"
        style={{ width: size, height: size }}
      >
        <Ionicons name="cash" size={size * 0.45} color="#64748B" />
      </View>
    );
  }
  const badge = badgeForWallet(name, template);
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: badge.background }}
    >
      <Text
        className="font-sans-bold"
        style={{ color: badge.color, fontSize: size * 0.34 }}
      >
        {badge.initials}
      </Text>
    </View>
  );
}
