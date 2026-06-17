import { Box } from "lucide-react";
import { SIMPLE_ICONS } from "@/lib/tech-icons";
import { lobeIconKey, normalizeTech } from "@/lib/ai-icon-names";
import { LobeAiIcon } from "@/components/ui/lobe-ai-icon";
import { cn } from "@/lib/utils";

/**
 * TechIcon — one component for any tech-stack / brand label, with a two-source backend:
 *
 *   • AI / LLM / agent brands (OpenAI, Anthropic, Claude, Gemini, Hugging Face,
 *     Mistral, Ollama, Perplexity, LangChain) → @lobehub/icons (see lobe-ai-icon.tsx).
 *   • Everything else — web/data stack + auth providers (GitHub, Google) → Simple
 *     Icons (CC0) path data embedded in lib/tech-icons.ts.
 *
 * Both render monochrome via currentColor, so a chip's icon matches its text on any
 * surface. Labels are matched loosely (case/space/punctuation-insensitive) and a few
 * are aliased to the right brand. Unknown labels (e.g. "tree-sitter") fall back to a
 * neutral box glyph so chips stay aligned.
 */

// Normalized-label → Simple Icons slug (AI brands are handled by lobehub, not here).
const ALIASES: Record<string, string> = {
  // web / framework
  next: "nextdotjs",
  nextjs: "nextdotjs",
  react: "react",
  reactjs: "react",
  reactnative: "react", // RN ships no separate brand mark; React's is canonical
  expo: "expo",
  svelte: "svelte",
  sveltekit: "svelte",
  node: "nodedotjs",
  nodejs: "nodedotjs",
  bun: "bun",
  fastapi: "fastapi",
  tailwind: "tailwindcss",
  tailwindcss: "tailwindcss",
  vercel: "vercel",
  pwa: "pwa",
  python: "python",
  typescript: "typescript",
  ts: "typescript",
  // data
  redis: "redis",
  sqlite: "sqlite",
  postgres: "postgresql",
  postgresql: "postgresql",
  supabase: "supabase",
  supabaserealtime: "supabase",
  firebase: "firebase",
  // ML frameworks not in lobehub v1
  pytorch: "pytorch",
  torch: "pytorch",
  tensorflow: "tensorflow",
  tensorflowlite: "tensorflow",
  tflite: "tensorflow",
  // auth providers
  github: "github",
  google: "google",
};

/** Resolve a free-text label to a Simple Icons slug, or null if unknown. */
export function resolveTechSlug(name: string): string | null {
  const n = normalizeTech(name);
  if (ALIASES[n]) return ALIASES[n];
  if (SIMPLE_ICONS[n]) return n; // label already matches a slug exactly
  return null;
}

export function TechIcon({ name, className }: { name: string; className?: string }) {
  const size = cn("h-3.5 w-3.5 flex-shrink-0", className);

  // 1) AI / LLM brands → @lobehub/icons
  const aiKey = lobeIconKey(name);
  if (aiKey) return <LobeAiIcon iconKey={aiKey} className={size} />;

  // 2) Everything else → Simple Icons
  const slug = resolveTechSlug(name);
  const icon = slug ? SIMPLE_ICONS[slug] : null;
  if (icon) {
    return (
      <svg viewBox="0 0 24 24" className={size} fill="currentColor" role="img" aria-hidden>
        <path d={icon.path} />
      </svg>
    );
  }

  // 3) Unknown → neutral fallback
  return <Box className={size} strokeWidth={1.8} aria-hidden />;
}
