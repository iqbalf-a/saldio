import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../state/AuthContext";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AddWalletScreen } from "../screens/AddWalletScreen";
import { WalletDetailScreen } from "../screens/WalletDetailScreen";
import { AddTransactionScreen } from "../screens/AddTransactionScreen";
import { TransferScreen } from "../screens/TransferScreen";
import { ImportPdfScreen } from "../screens/ImportPdfScreen";
import { UpdateGoldPriceScreen } from "../screens/UpdateGoldPriceScreen";
import { MainTabs } from "./MainTabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { profile, restoring } = useAuth();
  if (restoring) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F1F4F9" } }}>
      {!profile ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="AddWallet" component={AddWalletScreen} />
          <Stack.Screen name="WalletDetail" component={WalletDetailScreen} />
          <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
          <Stack.Screen name="Transfer" component={TransferScreen} />
          <Stack.Screen name="ImportPdf" component={ImportPdfScreen} />
          <Stack.Screen name="UpdateGoldPrice" component={UpdateGoldPriceScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
