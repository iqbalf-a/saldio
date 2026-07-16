import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/HomeScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { AssetsScreen } from "../screens/AssetsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { AddWalletScreen } from "../screens/AddWalletScreen";
import { WalletDetailScreen } from "../screens/WalletDetailScreen";
import { AddTransactionScreen } from "../screens/AddTransactionScreen";
import { EditWalletScreen } from "../screens/EditWalletScreen";
import { ImportPdfScreen } from "../screens/ImportPdfScreen";
import { UpdateGoldPriceScreen } from "../screens/UpdateGoldPriceScreen";
import { BackupScreen } from "../screens/BackupScreen";
import { ManageCategoriesScreen } from "../screens/ManageCategoriesScreen";
import { RecurringScreen } from "../screens/RecurringScreen";
import { BudgetScreen } from "../screens/BudgetScreen";
import type { HomeStackParamList, MainTabsParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabsParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

/** Stack di dalam tab Beranda — tab bar tetap terlihat di semua layar ini. */
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F1F4F9" } }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="AddWallet" component={AddWalletScreen} />
      <HomeStack.Screen name="WalletDetail" component={WalletDetailScreen} />
      <HomeStack.Screen name="EditWallet" component={EditWalletScreen} />
      <HomeStack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <HomeStack.Screen name="ImportPdf" component={ImportPdfScreen} />
      <HomeStack.Screen name="UpdateGoldPrice" component={UpdateGoldPriceScreen} />
      <HomeStack.Screen name="Backup" component={BackupScreen} />
      <HomeStack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
      <HomeStack.Screen name="Recurring" component={RecurringScreen} />
      <HomeStack.Screen name="Budget" component={BudgetScreen} />
    </HomeStack.Navigator>
  );
}

const TAB_ICONS: Record<keyof MainTabsParamList, string> = {
  Beranda: "home",
  Riwayat: "time",
  Aset: "pie-chart",
  Profil: "person",
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#3D51E0",
        tabBarInactiveTintColor: "#8A94A6",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E6EAF2",
          height: 66,
          paddingTop: 7,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: "Geist_500Medium",
          fontSize: 10,
        },
        tabBarIcon: ({ color, focused }) => (
          <Ionicons
            name={(focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`) as never}
            size={20}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Beranda" component={HomeStackNavigator} />
      <Tab.Screen name="Riwayat" component={HistoryScreen} />
      <Tab.Screen name="Aset" component={AssetsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
