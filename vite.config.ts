// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// Cloudflare's build plugin is disabled below (cloudflare: false) since this app now deploys
// to Vercel via Nitro instead of Cloudflare Workers.
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  // Disable the built-in Cloudflare Workers build plugin — Nitro handles
  // the Vercel build/output instead.
  cloudflare: false,

  // Extra plugins are appended here, not inside `vite: { plugins: [...] }`.
  plugins: [nitro()],
});