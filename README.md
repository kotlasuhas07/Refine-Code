# RefineCode

It is a tool that lets you paste or upload source code and get an AI-powered review of it. You can get bug, security, and performance feedback on any code snippet, see an automatically improved version of your code, track a weighted quality score across five dimensions, and export the full review for later use.

## What it does

* Reviews pasted or uploaded code and flags issues by severity (High / Medium / Low)
* Rewrites your code into an improved, cleaned-up version
* Scores the code across five weighted dimensions: security, correctness, performance, maintainability, and readability
* Detects when the code doesn't match the language you selected, or isn't valid code at all
* Shows a diff view comparing your original code against the AI-improved version
* Lets you chat with an inline assistant ("Nova") about selected code for follow-up questions
* Saves your past reviews to a history you can revisit (requires login)
* Exports any review as PDF, DOCX, Markdown, HTML, or plain text

## How it works

When you submit code, it's sent to a server-side API route along with your selected language. The server sends the code to an LLM (Llama 3.3 70B, served via Groq) using a strict system prompt that first checks whether the code matches the selected language, then produces a structured Markdown review: issues found, an improved code block, and optional notes.

The model also outputs five dimension scores (1-10) as trailing JSON, which the server validates and combines into a deterministic weighted composite score (security 35%, correctness 30%, performance 15%, maintainability 12%, readability 8%). If the model doesn't return valid dimension JSON, the app falls back to a simpler severity-count heuristic and labels the score as estimated.

The response streams back to the browser as it's generated, and the frontend renders it as Markdown and appends it to your history if you're logged in. The "Nova" assistant works the same way through a separate API route for follow-up questions on selected code.

## Tech stack

* TypeScript / React
* TanStack Start & TanStack Router for the app framework and server routes
* Cloudflare for deployment
* Vercel AI SDK with the Groq provider for LLM calls
* Groq API with LLaMA 3.3 70B for the LLM
* Supabase for authentication
* Tailwind CSS with shadcn/Radix UI components
* react-markdown for rendering reviews, diff for the diff view
* jsPDF, docx, mammoth, and pdfjs-dist for exports and file uploads

## Setup

Clone the repo and install dependencies:

bun install

A free Groq API key is available at console.groq.com. Supabase project credentials are available from your Supabase dashboard under Project Settings > API.

## Running it

To run the dev server:

bun run dev

To build and preview a production build:

bun run build
bun run preview

Then open the app in your browser, paste or upload code, choose a language, and run a review. Log in via Supabase to unlock review history.

## Project structure

```
refinecode/
├── public/                # Static assets
├── src/
│   ├── routes/
│   │   ├── api/           # review.ts + nova.ts server routes
│   │   ├── tool.tsx       # Main review page
│   │   └── login.tsx      # Login page
│   ├── lib/               # ai-gateway, doc-extract, export-review, error-capture
│   ├── components/        # CodeBlock, nova/, ui/
│   └── integrations/
│       └── supabase/      # Auth client and middleware
├── .env                   # Environment variables (not committed)
├── wrangler.jsonc         # Cloudflare deployment config
└── package.json           # Dependencies and scripts
```

## Notes

* Code submissions are capped at 50,000 characters per review
* Groq's free tier has a daily token limit, which is enough for normal usage but may run out under heavy testing
* Review scoring is model-assessed (the LLM rates its own dimensions), then combined into a composite score using a fixed, deterministic weighting formula -- it is not derived from a separate static-analysis tool
* Do not commit your .env file -- it contains live API keys and Supabase credentials