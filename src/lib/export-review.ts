import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";

export type ExportFormat = "pdf" | "docx" | "md" | "txt" | "html";

export interface ExportPayload {
  projectTitle: string;
  filename: string;
  language: string;
  code: string;
  review: string; // raw markdown
  includeImprovedCode: boolean;
  score?: number | null;
}

interface ParsedSeverityIssue {
  severity: "High" | "Medium" | "Low" | "Info";
  title: string;
  lines: string[];
}

interface ParsedReview {
  summary: string;
  issues: ParsedSeverityIssue[];
  improvedCode: { lang: string; code: string } | null;
  notes: string;
  score: number | null;
}

// ---------- Markdown parsing ----------

export function parseReview(md: string): ParsedReview {
  const issues: ParsedSeverityIssue[] = [];
  let improvedCode: ParsedReview["improvedCode"] = null;
  let notes = "";
  let summary = "";
  let score: number | null = null;

  // Score
  const scoreMatch = md.match(/score[^0-9]{0,12}(\d{1,3})\s*\/\s*100/i);
  if (scoreMatch) score = Math.min(100, parseInt(scoreMatch[1], 10));

  // Section split by H2
  const sections = md.split(/^## /m);
  for (const raw of sections) {
    const section = raw.trim();
    if (!section) continue;
    const [headerLine, ...rest] = section.split("\n");
    const header = headerLine.trim().toLowerCase();
    const body = rest.join("\n").trim();

    if (header.startsWith("summary")) {
      summary = body;
    } else if (header.startsWith("issues")) {
      issues.push(...parseIssues(body));
    } else if (header.startsWith("improved code")) {
      const m = body.match(/```([\w+-]*)\n([\s\S]*?)```/);
      if (m) improvedCode = { lang: m[1] || "", code: m[2] };
    } else if (header.startsWith("optional notes") || header.startsWith("notes")) {
      notes = body;
    }
  }

  return { summary, issues, improvedCode, notes, score };
}

function parseIssues(body: string): ParsedSeverityIssue[] {
  const out: ParsedSeverityIssue[] = [];
  // Match **[Severity] Title** then bullet lines until next ** or end
  const re = /\*\*\[(High|Medium|Low|Info)\]\s*([^*]+?)\*\*\s*([\s\S]*?)(?=\n\*\*\[(?:High|Medium|Low|Info)\]|\n## |$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const severity = m[1] as ParsedSeverityIssue["severity"];
    const title = m[2].trim();
    const detail = m[3]
      .split("\n")
      .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean);
    out.push({ severity, title, lines: detail });
  }
  return out;
}

// ---------- Filename ----------

export function buildExportFilename(base: string, format: ExportFormat) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const safe = base.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_") || "review";
  return `code-review-${safe}-${stamp}.${format}`;
}

function nowStamp() {
  return new Date().toLocaleString();
}

// ---------- Trigger download ----------

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Markdown ----------

function buildMarkdown(p: ExportPayload, parsed: ParsedReview): string {
  const lines: string[] = [];
  lines.push(`# ${p.projectTitle}`, "");
  lines.push(`- **File:** \`${p.filename}\``);
  lines.push(`- **Language:** ${p.language}`);
  lines.push(`- **Generated:** ${nowStamp()}`);
  if (parsed.score !== null) lines.push(`- **AI Review Score:** ${parsed.score}/100`);
  lines.push("");
  if (parsed.summary) {
    lines.push(`## Summary`, "", parsed.summary, "");
  }
  lines.push(`## Issues Found`, "");
  if (parsed.issues.length === 0) {
    lines.push("- None reported.", "");
  } else {
    for (const i of parsed.issues) {
      lines.push(`### [${i.severity}] ${i.title}`);
      for (const l of i.lines) lines.push(`- ${l}`);
      lines.push("");
    }
  }
  if (p.includeImprovedCode && parsed.improvedCode) {
    lines.push(`## Improved Code`, "", "```" + (parsed.improvedCode.lang || p.language));
    lines.push(parsed.improvedCode.code.replace(/\s+$/, ""));
    lines.push("```", "");
  }
  if (parsed.notes) lines.push(`## Optional Notes`, "", parsed.notes, "");
  lines.push(`## Original Code`, "", "```" + p.language, p.code, "```", "");
  lines.push(`## Technical Documentation`, "");
  lines.push(
    `This report was generated automatically by RefineCode using a large language model. Issues are ranked by severity (High / Medium / Low). Suggested fixes should be reviewed by a human engineer before being applied to production code.`,
    "",
  );
  return lines.join("\n");
}

