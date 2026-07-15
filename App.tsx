import "./global.css";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
      <AuthProvider>
        <AppDataProvider>
          <ConfirmProvider>
            <AuthErrorHandler />
            <NavigationContainer theme={theme} documentTitle={{ enabled: false }}>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </ConfirmProvider>
        </AppDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
