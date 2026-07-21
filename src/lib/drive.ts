import { DRIVE_DATA_FILENAME } from "./config";
import type { AppData } from "./types";
import { isPinEnabled, getCachedEncryptionKey } from "./pin";
import { encryptWithKey, decryptWithKey, isEncryptedPayload } from "./crypto";

/**
 * Sinkronisasi satu file JSON ke Google Drive appDataFolder milik user.
 *
 * Jika PIN aktif DAN kunci enkripsi sudah ter-cache di memori (sesi ter-unlock),
 * data akan dienkripsi sebelum upload dan didekripsi setelah download.
 * Jika PIN aktif tapi kunci belum tersedia (app baru buka, belum unlock),
 * siklus sync dilewatkan — upload tidak akan menimpa data terenkripsi di Drive.
 */

const FILES_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

/** Error khusus ketika Google Drive API mengembalikan 401 Unauthorized. */
export class DriveAuthError extends Error {
  constructor(message = "Token Google Drive kedaluarsa atau tidak valid") {
    super(message);
    this.name = "DriveAuthError";
  }
}

async function findDataFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${DRIVE_DATA_FILENAME}' and trashed=false`);
  const res = await fetch(
    `${FILES_API}?spaces=appDataFolder&q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 401) throw new DriveAuthError();
  if (!res.ok) throw new Error(`Drive list gagal: ${res.status}`);
  const json = await res.json();
  return json.files?.[0]?.id ?? null;
}

/** Format error deskriptif untuk dekripsi yang gagal. */
function decryptErrorMessage(reason: string): string {
  return `Gagal membuka backup: ${reason}. Pastikan PIN yang digunakan sesuai dengan saat backup dibuat.`;
}

export async function downloadFromDrive(token: string): Promise<AppData | null> {
  const fileId = await findDataFileId(token);
  if (!fileId) return null;
  const res = await fetch(`${FILES_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new DriveAuthError();
  if (!res.ok) throw new Error(`Drive download gagal: ${res.status}`);

  const raw = await res.text();

  // Data terenkripsi di Drive
  if (isEncryptedPayload(raw)) {
    const pinActive = await isPinEnabled();
    if (!pinActive) {
      throw new Error("File backup terenkripsi tapi PIN tidak aktif.");
    }
    const key = getCachedEncryptionKey();
    if (!key) {
      // PIN aktif tapi belum diverifikasi sesi ini — lewatkan siklus sync;
      // download tidak bisa tanpa kunci, tapi juga tidak akan menimpa data
      // terenkripsi karena upload juga melewati siklus ini.
      return null;
    }
    const payload = JSON.parse(raw);
    const decrypted = await decryptWithKey(payload, key);
    if (!decrypted) {
      throw new Error(decryptErrorMessage("data mungkin terenkripsi dengan PIN yang berbeda"));
    }
    return JSON.parse(decrypted) as AppData;
  }

  // Plain JSON (backward compatible, sebelum PIN pernah aktif)
  return JSON.parse(raw) as AppData;
}

export async function uploadToDrive(token: string, data: AppData): Promise<void> {
  const fileId = await findDataFileId(token);

  let body: string;
  const pinActive = await isPinEnabled();

  if (pinActive) {
    const key = getCachedEncryptionKey();
    if (!key) {
      // PIN aktif tapi belum diverifikasi sesi ini — JANGAN upload
      // data plaintext yang bisa menimpa backup terenkripsi di Drive.
      throw new Error(
        "Sync dilewati: kunci enkripsi belum tersedia (PIN belum diverifikasi sesi ini).",
      );
    }
    const json = JSON.stringify(data);
    const encrypted = await encryptWithKey(json, key);
    body = JSON.stringify({ v: 2, iv: encrypted.iv, data: encrypted.data });
  } else {
    body = JSON.stringify(data);
  }

  if (fileId) {
    const res = await fetch(`${UPLOAD_API}/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    });
    if (res.status === 401) throw new DriveAuthError();
    if (!res.ok) throw new Error(`Drive update gagal: ${res.status}`);
    return;
  }
  // Multipart create: metadata (nama + folder) + konten sekaligus
  const boundary = "saldio_boundary";
  const metadata = { name: DRIVE_DATA_FILENAME, parents: ["appDataFolder"] };
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    `${body}\r\n--${boundary}--`;
  const res = await fetch(`${UPLOAD_API}?uploadType=multipart`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipart,
  });
  if (res.status === 401) throw new DriveAuthError();
  if (!res.ok) throw new Error(`Drive create gagal: ${res.status}`);
}
