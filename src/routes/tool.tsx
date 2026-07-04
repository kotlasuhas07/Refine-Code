import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { diffLines } from "diff";
import {
  Code2,
  Sparkles,
  Upload,
  FileCode,
  Loader2,
  Download,
  Copy,
  Trash2,
  ShieldCheck,
  Zap,
  Eye,
  AlertTriangle,
  ChevronDown,
  FileText,
  FileType2,
  FileCode2,
  Globe2,
  FileDown,
  Check,
} from "lucide-react";
import { exportReview, type ExportFormat } from "@/lib/export-review";
import { NovaPopup, NOVA_ACTION_PROMPTS, type NovaAction } from "@/components/nova/NovaPopup";
import { NovaChat, type ChatMessage } from "@/components/nova/NovaChat";
import { CodeBlock } from "@/components/CodeBlock";

export const Route = createFileRoute("/tool")({
  head: () => ({
    meta: [
      { title: "RefineCode — AI-powered code review & analysis" },
      {
        name: "description",
        content:
          "Paste or upload code in Python, JavaScript, Java, C++ and more. RefineCode delivers instant AI-powered reviews covering bugs, security, performance, and readability.",
      },
      { property: "og:title", content: "RefineCode" },
      {
        property: "og:description",
        content: "RefineCode provides instant AI code review covering bugs, security, and performance.",
      },
    ],
  }),
  component: Home,
});

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", ext: [".js", ".jsx", ".mjs"] },
  { id: "typescript", label: "TypeScript", ext: [".ts", ".tsx"] },
  { id: "python", label: "Python", ext: [".py"] },
  { id: "java", label: "Java", ext: [".java"] },
  { id: "cpp", label: "C++", ext: [".cpp", ".cc", ".cxx", ".hpp", ".h"] },
  { id: "c", label: "C", ext: [".c"] },
  { id: "go", label: "Go", ext: [".go"] },
  { id: "rust", label: "Rust", ext: [".rs"] },
  { id: "ruby", label: "Ruby", ext: [".rb"] },
  { id: "php", label: "PHP", ext: [".php"] },
  { id: "csharp", label: "C#", ext: [".cs"] },
  { id: "sql", label: "SQL", ext: [".sql"] },
  { id: "swift", label: "Swift", ext: [".swift"] },
  { id: "kotlin", label: "Kotlin", ext: [".kt", ".kts"] },
  { id: "html", label: "HTML", ext: [".html", ".htm"] },
  { id: "css", label: "CSS", ext: [".css", ".scss", ".sass"] },
  { id: "json", label: "JSON", ext: [".json"] },
  { id: "xml", label: "XML", ext: [".xml"] },
  { id: "markdown", label: "Markdown", ext: [".md", ".markdown"] },
  { id: "plaintext", label: "Plain text", ext: [".txt"] },
];

const ACCEPTED_EXTS = [
  ".py", ".cpp", ".cc", ".cxx", ".hpp", ".h", ".c", ".java",
  ".js", ".jsx", ".mjs", ".ts", ".tsx",
  ".html", ".htm", ".css", ".scss", ".sass",
  ".json", ".xml", ".php", ".go", ".rs", ".swift", ".kt", ".kts",
  ".rb", ".cs", ".sql", ".txt", ".md", ".markdown",
  ".doc", ".docx", ".pdf",
];
const BINARY_EXTS = new Set([".pdf", ".doc", ".docx"]);

const SAMPLE = `def get_user(user_id):
    query = "SELECT * FROM users WHERE id = " + str(user_id)
    result = db.execute(query)
    password = "admin123"
    for i in range(0, len(result)):
        print(result[i])
    return result
`;

function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  for (const lang of LANGUAGES) {
    if (lang.ext.some((e) => lower.endsWith(e))) return lang.id;
  }
  return "javascript";
}

