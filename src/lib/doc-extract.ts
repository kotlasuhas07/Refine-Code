// Client-side text extraction from uploaded documents (DOCX, PDF, plain text).
// Returns plain text with line breaks preserved.

export type ExtractResult = {
  text: string;
  kind: "text" | "docx" | "pdf";
};

const TEXT_EXTS = new Set([
  ".txt", ".md", ".markdown",
  ".js", ".jsx", ".mjs", ".ts", ".tsx",
  ".py", ".java", ".cpp", ".cc", ".cxx", ".hpp", ".h", ".c",
  ".go", ".rs", ".rb", ".php", ".cs", ".sql",
  ".swift", ".kt", ".kts",
  ".html", ".htm", ".css", ".scss", ".sass",
  ".json", ".xml",
]);

function extOf(name: string): string {
  const lower = name.toLowerCase();
  const i = lower.lastIndexOf(".");
  return i >= 0 ? lower.slice(i) : "";
}

async function extractDocx(file: File): Promise<string> {
  // @ts-expect-error - no types for browser bundle
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value ?? "";
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Use a workerless setup: import the worker as a module URL.
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct rough line breaks from item.transform y-coords
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = item.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
        lines.push(line);
        line = "";
      }
      line += item.str;
      if (y !== undefined) lastY = y;
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }
  return pages.join("\n\n");
}

// If the extracted text contains fenced code blocks, prefer those.
// Returns concatenated code, otherwise the original text.
export function extractCodeBlocks(text: string): { code: string; hadFences: boolean } {
  const fence = /```(?:[a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) blocks.push(m[1]);
  if (blocks.length > 0) return { code: blocks.join("\n\n"), hadFences: true };
  return { code: text, hadFences: false };
}

export async function extractFromFile(file: File): Promise<ExtractResult> {
  const ext = extOf(file.name);

  if (ext === ".docx") {
    const text = await extractDocx(file);
    if (!text.trim()) throw new Error("No readable text found in the document.");
    return { text, kind: "docx" };
  }
  if (ext === ".doc") {
    throw new Error(
      "Legacy .doc files can't be parsed in the browser. Save as .docx (or copy the text) and try again.",
    );
  }
  if (ext === ".pdf") {
    const text = await extractPdf(file);
    if (!text.trim()) throw new Error("No selectable text found in the PDF (it may be a scanned image).");
    return { text, kind: "pdf" };
  }
  if (TEXT_EXTS.has(ext)) {
    const text = await file.text();
    if (text.slice(0, 4096).includes("\u0000")) {
      throw new Error("File appears to be binary or corrupted.");
    }
    return { text, kind: "text" };
  }
  throw new Error(`Unsupported file type "${ext || file.name}".`);
}
