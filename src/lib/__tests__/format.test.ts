import {
  formatRupiah,
  formatSignedRupiah,
  formatGrams,
  formatSignedGrams,
  parseISODate,
  toISODate,
  formatShortDate,
  formatMediumDate,
  formatDayLabel,
  formatMonthLabel,
  toYearMonth,
  monthShortLabel,
} from "../format";

/* ── formatRupiah ── */
describe("formatRupiah", () => {
  it("formats zero", () => {
    expect(formatRupiah(0)).toBe("Rp0");
  });

  it("formats whole numbers with dot thousands separator", () => {
    expect(formatRupiah(5000)).toBe("Rp5.000");
    expect(formatRupiah(100000)).toBe("Rp100.000");
    expect(formatRupiah(8450000)).toBe("Rp8.450.000");
  });

  it("formats decimals with comma (sen)", () => {
    expect(formatRupiah(1978190.6)).toBe("Rp1.978.190,60");
    expect(formatRupiah(0.98)).toBe("Rp0,98");
    expect(formatRupiah(1000.5)).toBe("Rp1.000,50");
  });

  it("handles negative values", () => {
    expect(formatRupiah(-50000)).toBe("-Rp50.000");
    expect(formatRupiah(-123.45)).toBe("-Rp123,45");
  });

  it("rounds floating-point dust", () => {
    // 0.1 + 0.2 = 0.30000000000000004, should still show Rp0,30
    expect(formatRupiah(0.1 + 0.2)).toBe("Rp0,30");
  });
});

/* ── formatSignedRupiah ── */
describe("formatSignedRupiah", () => {
  it("adds + prefix for positive", () => {
    expect(formatSignedRupiah(5000000)).toBe("+Rp5.000.000");
  });

  it("adds - prefix for negative", () => {
    expect(formatSignedRupiah(-45000)).toBe("-Rp45.000");
  });

  it("shows +Rp0 for zero", () => {
    expect(formatSignedRupiah(0)).toBe("+Rp0");
  });

  it("shows sen when present", () => {
    expect(formatSignedRupiah(0.98)).toBe("+Rp0,98");
    expect(formatSignedRupiah(-3500.75)).toBe("-Rp3.500,75");
  });
});

/* ── formatGrams ── */
describe("formatGrams", () => {
  it("formats with unit", () => {
    expect(formatGrams(12.5)).toBe("12,5 g");
    expect(formatGrams(0.5)).toBe("0,5 g");
  });

  it("formats without unit", () => {
    expect(formatGrams(12.5, false)).toBe("12,5");
  });
});

describe("formatSignedGrams", () => {
  it("adds + prefix", () => {
    expect(formatSignedGrams(2.5)).toBe("+2,5 g");
  });

  it("adds - prefix", () => {
    expect(formatSignedGrams(-1.0)).toBe("-1 g");
  });
});

/* ── parseISODate / toISODate ── */
describe("parseISODate", () => {
  it("parses YYYY-MM-DD to Date", () => {
    const d = parseISODate("2026-07-11");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July = 6
    expect(d.getDate()).toBe(11);
  });
});

describe("toISODate", () => {
  it("formats Date to YYYY-MM-DD", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toISODate(new Date(2025, 11, 31))).toBe("2025-12-31");
  });

  it("pads single digits", () => {
    expect(toISODate(new Date(2026, 2, 1))).toBe("2026-03-01");
  });
});

/* ── formatShortDate / formatMediumDate ── */
describe("formatShortDate", () => {
  it("returns '11 Jul'", () => {
    expect(formatShortDate("2026-07-11")).toBe("11 Jul");
  });

  it("returns '5 Jan'", () => {
    expect(formatShortDate("2026-01-05")).toBe("5 Jan");
  });
});

describe("formatMediumDate", () => {
  it("returns '11 Jul 2026'", () => {
    expect(formatMediumDate("2026-07-11")).toBe("11 Jul 2026");
  });
});

/* ── formatDayLabel ── */
describe("formatDayLabel", () => {
  it("returns 'Hari ini' for today", () => {
    const today = new Date(2026, 6, 11);
    expect(formatDayLabel("2026-07-11", today)).toBe("Hari ini · 11 Jul");
  });

  it("returns 'Kemarin' for yesterday", () => {
    const today = new Date(2026, 6, 11);
    expect(formatDayLabel("2026-07-10", today)).toBe("Kemarin · 10 Jul");
  });

  it("returns weekday name for older dates", () => {
    const today = new Date(2026, 6, 11); // Friday
    // 2026-07-08 = Wednesday
    expect(formatDayLabel("2026-07-08", today)).toBe("Rabu · 8 Jul");
  });
});

/* ── formatMonthLabel ── */
describe("formatMonthLabel", () => {
  it("returns 'Juli 2026' for '2026-07'", () => {
    expect(formatMonthLabel("2026-07")).toBe("Juli 2026");
  });

  it("returns 'Januari 2025' for '2025-01'", () => {
    expect(formatMonthLabel("2025-01")).toBe("Januari 2025");
  });

  it("returns 'Desember 2024' for '2024-12'", () => {
    expect(formatMonthLabel("2024-12")).toBe("Desember 2024");
  });
});

/* ── toYearMonth ── */
describe("toYearMonth", () => {
  it("extracts 'YYYY-MM' from ISO date", () => {
    expect(toYearMonth("2026-07-11")).toBe("2026-07");
    expect(toYearMonth("2025-01-05")).toBe("2025-01");
  });
});

/* ── monthShortLabel ── */
describe("monthShortLabel", () => {
  it("returns short month from YYYY-MM", () => {
    expect(monthShortLabel("2026-07")).toBe("Jul");
    expect(monthShortLabel("2026-01")).toBe("Jan");
    expect(monthShortLabel("2026-12")).toBe("Des");
  });
});
