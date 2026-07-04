import { Sparkles, MessageSquare } from "lucide-react";

export type NovaAction =
  | "ask"
  | "explain"
  | "fix"
  | "optimize"
  | "security"
  | "refactor"
  | "document";

const ACTIONS: { id: NovaAction; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { id: "ask", label: "Ask Nova AI", icon: MessageSquare, accent: "text-fuchsia-300" },
];

export function NovaPopup({
  x,
  y,
  onAction,
}: {
  x: number;
  y: number;
  onAction: (a: NovaAction) => void;
}) {
  // Clamp horizontally to viewport
  const W = 260;
  const left = Math.max(8, Math.min(x, window.innerWidth - W - 8));
  const top = Math.max(8, y);

  return (
    <div
      style={{ position: "fixed", left, top, width: W, zIndex: 60 }}
      className="nova-popup animate-in fade-in zoom-in-95 duration-150"
      onMouseDown={(e) => e.preventDefault()} // keep selection alive
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <span className="relative grid place-items-center w-6 h-6 rounded-md bg-gradient-to-br from-fuchsia-500/30 to-sky-500/30 ring-1 ring-white/15">
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-200" />
          <span className="absolute inset-0 rounded-md animate-pulse bg-fuchsia-400/10" />
        </span>
        <div className="leading-tight">
          <div className="text-[12px] font-semibold text-white tracking-tight">Nova AI</div>
          <div className="text-[10px] text-white/50 -mt-0.5">Inline assistant · context-aware</div>
        </div>
      </div>
      <ul className="py-1">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onAction(a.id)}
                className="group w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] text-white/85 hover:bg-white/8 hover:text-white transition"
              >
                <Icon className={`w-3.5 h-3.5 ${a.accent} group-hover:scale-110 transition`} />
                <span className="flex-1">{a.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const NOVA_ACTION_PROMPTS: Record<NovaAction, string> = {
  ask: "",
  explain: "Explain what this code does, line by line where it matters. Keep it concise.",
  fix: "Identify the bugs in this code and provide a corrected version.",
  optimize: "Optimize this code for performance and readability. Explain the changes briefly.",
  security: "Audit this code for security vulnerabilities. List them by severity (High/Medium/Low) with concrete fixes.",
  refactor: "Refactor this code for clarity and maintainability. Preserve behavior.",
  document: "Generate clear technical documentation for this code, including a summary, parameters, return values, and example usage.",
};

export const NOVA_FOLLOWUPS = [
  "Explain this line",
  "Why is this vulnerable?",
  "Optimize this loop",
  "Convert this to OOP",
  "Generate test cases",
];