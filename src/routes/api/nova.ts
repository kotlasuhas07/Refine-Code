import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createAiGatewayProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `You are Nova AI, an inline coding assistant embedded in a code editor.

Style:
- Concise, technical, senior-engineer tone. No filler, no motivational language.
- Prefer bullet points. Short paragraphs only when needed.
- When showing code, ALWAYS use fenced code blocks with a language tag.
- When fixing or refactoring, show only the changed/relevant portion unless the user asks for the full file.
- For security questions, name the vulnerability class (e.g. SQL injection, XSS, SSRF) and give a concrete fix.
- Never invent APIs. If unsure, say so in one line.

You are given the user's selected code as context. Stay focused on that snippet unless asked otherwise.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/nova")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as {
          messages?: ChatMessage[];
          selectedCode?: string;
          language?: string;
          action?: string;
        };

        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }
        const selectedCode = (body.selectedCode ?? "").slice(0, 20_000);
        const language = body.language ?? "";

        const key = process.env.GROQ_API_KEY;
        if (!key) return new Response("Missing GROQ_API_KEY", { status: 500 });

        const contextBlock = selectedCode
          ? `Selected code (${language || "unknown"}):\n\`\`\`${language}\n${selectedCode}\n\`\`\``
          : "No code selected.";

        const modelMessages: ModelMessage[] = [
          { role: "system", content: `${SYSTEM_PROMPT}\n\n${contextBlock}` },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const gateway = createAiGatewayProvider(key);
        const model = gateway("llama-3.3-70b-versatile");

        try {
          const result = streamText({ model, messages: modelMessages });
          return result.toTextStreamResponse();
        } catch (err) {
          const message = err instanceof Error ? err.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
