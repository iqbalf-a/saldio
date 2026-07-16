# Saldio — Roadmap

Status MVP: selesai & ter-deploy (branch `dev` → Vercel). Daftar ini adalah
rencana lanjutan, diurutkan berdasarkan prioritas. Centang saat selesai.

## Fase 1 — Penyuntingan data (dampak terbesar)

- [x] Edit transaksi (nominal, kategori, catatan, tanggal)
- [x] Hapus transaksi (dengan konfirmasi)
- [x] Ubah nama dompet & saldo/gram awal
- [x] Hapus/koreksi transfer (transfer dihapus sepenuhnya dari aplikasi)
- [x] Hapus/koreksi entri harga emas (long press di riwayat harga)
- [x] Undo hasil impor PDF per batch (tombol "Batalkan Impor Ini" setelah impor)

## Fase 2 — Sinkronisasi Google yang tahan lama

- [x] Isi client ID OAuth Web di `src/lib/config.ts` (Android ditunda — fokus web dulu)
- [x] Tangani token kedaluwarsa (±1 jam): deteksi 401 dari Drive → prompt login ulang, jangan telan error diam-diam
- [x] Indikator status sinkron di Profil ("Terakhir disinkron …", tombol manual)
- [x] Tombol "Sinkron sekarang" manual
- [x] Strategi konflik multi-perangkat (bandingkan timestamp, tawarkan pilih versi — bukan last-write-wins buta)

## Fase 3 — Melengkapi yang setengah jadi

- [x] Date picker sungguhan (kalender bottom-sheet setema, aksen biru/emas; chip Hari ini/Kemarin dipertahankan)
- [x] Kalibrasi parser dengan PDF asli BCA / Mandiri / Bank Jago — ketiganya tervalidasi cocok dengan ringkasan resmi tiap statement; dukungan PDF ber-password ikut ditambahkan
- [ ] Solusi impor PDF di Android native (pdfjs tidak jalan di Hermes) — **ditunda, fokus web dulu**
- [x] Unit test: parser PDF (`src/lib/pdf/`), formatter Rupiah/tanggal — 102 test pass (format, parseCommon, parsers)

## Fase 4 — Fitur finansial lanjutan

- [x] Breakdown pengeluaran per kategori per bulan (chart di tab Riwayat atau Aset)
- [x] Pencarian transaksi (catatan/kategori)
- [x] Kategori kustom (tambah/ubah/arsip)
- [x] Ekspor data CSV / JSON (backup export/import di tab Profil)
- [x] Transaksi berulang (langganan bulanan: Netflix, listrik, dll.)
- [x] Budget per kategori + indikator pemakaian

## Fase 5 — Kesiapan produksi

- [ ] Ikon aplikasi & splash screen Saldio (ganti default Expo)
- [ ] Konfigurasi EAS Build untuk APK (package name, versionCode, signing)
- [ ] PWA: manifest + installable di web (target Vercel)
- [ ] Kunci aplikasi: PIN / biometrik (expo-local-authentication)
- [ ] CI: typecheck + test di GitHub Actions

## Ditunda sesuai spek awal (belum dijadwalkan)

- Toggle bahasa Inggris
- ~~Parser PDF untuk bank selain BCA/Mandiri/Jago~~ — Neo Bank & Super Bank
  sudah ditambahkan (scope diperluas atas permintaan, sampel tersedia);
  hanya rekening utama yang diimpor dari laporan konsolidasi
- Koneksi API bank live
- Harga emas otomatis dari API (sekarang manual by design)
- Android OAuth client ID (ditunda — build APK belum diprioritaskan)

## Catatan teknis yang sudah diputuskan

- Chart digambar manual dengan `react-native-svg` (victory-native butuh Skia/Reanimated, berat di web)
- Font Geist dari `@expo-google-fonts/geist` (bukan file lokal)
- Data di Google Drive `appDataFolder` (scope `drive.appdata`), cache lokal AsyncStorage, debounce upload 2 detik
- Deploy web: `vercel.json` → `expo export --platform web` → `dist/` + rewrite SPA
- Konflik multi-perangkat: `lastModified` di `AppData`, deteksi via `lastSyncTimestamp`, modal pilihan versi lokal vs Drive
