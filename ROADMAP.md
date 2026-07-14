# Saldio — Roadmap

Status MVP: selesai & ter-deploy (branch `dev` → Vercel). Daftar ini adalah
rencana lanjutan, diurutkan berdasarkan prioritas. Centang saat selesai.

## Fase 1 — Penyuntingan data (dampak terbesar)

- [ ] Edit transaksi (nominal, kategori, catatan, tanggal)
- [ ] Hapus transaksi (dengan konfirmasi)
- [ ] Ubah nama dompet & saldo/gram awal
- [ ] Hapus/koreksi transfer
- [ ] Hapus/koreksi entri harga emas
- [ ] Undo hasil impor PDF per batch (tandai batch id di `source`/metadata, tombol "Batalkan impor ini")

## Fase 2 — Sinkronisasi Google yang tahan lama

- [ ] Isi client ID OAuth (Web + Android) di `src/lib/config.ts`
- [ ] Tangani token kedaluwarsa (±1 jam): deteksi 401 dari Drive → prompt login ulang, jangan telan error diam-diam
- [ ] Indikator status sinkron di Profil ("Terakhir disinkron …", ikon error saat gagal)
- [ ] Tombol "Sinkron sekarang" manual
- [ ] Strategi konflik multi-perangkat (minimal: bandingkan timestamp, tawarkan pilih versi — bukan last-write-wins buta)

## Fase 3 — Melengkapi yang setengah jadi

- [x] Date picker sungguhan (kalender bottom-sheet setema, aksen biru/emas; chip Hari ini/Kemarin dipertahankan)
- [x] Kalibrasi parser dengan PDF asli BCA / Mandiri / Bank Jago — ketiganya tervalidasi cocok dengan ringkasan resmi tiap statement; dukungan PDF ber-password ikut ditambahkan
- [ ] Solusi impor PDF di Android native (pdfjs tidak jalan di Hermes): opsi WebView tersembunyi, library native, atau arahan resmi "impor lewat versi web"
- [ ] Unit test: parser PDF (`src/lib/pdf/`), kalkulasi saldo (`src/lib/balances.ts`), formatter Rupiah/tanggal

## Fase 4 — Fitur finansial lanjutan

- [ ] Breakdown pengeluaran per kategori per bulan (chart di tab Riwayat atau Aset)
- [ ] Pencarian transaksi (catatan/kategori)
- [ ] Kategori kustom (tambah/ubah/arsip)
- [ ] Ekspor data CSV / JSON
- [ ] Transaksi berulang (langganan bulanan: Netflix, listrik, dll.)
- [ ] Budget per kategori + indikator pemakaian

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

## Catatan teknis yang sudah diputuskan

- Chart digambar manual dengan `react-native-svg` (victory-native butuh Skia/Reanimated, berat di web)
- Font Geist dari `@expo-google-fonts/geist` (bukan file lokal)
- Data di Google Drive `appDataFolder` (scope `drive.appdata`), cache lokal AsyncStorage, debounce upload 2 detik
- Deploy web: `vercel.json` → `expo export --platform web` → `dist/` + rewrite SPA
