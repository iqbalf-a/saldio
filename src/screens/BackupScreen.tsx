import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useConfirm } from "../components/ConfirmModal";
import { useAppData } from "../state/AppDataContext";
import type { AppData } from "../lib/types";

export function BackupScreen({ navigation }: { navigation: any }) {
  const { data, replaceAll } = useAppData();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = async () => {
    try {
      setBusy(true);
      const json = JSON.stringify(data, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `saldio-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Untuk native, gunakan alert untuk copy manual
        // Atau bisa pakai expo-file-system + expo-sharing jika diinstall
        alert("Backup tersimpan. Copy JSON ini ke file backup:\n\n" + json.slice(0, 500) + "...");
      }
    } catch {
      setError("Gagal membuat file backup. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const importData = async () => {
    try {
      setBusy(true);
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      let content: string;
      if (Platform.OS === "web") {
        const response = await fetch(result.assets[0].uri);
        content = await response.text();
      } else {
        // Untuk native, baca file dengan fetch
        const response = await fetch(result.assets[0].uri);
        content = await response.text();
      }

      const json = JSON.parse(content) as AppData;

      if (!json.wallets || !json.transactions || !json.goldPriceLog) {
        setError("File tidak valid. Pastikan file backup dari Saldio.");
        return;
      }

      confirm({
        title: "Import data?",
        message: "Data saat ini akan diganti dengan data dari file backup. Tindakan ini tidak bisa dibatalkan.",
        confirmLabel: "Import",
        onConfirm: () => {
          replaceAll(json);
          navigation.goBack();
        },
      });
    } catch {
      setError("Gagal membaca file. Pastikan file JSON valid.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Backup & Restore" />

      {/* Info data */}
      <View className="mb-6 rounded-2xl bg-white p-5">
        <Text className="font-sans-semibold text-sm text-saldio-ink">Data Anda</Text>
        <View className="mt-3 flex-row items-center justify-between py-2 border-b border-saldio-border">
          <Text className="font-sans text-xs text-saldio-muted">Jumlah dompet</Text>
          <Text className="font-mono-medium text-sm text-saldio-ink">{data.wallets.length}</Text>
        </View>
        <View className="flex-row items-center justify-between py-2 border-b border-saldio-border">
          <Text className="font-sans text-xs text-saldio-muted">Jumlah transaksi</Text>
          <Text className="font-mono-medium text-sm text-saldio-ink">{data.transactions.length}</Text>
        </View>
        <View className="flex-row items-center justify-between py-2">
          <Text className="font-sans text-xs text-saldio-muted">Riwayat harga emas</Text>
          <Text className="font-mono-medium text-sm text-saldio-ink">{data.goldPriceLog.length} entri</Text>
        </View>
      </View>

      {/* Export button */}
      <View className="mb-4 rounded-2xl bg-white p-5">
        <View className="mb-4 flex-row items-start gap-3 rounded-xl bg-saldio-green-bg p-4">
          <Ionicons name="cloud-upload-outline" size={20} color="#16A34A" />
          <Text className="flex-1 font-sans text-sm leading-5 text-saldio-green">
            Export data ke file JSON untuk di-backup di perangkat atau komputer Anda.
          </Text>
        </View>
        <PrimaryButton
          label="Export Data"
          onPress={exportData}
          loading={busy}
          disabled={busy}
        />
      </View>

      {/* Import button */}
      <View className="mb-4 rounded-2xl bg-white p-5">
        <View className="mb-4 flex-row items-start gap-3 rounded-xl bg-saldio-sky p-4">
          <Ionicons name="cloud-download-outline" size={20} color="#3D51E0" />
          <Text className="flex-1 font-sans text-sm leading-5 text-saldio-blue">
            Import file backup JSON untuk mengembalikan data. Data saat ini akan diganti.
          </Text>
        </View>
        <PrimaryButton
          label="Import Data"
          onPress={importData}
          loading={busy}
          disabled={busy}
          variant="primary"
        />
      </View>

      {/* Error message */}
      {error ? (
        <View className="mt-4 flex-row items-start gap-2 rounded-2xl bg-saldio-red-bg p-4">
          <Ionicons name="alert-circle" size={16} color="#E23B3B" />
          <Text className="flex-1 font-sans text-xs leading-4 text-saldio-red">{error}</Text>
        </View>
      ) : null}

      <View className="mt-6 rounded-2xl bg-saldio-bg p-4">
        <Text className="font-sans text-xs text-saldio-soft">
          Backup disimpan di perangkat Anda. Pastikan file backup aman dan tidak hilang.
        </Text>
      </View>
    </Screen>
  );
}
