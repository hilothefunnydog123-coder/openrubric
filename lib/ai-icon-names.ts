// Shared, dependency-free helpers for tech-label icon resolution.
//
// Kept in a plain module (no "use client") so a Server Component can both normalize
// labels and decide whether a label is AI/LLM (served by @lobehub/icons) WITHOUT
// importing the client-only icon components.

/** Lowercase + strip every non-alphanumeric, so "Next.js", "Hugging Face" and
 *  "tree-sitter" become "nextjs", "huggingface", "treesitter". */
export function normalizeTech(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normalized label → @lobehub/icons component key. These AI/LLM/agent brands are
 * rendered by lobehub (see lobe-ai-icon.tsx); everything else falls back to the
 * Simple Icons set. PyTorch/TensorFlow are intentionally NOT here — lobehub v1 has
 * no mark for them, so they stay on Simple Icons.
 */
export const LOBE_AI_KEYS: Record<string, string> = {
  openai: "openai",
  whisper: "openai", // Whisper is an OpenAI model
  gpt: "openai",
  gpt4: "openai",
  gpt5: "openai",
  chatgpt: "openai",
  anthropic: "anthropic",
  claude: "claude",
  gemini: "gemini",
  googlegemini: "gemini",
  huggingface: "huggingface",
  hf: "huggingface",
  mistral: "mistral",
  mistralai: "mistral",
  ollama: "ollama",
  perplexity: "perplexity",
  langchain: "langchain",
};

/** The lobehub component key for a label, or null if lobehub doesn't cover it. */
export function lobeIconKey(name: string): string | null {
  return LOBE_AI_KEYS[normalizeTech(name)] ?? null;
}
