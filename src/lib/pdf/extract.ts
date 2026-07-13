/**
 * Ekstraksi teks PDF dengan pdfjs-dist, diproses sepenuhnya di perangkat.
 *
 * pdfjs membutuhkan API DOM (DOMMatrix, worker) sehingga hanya andal di web.
 * Di Android/iOS ekstraksi tetap dicoba, dan kegagalan ditangani sebagai
 * error yang ramah di layar impor.
 */

export interface ExtractedPdf {
  lines: string[];
  pageCount: number;
}

/** PDF terkunci: butuh password, atau password yang diberikan salah. */
export class PdfPasswordError extends Error {
  constructor(public readonly wrongPassword: boolean) {
    super(wrongPassword ? "Password PDF salah" : "PDF membutuhkan password");
    this.name = "PdfPasswordError";
  }
}

export async function extractPdfLines(uri: string, password?: string): Promise<ExtractedPdf> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof pdfjs.GlobalWorkerOptions !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const res = await fetch(uri);
  const data = await res.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data, password });
  let doc: Awaited<typeof loadingTask.promise>;
  try {
    doc = await loadingTask.promise;
  } catch (e) {
    if ((e as Error)?.name === "PasswordException") {
      throw new PdfPasswordError(!!password);
    }
    throw e;
  }

  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // Rekonstruksi baris: kelompokkan item teks berdasarkan posisi Y,
    // lalu urutkan per baris berdasarkan X.
    const rows = new Map<number, Array<{ x: number; str: string }>>();
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const x = item.transform[4];
      const row = rows.get(y) ?? [];
      row.push({ x, str: item.str });
      rows.set(y, row);
    }
    const sortedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, items] of sortedRows) {
      const line = items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (line) lines.push(line);
    }
  }
  const pageCount = doc.numPages;
  await loadingTask.destroy();
  return { lines, pageCount };
}
