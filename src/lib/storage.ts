import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppData, EMPTY_DATA, UserProfile } from "./types";

const DATA_KEY = "saldio:data";
const PROFILE_KEY = "saldio:profile";
const TOKEN_KEY = "saldio:googleAccessToken";

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_DATA, ...parsed };
  } catch {
    return EMPTY_DATA;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: UserProfile | null): Promise<void> {
  if (profile) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  else await AsyncStorage.removeItem(PROFILE_KEY);
}

export async function loadAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveAccessToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}
