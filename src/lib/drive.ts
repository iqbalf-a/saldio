import { DRIVE_DATA_FILENAME } from "./config";
import type { AppData } from "./types";

/**
 * Sinkronisasi satu file JSON ke Google Drive appDataFolder milik user.
 * Saldio tidak punya server sendiri — Drive user adalah satu-satunya backup.
 */

const FILES_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

/** Error khusus ketika Google Drive API mengembalikan 401 Unauthorized. */
export class DriveAuthError extends Error {
  constructor(message = "Token Google Drive kedaluwarsa atau tidak valid") {
    super(message);
    this.name = "DriveAuthError";
  }
}

async function findDataFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${DRIVE_DATA_FILENAME}' and trashed=false`);
  const res = await fetch(
    `${FILES_API}?spaces=appDataFolder&q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 401) throw new DriveAuthError();
  if (!res.ok) throw new Error(`Drive list gagal: ${res.status}`);
  const json = await res.json();
  return json.files?.[0]?.id ?? null;
}

export async function downloadFromDrive(token: string): Promise<AppData | null> {
  const fileId = await findDataFileId(token);
  if (!fileId) return null;
  const res = await fetch(`${FILES_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new DriveAuthError();
  if (!res.ok) throw new Error(`Drive download gagal: ${res.status}`);
  return (await res.json()) as AppData;
}

export async function uploadToDrive(token: string, data: AppData): Promise<void> {
  const fileId = await findDataFileId(token);
  const body = JSON.stringify(data);
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
