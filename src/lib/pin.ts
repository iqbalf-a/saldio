import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { deriveAesKey } from "./crypto";

const PIN_HASH_KEY = "saldio:pinHash";
const PIN_SALT_KEY = "saldio:pinSalt";
const PIN_VERIFY_KEY = "saldio:pinVerified";
const PIN_ATTEMPTS_KEY = "saldio:pinAttempts"; // { count: number, lockoutUntil: number }

/* ─── Kunci enkripsi ter-cache di memori ─── */

let cachedEncryptionKey: CryptoKey | null = null;

/** Ambil kunci enkripsi yang sudah di-cache (bernilai null jika belum unlock). */
export function getCachedEncryptionKey(): CryptoKey | null {
  return cachedEncryptionKey;
}

/** Hapus cache kunci enkripsi (dipanggil saat lock atau remove PIN). */
export function clearCachedEncryptionKey(): void {
  cachedEncryptionKey = null;
}

/* ─── Lockout helpers ─── */

interface AttemptsState {
  count: number;
  lockoutUntil: number;
}

function lockoutDuration(attemptCount: number): number {
  if (attemptCount >= 15) return 15 * 60_000; // 15 menit
  if (attemptCount >= 10) return 5 * 60_000;  // 5 menit
  if (attemptCount >= 5) return 30_000;        // 30 detik
  return 0;
}

async function loadAttempts(): Promise<AttemptsState> {
  const raw = await AsyncStorage.getItem(PIN_ATTEMPTS_KEY);
  if (!raw) return { count: 0, lockoutUntil: 0 };
  try { return JSON.parse(raw); } catch { return { count: 0, lockoutUntil: 0 }; }
}

async function saveAttempts(s: AttemptsState): Promise<void> {
  await AsyncStorage.setItem(PIN_ATTEMPTS_KEY, JSON.stringify(s));
}

/** Sisa waktu lockout (ms). 0 = tidak terkunci. */
export async function getLockoutRemaining(): Promise<number> {
  const s = await loadAttempts();
  const rem = s.lockoutUntil - Date.now();
  return rem > 0 ? rem : 0;
}

/** Hash 6-digit PIN dengan SHA-256. Output hex lowercase. */
export async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

/**
 * Simpan hash PIN + generate salt baru + cache kunci enkripsi di memori.
 * Dipanggil saat setup PIN baru atau ubah PIN.
 */
export async function savePinHash(pin: string): Promise<void> {
  const h = await hashPin(pin);
  await AsyncStorage.setItem(PIN_HASH_KEY, h);

  // Generate salt baru, simpan ke AsyncStorage, derive + cache key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hexSalt = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await AsyncStorage.setItem(PIN_SALT_KEY, hexSalt);
  cachedEncryptionKey = await deriveAesKey(pin, salt);
}

/** Ambil hash PIN. null = belum di-set. */
export async function loadPinHash(): Promise<string | null> {
  return AsyncStorage.getItem(PIN_HASH_KEY);
}

/** Hapus PIN (nonaktifkan). */
export async function removePinHash(): Promise<void> {
  await AsyncStorage.multiRemove([PIN_HASH_KEY, PIN_VERIFY_KEY, PIN_SALT_KEY]);
  clearCachedEncryptionKey();
}

/**
 * Verifikasi PIN terhadap hash yang tersimpan.
 * Jika sukses, derive + cache kunci enkripsi di memori.
 */
export async function verifyPin(
  pin: string,
): Promise<{ ok: boolean; lockoutRemaining: number }> {
  const stored = await loadPinHash();
  if (!stored) return { ok: true, lockoutRemaining: 0 }; // no PIN set → always pass

  const attempts = await loadAttempts();

  // Cek lockout aktif
  if (attempts.lockoutUntil > Date.now()) {
    return { ok: false, lockoutRemaining: attempts.lockoutUntil - Date.now() };
  }

  const h = await hashPin(pin);
  if (h === stored) {
    // Sukses — reset attempts & tandai verifikasi
    await saveAttempts({ count: 0, lockoutUntil: 0 });
    await AsyncStorage.setItem(PIN_VERIFY_KEY, String(Date.now()));

    // Derive + cache kunci enkripsi dari PIN + salt
    let hexSalt = await AsyncStorage.getItem(PIN_SALT_KEY);
    if (!hexSalt) {
      // Migrasi: PIN ini dibuat sebelum salt-based encryption ada.
      // Aman generate salt baru sekarang — belum pernah ada data yang
      // terenkripsi dengan kunci lama karena kunci itu memang belum pernah ada.
      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      hexSalt = Array.from(newSalt)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      await AsyncStorage.setItem(PIN_SALT_KEY, hexSalt);
    }
    const salt = new Uint8Array(
      hexSalt.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
    cachedEncryptionKey = await deriveAesKey(pin, salt);

    return { ok: true, lockoutRemaining: 0 };
  }

  // Gagal — increment & hitung lockout
  const newCount = attempts.count + 1;
  const duration = lockoutDuration(newCount);
  const lockoutUntil = duration > 0 ? Date.now() + duration : 0;
  await saveAttempts({ count: newCount, lockoutUntil });
  return { ok: false, lockoutRemaining: lockoutUntil - Date.now() };
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