function Home() {
  const [code, setCode] = useState<string>(SAMPLE);
  const [language, setLanguage] = useState<string>("python");
  const [filename, setFilename] = useState<string>("snippet.py");
  const [review, setReview] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ code: string; language: string; filename: string; review: string; date: string }[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [user, setUser] = useState<any>(null);
  const isAuthenticated = !!user;
  const requireAuth = (
    feature: string,
    callback?: () => void,
  ) => {
    if (!isAuthenticated) {
      toast.error("Login to use this feature", {
        description: `${feature} is available for logged-in users only.`,
      });
      return;
    }
    callback?.();
  };
  const [novaPopup, setNovaPopup] = useState<{ x: number; y: number } | null>(null);
  const [novaSelection, setNovaSelection] = useState<string>("");
  const [novaChatOpen, setNovaChatOpen] = useState(false);
  const [novaMessages, setNovaMessages] = useState<ChatMessage[]>([]);
  const [novaPending, setNovaPending] = useState<string | null>(null);
  const [novaChatCode, setNovaChatCode] = useState<string>("");

  const captureSelection = useCallback((clientX?: number, clientY?: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setNovaPopup(null);
      setNovaSelection("");
      return;
    }
    const sel = ta.value.slice(start, end).trim();
    if (sel.length < 2) {
      setNovaPopup(null);
      setNovaSelection("");
      return;
    }
    setNovaSelection(sel);
    const rect = ta.getBoundingClientRect();
    const x = (clientX ?? rect.left + rect.width / 2) + 8;
    const y = (clientY ?? rect.top + 24) + 12;
    setNovaPopup({ x, y });
  }, []);

  const handleNovaAction = useCallback(
    (action: NovaAction) => {
      const prompt = NOVA_ACTION_PROMPTS[action];
      setNovaChatCode(novaSelection);
      setNovaPopup(null);
      setNovaChatOpen(true);
      if (action === "ask") return;
      setNovaPending(prompt);
    },
    [novaSelection],
  );

  useEffect(() => {
    if (!novaPopup) return;
    const onScroll = () => setNovaPopup(null);
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".nova-popup") || t === textareaRef.current) return;
      setNovaPopup(null);
    };
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, [novaPopup]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const lineCount = code.split("\n").length;

  const parsedError = (() => {
    const t = review.trim();
    if (!t.startsWith("{")) return null;
    try {
      const obj = JSON.parse(t);
      if (obj && obj.status === "error") return obj as {
        status: "error";
        error_type: string;
        message: string;
        possible_detected_language?: string;
        suggestion?: string;
      };
    } catch {
      return null;
    }
    return null;
  })();

  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!isAuthenticated) {
      toast.error("Login to use this feature");
      return;
    }
    const lower = file.name.toLowerCase();
    const ext = lower.slice(lower.lastIndexOf("."));
    if (!ACCEPTED_EXTS.includes(ext)) {
      const msg = `Unsupported file type "${ext || file.name}". Supported: ${ACCEPTED_EXTS.join(", ")}`;
      setError(msg);
      toast.error("Unsupported file", { description: "See supported formats above." });
      return;
    }

    const sizeCap = BINARY_EXTS.has(ext) ? 10_000_000 : 200_000;
    if (file.size > sizeCap) {
      const msg = BINARY_EXTS.has(ext) ? "Document too large (max 10MB)." : "File too large (max 200KB).";
      setError(msg);
      toast.error(msg);
      return;
    }

    setExtracting(true);
    setError(null);
    const toastId = BINARY_EXTS.has(ext)
      ? toast.loading("Extracting code from document…")
      : undefined;
    try {
      const { extractFromFile, extractCodeBlocks } = await import("@/lib/doc-extract");
      const { text, kind } = await extractFromFile(file);
      const { code: extracted, hadFences } = extractCodeBlocks(text);
      const finalText = extracted.trim();
      if (!finalText) throw new Error("No meaningful text or code found in the file.");
      if (finalText.length > 50_000) {
        throw new Error("Extracted content exceeds 50,000 character limit. Trim the document and retry.");
      }
      setCode(finalText);
      setFilename(file.name);
      setLanguage(detectLanguage(file.name));
      if (toastId !== undefined) toast.dismiss(toastId);
      toast.success(
        kind === "text"
          ? `Loaded ${file.name}`
          : hadFences
            ? `Extracted code blocks from ${file.name}`
            : `Extracted text from ${file.name}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to read the file.";
      setError(msg);
      if (toastId !== undefined) toast.dismiss(toastId);
      toast.error("Extraction failed", { description: msg });
    } finally {
      setExtracting(false);
    }
  }, [isAuthenticated]);

  const onUploadClick = () => {
    requireAuth("File Upload", () => {
      fileInputRef.current?.click();
    });
  };
  const runReview = async () => {
    if (!code.trim()) {
      setError("Paste or upload some code first.");
      return;
    }
    setLoading(true);
    setError(null);
    setReview("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text();
        throw new Error(msg || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setReview(acc);
      }
      if (user) {
        setHistory((prev) => [{
          code,
          language,
          filename,
          review: acc,
          date: new Date().toLocaleString(),
        }, ...prev.slice(0, 9)]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [includeImproved, setIncludeImproved] = useState(true);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!user) {
        toast.error("Login to use export");
        return;
      }

      if (!review || parsedError) return;

      setExporting(format);

      try {
        await exportReview(format, {
          projectTitle: "RefineCode — Technical Report",
          filename,
          language,
          code,
          review,
          includeImprovedCode: includeImproved,
        });

        toast.success(`Exported as ${format.toUpperCase()}`, {
          description: "Your file has been downloaded.",
        });
      } catch (e) {
        toast.error("Export failed", {
          description: e instanceof Error ? e.message : "Unknown error.",
        });
      } finally {
        setExporting(null);
      }
    },
    [user, review, parsedError, filename, language, code, includeImproved],
  );

  const copyReview = async () => {
    if (!review) return;
    await navigator.clipboard.writeText(review);
    toast.success("Review copied to clipboard");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 text-white grid place-items-center shadow-[0_0_24px_-8px_rgba(139,92,246,0.9)] ring-1 ring-white/20 overflow-hidden">
              <Code2 className="w-4.5 h-4.5" strokeWidth={2.25} />
              <Sparkles className="absolute right-0.5 top-0.5 w-2.5 h-2.5 text-white/85" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display font-semibold text-base leading-tight tracking-tight bg-gradient-to-r from-slate-950 via-blue-700 to-violet-700 bg-clip-text text-transparent">
                RefineCode
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                AI-powered analysis · security · performance
              </p>
            </div>
          </div>

          {!isAuthenticated && (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition"
            >
              Login →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <section className="mb-8">
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1]">
            Find bugs, security holes, and rough edges
            <span className="text-primary"> before they ship.</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Paste source code or upload a file. Get a senior-engineer-grade review covering syntax,
            bad practices, vulnerabilities, performance, and readability — in seconds.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <Pill icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Security audit" />
            <Pill icon={<Zap className="w-3.5 h-3.5" />} label="Performance tips" />
            <Pill icon={<Eye className="w-3.5 h-3.5" />} label="Readability score" />
            <Pill icon={<FileCode className="w-3.5 h-3.5" />} label="12+ languages" />
          </div>
        </section>

        {/* Workbench */}
        <section className="grid lg:grid-cols-2 gap-5">
          {/* Editor panel */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface/60">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-warning/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/80" />
                </div>
                <span className="font-mono text-xs text-muted-foreground ml-2">{filename}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs bg-card border border-border rounded-md px-2 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-ring/40"
                  aria-label="Language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <IconButton onClick={onUploadClick} title="Upload file">
                  <Upload className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  onClick={() => {
                    setCode("");
                    setReview("");
                    setError(null);
                  }}
                  title="Clear"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </IconButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_EXTS.join(",")}
                  multiple={false}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div
              className={`relative flex-1 min-h-[420px] flex bg-[var(--code-bg)] transition ${dragOver ? "ring-2 ring-primary/60 ring-inset" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);

                if (!user) {
                  toast.error("Login to use file upload");
                  return;
                }

                const f = e.dataTransfer.files?.[0];

                if (f) handleFile(f);
              }}
            >
              {/* Line numbers */}
              <div
                className="select-none font-mono text-xs text-white/30 py-4 px-3 text-right border-r border-white/5"
                aria-hidden
              >
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onMouseUp={(e) => captureSelection(e.clientX, e.clientY)}
                onKeyUp={(e) => {
                  if (e.shiftKey || e.key === "Shift" || e.key.startsWith("Arrow")) {
                    captureSelection();
                  }
                }}
                onBlur={() => setTimeout(() => setNovaPopup(null), 150)}
                spellCheck={false}
                placeholder="// Paste your code here…"
                className="flex-1 resize-none bg-transparent text-white/90 font-mono text-[13px] leading-6 p-4 outline-none caret-primary"
              />
              {(extracting || dragOver) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                  <div className="flex items-center gap-2 text-white/90 text-sm font-medium px-4 py-2 rounded-lg bg-white/10 border border-white/15">
                    {extracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting code from document…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Drop file to upload
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface/40">
              <span className="text-xs text-muted-foreground font-mono">
                {code.length.toLocaleString()} chars · {lineCount} lines
              </span>
              <button
                onClick={runReview}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg shadow-soft hover:shadow-lift hover:bg-primary/95 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Reviewing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Run AI review
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Review panel */}
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Review</span>
                {loading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    streaming
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <IconButton
                  onClick={() => {
                    if (!user) {
                      toast.error("Login to check history");
                      return;
                    }

                    setShowHistory((h) => !h);
                  }}
                  title="History"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </IconButton>
                <IconButton
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error("Login to compare code versions");
                      return;
                    }

                    setShowDiff((d) => !d);
                  }}
                  title="Diff View"
                  disabled={!review || !!parsedError}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="18" rx="1" />
                  </svg>
                </IconButton>
                <IconButton onClick={copyReview} title="Copy" disabled={!review || !!parsedError}>
                  <Copy className="w-3.5 h-3.5" />
                </IconButton>
                <ExportMenu
                  disabled={!review || !!parsedError}
                  exporting={exporting}
                  includeImproved={includeImproved}
                  setIncludeImproved={setIncludeImproved}
                  onExport={handleExport}
                />
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto">
              {error && (
                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive px-3 py-2 text-sm">
                  {error}
                </div>
              )}
              {showHistory && history.length > 0 && (
                <div style={{ marginBottom: "16px", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", background: "var(--muted)", fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)" }}>Review History (last 10)</div>
                  {history.map((h, i) => (
                    <div key={i} onClick={() => { setReview(h.review); setCode(h.code); setLanguage(h.language); setFilename(h.filename); setShowHistory(false); }}
                      style={{ padding: "10px 12px", borderTop: i > 0 ? "1px solid var(--border)" : undefined, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500 }}>{h.filename}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{h.date}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{h.language}</div>
                    </div>
                  ))}
                </div>
              )}
              {showHistory && history.length === 0 && (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)" }}>No reviews yet.</div>
              )}
              {showDiff && (() => {
                const improvedMatch = review.match(/```[\w]*\n([\s\S]*?)```/);
                const improvedCode = improvedMatch ? improvedMatch[1] : null;
                if (!improvedCode) return <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)" }}>No improved code found in review.</div>;
                const diffs = diffLines(code, improvedCode);
                return (
                  <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                      <div style={{ padding: "8px 12px", background: "#fee2e2", fontWeight: 600, fontSize: "12px", color: "#991b1b", borderBottom: "1px solid var(--border)" }}>Original</div>
                      <div style={{ padding: "8px 12px", background: "#dcfce7", fontWeight: 600, fontSize: "12px", color: "#166534", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>Improved</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxHeight: "400px", overflow: "auto" }}>
                      <div style={{ borderRight: "1px solid var(--border)" }}>
                        {diffs.filter(d => !d.added).map((d, i) => (
                          <pre key={i} style={{ margin: 0, padding: "2px 12px", background: d.removed ? "#fee2e2" : "transparent", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{d.value}</pre>
                        ))}
                      </div>
                      <div>
                        {diffs.filter(d => !d.removed).map((d, i) => (
                          <pre key={i} style={{ margin: 0, padding: "2px 12px", background: d.added ? "#dcfce7" : "transparent", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{d.value}</pre>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {!review && !loading && !error && <EmptyState />}
              {loading && !review && (
                <div className="space-y-3">
                  <Shimmer w="60%" />
                  <Shimmer w="92%" />
                  <Shimmer w="80%" />
                  <Shimmer w="40%" />
                  <Shimmer w="70%" />
                </div>
              )}
              {review && parsedError && (
                <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/15 text-destructive grid place-items-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-destructive">
                          {parsedError.error_type === "LANGUAGE_MISMATCH"
                            ? "Language mismatch"
                            : "Invalid code"}
                        </h3>
                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                          {parsedError.error_type}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{parsedError.message}</p>
                      {parsedError.possible_detected_language && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Detected language:{" "}
                          <span className="font-mono font-medium text-foreground">
                            {parsedError.possible_detected_language}
                          </span>
                        </p>
                      )}
                      {parsedError.suggestion && (
                        <p className="text-sm text-muted-foreground mt-2">{parsedError.suggestion}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {review && !parsedError && !showHistory && !showDiff && (() => {
                const scoreMatch = review.match(/SCORE:\s*(\d+(?:\.\d+)?)\/10/);
                const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
                const scoreColor = score === null ? "" : score >= 8 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";
                return (
                  <>
                    {score !== null && (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: "var(--muted)" }}>
                        <div style={{ position: "relative", width: "56px", height: "56px" }}>
                          <svg viewBox="0 0 36 36" style={{ width: "56px", height: "56px", transform: "rotate(-90deg)" }}>
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3"
                              strokeDasharray={`${(score / 10) * 100} 100`} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: scoreColor }}>{score}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Quality Score</div>
                          <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{score >= 8 ? "Great code!" : score >= 5 ? "Needs improvement" : "Serious issues found"}</div>
                        </div>
                      </div>
                    )}
                    <article className="review-prose">
                      <ReactMarkdown
                        components={{
                          pre: ({ children }) => <CodeBlock variant="light">{children as never}</CodeBlock>,
                        }}
                      >{review}</ReactMarkdown>
                    </article>
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground text-center">
          Reviews are AI-generated and should be verified by a human.
        </footer>
      </main>

      {/* Nova AI floating popup */}
      {novaPopup && (
        <NovaPopup x={novaPopup.x} y={novaPopup.y} onAction={handleNovaAction} />
      )}

      {/* Nova AI launcher (always available) */}
      <button
        type="button"
        onClick={() => {
          setNovaChatCode(novaSelection);
          setNovaChatOpen(true);
        }}
        className="fixed bottom-5 right-5 z-30 group inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-white text-sm font-semibold bg-gradient-to-br from-fuchsia-500 to-sky-500 shadow-[0_8px_30px_-6px_rgba(217,70,239,0.6)] hover:shadow-[0_12px_40px_-6px_rgba(217,70,239,0.8)] hover:scale-[1.03] transition-all"
        aria-label="Open Nova AI"
      >
        <span className="relative grid place-items-center w-6 h-6 rounded-full bg-white/15 ring-1 ring-white/25">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-60" />
        </span>
        Nova AI
      </button>

      {/* Nova AI chat panel */}
      <NovaChat
        open={novaChatOpen}
        onClose={() => setNovaChatOpen(false)}
        selectedCode={novaChatCode}
        language={language}
        messages={novaMessages}
        setMessages={setNovaMessages}
        pendingPrompt={novaPending}
        onPendingConsumed={() => setNovaPending(null)}
      />
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-foreground/80 shadow-soft">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}

function IconButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      {...props}
      className="w-7 h-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function Shimmer({ w }: { w: string }) {
  return (
    <div
      className="h-3 rounded bg-gradient-to-r from-muted via-accent to-muted bg-[length:200%_100%] animate-pulse"
      style={{ width: w }}
    />
  );
}

function EmptyState() {
  return (
    <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">
        <Sparkles className="w-6 h-6" />
      </div>
      <h3 className="font-display font-semibold text-lg">Ready when you are</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
        Click <span className="font-medium text-foreground">Run AI review</span> to analyze your
        code. You'll get a summary, ranked issues, a refactor snippet, and a quality score.
      </p>
    </div>
  );
}

const EXPORT_FORMATS: {
  id: ExportFormat;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  { id: "pdf", label: "PDF", desc: "Professional report", icon: FileType2, accent: "text-rose-500" },
  { id: "docx", label: "DOCX", desc: "Editable Word document", icon: FileText, accent: "text-blue-500" },
  { id: "md", label: "Markdown", desc: "Developer-friendly .md", icon: FileCode2, accent: "text-violet-500" },
  { id: "html", label: "HTML", desc: "Standalone webpage", icon: Globe2, accent: "text-amber-500" },
  { id: "txt", label: "Plain text", desc: "Readable .txt file", icon: FileDown, accent: "text-emerald-500" },
];

function ExportMenu({
  disabled,
  exporting,
  includeImproved,
  setIncludeImproved,
  onExport,
}: {
  disabled: boolean;
  exporting: ExportFormat | null;
  includeImproved: boolean;
  setIncludeImproved: (v: boolean) => void;
  onExport: (f: ExportFormat) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const busy = exporting !== null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen((o) => !o)}
        className="group inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold pl-2.5 pr-2 py-1.5 rounded-md shadow-soft hover:shadow-lift hover:bg-primary/95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-soft"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Exporting…</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
            <span>Export</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-border bg-card shadow-lift overflow-hidden z-30 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 py-2.5 border-b border-border bg-surface/60">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Export documentation
            </p>
          </div>
          <ul className="py-1.5">
            {EXPORT_FORMATS.map((f) => {
              const Icon = f.icon;
              const isThis = exporting === f.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => {
                      setOpen(false);
                      onExport(f.id);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition group disabled:opacity-50"
                  >
                    <span
                      className={`w-8 h-8 grid place-items-center rounded-lg bg-surface border border-border ${f.accent} group-hover:scale-105 transition-transform`}
                    >
                      {isThis ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium leading-tight">{f.label}</span>
                      <span className="block text-[11px] text-muted-foreground leading-tight">
                        {f.desc}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      .{f.id}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-2.5 border-t border-border bg-surface/40">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-foreground/80">
              <span className="relative">
                <input
                  type="checkbox"
                  checked={includeImproved}
                  onChange={(e) => setIncludeImproved(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="block w-4 h-4 rounded border border-border bg-card peer-checked:bg-primary peer-checked:border-primary transition" />
                <Check className="w-3 h-3 text-primary-foreground absolute inset-0.5 opacity-0 peer-checked:opacity-100 transition" />
              </span>
              Include improved code
            </label>
          </div>
        </div>
      )}
    </div>
  );
}