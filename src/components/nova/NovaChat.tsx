import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { toast } from "sonner";
import { Sparkles, X, Send, Copy, RefreshCw, Loader2, Code2 } from "lucide-react";
import { NOVA_FOLLOWUPS } from "./NovaPopup";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

export function NovaChat({
  open,
  onClose,
  selectedCode,
  language,
  messages,
  setMessages,
  pendingPrompt,
  onPendingConsumed,
}: {
  open: boolean;
  onClose: () => void;
  selectedCode: string;
  language: string;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  pendingPrompt: string | null;
  onPendingConsumed: () => void;
}) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
      const assistantId = crypto.randomUUID();
      const baseHistory = [...messages, userMsg];
      setMessages([...baseHistory, { id: assistantId, role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch("/api/nova", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: baseHistory.map((m) => ({ role: m.role, content: m.content })),
            selectedCode,
            language,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(await res.text());
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          );
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        toast.error("Nova AI error", { description: e instanceof Error ? e.message : "Unknown" });
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, setMessages, selectedCode, language, streaming],
  );

  // consume pending prompt from popup
  useEffect(() => {
    if (open && pendingPrompt) {
      onPendingConsumed();
      void send(pendingPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingPrompt]);

  // autoscroll
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const regenerate = () => {
    // find last user message; rebuild without trailing assistant
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const cutoff = messages.length - 1 - lastUserIdx;
    const last = messages[cutoff];
    const trimmed = messages.slice(0, cutoff);
    setMessages(trimmed);
    void send(last.content);
  };

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] z-50 nova-panel flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className="relative grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500/40 to-sky-500/40 ring-1 ring-white/15">
            <Sparkles className="w-4 h-4 text-fuchsia-100" />
            <span className="absolute -inset-0.5 rounded-lg bg-fuchsia-400/10 blur animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white tracking-tight">Nova AI</div>
            <div className="text-[11px] text-white/50">
              {selectedCode ? `${selectedCode.split("\n").length} lines · ${language || "code"}` : "No selection"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected code context */}
        {selectedCode && (
          <div className="px-4 pt-3">
            <details className="rounded-lg bg-white/5 border border-white/10 overflow-hidden">
              <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-[11px] text-white/60 hover:text-white/80 select-none">
                <Code2 className="w-3.5 h-3.5" />
                Selected context · {language || "code"}
              </summary>
              <div className="px-3 pb-3 pt-1">
                <CodeBlock variant="nova" language={language || "code"}>
                  <code>{selectedCode}</code>
                </CodeBlock>
              </div>
            </details>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-8 px-4">
              <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-sky-500/20 ring-1 ring-white/10 mb-3">
                <Sparkles className="w-5 h-5 text-fuchsia-200" />
              </div>
              <h3 className="text-white font-semibold">Ask Nova anything</h3>
              <p className="text-[12px] text-white/50 mt-1">
                Context-aware answers about your selected code.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                {NOVA_FOLLOWUPS.map((p) => (
                  <button
                    key={p}
                    onClick={() => void send(p)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/75 transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <ChatBubble key={m.id} msg={m} />
          ))}
          {streaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 text-[12px] text-white/50">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Nova is thinking…
            </div>
          )}
        </div>

        {/* Footer actions */}
        {messages.length > 0 && !streaming && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <button
              onClick={regenerate}
              className="text-[11px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/75 border border-white/10 transition"
            >
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </div>
        )}

        {/* Composer */}
        <form
          className="p-3 border-t border-white/10 bg-black/30"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-fuchsia-400/40 focus-within:ring-2 focus-within:ring-fuchsia-400/20 transition px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Ask about the selected code…"
              className="flex-1 resize-none bg-transparent text-[13px] text-white placeholder:text-white/35 outline-none max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-sky-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-4px_rgba(217,70,239,0.6)] hover:brightness-110 transition"
              aria-label="Send"
            >
              {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="mt-1.5 px-1 text-[10px] text-white/40">
            Enter to send · Shift+Enter for newline
          </div>
        </form>
      </aside>
    </>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const copy = async () => {
    await navigator.clipboard.writeText(msg.content);
    toast.success("Copied");
  };
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] ${isUser ? "" : "w-full"}`}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm px-3.5 py-2 bg-gradient-to-br from-fuchsia-500/90 to-sky-500/90 text-white text-[13px] leading-relaxed shadow-[0_4px_24px_-8px_rgba(217,70,239,0.5)]">
            {msg.content}
          </div>
        ) : (
          <div className="group relative">
            <div className="nova-md text-[13px] leading-relaxed text-white/90">
              <ReactMarkdown
                components={{
                  pre: ({ children }) => <CodeBlock variant="nova">{children as never}</CodeBlock>,
                }}
              >{msg.content || "…"}</ReactMarkdown>
            </div>
            {msg.content && (
              <button
                onClick={copy}
                className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition w-7 h-7 grid place-items-center rounded-md bg-white/10 hover:bg-white/15 text-white/70 border border-white/10"
                title="Copy"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
