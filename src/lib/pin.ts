import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const PIN_HASH_KEY = "saldio:pinHash";
const PIN_VERIFY_KEY = "saldio:pinVerified";

/** Hash 6-digit PIN dengan SHA-256. Output hex lowercase. */
export async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

/** Simpan hash PIN ke AsyncStorage. */
export async function savePinHash(pin: string): Promise<void> {
  const h = await hashPin(pin);
  await AsyncStorage.setItem(PIN_HASH_KEY, h);
}

/** Ambil hash PIN. null = belum di-set. */
export async function loadPinHash(): Promise<string | null> {
  return AsyncStorage.getItem(PIN_HASH_KEY);
}

/** Hapus PIN (nonaktifkan). */
export async function removePinHash(): Promise<void> {
  await AsyncStorage.multiRemove([PIN_HASH_KEY, PIN_VERIFY_KEY]);
}

/** Verifikasi PIN terhadap hash yang tersimpan. */
export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await loadPinHash();
  if (!stored) return true; // no PIN set → always pass
  const h = await hashPin(pin);
  if (h === stored) {
    // tandai sudah diverifikasi (timestamp)
    await AsyncStorage.setItem(PIN_VERIFY_KEY, String(Date.now()));
    return true;
  }
  return false;
}

/** Apakah PIN sudah aktif? */
export async function isPinEnabled(): Promise<boolean> {
  return (await loadPinHash()) !== null;
}

/** Sudah diverifikasi di sesi ini? */
export async function isPinVerified(): Promise<boolean> {
  const ts = await AsyncStorage.getItem(PIN_VERIFY_KEY);
  if (!ts) return false;
  // PIN berlaku 30 menit sejak verifikasi terakhir
  return Date.now() - Number(ts) < 30 * 60 * 1000;
}

/** Tandai PIN tidak lagi terverifikasi (untuk logout). */
export async function clearPinVerification(): Promise<void> {
  await AsyncStorage.removeItem(PIN_VERIFY_KEY);
}
