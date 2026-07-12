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
 * BCA: baris diawali tanggal DD/MM (tahun dari header "PERIODE"),
 * nominal gaya 1,234,567.89, penanda "DB" = keluar, "CR" = masuk.
 * Contoh: "05/07 TRSF E-BANKING DB 0507/FTSCY/WS95051 56,500.00 DB"
 */
export function parseBca(lines: string[]): ParsedTransaction[] {
  const year = detectStatementYear(lines);
  const out: ParsedTransaction[] = [];
  for (const line of lines) {
    const m = line.match(/^(\d{2})\/(\d{2})\s+(.*)$/);
    if (!m) continue;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;
    const rest = m[3];
    const amountMatch = rest.match(/([\d.,]+\.\d{2}|[\d.,]{4,})\s*(DB|CR)?\s*$/i);
    if (!amountMatch) continue;
    const amount = parseAmount(amountMatch[1]);
    if (!amount) continue;
    const marker = (amountMatch[2] ?? "").toUpperCase();
    const description = rest.slice(0, amountMatch.index).trim().replace(/\s{2,}/g, " ");
    if (!description || /^SALDO/i.test(description)) continue;
    const direction: "in" | "out" =
      marker === "DB" || /\bDB\b/.test(description) ? "out" : "in";
    out.push({
      date: isoDate(year, month, day),
      description,
      amount,
      direction,
      category: guessCategory(description),
    });
  }
  return out;
}

/**
 * Mandiri: baris diawali "DD Mmm YYYY" atau DD/MM/YYYY,
 * nominal gaya 1.234.567,89 dengan akhiran "D"/"K" (debet/kredit),
 * atau bertanda +/-.
 */
export function parseMandiri(lines: string[]): ParsedTransaction[] {
  const out: ParsedTransaction[] = [];
  for (const line of lines) {
    let day: number, month: number | null, year: number, rest: string;
    let m = line.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\s+(.*)$/);
    if (m) {
      day = parseInt(m[1], 10);
      month = monthFromToken(m[2]);
      year = parseInt(m[3], 10);
      rest = m[4];
    } else {
      m = line.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(.*)$/);
      if (!m) continue;
      day = parseInt(m[1], 10);
      month = parseInt(m[2], 10);
      year = parseInt(m[3], 10);
      rest = m[4];
    }
    if (!month || day < 1 || day > 31) continue;
    const amountMatch = rest.match(/([+-]?\s*(?:Rp)?[\d.,]{4,})\s*(D|K|DB|CR)?\s*$/i);
    if (!amountMatch) continue;
    const amount = parseAmount(amountMatch[1]);
    if (!amount) continue;
    const marker = (amountMatch[2] ?? "").toUpperCase();
    const negative = /-/.test(amountMatch[1]);
    const description = rest.slice(0, amountMatch.index).trim().replace(/\s{2,}/g, " ");
    if (!description || /^SALDO/i.test(description)) continue;
    const direction: "in" | "out" =
      marker === "D" || marker === "DB" || negative ? "out" : "in";
    out.push({
      date: isoDate(year, month, day),
      description,
      amount,
      direction,
      category: guessCategory(description),
    });
  }
  return out;
}

/**
 * Bank Jago: baris diawali "DD Mmm YYYY" (atau tanpa tahun),
 * nominal bertanda eksplisit "+Rp50.000" / "-Rp50.000".
 * Contoh: "05 Jul 2026 QR 014 KOPI TUKU -Rp24.000"
 */
export function parseBankJago(lines: string[]): ParsedTransaction[] {
  const fallbackYear = detectStatementYear(lines);
  const out: ParsedTransaction[] = [];
  for (const line of lines) {
    const m = line.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s*(\d{4})?\s+(.*)$/);
    if (!m) continue;
    const day = parseInt(m[1], 10);
    const month = monthFromToken(m[2]);
    const year = m[3] ? parseInt(m[3], 10) : fallbackYear;
    if (!month || day < 1 || day > 31) continue;
    const rest = m[4];
    const amountMatch = rest.match(/([+-])\s*(?:Rp)?\s*([\d.,]+)\s*$/i);
    if (!amountMatch) continue;
    const amount = parseAmount(amountMatch[2]);
    if (!amount) continue;
    const description = rest.slice(0, amountMatch.index).trim().replace(/\s{2,}/g, " ");
    if (!description || /^SALDO/i.test(description)) continue;
    out.push({
      date: isoDate(year, month, day),
      description,
      amount,
      direction: amountMatch[1] === "+" ? "in" : "out",
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
