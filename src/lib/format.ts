const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * Format Rupiah gaya Indonesia: Rp8.450.000 (pemisah ribuan titik).
 * Sen ditampilkan hanya bila ada, dengan koma desimal: Rp1.978.190,60.
 */
export function formatRupiah(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  // Bersihkan debu floating-point lalu pisahkan rupiah & sen
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  const suffix = fraction > 0 ? `,${String(fraction).padStart(2, "0")}` : "";
  return `${sign}Rp${withThousands(whole)}${suffix}`;
}

/** Format dengan tanda eksplisit: +Rp5.000.000 / -Rp45.000 / +Rp0,98 */
export function formatSignedRupiah(amount: number): string {
  const prefix = amount >= 0 ? "+" : "-";
  return `${prefix}${formatRupiah(Math.abs(amount))}`;
}

function withThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Gram emas: 12,5 g (koma desimal Indonesia). Simpan nilai asli tanpa pembulatan. */
export function formatGrams(grams: number, withUnit = true): string {
  const s = String(grams).replace(".", ",");
  return withUnit ? `${s} g` : s;
}

export function formatSignedGrams(grams: number): string {
  const prefix = grams >= 0 ? "+" : "-";
  return `${prefix}${formatGrams(Math.abs(grams))}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** "11 Jul" */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "8 Jul 2026" */
export function formatMediumDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Label grup harian: "Hari ini · 11 Jul", "Kemarin · 10 Jul", "Rabu · 8 Jul" */
export function formatDayLabel(iso: string, today: Date = new Date()): string {
  const d = parseISODate(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(today) - startOfDay(d)) / 86400000);
  const short = formatShortDate(iso);
  if (diffDays === 0) return `Hari ini · ${short}`;
  if (diffDays === 1) return `Kemarin · ${short}`;
  return `${WEEKDAYS[d.getDay()]} · ${short}`;
}

/** "Juli 2026" */
export function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-07" dari ISO date */
export function toYearMonth(iso: string): string {
  return iso.slice(0, 7);
}

/** Bulan ini dalam format YYYY-MM (lokal). */
export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthShortLabel(yearMonth: string): string {
  const [, m] = yearMonth.split("-").map(Number);
  return MONTHS_SHORT[m - 1];
}

/** Format ringkas untuk ruang sempit (mis. sel kalender): 8,5jt / 150rb / 500. */
export function formatCompactRupiah(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const val = Math.round((abs / 1_000_000) * 10) / 10;
    return `${sign}${String(val).replace(".", ",")}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1000)}rb`;
  }
  return `${sign}${abs}`;
}
