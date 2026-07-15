import "./global.css";
import React from "react";
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
import { AuthProvider } from "./src/state/AuthContext";
import { AppDataProvider } from "./src/state/AppDataContext";
import { ConfirmProvider } from "./src/components/ConfirmModal";
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
