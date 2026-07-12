import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/HomeScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { AssetsScreen } from "../screens/AssetsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import type { MainTabsParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabsParamList>();

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
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontFamily: "Geist_500Medium",
          fontSize: 11,
        },
        tabBarIcon: ({ color, focused }) => (
          <Ionicons
            name={(focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`) as never}
            size={22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Beranda" component={HomeScreen} />
      <Tab.Screen name="Riwayat" component={HistoryScreen} />
      <Tab.Screen name="Aset" component={AssetsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
