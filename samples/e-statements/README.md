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
```

Contoh: `bca-2026-06.pdf`, `bank_jago-2026-07.pdf`

## Status kalibrasi parser

| Bank      | Status                                            |
| --------- | ------------------------------------------------- |
| BCA       | ⚠️ Belum — hanya teruji dengan PDF tiruan          |
| Mandiri   | ⚠️ Belum — hanya teruji dengan PDF tiruan          |
| Bank Jago | ⚠️ Belum — hanya teruji dengan PDF tiruan          |

Setelah file tersedia, kalibrasi dilakukan dengan mengekstrak teksnya
(`src/lib/pdf/extract.ts`), mencocokkan pola baris transaksi terhadap regex
parser, lalu memperbaiki regex sampai seluruh baris terbaca benar.
(Roadmap Fase 3.)
