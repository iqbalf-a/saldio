import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { CARD_SHADOW } from "../lib/ui";

interface ScreenProps {
  children: React.ReactNode;
  /** Scroll konten (default true) */
  scroll?: boolean;
  padded?: boolean;
}

/** Wrapper layar: latar saldio-bg + safe area top. */
export function Screen({ children, scroll = true, padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const pad = padded ? "px-5" : "";
  if (!scroll) {
    return (
      <View className={`flex-1 bg-saldio-bg ${pad}`} style={{ paddingTop: insets.top + 20 }}>
        {children}
      </View>
    );
  }
  return (
    <View className="flex-1 bg-saldio-bg" style={{ paddingTop: insets.top + 20 }}>
      <ScrollView
        className={`flex-1 ${pad}`}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

interface HeaderProps {
  title?: string;
  /** Elemen di samping judul (mis. badge dompet) */
  leading?: React.ReactNode;
  right?: React.ReactNode;
  onBack?: () => void;
}

/** Header dengan tombol kembali bulat putih, judul, dan aksi kanan. */
export function ScreenHeader({ title, leading, right, onBack }: HeaderProps) {
  const navigation = useNavigation();
  return (
    <View className="mb-4 flex-row items-center gap-3">
      <Pressable
        onPress={onBack ?? (() => navigation.goBack())}
        style={CARD_SHADOW}
        className="h-11 w-11 items-center justify-center rounded-2xl bg-white active:opacity-70"
      >
        <Ionicons name="chevron-back" size={20} color="#101736" />
      </Pressable>
      {leading}
      {title ? (
        <Text className="flex-1 font-sans-bold text-lg text-saldio-ink" numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View className="flex-1" />
      )}
      {right}
    </View>
  );
}
