jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  // Hash deterministik sederhana — cukup untuk kebutuhan test (bukan kriptografis),
  // yang penting input sama -> output sama, input beda -> output beda.
  digestStringAsync: async (_algo: string, data: string) => {
    let h = 0;
    for (let i = 0; i < data.length; i++) h = (h * 31 + data.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, "0");
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  hashPin,
  verifyPin,
  savePinHash,
  removePinHash,
  isPinEnabled,
  isPinVerified,
  getCachedEncryptionKey,
  clearCachedEncryptionKey,
  clearAllPinData,
} from "../pin";

const PIN_HASH_KEY = "saldio:pinHash";
const PIN_SALT_KEY = "saldio:pinSalt";

describe("pin.ts — migrasi salt untuk PIN lama (Fase F.3)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    clearCachedEncryptionKey();
  });

  it("PIN dibuat sebelum salt-based encryption (tanpa PIN_SALT_KEY) tetap bisa verifyPin dan dapat cached key", async () => {
    const PIN = "123456";

    // Simulasikan PIN "lama": simpan hash langsung, TANPA lewat savePinHash()
    // (yang sekarang otomatis generate salt) — supaya PIN_SALT_KEY kosong,
    // persis kondisi akun yang PIN-nya dibuat sebelum Fase C ada.
    const hash = await hashPin(PIN);
    await AsyncStorage.setItem(PIN_HASH_KEY, hash);

    // Pastikan skenario valid: PIN aktif tapi salt belum ada
    expect(await isPinEnabled()).toBe(true);
    expect(await AsyncStorage.getItem(PIN_SALT_KEY)).toBeNull();
    expect(getCachedEncryptionKey()).toBeNull();

    // Verifikasi PIN — harus sukses DAN memicu migrasi lazy salt
    const result = await verifyPin(PIN);
    expect(result.ok).toBe(true);

    // Migrasi harus sudah menyimpan salt baru...
    expect(await AsyncStorage.getItem(PIN_SALT_KEY)).not.toBeNull();
    // ...dan kunci enkripsi harus sudah ter-cache di memori (bukan null lagi)
    const key = getCachedEncryptionKey();
    expect(key).not.toBeNull();
    expect(key).toHaveProperty("type", "secret"); // ciri CryptoKey AES-GCM
  });

  it("PIN salah pada akun lama tetap ditolak dan tidak mengisi cached key", async () => {
    const hash = await hashPin("111111");
    await AsyncStorage.setItem(PIN_HASH_KEY, hash);

    const result = await verifyPin("999999");
    expect(result.ok).toBe(false);
    expect(getCachedEncryptionKey()).toBeNull();
  });

  it("PIN yang dibuat lewat savePinHash() (jalur normal, bukan migrasi) tetap bekerja seperti biasa", async () => {
    const PIN = "654321";
    await savePinHash(PIN);

    // savePinHash sudah langsung cache key tanpa perlu verifyPin
    expect(getCachedEncryptionKey()).not.toBeNull();

    clearCachedEncryptionKey();
    expect(getCachedEncryptionKey()).toBeNull();

    const result = await verifyPin(PIN);
    expect(result.ok).toBe(true);
    expect(getCachedEncryptionKey()).not.toBeNull();
  });

  it("removePinHash membersihkan salt dan cached key", async () => {
    await savePinHash("222222");
    expect(getCachedEncryptionKey()).not.toBeNull();

    await removePinHash();
    expect(getCachedEncryptionKey()).toBeNull();
    expect(await AsyncStorage.getItem(PIN_SALT_KEY)).toBeNull();
    expect(await isPinEnabled()).toBe(false);
  });
});

describe("pin.ts — clearAllPinData mencegah PIN 'mewarisi' ke akun berikutnya (sign-out)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    clearCachedEncryptionKey();
  });

  it("menghapus hash, salt, status verifikasi, dan cached key sekaligus", async () => {
    await savePinHash("777777");
    await verifyPin("777777"); // tandai terverifikasi di sesi ini
    expect(await isPinEnabled()).toBe(true);
    expect(await isPinVerified()).toBe(true);
    expect(getCachedEncryptionKey()).not.toBeNull();

    await clearAllPinData();

    // Sesi/akun berikutnya di perangkat yang sama tidak boleh mewarisi PIN ini.
    expect(await isPinEnabled()).toBe(false);
    expect(await isPinVerified()).toBe(false);
    expect(getCachedEncryptionKey()).toBeNull();
  });

  it("percobaan gagal (lockout) tidak ikut ke sesi berikutnya", async () => {
    await savePinHash("888888");
    await verifyPin("wrong1"); // gagal sekali — mulai mengisi attempts counter

    await clearAllPinData();

    // PIN baru di akun berikutnya harus mulai bersih, bukan mewarisi lockout lama.
    await savePinHash("999999");
    const result = await verifyPin("999999");
    expect(result.ok).toBe(true);
    expect(result.lockoutRemaining).toBe(0);
  });

  it("aman dipanggil saat belum pernah ada PIN sama sekali (mis. akun tanpa PIN sign-out)", async () => {
    expect(await isPinEnabled()).toBe(false);
    await expect(clearAllPinData()).resolves.not.toThrow();
    expect(await isPinEnabled()).toBe(false);
  });
});
