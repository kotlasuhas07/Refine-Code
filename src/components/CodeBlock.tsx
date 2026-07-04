import { useState, useRef, type ReactNode } from "react";
import { Copy, Check } from "lucide-react";

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    return extractText((node as { props: { children: ReactNode } }).props.children);
  }
  return "";
}

export type CodeBlockVariant = "light" | "nova";

export function CodeBlock({
  children,
  variant = "light",
  language,
  className,
}: {
  children: ReactNode;
  variant?: CodeBlockVariant;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    const text = preRef.current?.innerText ?? extractText(children);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const isNova = variant === "nova";

  return (
    <div className={`code-block group ${isNova ? "code-block--nova" : "code-block--light"} ${className ?? ""}`}>
      {language && (
        <span className="code-block__lang" aria-hidden>
          {language}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        title="Copy code"
        aria-label={copied ? "Copied" : "Copy code"}
        className={`code-block__copy ${copied ? "is-copied" : ""}`}
      >
        <span className="code-block__copy-icon">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </span>
        <span className="code-block__copy-label">{copied ? "Copied!" : "Copy"}</span>
      </button>
      <pre ref={preRef} className="code-block__pre">
        {children}
      </pre>
    </div>
  );
}