async function exportMarkdown(p: ExportPayload, parsed: ParsedReview) {
  const md = buildMarkdown(p, parsed);
  download(new Blob([md], { type: "text/markdown;charset=utf-8" }), buildExportFilename(p.filename, "md"));
}

// ---------- TXT ----------

async function exportTxt(p: ExportPayload, parsed: ParsedReview) {
  const lines: string[] = [];
  const hr = "=".repeat(70);
  lines.push(hr, p.projectTitle.toUpperCase(), hr, "");
  lines.push(`File:      ${p.filename}`);
  lines.push(`Language:  ${p.language}`);
  lines.push(`Generated: ${nowStamp()}`);
  if (parsed.score !== null) lines.push(`Score:     ${parsed.score}/100`);
  lines.push("");
  if (parsed.summary) {
    lines.push("SUMMARY", "-".repeat(70), parsed.summary, "");
  }
  lines.push("ISSUES FOUND", "-".repeat(70));
  if (parsed.issues.length === 0) {
    lines.push("None reported.", "");
  } else {
    parsed.issues.forEach((i, idx) => {
      lines.push(`${idx + 1}. [${i.severity.toUpperCase()}] ${i.title}`);
      i.lines.forEach((l) => lines.push(`   - ${l}`));
      lines.push("");
    });
  }
  if (p.includeImprovedCode && parsed.improvedCode) {
    lines.push("IMPROVED CODE", "-".repeat(70), parsed.improvedCode.code, "");
  }
  if (parsed.notes) lines.push("NOTES", "-".repeat(70), parsed.notes, "");
  lines.push("ORIGINAL CODE", "-".repeat(70), p.code, "");
  download(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), buildExportFilename(p.filename, "txt"));
}

