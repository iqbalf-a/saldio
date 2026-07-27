import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../state/AuthContext";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { MainTabs } from "./MainTabs";
import { useTheme } from "../components/ThemeProvider";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { profile, restoring } = useAuth();
  const { isDark } = useTheme();
  if (restoring) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDark ? "#0F1123" : "#F1F4F9" } }}>
      {!profile ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
