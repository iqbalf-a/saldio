import { monthFromToken, parseAmount, isoDate, detectStatementYear } from "../parseCommon";

/* ── monthFromToken ── */
describe("monthFromToken", () => {
  const cases: [string, number | null][] = [
    ["Jan", 1], ["feb", 2], ["MAR", 3], ["apr", 4],
    ["mei", 5], ["jun", 6], ["jul", 7], ["agu", 8],
    ["agt", 8], ["sep", 9], ["okt", 10], ["nov", 11],
    ["des", 12],
    // English aliases
    ["may", 5], ["aug", 8], ["oct", 10], ["dec", 12],
    // Invalid
    ["xyz", null], ["123", null], ["", null],
  ];

  it.each(cases)("monthFromToken('%s') => %s", (token, expected) => {
    expect(monthFromToken(token)).toBe(expected);
  });
});

/* ── parseAmount ── */
describe("parseAmount", () => {
  it("parses Indonesian format with dot thousands + comma decimal", () => {
    expect(parseAmount("1.234.567,89")).toBe(1234567.89);
  });

  it("parses English format with comma thousands + dot decimal", () => {
    expect(parseAmount("1,234,567.89")).toBe(1234567.89);
  });

  it("parses dot-only thousands (no sen)", () => {
    expect(parseAmount("6.279.339")).toBe(6279339);
  });

  it("strips Rp prefix", () => {
    expect(parseAmount("Rp1.234.567,89")).toBe(1234567.89);
  });

  it("strips +/- signs", () => {
    expect(parseAmount("-50.000")).toBe(50000);
    expect(parseAmount("+100.000")).toBe(100000);
  });

  it("returns null for non-numeric input", () => {
    expect(parseAmount("N/A")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("---")).toBeNull();
  });

  it("parses plain integer", () => {
    expect(parseAmount("50000")).toBe(50000);
  });

  it("handles edge case: Rp0,00", () => {
    expect(parseAmount("Rp0,00")).toBe(0);
  });
});

/* ── isoDate ── */
describe("isoDate", () => {
  it("returns YYYY-MM-DD padded", () => {
    expect(isoDate(2026, 7, 11)).toBe("2026-07-11");
    expect(isoDate(2025, 1, 5)).toBe("2025-01-05");
    expect(isoDate(2024, 12, 31)).toBe("2024-12-31");
  });
});

/* ── detectStatementYear ── */
describe("detectStatementYear", () => {
  it("extracts year from PERIODE header", () => {
    const lines = ["PERIODE : AGUSTUS 2025", "SALDO AWAL ..."];
    expect(detectStatementYear(lines)).toBe(2025);
  });

  it("extracts any 4-digit year from lines", () => {
    const lines = ["Rekening: 1234567890", "Tanggal cetak: 2026-01-05"];
    expect(detectStatementYear(lines)).toBe(2026);
  });

  it("returns current year if none found", () => {
    const lines = ["Tidak ada tahun di sini"];
    expect(detectStatementYear(lines)).toBe(new Date().getFullYear());
  });
});
