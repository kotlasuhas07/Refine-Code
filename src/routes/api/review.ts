import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createAiGatewayProvider } from "@/lib/ai-gateway";

const SYSTEM_PROMPT = `You are a strict static-analysis code reviewer.

STEP 1 — LANGUAGE DETECTION (MANDATORY FIRST STEP):
Detect the actual language of the submitted code from its syntax (keywords, punctuation, imports, declarations). Compare it with the user-selected language.

If the detected language is clearly different from the selected language, respond with ONLY this raw JSON object (no markdown, no code fences, no extra text):
{"status":"error","error_type":"LANGUAGE_MISMATCH","message":"The uploaded code appears to be written in a different programming language.","possible_detected_language":"<detected_language>","suggestion":"Please select the correct programming language and try again."}

IMPORTANT:
- Syntax errors alone do NOT mean language mismatch.
- Broken or incomplete code should still be reviewed if the intended language is obvious.
- Treat syntax errors as review issues, not mismatch errors.
- Only return LANGUAGE_MISMATCH when the code is unmistakably another language.
- If the code is clearly intended to be the selected language, continue the review even if the syntax is broken.

If the code is complete gibberish or not code at all, respond with ONLY this raw JSON:
{"status":"error","error_type":"INVALID_CODE","message":"The submitted content does not appear to be valid code.","suggestion":"Please upload actual source code and try again."}

STEP 2 — REVIEW (only if language matches and code is valid):
Be concise and technical.

Rules:
- No praise
- No motivational language
- No long summaries
- No beginner explanations
- Focus on bugs, security, performance, maintainability
- Never hallucinate issues
- Syntax errors preventing execution are always High severity

Output EXACTLY this Markdown format:

## Issues Found

**[Severity] Issue Name**
- Explanation
- Fix: <concrete fix>

(Severity = High | Medium | Low)

If there are no issues, write:
- None.

## Improved Code

\`\`\`<language>
<improved code>
\`\`\`

## Optional Notes

Only include if truly important.

STEP 3 — DIMENSION SCORES (mandatory, always last):
After your review, on a new line output ONLY this JSON with no surrounding text, fences, or explanation:
{"scores":{"security":N,"correctness":N,"performance":N,"maintainability":N,"readability":N}}

Score each dimension 1–10 using these anchors. Base scores on the code itself, not on how many issues you happened to list.

- security:        10 = no vulnerabilities  |  1 = critical exploitable flaw (SQLi, RCE, hardcoded secrets, exposed keys)
- correctness:     10 = logic is sound, no bugs  |  1 = will crash or produce wrong output in normal use
- performance:     10 = efficient for its context  |  1 = severe algorithmic waste or unnecessary blocking
- maintainability: 10 = clean, modular, testable  |  1 = deeply tangled, no separation of concerns, untestable
- readability:     10 = immediately clear to any reviewer  |  1 = incomprehensible naming, structure, or flow

CRITICAL:
- When returning error JSON (LANGUAGE_MISMATCH / INVALID_CODE), output ONLY that JSON — no review, no scores.
- For normal reviews, the dimension JSON must always be the final line of your response.
- No markdown fences around the dimension JSON.`;

// Composite formula weights — security and correctness dominate
// because they affect whether code is safe and correct to ship.
// Readability/maintainability are real but secondary signals.
const WEIGHTS = {
  security:        0.35,
  correctness:     0.30,
  performance:     0.15,
  maintainability: 0.12,
  readability:     0.08,
} as const;

type Dimensions = Record<keyof typeof WEIGHTS, number>;

function computeScore(dims: Dimensions): number {
  const raw = (Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>)
    .reduce((sum, k) => sum + dims[k] * WEIGHTS[k], 0);
  // Round to one decimal so "8.0" doesn't display as "8.0000..."
  return Math.round(raw * 10) / 10;
}