// ---------- HTML ----------

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const SEVERITY_COLORS = {
  High: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
  Medium: { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" },
  Low: { bg: "#dbeafe", fg: "#1e40af", border: "#93c5fd" },
  Info: { bg: "#f1f5f9", fg: "#334155", border: "#cbd5e1" },
} as const;

async function exportHtml(p: ExportPayload, parsed: ParsedReview) {
  const issueHtml = parsed.issues
    .map((i) => {
      const c = SEVERITY_COLORS[i.severity];
      return `
      <div class="issue" style="border-left:4px solid ${c.border}">
        <div class="issue-head">
          <span class="badge" style="background:${c.bg};color:${c.fg}">${i.severity}</span>
          <h3>${escapeHtml(i.title)}</h3>
        </div>
        <ul>${i.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
      </div>`;
    })
    .join("");

  const improved =
    p.includeImprovedCode && parsed.improvedCode
      ? `<section><h2>Improved Code</h2><pre><code>${escapeHtml(parsed.improvedCode.code)}</code></pre></section>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(p.projectTitle)} — ${escapeHtml(p.filename)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font: 15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif; color:#0f172a; background:#fafbfc; margin:0; padding:40px 20px; }
  .wrap { max-width: 900px; margin: 0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:40px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -.02em; }
  h2 { font-size: 18px; margin: 32px 0 12px; letter-spacing: -.01em; border-bottom:1px solid #e5e7eb; padding-bottom:8px; }
  h3 { font-size: 15px; margin: 0; font-weight: 600; }
  .meta { color:#64748b; font-size: 13px; margin-bottom: 8px; }
  .meta b { color:#0f172a; font-weight: 500; }
  .score { display:inline-block; background:#3b82f6; color:#fff; padding:6px 14px; border-radius:999px; font-weight:600; font-size:13px; margin-top:8px; }
  .issue { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:14px 16px; margin:10px 0; }
  .issue-head { display:flex; gap:10px; align-items:center; margin-bottom:6px; }
  .badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:.04em; }
  ul { margin: 6px 0 0; padding-left: 18px; }
  pre { background:#0f172a; color:#e2e8f0; padding:16px; border-radius:10px; overflow:auto; font: 13px/1.6 "JetBrains Mono",ui-monospace,monospace; }
  code { font-family: "JetBrains Mono",ui-monospace,monospace; }
  footer { margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; color:#64748b; font-size:12px; text-align:center; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(p.projectTitle)}</h1>
    <div class="meta">
      <div><b>File:</b> ${escapeHtml(p.filename)}</div>
      <div><b>Language:</b> ${escapeHtml(p.language)}</div>
      <div><b>Generated:</b> ${escapeHtml(nowStamp())}</div>
    </div>
    ${parsed.score !== null ? `<div class="score">AI Review Score · ${parsed.score}/100</div>` : ""}

    ${parsed.summary ? `<section><h2>Summary</h2><p>${escapeHtml(parsed.summary)}</p></section>` : ""}

    <section>
      <h2>Issues Found</h2>
      ${parsed.issues.length ? issueHtml : "<p>None reported.</p>"}
    </section>

    ${improved}

    ${parsed.notes ? `<section><h2>Notes</h2><p>${escapeHtml(parsed.notes)}</p></section>` : ""}

    <section><h2>Original Code</h2><pre><code>${escapeHtml(p.code)}</code></pre></section>

    <footer>Generated by RefineCode · AI-generated content should be verified by a human.</footer>
  </div>
</body>
</html>`;
  download(new Blob([html], { type: "text/html;charset=utf-8" }), buildExportFilename(p.filename, "html"));
}

// ---------- PDF ----------

async function exportPdf(p: ExportPayload, parsed: ParsedReview) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const SEVERITY_RGB: Record<string, [number, number, number]> = {
    High: [220, 38, 38],
    Medium: [217, 119, 6],
    Low: [37, 99, 235],
    Info: [100, 116, 139],
  };

  function ensureSpace(needed: number) {
    if (y + needed > H - M - 24) {
      addFooter();
      doc.addPage();
      y = M;
      addHeader();
    }
  }

  function addHeader() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(p.projectTitle, M, 24);
    doc.text(p.filename, W - M, 24, { align: "right" });
    doc.setDrawColor(230);
    doc.line(M, 30, W - M, 30);
    doc.setTextColor(15);
  }

  function addFooter() {
    const page = doc.getCurrentPageInfo().pageNumber;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Page ${page}`, W / 2, H - 20, { align: "center" });
    doc.text("RefineCode", M, H - 20);
    doc.text(nowStamp(), W - M, H - 20, { align: "right" });
    doc.setTextColor(15);
  }

  function writeWrapped(text: string, size: number, opts: { bold?: boolean; color?: [number, number, number]; indent?: number } = {}) {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (opts.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(15);
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(text, W - M * 2 - indent);
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, M + indent, y);
      y += size + 4;
    }
    doc.setTextColor(15);
  }

  function writeBadge(severity: string) {
    const [r, g, b] = SEVERITY_RGB[severity] ?? SEVERITY_RGB.Info;
    const label = severity.toUpperCase();
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const w = doc.getTextWidth(label) + 12;
    ensureSpace(18);
    doc.setFillColor(r, g, b);
    doc.roundedRect(M, y - 10, w, 14, 3, 3, "F");
    doc.setTextColor(255);
    doc.text(label, M + 6, y);
    doc.setTextColor(15);
    return w;
  }

  function writeCodeBlock(code: string) {
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(code, W - M * 2 - 16);
    const lineH = 11;
    let i = 0;
    while (i < lines.length) {
      const remaining = H - M - 30 - y;
      const fit = Math.max(1, Math.floor(remaining / lineH));
      const chunk = lines.slice(i, i + fit);
      const boxH = chunk.length * lineH + 12;
      ensureSpace(boxH);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(M, y - 4, W - M * 2, boxH, 4, 4, "FD");
      doc.setTextColor(15, 23, 42);
      chunk.forEach((l: string, idx: number) => {
        doc.text(l, M + 8, y + 6 + idx * lineH);
      });
      y += boxH + 4;
      i += fit;
    }
    doc.setTextColor(15);
  }

  addHeader();

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(p.projectTitle, M, y + 10);
  y += 32;

  // Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`File: ${p.filename}    Language: ${p.language}    Generated: ${nowStamp()}`, M, y);
  y += 18;
  if (parsed.score !== null) {
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(M, y - 2, 130, 22, 4, 4, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`AI Score  ${parsed.score} / 100`, M + 10, y + 13);
    y += 32;
  } else {
    y += 6;
  }
  doc.setTextColor(15);

  if (parsed.summary) {
    writeWrapped("Summary", 13, { bold: true });
    y += 2;
    writeWrapped(parsed.summary, 10);
    y += 10;
  }

  writeWrapped("Issues Found", 13, { bold: true });
  y += 4;
  if (parsed.issues.length === 0) {
    writeWrapped("No issues reported.", 10);
  } else {
    for (const issue of parsed.issues) {
      ensureSpace(40);
      const badgeW = writeBadge(issue.severity);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(issue.title, W - M * 2 - badgeW - 10);
      doc.text(titleLines[0], M + badgeW + 6, y);
      y += 14;
      if (titleLines.length > 1) {
        for (let k = 1; k < titleLines.length; k++) {
          ensureSpace(14);
          doc.text(titleLines[k], M, y);
          y += 14;
        }
      }
      for (const l of issue.lines) {
        writeWrapped(`• ${l}`, 10, { indent: 12 });
      }
      y += 8;
    }
  }

  if (p.includeImprovedCode && parsed.improvedCode) {
    y += 6;
    writeWrapped("Improved Code", 13, { bold: true });
    y += 4;
    writeCodeBlock(parsed.improvedCode.code);
  }

  if (parsed.notes) {
    y += 6;
    writeWrapped("Notes", 13, { bold: true });
    y += 2;
    writeWrapped(parsed.notes, 10);
  }

  y += 10;
  writeWrapped("Original Code", 13, { bold: true });
  y += 4;
  writeCodeBlock(p.code);

  addFooter();
  const blob = doc.output("blob");
  download(blob, buildExportFilename(p.filename, "pdf"));
}

// ---------- DOCX ----------

async function exportDocx(p: ExportPayload, parsed: ParsedReview) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: p.projectTitle, bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `File: `, bold: true }),
        new TextRun(p.filename),
        new TextRun({ text: `    Language: `, bold: true }),
        new TextRun(p.language),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generated: `, bold: true }),
        new TextRun(nowStamp()),
      ],
    }),
  );

  if (parsed.score !== null) {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({ text: `AI Review Score: `, bold: true }),
          new TextRun({ text: `${parsed.score} / 100`, bold: true, color: "3B82F6" }),
        ],
      }),
    );
  }

  if (parsed.summary) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Summary" }),
      new Paragraph({ children: [new TextRun(parsed.summary)] }),
    );
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Issues Found" }));
  if (parsed.issues.length === 0) {
    children.push(new Paragraph({ children: [new TextRun("None reported.")] }));
  } else {
    const sevColor: Record<string, string> = {
      High: "DC2626",
      Medium: "D97706",
      Low: "2563EB",
      Info: "64748B",
    };
    for (const i of parsed.issues) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: `[${i.severity}] `,
              bold: true,
              color: sevColor[i.severity] ?? "000000",
            }),
            new TextRun({ text: i.title, bold: true }),
          ],
        }),
      );
      for (const l of i.lines) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun(l)],
          }),
        );
      }
    }
  }

  function codeParagraphs(code: string) {
    return code.split("\n").map(
      (line) =>
        new Paragraph({
          spacing: { before: 0, after: 0 },
          shading: { fill: "F1F5F9", type: ShadingType.CLEAR, color: "auto" },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: "3B82F6", space: 6 },
          },
          children: [new TextRun({ text: line || " ", font: "Consolas", size: 18 })],
        }),
    );
  }

  if (p.includeImprovedCode && parsed.improvedCode) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Improved Code" }));
    children.push(...codeParagraphs(parsed.improvedCode.code));
  }

  if (parsed.notes) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Notes" }),
      new Paragraph({ children: [new TextRun(parsed.notes)] }),
    );
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Original Code" }));
  children.push(...codeParagraphs(p.code));

  children.push(
    new Paragraph({
      spacing: { before: 240 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Generated by RefineCode · AI-generated content should be verified by a human.",
          italics: true,
          color: "64748B",
          size: 18,
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: "RefineCode",
    title: p.projectTitle,
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  download(blob, buildExportFilename(p.filename, "docx"));
}

// ---------- Public ----------

export async function exportReview(format: ExportFormat, payload: ExportPayload) {
  const parsed = parseReview(payload.review);
  if (payload.score != null && parsed.score == null) parsed.score = payload.score;

  switch (format) {
    case "md":
      return exportMarkdown(payload, parsed);
    case "txt":
      return exportTxt(payload, parsed);
    case "html":
      return exportHtml(payload, parsed);
    case "pdf":
      return exportPdf(payload, parsed);
    case "docx":
      return exportDocx(payload, parsed);
  }
}

