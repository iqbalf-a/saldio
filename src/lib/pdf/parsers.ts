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

/**
 * Neo Bank (Consolidated Statement): laporan multi-rekening — hanya bagian
 * "Now Savings/Tabungan Now" yang diimpor (Neo Wish dilewati). Baris:
 *   "04/01/2026 QRIS (PAYMENT) -6.397,00 1.980.943,93"
 * yaitu tanggal penuh, deskripsi, mutasi (negatif = keluar, tanpa tanda =
 * masuk), lalu kolom saldo. Baris terjemahan Indonesia di bawahnya dilewati.
 */
export function parseNeoBank(lines: string[]): ParsedTransaction[] {
  const out: ParsedTransaction[] = [];
  let capture = false;
  const rowRe = /^(\d{2})\/(\d{2})\/(\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})\s+[\d.]+,\d{2}$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^Now Savings/i.test(line)) {
      capture = true;
      continue;
    }
    if (/^(Total (Credit|Debit|Balance)|Neo Wish)/i.test(line)) {
      capture = false;
      continue;
    }
    if (!capture) continue;
    const m = line.match(rowRe);
    if (!m) continue;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;
    const description = m[4].replace(/\s{2,}/g, " ").trim();
    if (/Opening Balance|Saldo Awal/i.test(description)) continue;
    const amount = parseAmount(m[5]);
    if (!amount) continue;
    out.push({
      date: isoDate(year, month, day),
      description,
      amount,
      direction: m[5].startsWith("-") ? "out" : "in",
      category: guessCategory(description),
    });
  }
  return out;
}

/**
 * Super Bank: laporan terkonsolidasi multi-kantong — hanya bagian
 * "Tabungan Utama" yang diimpor (Saku/Celengan/OVO/Deposito/Kartu Untung
 * dilewati agar perpindahan internal tidak terhitung dobel). Hasil ekstraksi
 * memisahkan nominal dan keterangan ke baris berdampingan:
 *   "-Rp50.000,00 Rp1.967.216,71"   ← mutasi + saldo
 *   "1 Jan Pengisian Celengan"      ← tanggal (tanpa tahun) + deskripsi
 * sehingga baris nominal dipasangkan dengan baris keterangan berikutnya.
 * Tahun diambil dari header periode laporan.
 */
export function parseSuperBank(lines: string[]): ParsedTransaction[] {
  const out: ParsedTransaction[] = [];
  const year = detectStatementYear(lines);
  let capture = false;
  let pending: { amount: number; direction: "in" | "out" } | null = null;
  const amountRe = /^([+-])Rp([\d.,]+)\s+Rp[\d.,]+$/;
  const descRe = /^(\d{1,2})\s+([A-Za-z]{3})\s+(.+)$/;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^Tabungan Utama - \d/.test(line)) {
      capture = true;
      continue;
    }
    if (/^(Saku\b|Celengan$|OVO Nabung|Deposito$|Kartu Untung$)/.test(line)) {
      capture = false;
      continue;
    }
    if (!capture) continue;

    const am = line.match(amountRe);
    if (am) {
      const amount = parseAmount(am[2]);
      pending = amount ? { amount, direction: am[1] === "-" ? "out" : "in" } : null;
      continue;
    }

    const dm = line.match(descRe);
    if (dm && pending) {
      const month = monthFromToken(dm[2]);
      const day = parseInt(dm[1], 10);
      const description = dm[3].replace(/\s{2,}/g, " ").trim();
      // "1 Jan 2026" (tahun saja, tanpa deskripsi) adalah artefak kolom — bukan transaksi
      if (month && day >= 1 && day <= 31 && !/^\d{4}$/.test(description)) {
        out.push({
          date: isoDate(year, month, day),
          description,
          amount: pending.amount,
          direction: pending.direction,
          category: guessCategory(description),
        });
        pending = null;
      }
    }
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
    case "neo_bank":
      return parseNeoBank(lines);
    case "super_bank":
      return parseSuperBank(lines);
    default:
      return [];
  }
}

export const PARSER_LABELS: Partial<Record<WalletTemplateKey, string>> = {
  bca: "BCA",
  mandiri: "Mandiri",
  bank_jago: "Bank Jago",
  neo_bank: "Neo Bank",
  super_bank: "Super Bank",
};
