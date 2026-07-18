import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Screen } from "../components/Screen";
import { useConfirm } from "../components/ConfirmModal";
import { useAppData } from "../state/AppDataContext";
import { useAuth } from "../state/AuthContext";
import type { MainTabsParamList } from "../navigation/types";
import { isPinEnabled, clearPinVerification } from "../lib/pin";
import { PinModal } from "../components/PinLockScreen";

type Nav = BottomTabNavigationProp<MainTabsParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, accessToken, isGuest, signOut } = useAuth();
  const { resetAll, lastSyncTimestamp, manualSync } = useAppData();
  const confirm = useConfirm();
  const online = !!accessToken;
  const [syncing, setSyncing] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  // Tombol PIN disembunyikan sampai status termuat — mencegah "Aktifkan PIN"
  // menimpa PIN yang sudah ada sebelum AsyncStorage selesai dibaca
  const [pinLoaded, setPinLoaded] = useState(false);
  const [pinModal, setPinModal] = useState<"enable" | "change" | "disable">("enable");
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinOldValue, setPinOldValue] = useState("");

  useEffect(() => {
    isPinEnabled().then((v) => {
      setPinEnabled(v);
      setPinLoaded(true);
    });
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await manualSync();
    setSyncing(false);
  }, [manualSync]);

  /** Format timestamp ke "X detik/menit/jam lalu" dalam Bahasa Indonesia. */
  const formatSyncTime = (ts: number | null): string => {
    if (!ts) return "Belum pernah";
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec} detik lalu`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} menit lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const day = Math.floor(hr / 24);
    return `${day} hari lalu`;
  };

  return (
    <Screen>
      <Text className="mb-4 font-sans-bold text-xl text-saldio-ink">Profil</Text>

      <View className="flex-row items-center gap-4 rounded-3xl bg-white p-5">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-saldio-blue">
          <Text className="font-sans-bold text-xl text-white">
            {(profile?.name ?? "P").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-base text-saldio-ink">{profile?.name}</Text>
          <Text className="mt-0.5 font-sans text-sm text-saldio-muted">
            {isGuest
              ? "Mode Tamu · data contoh"
              : profile?.email === "offline"
                ? "Tanpa akun Google"
                : profile?.email}
          </Text>
        </View>
      </View>

      {isGuest ? (
        <View className="mt-4 flex-row items-start gap-3 rounded-2xl bg-saldio-sky p-4">
          <Ionicons name="eye" size={18} color="#3D51E0" />
          <Text className="flex-1 font-sans text-xs leading-4 text-saldio-blue">
            Kamu sedang menjelajah dengan data contoh. Keluar lalu masuk dengan Google untuk mulai
            mencatat keuanganmu sendiri — data contoh akan dibersihkan otomatis.
          </Text>
        </View>
      ) : null}

      <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-white p-4">
        <Ionicons
          name={online ? "cloud-done" : "cloud-offline"}
          size={20}
          color={online ? "#16A34A" : "#8A94A6"}
        />
        <View className="flex-1">
          <Text className="font-sans-semibold text-sm text-saldio-ink">
            {online ? "Tersambung ke Google Drive" : "Mode offline"}
          </Text>
          <Text className="mt-0.5 font-sans text-xs leading-4 text-saldio-muted">
            {online
              ? `Terakhir disinkron: ${formatSyncTime(lastSyncTimestamp)}`
              : "Data hanya tersimpan di perangkat ini. Masuk dengan Google untuk mencadangkan ke Drive."}
          </Text>
        </View>
        {online && (
          <Pressable
            onPress={handleSync}
            disabled={syncing}
            className="rounded-xl bg-saldio-sky px-3 py-2 active:opacity-70"
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#3D51E0" />
            ) : (
              <Ionicons name="sync" size={18} color="#3D51E0" />
            )}
          </Pressable>
        )}
      </View>

      <View className="mt-6 gap-3">
        <Pressable
          onPress={() => navigation.navigate("Beranda", { screen: "ManageCategories" })}
          className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
        >
          <Ionicons name="pricetags" size={20} color="#3D51E0" />
          <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">Kategori</Text>
          <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Beranda", { screen: "Backup" })}
          className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
        >
          <Ionicons name="cloud-download" size={20} color="#3D51E0" />
          <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">Backup & Restore</Text>
          <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
        </Pressable>

        <Pressable
          onPress={() =>
            confirm({
              title: "Keluar?",
              message: isGuest
                ? "Data contoh Mode Tamu akan dibersihkan."
                : "Data lokal tetap tersimpan di perangkat ini.",
              confirmLabel: "Keluar",
              onConfirm: () => {
                if (isGuest) resetAll();
                signOut();
              },
            })
          }
          className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
        >
          <Ionicons name="log-out" size={20} color="#3D51E0" />
          <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">Keluar</Text>
          <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
        </Pressable>

        <Pressable
          onPress={() =>
            confirm({
              title: "Hapus semua data?",
              message: "Seluruh dompet, transaksi, dan riwayat harga akan dihapus permanen dari perangkat ini.",
              confirmLabel: "Hapus Semua",
              onConfirm: () => resetAll(),
            })
          }
          className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
        >
          <Ionicons name="trash" size={20} color="#E23B3B" />
          <Text className="flex-1 font-sans-semibold text-sm text-saldio-red">Hapus semua data</Text>
          <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Beranda", { screen: "Recurring" })}
          className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
        >
          <Ionicons name="repeat" size={20} color="#3D51E0" />
          <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">Transaksi Berulang</Text>
          <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Beranda", { screen: "Budget" })}
          className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
        >
          <Ionicons name="wallet" size={20} color="#3D51E0" />
          <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">Budget Kategori</Text>
          <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
        </Pressable>

        {/* --- Keamanan: PIN --- */}
        <View className="mt-2">
          <Text className="mb-2 ml-1 font-sans text-xs text-saldio-muted">Keamanan</Text>
        </View>

        {!pinLoaded ? null : !pinEnabled ? (
          <Pressable
            onPress={() => {
              setPinModal("enable");
              setPinModalVisible(true);
            }}
            className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
          >
            <Ionicons name="lock-closed" size={20} color="#3D51E0" />
            <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">Aktifkan PIN</Text>
            <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() => {
                setPinModal("change");
                setPinModalVisible(true);
              }}
              className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
            >
              <Ionicons name="lock-closed" size={20} color="#3D51E0" />
              <Text className="flex-1 font-sans-semibold text-sm text-saldio-ink">Ubah PIN</Text>
              <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
            </Pressable>
            <Pressable
              onPress={() => {
                setPinModal("disable");
                setPinModalVisible(true);
              }}
              className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
            >
              <Ionicons name="lock-open" size={20} color="#8A94A6" />
              <Text className="flex-1 font-sans-semibold text-sm text-saldio-muted">Nonaktifkan PIN</Text>
              <Ionicons name="chevron-forward" size={16} color="#8A94A6" />
            </Pressable>
          </>
        )}

      </View>

      <Text className="mt-8 text-center font-sans text-xs text-saldio-muted">
        Saldio · data milikmu, di Drive milikmu
      </Text>

      <PinModal
        visible={pinModalVisible}
        mode={
          pinModal === "change" && !pinOldValue
            ? "change_old"
            : pinModal === "change" && pinOldValue
              ? "change_new"
              : pinModal === "disable"
                ? "disable"
                : "setup"
        }
        oldPin={pinOldValue || undefined}
        onDone={() => {
          setPinModalVisible(false);
          setPinOldValue("");
          isPinEnabled().then(setPinEnabled);
          clearPinVerification();
        }}
        onCancel={() => {
          setPinModalVisible(false);
          setPinOldValue("");
        }}
        onNeedChangeNew={(oldPin) => {
          setPinOldValue(oldPin);
        }}
      />
    </Screen>
  );
}
