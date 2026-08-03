import React, { useState } from "react";
import { Alert, Image, Modal, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useDarkColor } from "../lib/darkColors";

interface Props {
  value?: string;
  onChange: (dataUri: string | undefined) => void;
}

const IMAGE_QUALITY = 0.4;

async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Izin diperlukan", "Saldio butuh akses galeri untuk melampirkan foto struk.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: IMAGE_QUALITY,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;
  return `data:image/jpeg;base64,${result.assets[0].base64}`;
}

async function captureFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Izin diperlukan", "Saldio butuh akses kamera untuk memfoto struk.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: IMAGE_QUALITY,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return null;
  return `data:image/jpeg;base64,${result.assets[0].base64}`;
}

export function ReceiptPicker({ value, onChange }: Props) {
  const muted = useDarkColor("muted");
  const [viewerOpen, setViewerOpen] = useState(false);

  const handlePick = async () => {
    const uri = await pickFromLibrary();
    if (uri) onChange(uri);
  };
  const handleCapture = async () => {
    const uri = await captureFromCamera();
    if (uri) onChange(uri);
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
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white dark:bg-saldio-surface p-3 active:opacity-70"
        >
          <Ionicons name="camera" size={18} color={muted} />
          <Text className="font-sans-semibold text-xs text-saldio-soft dark:text-saldio-dark-soft">Ambil Foto</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={handlePick}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white dark:bg-saldio-surface p-3 active:opacity-70"
      >
        <Ionicons name="image" size={18} color={muted} />
        <Text className="font-sans-semibold text-xs text-saldio-soft dark:text-saldio-dark-soft">Pilih dari Galeri</Text>
      </Pressable>
    </View>
  );
}
