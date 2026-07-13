import { guessCategory } from "../categories";
import type { WalletTemplateKey } from "../types";
import {
  detectStatementYear,
  isoDate,
  monthFromToken,
  parseAmount,
  type ParsedTransaction,
} from "./parseCommon";

/**
 * Parser mutasi per bank. Format e-statement asli bervariasi antar versi
 * aplikasi, jadi parser dibuat toleran: baris yang tidak dikenali dilewati,
 * dan hasilnya selalu bisa dikoreksi user di langkah tinjau.
 */

/**
 * BCA (Laporan Mutasi Rekening): baris utama diawali DD/MM (tahun dari
 * header "PERIODE : AGUSTUS 2025"), lalu keterangan, nominal 1,234,567.89,
 * penanda "DB" (keluar; tanpa penanda = masuk), dan kolom saldo opsional:
 *   "25/08 TRSF E-BANKING DB 2508/FTFVA/WS95031 53,200.00 DB 6,279,339.44"
 * Nama lawan transaksi (mis. "80777/TOKOPEDIA") berada di baris lanjutan
 * dan ditempelkan ke keterangan agar tebakan kategori lebih akurat.
 */
export function parseBca(lines: string[]): ParsedTransaction[] {
  const year = detectBcaYear(lines);
  const out: ParsedTransaction[] = [];
  /** Transaksi terakhir yang masih menunggu nama lawan dari baris lanjutan */
  let open: ParsedTransaction | null = null;

  const finalize = () => {
    if (open) {
      open.category = guessCategory(open.description);
      out.push(open);
      open = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Batas halaman/tabel: berhenti mengait nama untuk transaksi sebelumnya
    if (/^(Bersambung|TANGGAL KETERANGAN|SALDO AWAL|MUTASI (CR|DB)|SALDO AKHIR)/i.test(line)) {
      finalize();
      continue;
    }

    const row = line.match(/^(\d{2})\/(\d{2})\s+(.+)$/);
    if (row) {
      const day = parseInt(row[1], 10);
      const month = parseInt(row[2], 10);
      const rest = row[3];
      if (day < 1 || day > 31 || month < 1 || month > 12) continue;
      finalize();
      if (/^SALDO/i.test(rest)) continue;
      // Ekor baris: nominal, lalu opsional "DB", lalu opsional kolom saldo
      const tail = rest.match(/([\d,]+\.\d{2})(\s+DB)?(\s+[\d,]+\.\d{2})?\s*$/);
      if (!tail) continue;
      const amount = parseAmount(tail[1]);
      if (amount === null || amount < 0) continue;
      const description = rest.slice(0, tail.index).trim().replace(/\s{2,}/g, " ");
      if (!description) continue;
      const direction: "in" | "out" =
        !!tail[2] || /\bDB\b/.test(description) ? "out" : "in";
      open = {
        date: isoDate(year, month, day),
        description,
        amount,
        direction,
        category: "Lainnya",
      };
      continue;
    }

    // Baris lanjutan: cari nama lawan transaksi (huruf besar, tanpa deretan digit)
    if (open) {
      const cleaned = line.replace(/^\d+\//, "").trim();
      const tokens = cleaned.split(/\s+/);
      const looksLikeName =
        cleaned.length >= 4 &&
        /^[A-Z][A-Z0-9 .,&'()/-]*$/.test(cleaned) &&
        !/\d{4,}/.test(cleaned) &&
        tokens.filter((t) => t.length === 1).length <= tokens.length / 2;
      if (looksLikeName) {
        open.description = `${open.description} ${cleaned}`;
        finalize();
      }
    }
  }
  finalize();
  return out;
}

/** Tahun laporan BCA dari header "PERIODE : AGUSTUS 2025". */
function detectBcaYear(lines: string[]): number {
  for (const line of lines) {
    const m = line.match(/PERIODE\s*:?\s*[A-Z]+\s+(20\d{2})/i);
    if (m) return parseInt(m[1], 10);
  }
  return detectStatementYear(lines);
}

/**
 * Mandiri (e-Statement Livin'): satu transaksi terpecah ke beberapa baris.
 * Jangkar yang andal adalah baris bernomor yang diakhiri nominal + saldo:
 *   "6 ke jagocoffee.com/ -10.000,00 17.594.645,00"
 * Tanggal diambil dari baris "DD Mmm YYYY" terdekat sebelumnya; potongan
 * deskripsi bisa berada sebelum baris tanggal, menempel di baris tanggal,
 * atau menempel di baris bernomor — semuanya digabungkan.
 */
export function parseMandiri(lines: string[]): ParsedTransaction[] {
  const out: ParsedTransaction[] = [];
  const skipRe =
    /^(e-Statement|Menara Mandiri|Nama\/|Cabang\/|Tabungan |Saldo (Awal|Akhir)|Nomor Rekening|Mata Uang|Dana (Masuk|Keluar)|No Tanggal|No Date|PT Bank|Mandiri Call|serta merupakan|Periode\/|Dicetak)/i;
  const timeRe = /^\d{1,2}:\d{2}(:\d{2})?\s*(WIB|WITA|WIT)?\b/i;
  const dateRe = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:\s+(.+))?$/;
  const rowRe = /^\d+\s+(.*?)\s*([+-]?[\d.]+,\d{2})\s+[\d.]+,\d{2}$/;
  // Fragmen deskripsi yang layak: bukan referensi (deretan digit panjang)
  const fragmentOk = (s: string) => !/\d{6,}/.test(s) && !/^[\d\s#/-]+$/.test(s) && s.length <= 80;

  let currentDate: string | null = null;
  /** Fragmen sebelum baris tanggal (maks. 1, yang terakhir) */
  let preDate: string | null = null;
  /** Fragmen di/antara baris tanggal dan baris bernomor */
  let pending: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || timeRe.test(line)) continue;
    if (skipRe.test(line)) {
      // Baris header/footer memutus konteks — fragmen sebelumnya (mis.
      // potongan nama cabang) bukan milik transaksi berikutnya.
      preDate = null;
      continue;
    }

    const dm = line.match(dateRe);
    if (dm) {
      const month = monthFromToken(dm[2]);
      const day = parseInt(dm[1], 10);
      if (month && day >= 1 && day <= 31) {
        currentDate = isoDate(parseInt(dm[3], 10), month, day);
        pending = [];
        if (preDate) pending.push(preDate);
        if (dm[4] && fragmentOk(dm[4])) pending.push(dm[4].trim());
        preDate = null;
        continue;
      }
    }

    const rm = line.match(rowRe);
    if (rm && currentDate) {
      const inline = rm[1].trim();
      const description =
        [...pending, inline].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim() ||
        "Transaksi";
      const amount = parseAmount(rm[2]);
      if (amount) {
        out.push({
          date: currentDate,
          description,
          amount,
          direction: rm[2].startsWith("-") ? "out" : "in",
          category: guessCategory(description),
        });
      }
      pending = [];
      preDate = null;
      continue;
    }

    if (fragmentOk(line)) preDate = line;
  }
  return out;
}

/**
 * Bank Jago (Pockets Transactions History): satu baris utama per transaksi:
 *   "27 Jan 2026 USAHA DAGANG QRIS Payment -3.000 13.735,95"
 * yaitu tanggal, deskripsi, nominal bertanda +/-, lalu kolom saldo.
 * Baris lanjutan (jam, ID#, potongan nama) tidak diawali tanggal sehingga
 * otomatis terlewati.
 */
export function parseBankJago(lines: string[]): ParsedTransaction[] {
  const out: ParsedTransaction[] = [];
  const lineRe =
    /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\s+(.+?)\s+([+-][\d.,]+)\s+([\d.,]+)$/;
  for (const raw of lines) {
    const m = raw.trim().match(lineRe);
    if (!m) continue;
    const day = parseInt(m[1], 10);
    const month = monthFromToken(m[2]);
    const year = parseInt(m[3], 10);
    if (!month || day < 1 || day > 31) continue;
    const amount = parseAmount(m[5]);
    if (!amount) continue;
    const description = m[4].replace(/\s{2,}/g, " ").trim();
    if (!description) continue;
    out.push({
      date: isoDate(year, month, day),
      description,
      amount,
      direction: m[5].startsWith("+") ? "in" : "out",
      category: guessCategory(description),
    });
  }
  return out;
}

export function parseStatement(template: WalletTemplateKey, lines: string[]): ParsedTransaction[] {
  switch (template) {
    case "bca":
      return parseBca(lines);
    case "mandiri":
      return parseMandiri(lines);
    case "bank_jago":
      return parseBankJago(lines);
    default:
      return [];
  }
}

export const PARSER_LABELS: Partial<Record<WalletTemplateKey, string>> = {
  bca: "BCA",
  mandiri: "Mandiri",
  bank_jago: "Bank Jago",
};
