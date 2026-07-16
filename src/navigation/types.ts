import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

/**
 * Layar detail & form bersarang di dalam tab Beranda agar bottom tab bar
 * tetap terlihat di semua layar.
 */
export type HomeStackParamList = {
  Home: undefined;
  AddWallet: undefined;
  WalletDetail: { walletId: string };
  EditWallet: { walletId: string };
  AddTransaction: { walletId?: string; transactionId?: string };
  ImportPdf: { walletId: string };
  UpdateGoldPrice: { walletId: string };
  Backup: undefined;
  ManageCategories: undefined;
  Recurring: undefined;
  Budget: undefined;
};

export type MainTabsParamList = {
  Beranda: NavigatorScreenParams<HomeStackParamList> | undefined;
  Riwayat: undefined;
  Aset: undefined;
  Profil: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabsParamList> | undefined;
};

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;
