import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabsParamList> | undefined;
  AddWallet: undefined;
  WalletDetail: { walletId: string };
  AddTransaction: { walletId?: string };
  Transfer: { fromWalletId?: string };
  ImportPdf: { walletId: string };
  UpdateGoldPrice: { walletId: string };
};

export type MainTabsParamList = {
  Beranda: undefined;
  Riwayat: undefined;
  Aset: undefined;
  Profil: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
