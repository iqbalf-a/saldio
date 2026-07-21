import {
  encryptWithKey,
  decryptWithKey,
  encryptWithPin,
  decryptWithPin,
  deriveAesKey,
  isEncryptedPayload,
} from "../crypto";

describe("AES-GCM crypto", () => {
  const PIN = "123456";

  // ── encryptWithKey / decryptWithKey ──────────────────────────────

  it("encrypt lalu decrypt dengan key yang sama → plaintext asli", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveAesKey(PIN, salt);

    const plaintext = "Data keuangan Saldio";
    const enc = await encryptWithKey(plaintext, key);

    expect(enc.iv).toBeTruthy();
    expect(enc.data).toBeTruthy();
    expect(enc.iv.length).toBe(24); // 12 byte = 24 hex chars
    // Data harus panjang (ciphertext + 16 byte GCM tag = min 16 byte)
    expect(enc.data.length).toBeGreaterThanOrEqual(32);

    const dec = await decryptWithKey(enc, key);
    expect(dec).toBe(plaintext);
  });

  it("decryptWithKey dengan key berbeda → null", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key1 = await deriveAesKey("111111", salt);
    const key2 = await deriveAesKey("222222", salt);

    const enc = await encryptWithKey("rahasia", key1);
    const dec = await decryptWithKey(enc, key2);
    expect(dec).toBeNull();
  });

  it("decryptWithKey dengan data korup → null", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveAesKey(PIN, salt);

    const enc = await encryptWithKey("teks", key);
    // Corupkan data (balik beberapa hex digit)
    const corrupted = enc.data.split("").reverse().join("");
    const dec = await decryptWithKey({ iv: enc.iv, data: corrupted }, key);
    expect(dec).toBeNull();
  });

  it("decryptWithKey dengan IV salah → null", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveAesKey(PIN, salt);

    const enc = await encryptWithKey("teks lain", key);
    // Ganti IV
    const wrongIv = enc.iv.split("").reverse().join("");
    const dec = await decryptWithKey({ iv: wrongIv, data: enc.data }, key);
    expect(dec).toBeNull();
  });

  // ── encryptWithPin / decryptWithPin ──────────────────────────────

  it("encryptWithPin lalu decryptWithPin → plaintext asli", async () => {
    const plaintext = JSON.stringify({ wallets: [], transactions: [] });
    const enc = await encryptWithPin(plaintext, PIN);

    expect(enc.v).toBe(2);
    expect(enc.salt.length).toBe(32); // 16 byte = 32 hex chars

    const dec = await decryptWithPin(enc, PIN);
    expect(dec).toBe(plaintext);
  });

  it("decryptWithPin dengan PIN salah → null", async () => {
    const enc = await encryptWithPin("data rahasia", PIN);
    const dec = await decryptWithPin(enc, "999999");
    expect(dec).toBeNull();
  });

  it("salt unik tiap panggilan encrypt", async () => {
    const enc1 = await encryptWithPin("test", PIN);
    const enc2 = await encryptWithPin("test", PIN);
    expect(enc1.salt).not.toBe(enc2.salt);
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.data).not.toBe(enc2.data);
    // Tapi keduanya bisa di-decrypt dengan PIN yang sama
    expect(await decryptWithPin(enc1, PIN)).toBe("test");
    expect(await decryptWithPin(enc2, PIN)).toBe("test");
  });

  // ── isEncryptedPayload ───────────────────────────────────────────

  it("isEncryptedPayload mengenali v:2", async () => {
    const enc = await encryptWithPin("hi", PIN);
    expect(isEncryptedPayload(JSON.stringify(enc))).toBe(true);
  });

  it("isEncryptedPayload mengenali v:1 (backward-compat)", () => {
    const v1 = { v: 1, salt: "aa", iv: "bb", data: "cc" };
    expect(isEncryptedPayload(JSON.stringify(v1))).toBe(true);
  });

  it("isEncryptedPayload menolak plain JSON", () => {
    expect(isEncryptedPayload('{"wallets":[]}')).toBe(false);
  });

  it("isEncryptedPayload menolak string random", () => {
    expect(isEncryptedPayload("bukan json")).toBe(false);
  });

  // ── v:1 decrypt gagal gracefully ─────────────────────────────────

  it("decryptWithPin v:1 → null (format lama tidak didukung)", async () => {
    const v1 = { v: 1, salt: "aa", iv: "bb", data: "cc" } as any;
    const dec = await decryptWithPin(v1, PIN);
    expect(dec).toBeNull();
  });
});
