# Template e-Statement untuk Kalibrasi Parser

Letakkan contoh PDF mutasi asli di folder ini untuk mengkalibrasi parser
impor PDF (`src/lib/pdf/parsers.ts`).

## ⚠️ Keamanan

**Semua file `.pdf` di folder ini di-gitignore dan tidak akan pernah
ter-commit ke GitHub.** Meski begitu, tetap disarankan memakai e-statement
yang datanya sudah disensor bila memungkinkan — yang penting bagi parser
adalah *struktur barisnya* (posisi tanggal, deskripsi, nominal, penanda
debit/kredit), bukan nilai aslinya.

## Penamaan file

```
bca-YYYY-MM.pdf          → e-statement BCA
mandiri-YYYY-MM.pdf      → e-statement Mandiri (Livin')
bank_jago-YYYY-MM.pdf    → e-statement Bank Jago
neo_bank-YYYY-MM.pdf     → consolidated statement Neo Bank
super_bank-YYYY-MM.pdf   → laporan Super Bank
```

Contoh: `bca-2026-06.pdf`, `bank_jago-2026-07.pdf`

## Status kalibrasi parser

| Bank       | Status                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| BCA        | ✅ Terkalibrasi — 29 transaksi, total & jumlah cocok persis ringkasan resmi bank |
| Mandiri    | ✅ Terkalibrasi — 76 transaksi cocok ringkasan bank; teruji end-to-end dengan password |
| Bank Jago  | ✅ Terkalibrasi — seluruh baris sampel terbaca, teruji end-to-end                |
| Neo Bank   | ✅ Terkalibrasi — 35 transaksi (hanya bagian Now Savings), cocok Total Debit; teruji end-to-end dengan password |
| Super Bank | ✅ Terkalibrasi — 63 transaksi (hanya bagian Tabungan Utama), cocok ringkasan; teruji end-to-end |

Catatan:
- PDF Mandiri dan Neo Bank terkunci password (alur input password di aplikasi
  menanganinya); BCA, Jago, dan Super Bank terbuka tanpa password.
- Laporan Neo Bank & Super Bank bersifat terkonsolidasi multi-kantong —
  parser sengaja hanya mengambil rekening utama (Now Savings / Tabungan
  Utama) agar perpindahan internal antar kantong tidak terhitung dobel.
- Selisih kecil pada total pemasukan Neo Bank (±Rp8) berasal dari pembulatan
  sen bunga harian ke rupiah bulat — bukan kesalahan baca.

Setelah file tersedia, kalibrasi dilakukan dengan mengekstrak teksnya
(`src/lib/pdf/extract.ts`), mencocokkan pola baris transaksi terhadap regex
parser, lalu memperbaiki regex sampai seluruh baris terbaca benar.
(Roadmap Fase 3.)