/** Extract and validate the trailing dimension JSON the model appended. */
function parseDimensions(text: string): { dims: Dimensions | null; cleanText: string } {
  // Match the scores JSON anywhere in the last 300 chars of the response
  const match = text.match(/\{"scores":\{(?:[^}]|\}(?!\}))*\}\}/);
  if (!match) return { dims: null, cleanText: text.trim() };

  try {
    const parsed = JSON.parse(match[0]) as { scores: Record<string, unknown> };
    const s = parsed.scores;
    const keys = Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>;

    // Validate every expected key is present and is a number 1–10
    for (const k of keys) {
      if (typeof s[k] !== "number" || (s[k] as number) < 1 || (s[k] as number) > 10) {
        return { dims: null, cleanText: text.trim() };
      }
    }

    const dims = Object.fromEntries(keys.map(k => [k, s[k] as number])) as Dimensions;
    const cleanText = text.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim();
    return { dims, cleanText };
  } catch {
    return { dims: null, cleanText: text.trim() };
  }
}

export const Route = createFileRoute("/api/review")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { code, language } = (await request.json()) as {
          code?: string;
          language?: string;
        };

        if (!code || typeof code !== "string" || code.trim().length === 0) {
          return new Response("Code is required", { status: 400 });
        }

        if (code.length > 50_000) {
          return new Response("Code exceeds 50,000 character limit", { status: 400 });
        }

        const key = process.env.GROQ_API_KEY;
        if (!key) return new Response("Missing GROQ_API_KEY", { status: 500 });

        const gateway = createAiGatewayProvider(key);
        const model   = gateway("llama-3.3-70b-versatile");

        try {
          const result = await generateText({
            model,
            system: SYSTEM_PROMPT,
            prompt: `User-selected language: ${language ?? "unspecified"}

Detect the actual language of the code below.

IMPORTANT:
- Broken syntax does NOT mean language mismatch.
- If the intended language is obvious, review it normally.
- Only return LANGUAGE_MISMATCH if the code is clearly another language.

Code:
\`\`\`${language ?? ""}
${code}
\`\`\`
`,
          });

          const text = result.text;

          // ── Error responses (language mismatch / invalid code) ──────────
          if (
            text.trim().startsWith("{") &&
            (text.includes('"LANGUAGE_MISMATCH"') || text.includes('"INVALID_CODE"'))
          ) {
            return new Response(text, {
              headers: { "Content-Type": "application/json" },
            });
          }

          // ── Extract dimension scores and compute composite ───────────────
          const { dims, cleanText } = parseDimensions(text);

          let score: number;
          let scoreMethod: string;

          if (dims) {
            // Weighted composite from model-assessed dimensions — primary path
            score       = computeScore(dims);
            scoreMethod = "weighted";
          } else {
            // Fallback: severity-count heuristic, same as before.
            // This fires only when the model ignores the JSON instruction.
            const hi  = (text.match(/\[High\]/g)   || []).length;
            const med = (text.match(/\[Medium\]/g)  || []).length;
            const lo  = (text.match(/\[Low\]/g)     || []).length;
            score       = hi >= 3 ? 2 : hi >= 1 ? 4 : med >= 3 ? 5 : med >= 1 ? 6 : lo >= 3 ? 7 : lo >= 1 ? 8 : 10;
            scoreMethod = "heuristic";
          }

          // ── Build dimension breakdown for display ────────────────────────
          let breakdownBlock = "";
          if (dims) {
            const rows = (Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>)
              .map(k => `| ${k.charAt(0).toUpperCase() + k.slice(1).padEnd(15)} | ${dims[k].toString().padStart(2)}/10 |`)
              .join("\n");
            breakdownBlock = `\n\n## Score Breakdown\n\n| Dimension        | Score |\n|------------------|-------|\n${rows}\n\n*Composite = security×35% + correctness×30% + performance×15% + maintainability×12% + readability×8%*`;
          }

          const finalResponse =
            `${cleanText}${breakdownBlock}\n\n## Quality Score\n\nSCORE: ${score}/10` +
            (scoreMethod === "heuristic" ? " *(estimated)*" : "");

          return new Response(finalResponse, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });

        } catch (err) {
          const message = err instanceof Error ? err.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});