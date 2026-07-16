import { parseBca, parseMandiri, parseBankJago, parseNeoBank, parseSuperBank, parseStatement, PARSER_LABELS } from "../parsers";

/* ── parseBca ── */
describe("parseBca", () => {
  it("parses a simple debit row", () => {
    const lines = [
      "PERIODE : AGUSTUS 2025",
      "25/08 TRSF E-BANKING DB 2508/FTFVA/WS95031 53,200.00 DB 6,279,339.44",
    ];
    const tx = parseBca(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2025-08-25",
      description: "TRSF E-BANKING DB 2508/FTFVA/WS95031",
      amount: 53200,
      direction: "out",
    }));
  });

  it("parses credit row (no DB marker)", () => {
    const lines = [
      "PERIODE : JULI 2026",
      "10/07 TRANSFER MASUK 1234567890 1,000,000.00 15,000,000.00",
    ];
    const tx = parseBca(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2026-07-10",
      amount: 1000000,
      direction: "in",
    }));
  });

  it("appends counterparty name from continuation line", () => {
    const lines = [
      "PERIODE : JULI 2026",
      "10/07 TRSF E-BANKING DB 2508/FTFVA/WS95031 75,000.00 DB 14,925,000.00",
      "TOKOPEDIA",
    ];
    const tx = parseBca(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0].description).toContain("TOKOPEDIA");
  });

  it("skips SALDO lines", () => {
    const lines = [
      "PERIODE : JULI 2026",
      "SALDO AWAL",
      "10/07 TRSF E-BANKING DB 2508/FTFVA/WS95031 75,000.00 DB 14,925,000.00",
    ];
    const tx = parseBca(lines);
    expect(tx).toHaveLength(1);
  });

  it("returns empty for no matching rows", () => {
    const lines = ["PERIODE : JULI 2026", "Tidak ada transaksi"];
    expect(parseBca(lines)).toEqual([]);
  });
});

/* ── parseMandiri ── */
describe("parseMandiri", () => {
  it("parses a standard debit row with date + amount", () => {
    const lines = [
      "e-Statement",
      "10 Jul 2026",
      "6 ke jagocoffee.com/ -10.000,00 17.594.645,00",
    ];
    const tx = parseMandiri(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2026-07-10",
      amount: 10000,
      direction: "out",
    }));
  });

  it("parses credit (positive amount)", () => {
    const lines = [
      "e-Statement",
      "10 Jul 2026",
      "6 dari TOKOPEDIA +500.000,00 18.094.645,00",
    ];
    const tx = parseMandiri(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2026-07-10",
      amount: 500000,
      direction: "in",
    }));
  });

  it("skips header/footer lines", () => {
    const lines = [
      "e-Statement Livin'",
      "Nama/  USER",
      "Tabungan",
      "Saldo Awal",
    ];
    expect(parseMandiri(lines)).toEqual([]);
  });
});

/* ── parseBankJago ── */
describe("parseBankJago", () => {
  it("parses standard Jago line", () => {
    const lines = [
      "27 Jan 2026 USAHA DAGANG QRIS Payment -3.000 13.735,95",
    ];
    const tx = parseBankJago(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2026-01-27",
      description: "USAHA DAGANG QRIS Payment",
      amount: 3000,
      direction: "out",
    }));
  });

  it("parses positive (credit) line", () => {
    const lines = [
      "01 Feb 2026 Transfer dari Andi +1.500.000 15.235.900,00",
    ];
    const tx = parseBankJago(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2026-02-01",
      amount: 1500000,
      direction: "in",
    }));
  });

  it("ignores non-matching lines", () => {
    const lines = ["27 Jan 2026", "just some time info"];
    expect(parseBankJago(lines)).toEqual([]);
  });
});

