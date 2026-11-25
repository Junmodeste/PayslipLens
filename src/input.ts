// Turns a user file into something Gemini Nano can read, entirely in the browser.
// Nano accepts text and JPEG/PNG images, but not PDF: text PDFs are converted
// to text, scanned PDFs are rendered to PNG.
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PayslipInput =
  | { kind: "text"; text: string; pages: number }
  | { kind: "image"; mimeType: "image/png" | "image/jpeg"; base64: string };

const MAX_BYTES = 5 * 1024 * 1024;
// Below this many characters per page we treat the PDF as a scan.
const MIN_TEXT_PER_PAGE = 40;

export async function readPayslip(file: File): Promise<PayslipInput> {
  if (file.size > MAX_BYTES) throw new Error("File is larger than 5 MB.");
  if (file.type === "image/png" || file.type === "image/jpeg") {
    return { kind: "image", mimeType: file.type, base64: await toBase64(file) };
  }
  if (file.type !== "application/pdf") throw new Error("Use a PDF, PNG or JPEG file.");

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      pages.push(await pageText(await pdf.getPage(i)));
    }
    const text = pages.join("\n\n").trim();
    if (text.length >= MIN_TEXT_PER_PAGE * pdf.numPages) {
      return { kind: "text", text, pages: pdf.numPages };
    }
    // Scanned payslip: render the first page as an image.
    return { kind: "image", mimeType: "image/png", base64: await renderPage(await pdf.getPage(1)) };
  } finally {
    await task.destroy();
  }
}

type Cell = { x: number; str: string };

const isNumeric = (s: string) => /^[\d\s.,%-]+$/.test(s);

// Rebuilds the payslip table. Cells on the same baseline form a row; once the
// header row ("Rubrique | Base | Taux | Gain | Retenue | ...") is found, every
// value is tagged with its column name, because empty cells would otherwise
// make the employee and employer amounts impossible to tell apart.
async function pageText(page: pdfjs.PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  const byY = new Map<number, Cell[]>();
  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue;
    const y = Math.round(item.transform[5] / 3) * 3; // tolerate small baseline jitter
    byY.set(y, [...(byY.get(y) ?? []), { x: item.transform[4], str: item.str.trim() }]);
  }
  const rows = [...byY.entries()]
    .sort(([a], [b]) => b - a) // PDF y axis goes up
    .map(([, cells]) => cells.sort((a, b) => a.x - b.x));

  let header: Cell[] | undefined;
  return rows
    .map((cells) => {
      if (!header && cells.length >= 4 && cells.every((c) => !isNumeric(c.str))) {
        header = cells;
        return cells.map((c) => c.str).join(" | ");
      }
      return header ? labelRow(cells, header) : cells.map((c) => c.str).join(" | ");
    })
    .join("\n");
}

function labelRow(cells: Cell[], header: Cell[]): string {
  const TOLERANCE = 4;
  const label: string[] = [];
  const values: string[] = [];
  for (const cell of cells) {
    let col = 0;
    header.forEach((h, i) => {
      if (cell.x >= h.x - TOLERANCE) col = i;
    });
    if (col === 0) label.push(cell.str);
    else values.push(`${header[col].str}: ${cell.str}`);
  }
  return [label.join(" "), ...values].join(" | ");
}

async function renderPage(page: pdfjs.PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return canvas.toDataURL("image/png").split(",")[1];
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
