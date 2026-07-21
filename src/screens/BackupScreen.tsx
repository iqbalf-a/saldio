import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen, ScreenHeader } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { useConfirm } from "../components/ConfirmModal";
import { useAppData } from "../state/AppDataContext";
import type { AppData } from "../lib/types";
import { isPinEnabled, verifyPin, getCachedEncryptionKey, getLockoutRemaining } from "../lib/pin";
import { encryptWithKey, decryptWithKey, isEncryptedPayload } from "../lib/crypto";

export function BackupScreen({ navigation }: { navigation: any }) {
  const { data, replaceAll } = useAppData();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PIN input state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinMode, setPinMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [pendingData, setPendingData] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Countdown timer saat lockout — sama dengan PinLockScreen
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const id = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1000) { clearInterval(id); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutRemaining > 0]);

  const exportData = async () => {
    try {
      setBusy(true);
      const json = JSON.stringify(data, null, 2);

      const pinActive = await isPinEnabled();
      if (pinActive) {
        // PIN aktif → tampilkan input PIN untuk enkripsi
        setPendingData(json);
        setPinMode("encrypt");
        setPinInput("");
        setError(null);
        // Cek lockout
        const remaining = await getLockoutRemaining();
        setLockoutRemaining(remaining);
        setPinModalVisible(true);
        setBusy(false);
        return;
      }

      // Tidak ada PIN → export plain
      downloadPlain(json);
    } catch {
      setError("Gagal membuat file backup. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const downloadPlain = (json: string) => {
    if (Platform.OS === "web") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saldio-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      confirm({
        title: "Copy backup?",
        message: "Backup tersimpan di cache. Anda perlu menyalin JSON ini secara manual ke file backup.",
        confirmLabel: "Salin ke Clipboard",
        onConfirm: async () => {
          try {
            const Clipboard = await import("expo-clipboard");
            await Clipboard.setStringAsync(json);
          } catch {
            setError("Gagal menyalin ke clipboard. Copy manual saja.");
          }
        },
      });
    }
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 6) {
      setError("PIN harus 6 digit.");
      return;
    }

    // Verifikasi PIN lewat jalur yang sama dengan PinLockScreen
    // (sudah punya lockout escalation)
    const result = await verifyPin(pinInput);
    if (!result.ok) {
      setLockoutRemaining(result.lockoutRemaining);
      setError(
        result.lockoutRemaining > 0
          ? `Terlalu banyak percobaan. Tunggu ${Math.ceil(result.lockoutRemaining / 1000)} detik`
          : "PIN salah."
      );
      setPinInput("");
      return;
    }

    // PIN benar — ambil kunci enkripsi dari cache
    const key = getCachedEncryptionKey();
    if (!key) {
      setError("Terjadi kesalahan internal. Coba lagi.");
      return;
    }

    setPinModalVisible(false);
    setBusy(true);

    try {
      if (pinMode === "encrypt" && pendingData) {
        const encrypted = await encryptWithKey(pendingData, key);
        downloadPlain(JSON.stringify({ v: 2, iv: encrypted.iv, data: encrypted.data }));
      } else if (pinMode === "decrypt" && pendingData) {
        const payload = JSON.parse(pendingData);
        const decrypted = await decryptWithKey(payload, key);
        if (!decrypted) {
          setError("Data backup korup.");
          return;
        }
        const json = JSON.parse(decrypted) as AppData;
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
      }
    } catch {
      setError("Gagal memproses data. Coba lagi.");
    } finally {
      setBusy(false);
      setPendingData(null);
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
        const response = await fetch(result.assets[0].uri);
        content = await response.text();
      }

      // Cek apakah file terenkripsi
      if (isEncryptedPayload(content)) {
        const pinActive = await isPinEnabled();
        if (!pinActive) {
          setError("File terenkripsi tapi PIN tidak aktif. Aktifkan PIN dulu.");
          return;
        }
        // Minta PIN untuk dekripsi
        setPendingData(content);
        setPinMode("decrypt");
        setPinInput("");
        setError(null);
        // Cek lockout
        const remaining = await getLockoutRemaining();
        setLockoutRemaining(remaining);
        setPinModalVisible(true);
        setBusy(false);
        return;
      }

      // Plain JSON
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

      {/* PIN input modal — menggunakan PIN asli aplikasi (bukan passphrase bebas) */}
      {pinModalVisible && (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/50">
          <View className="mx-8 w-full rounded-2xl bg-white p-6">
            <Text className="text-center font-sans-bold text-lg text-saldio-ink">
              {pinMode === "encrypt" ? "PIN untuk Enkripsi Backup" : "PIN untuk Dekripsi Backup"}
            </Text>
            <Text className="mt-2 text-center font-sans text-sm text-saldio-muted">
              Masukkan PIN aplikasi Anda (6 digit)
            </Text>
            <TextInput
              className="mt-4 rounded-xl border border-saldio-border bg-saldio-bg px-4 py-3 text-center font-mono-medium text-lg text-saldio-ink"
              placeholder="PIN 6 digit"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={6}
              secureTextEntry
              autoFocus
              value={pinInput}
              onChangeText={setPinInput}
            />
            {lockoutRemaining > 0 && (
              <Text className="mt-2 text-center font-sans text-xs text-saldio-red">
                Terlalu banyak percobaan. Tunggu {Math.ceil(lockoutRemaining / 1000)} detik
              </Text>
            )}
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => { setPinModalVisible(false); setPendingData(null); setLockoutRemaining(0); }}
                className="h-[44px] flex-1 items-center justify-center rounded-full border border-saldio-border active:opacity-80"
              >
                <Text className="font-sans-semibold text-sm text-saldio-muted">Batal</Text>
              </Pressable>
              <PrimaryButton
                label={pinMode === "encrypt" ? "Enkripsi" : "Dekripsi"}
                onPress={handlePinSubmit}
                disabled={pinInput.length !== 6 || lockoutRemaining > 0}
              />
            </View>
          </View>
        </View>
      )}

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
