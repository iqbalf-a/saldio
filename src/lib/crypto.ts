/**
 * Enkripsi data menggunakan AES-GCM + PBKDF2-SHA256 (Web Crypto API).
 *
 * Alur:
 * - Export: PIN → PBKDF2(salt) → CryptoKey → AES-GCM encrypt → { v:2, salt, iv, data }
 * - Import: PIN + salt → PBKDF2 → CryptoKey → AES-GCM decrypt → plaintext
 *
 * Format file terenkripsi:
 * { v: 2, salt: hex, iv: hex, data: hex }
 *
 * v:1 (XOR lama) masih dideteksi oleh isEncryptedPayload() untuk backward-compat,
 * tapi dekripsi v:1 tidak didukung lagi.
 */

const ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Standar AES-GCM

/* ── Hex helpers ─────────────────────────────────────────────────────── */

function hexEncode(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexDecode(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/* ── Key derivation ──────────────────────────────────────────────────── */

/**
 * Derive CryptoKey AES-GCM 256-bit dari PIN + salt via PBKDF2-SHA256.
 */
export async function deriveAesKey(
  pin: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const pinBytes = new TextEncoder().encode(pin);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pinBytes.buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/* ── Low-level encrypt/decrypt with CryptoKey ────────────────────────── */

/**
 * Enkripsi plaintext dengan CryptoKey AES-GCM.
 * Return iv + ciphertext (termasuk GCM tag otomatis) sebagai hex.
 */
export async function encryptWithKey(
  plaintext: string,
  key: CryptoKey,
): Promise<{ iv: string; data: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encoded.buffer as ArrayBuffer,
  );

  return {
    iv: hexEncode(iv),
    data: hexEncode(new Uint8Array(cipherBuf)),
  };
}

/**
 * Dekripsi ciphertext dengan CryptoKey AES-GCM.
 * Return plaintext atau null jika kunci salah / data korup.
 * SubtleCrypto AES-GCM melempar OperationError saat tag tidak cocok.
 */
export async function decryptWithKey(
  payload: { iv: string; data: string },
  key: CryptoKey,
): Promise<string | null> {
  try {
    const iv = hexDecode(payload.iv);
    const data = hexDecode(payload.data);

    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      data.buffer as ArrayBuffer,
    );

    return new TextDecoder().decode(plainBuf);
  } catch {
    // Kunci salah → OperationError, data korup → SyntaxError, dll
    return null;
  }
}

/* ── High-level API (PIN string convenience) ──────────────────────────── */

export interface EncryptedPayload {
  v: 2;
  salt: string; // hex, hanya dipakai saat derive dari PIN string
  iv: string; // hex, 12 byte, AES-GCM nonce
  data: string; // hex, ciphertext + GCM tag
}

/** Tipe input yang bisa diterima — v:1 (XOR lama) atau v:2 (AES-GCM). */
interface LegacyPayload {
  v: 1;
  salt: string;
  iv: string;
  data: string;
}

/** Enkripsi string dengan PIN (derive key on-the-fly). */
export async function encryptWithPin(
  plaintext: string,
  pin: string,
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveAesKey(pin, salt);
  const { iv, data } = await encryptWithKey(plaintext, key);

  return { v: 2, salt: hexEncode(salt), iv, data };
}

/** Dekripsi payload dengan PIN. Return plaintext atau null jika gagal. */
export async function decryptWithPin(
  payload: EncryptedPayload | LegacyPayload,
  pin: string,
): Promise<string | null> {
  try {
    // v:1 (XOR lama) tidak didukung lagi — format ini sudah tidak bisa
    // di-decrypt dengan AES-GCM, kembalikan null agar user tahu
    if ((payload as LegacyPayload).v === 1) {
      return null;
    }

    const salt = hexDecode(payload.salt);
    const key = await deriveAesKey(pin, salt);
    return decryptWithKey(payload, key);
  } catch {
    return null;
  }
}

/** Cek apakah string adalah encrypted payload (v:1 lama ATAU v:2 baru). */
export function isEncryptedPayload(text: string): boolean {
  try {
    const obj = JSON.parse(text);
    return (
      (obj.v === 1 || obj.v === 2) &&
      typeof obj.salt === "string" &&
      typeof obj.iv === "string" &&
      typeof obj.data === "string"
    );
  } catch {
    return false;
  }
}