/* ── parseNeoBank ── */
describe("parseNeoBank", () => {
  it("parses transactions within Now Savings section", () => {
    const lines = [
      "Now Savings",
      "04/01/2026 QRIS (PAYMENT) -6.397,00 1.980.943,93",
      "05/01/2026 Top Up 100.000,00 2.080.943,93",
      "Total Credit 100.000,00",
      "Neo Wish",
    ];
    const tx = parseNeoBank(lines);
    expect(tx).toHaveLength(2);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2026-01-04",
      description: "QRIS (PAYMENT)",
      amount: 6397,
      direction: "out",
    }));
    expect(tx[1]).toEqual(expect.objectContaining({
      date: "2026-01-05",
      amount: 100000,
      direction: "in",
    }));
  });

  it("skips Opening Balance lines", () => {
    const lines = [
      "Now Savings",
      "01/01/2026 Opening Balance 0 1.000.000,00",
      "02/01/2026 QRIS (PAYMENT) -5.000,00 995.000,00",
      "Total Credit 0",
    ];
    const tx = parseNeoBank(lines);
    expect(tx).toHaveLength(1);
    expect(tx[0].description).toBe("QRIS (PAYMENT)");
  });

  it("captures nothing outside Now Savings", () => {
    const lines = [
      "Neo Wish",
      "04/01/2026 QRIS (PAYMENT) -6.397,00 1.980.943,93",
    ];
    expect(parseNeoBank(lines)).toEqual([]);
  });
});

/* ── parseSuperBank ── */
describe("parseSuperBank", () => {
  it("parses paired amount + description lines", () => {
    const lines = [
      "Tabungan Utama - 12345",
      "-Rp50.000,00 Rp1.967.216,71",
      "1 Jan Pengisian Celengan",
      "+Rp1.000.000,00 Rp2.967.216,71",
      "3 Jan Gajian",
      "Saku",
    ];
    const tx = parseSuperBank(lines);
    expect(tx).toHaveLength(2);
    expect(tx[0]).toEqual(expect.objectContaining({
      date: "2026-01-01",
      description: "Pengisian Celengan",
      amount: 50000,
      direction: "out",
    }));
    expect(tx[1]).toEqual(expect.objectContaining({
      date: "2026-01-03",
      description: "Gajian",
      amount: 1000000,
      direction: "in",
    }));
  });

  it("captures nothing outside Tabungan Utama", () => {
    const lines = [
      "Saku - 67890",
      "+Rp10.000,00 Rp10.000,00",
      "1 Jan Top Up",
    ];
    expect(parseSuperBank(lines)).toEqual([]);
  });

  it("skips artifact year-only description lines", () => {
    const lines = [
      "Tabungan Utama - 12345",
      "+Rp500.000,00 Rp500.000,00",
      "1 Mar 2026",
    ];
    expect(parseSuperBank(lines)).toEqual([]);
  });
});

/* ── parseStatement router ── */
describe("parseStatement", () => {
  it("routes to correct parser by template key", () => {
    const bcaLines = [
      "PERIODE : JULI 2026",
      "10/07 TRSF E-BANKING DB 2508/FTFVA/WS95031 75,000.00 DB 14,925,000.00",
    ];
    const tx = parseStatement("bca", bcaLines);
    expect(tx).toHaveLength(1);
    expect(tx[0].direction).toBe("out");
  });

  it("returns empty for unknown template", () => {
    expect(parseStatement("unknown" as any, ["line"])).toEqual([]);
  });
});

/* ── PARSER_LABELS ── */
describe("PARSER_LABELS", () => {
  it("has labels for all supported banks", () => {
    expect(PARSER_LABELS.bca).toBe("BCA");
    expect(PARSER_LABELS.mandiri).toBe("Mandiri");
    expect(PARSER_LABELS.bank_jago).toBe("Bank Jago");
    expect(PARSER_LABELS.neo_bank).toBe("Neo Bank");
    expect(PARSER_LABELS.super_bank).toBe("Super Bank");
  });
});
