import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useDarkColor } from "../lib/darkColors";

interface Props {
  value?: string;
  onChange: (dataUri: string | undefined) => void;
}

/**
 * Sisi terpanjang foto struk setelah diresize — cukup untuk dibaca ulang,
 * tapi tidak membengkakkan ledger JSON yang tersimpan di AsyncStorage & Drive.
 */
const MAX_DIMENSION = 1280;
/** Batas ukuran base64 akhir. Foto asli disimpan inline di ledger (bukan file
 * terpisah), jadi ukurannya harus dijaga kecil agar tidak menabrak batas
 * SQLite CursorWindow Android (~2MB per baris AsyncStorage). */
const MAX_BASE64_BYTES = 700_000;

/** Resize + kompres progresif sampai di bawah batas ukuran. Selalu keluar
 * sebagai JPEG (format ditentukan di sini, bukan diwarisi dari sumber asli —
 * jadi prefix data URI "image/jpeg" selalu akurat). */
async function resizeAndEncode(uri: string): Promise<string | null> {
  for (const quality of [0.5, 0.35, 0.2]) {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: quality, format: SaveFormat.JPEG, base64: true }
    );
    if (!result.base64) continue;
    const approxBytes = (result.base64.length * 3) / 4;
    if (approxBytes <= MAX_BASE64_BYTES) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
  }
  return null;
}

type PickResult = string | null | "too_large";

async function pickFromLibrary(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Izin diperlukan", "Saldio butuh akses galeri untuk melampirkan foto struk.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const encoded = await resizeAndEncode(result.assets[0].uri);
  return encoded ?? "too_large";
}

async function captureFromCamera(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Izin diperlukan", "Saldio butuh akses kamera untuk memfoto struk.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({});
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  const encoded = await resizeAndEncode(result.assets[0].uri);
  return encoded ?? "too_large";
}

export function ReceiptPicker({ value, onChange }: Props) {
  const muted = useDarkColor("muted");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const applyResult = (r: PickResult) => {
    if (r === "too_large") {
      Alert.alert(
        "Foto terlalu besar",
        "Struk tidak bisa dipangkas cukup kecil untuk disimpan. Coba foto ulang lebih dekat ke struknya saja."
      );
      return;
    }
    if (r) onChange(r);
  };

  const handlePick = async () => {
    setBusy(true);
    try {
      applyResult(await pickFromLibrary());
    } catch {
      Alert.alert("Gagal memilih foto", "Coba lagi, atau catat transaksi tanpa foto struk.");
    } finally {
      setBusy(false);
    }
  };

  const handleCapture = async () => {
    setBusy(true);
    try {
      applyResult(await captureFromCamera());
    } catch {
      Alert.alert("Gagal mengambil foto", "Coba lagi, atau catat transaksi tanpa foto struk.");
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <>
        <View className="flex-row items-center gap-3 rounded-2xl bg-white dark:bg-saldio-surface p-3">
          <Pressable onPress={() => setViewerOpen(true)}>
            <Image source={{ uri: value }} style={{ width: 56, height: 56, borderRadius: 12 }} />
          </Pressable>
          <Text className="flex-1 font-sans text-xs text-saldio-muted dark:text-saldio-dark-muted">
            Foto struk terlampir — ketuk untuk lihat penuh
          </Text>
          <Pressable onPress={() => onChange(undefined)} hitSlop={8} className="p-1">
            <Ionicons name="trash" size={18} color="#E23B3B" />
          </Pressable>
        </View>
        <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
          <Pressable
            className="flex-1 items-center justify-center bg-black/90"
            onPress={() => setViewerOpen(false)}
          >
            <Image source={{ uri: value }} style={{ width: "90%", height: "70%" }} resizeMode="contain" />
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <View className="flex-row gap-2">
      {Platform.OS !== "web" ? (
        <Pressable
          onPress={handleCapture}
          disabled={busy}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white dark:bg-saldio-surface p-3 active:opacity-70"
          style={busy ? { opacity: 0.6 } : undefined}
        >
          {busy ? (
            <ActivityIndicator size="small" color={muted} />
          ) : (
            <Ionicons name="camera" size={18} color={muted} />
          )}
          <Text className="font-sans-semibold text-xs text-saldio-soft dark:text-saldio-dark-soft">Ambil Foto</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={handlePick}
        disabled={busy}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white dark:bg-saldio-surface p-3 active:opacity-70"
        style={busy ? { opacity: 0.6 } : undefined}
      >
        {busy ? (
          <ActivityIndicator size="small" color={muted} />
        ) : (
          <Ionicons name="image" size={18} color={muted} />
        )}
        <Text className="font-sans-semibold text-xs text-saldio-soft dark:text-saldio-dark-soft">Pilih dari Galeri</Text>
      </Pressable>
    </View>
  );
}
