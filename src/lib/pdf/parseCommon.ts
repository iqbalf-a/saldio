export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  category: string;
}

const MONTH_TOKENS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  agu: 8, agt: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

export function monthFromToken(token: string): number | null {
  return MONTH_TOKENS[token.slice(0, 3).toLowerCase()] ?? null;
}

/**
 * Parse nominal dari berbagai gaya penulisan mutasi bank:
 * "1.234.567,89" (ID), "1,234,567.89" (EN), "1.234.567", "Rp1.234.567".
 * Sen dipertahankan apa adanya (tanpa pembulatan) agar saldo cocok persis
 * dengan catatan bank.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/rp/i, "").replace(/\s/g, "").replace(/[+-]/g, "");
  if (!/\d/.test(s)) return null;
  s = s.replace(/[^0-9.,]/g, "");
  // Pemisah desimal = tanda [.,] terakhir yang diikuti tepat 2 digit di akhir
  const m = s.match(/^(.*)([.,])(\d{2})$/);
  let integerPart: string;
  let cents = 0;
  if (m && /[.,]/.test(m[1] + m[2])) {
    integerPart = m[1];
    cents = parseInt(m[3], 10);
  } else {
    integerPart = s;
  }
  const intVal = parseInt(integerPart.replace(/[.,]/g, ""), 10);
  if (Number.isNaN(intVal)) return null;
  return Math.round(intVal * 100 + cents) / 100;
}

export function isoDate(year: number, month: number, day: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p(month)}-${p(day)}`;
}

/** Cari tahun periode laporan dari isi dokumen (mis. "PERIODE : JULI 2026"). */
export function detectStatementYear(lines: string[]): number {
  for (const line of lines) {
    const m = line.match(/\b(20\d{2})\b/);
    if (m) return parseInt(m[1], 10);
  }
  return new Date().getFullYear();
}
