"use client";

// Import each icon's *Mono* component directly, NOT the package barrel or even the
// per-icon index. The barrel pulls features/ProviderCombine and the per-icon index
// pulls Avatar → features/IconAvatar → antd-style → antd, none of which is installed
// (and we don't want antd in the bundle). Each Mono.js is a self-contained
// <svg fill="currentColor"> with zero heavy deps. (Types come from the ambient
// declaration in types/lobehub-icons.d.ts, since these subpaths ship no .d.ts.)
import OpenAI from "@lobehub/icons/es/OpenAI/components/Mono";
import Anthropic from "@lobehub/icons/es/Anthropic/components/Mono";
import Claude from "@lobehub/icons/es/Claude/components/Mono";
import Gemini from "@lobehub/icons/es/Gemini/components/Mono";
import HuggingFace from "@lobehub/icons/es/HuggingFace/components/Mono";
import Mistral from "@lobehub/icons/es/Mistral/components/Mono";
import Ollama from "@lobehub/icons/es/Ollama/components/Mono";
import Perplexity from "@lobehub/icons/es/Perplexity/components/Mono";
import LangChain from "@lobehub/icons/es/LangChain/components/Mono";

/**
 * Renders an AI/LLM brand mark from @lobehub/icons. We use each icon's default
 * (Mono) component, a self-contained <svg fill="currentColor">, so it inherits the
 * surrounding text color exactly like the Simple Icons set, and stays consistent on
 * both the dark hero panel and the light judge cards.
 *
 * iconKey is the value from LOBE_AI_KEYS (see lib/ai-icon-names.ts).
 */

type LobeIcon = React.ComponentType<{ size?: number | string; className?: string }>;

const COMPONENTS: Record<string, LobeIcon> = {
  openai: OpenAI,
  anthropic: Anthropic,
  claude: Claude,
  gemini: Gemini,
  huggingface: HuggingFace,
  mistral: Mistral,
  ollama: Ollama,
  perplexity: Perplexity,
  langchain: LangChain,
};

export function LobeAiIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const Icon = COMPONENTS[iconKey];
  if (!Icon) return null;
  // className carries the h-/w- sizing; CSS dimensions override the svg's default
  // height attribute, and size="1em" keeps it crisp if no class is supplied.
  return <Icon size="1em" className={className} />;
}
