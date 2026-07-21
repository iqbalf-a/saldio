import "./global.css";
import React, { useEffect, useState } from "react";
import { AppState, Modal, Platform, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
} from "@expo-google-fonts/geist-mono";
import { AuthProvider, useAuth } from "./src/state/AuthContext";
import { AppDataProvider, useAppData } from "./src/state/AppDataContext";
import { ConfirmProvider, useConfirm } from "./src/components/ConfirmModal";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";
import { isPinEnabled, isPinVerified, getCachedEncryptionKey } from "./src/lib/pin";
import { PinLockScreen } from "./src/components/PinLockScreen";
import { UpdateBanner } from "./src/components/UpdateBanner";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ThemeProvider } from "./src/components/ThemeProvider";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F1F4F9",
    primary: "#3D51E0",
  },
};

if (Platform.OS === "web" && typeof document !== "undefined") {
  document.title = "Saldio";
}

/** Menangani token Google Drive kedaluwarsa — tampilkan modal login ulang. */
function AuthErrorHandler() {
  const { authError, clearAuthError } = useAppData();
  const { signOut } = useAuth();
  const confirm = useConfirm();

  useEffect(() => {
    if (authError) {
      confirm({
        title: "Sesi Berakhir",
        message: "Sesi Google Drive telah berakhir. Silakan login ulang untuk melanjutkan sinkronisasi.",
        confirmLabel: "Login Ulang",
        onConfirm: () => {
          clearAuthError();
          signOut();
        },
      });
    }
  }, [authError, confirm, clearAuthError, signOut]);

  return null;
}

/** Menangani konflik sinkronisasi multi-perangkat — tampilkan modal pilihan versi data. */
function ConflictResolver() {
  const { conflictRemote, resolveConflict } = useAppData();
  const insets = useSafeAreaInsets();

  if (!conflictRemote) return null;

  return (
    <Modal visible transparent animationType="fade">
      <Pressable
        className="flex-1 items-center justify-center bg-black/40 px-8"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <Pressable className="w-full rounded-3xl bg-white p-6" onPress={() => {}}>
          <View className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <Ionicons name="swap-horizontal" size={28} color="#3D51E0" />
            </View>
          </View>

          <Text className="mt-5 text-center font-sans-bold text-lg text-saldio-ink">
            Konflik Sinkronisasi
          </Text>
          <Text className="mt-2 text-center font-sans text-sm leading-5 text-saldio-muted">
            Data di perangkat ini dan Drive sudah berubah sejak sinkron terakhir.{"\n"}Pilih data yang ingin disimpan:
          </Text>

          <View className="mt-6 gap-3">
            <Pressable
              onPress={() => resolveConflict(true)}
              className="h-[52px] items-center justify-center rounded-full bg-saldio-blue active:opacity-80"
            >
              <Text className="font-sans-semibold text-base text-white">
                Data Perangkat Ini
              </Text>
            </Pressable>
            <Pressable
              onPress={() => resolveConflict(false)}
              className="h-[52px] items-center justify-center rounded-full bg-saldio-bg active:opacity-80"
            >
              <Text className="font-sans-semibold text-base text-saldio-soft">
                Data dari Drive
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * PIN gate — mencegah akses ke app utama jika PIN aktif tapi belum diverifikasi.
 * Rendered di dalam providers tapi di luar NavigationContainer.
 */
function PinGate({ children }: { children: React.ReactNode }) {
  const [pinRequired, setPinRequired] = useState(false);
  const [ready, setReady] = useState(false);
  const { manualSync } = useAppData();

  // Cek PIN saat mount dan setiap app/tab kembali aktif (re-lock setelah 30 menit)
  useEffect(() => {
    const check = async () => {
      const enabled = await isPinEnabled();
      if (!enabled) {
        setPinRequired(false);
        setReady(true);
        return;
      }
      const verified = await isPinVerified();
      const hasKey = getCachedEncryptionKey() !== null;
      setPinRequired(!(verified && hasKey));
      setReady(true);
    };
    check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, []);

  if (!ready) {
    return <View className="flex-1 bg-saldio-bg" />;
  }

  if (pinRequired) {
    return (
      <PinLockScreen
        onUnlock={() => {
          setPinRequired(false);
          // Kunci enkripsi sudah ter-cache di pin.ts — picu sync
          // supaya data terenkripsi di Drive yang sempat terlewat
          // (saat kunci belum tersedia) bisa diambil sekarang
          manualSync();
        }}
      />
    );
  }

  return <>{children}</>;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
  });

  if (!fontsLoaded) return <View className="flex-1 bg-saldio-bg" />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <AppDataProvider>
          <ConfirmProvider>
            <PinGate>
              <AuthErrorHandler />
              <ConflictResolver />
              <UpdateBanner />
              <NavigationContainer theme={theme} documentTitle={{ enabled: false }}>
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </PinGate>
          </ConfirmProvider>
        </AppDataProvider>
      </AuthProvider>
      </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
