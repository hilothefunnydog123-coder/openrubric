import { Box } from "lucide-react";
import { SIMPLE_ICONS } from "@/lib/tech-icons";
import { lobeIconKey, normalizeTech } from "@/lib/ai-icon-names";
import { LobeAiIcon } from "@/components/ui/lobe-ai-icon";
import { cn } from "@/lib/utils";

/**
 * TechIcon, one component for any tech-stack / brand label, with a two-source backend:
 *
 *   • AI / LLM / agent brands (OpenAI, Anthropic, Claude, Gemini, Hugging Face,
 *     Mistral, Ollama, Perplexity, LangChain) → @lobehub/icons (see lobe-ai-icon.tsx).
 *   • Everything else, web/data stack + auth providers (GitHub, Google) → Simple
 *     Icons (CC0) path data embedded in lib/tech-icons.ts.
 *
 * Both render monochrome via currentColor, so a chip's icon matches its text on any
 * surface. Labels are matched loosely (case/space/punctuation-insensitive) and a few
 * are aliased to the right brand. Unknown labels (e.g. "tree-sitter") fall back to a
 * neutral box glyph so chips stay aligned.
 */

/**
 * Raw-label → slug, matched BEFORE normalization. Needed for labels whose punctuation
 * carries meaning: "c++" and "c#" both normalize to "c" (the C language), so they must
 * be caught here first or they'd collide with, and steal, the C icon.
 */
const RAW_ALIASES: Record<string, string> = {
  "c++": "cplusplus",
  "c#": "dotnet", // no CC0 C# mark; .NET is the closest brand
  ".net": "dotnet",
  "objective-c": "apple",
  "node.js": "nodedotjs",
  "three.js": "threedotjs",
  "vue.js": "vuedotjs",
  "react native": "react",
  "scikit-learn": "scikitlearn",
};

// Normalized-label → Simple Icons slug (AI brands are handled by lobehub, not here).
const ALIASES: Record<string, string> = {
  // languages
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  cpp: "cplusplus",
  cplusplus: "cplusplus",
  go: "go",
  golang: "go",
  rust: "rust",
  swift: "swift",
  swiftui: "swift",
  kotlin: "kotlin",
  ruby: "ruby",
  php: "php",
  dart: "dart",
  scala: "scala",
  solidity: "solidity",
  lua: "lua",
  bash: "gnubash",
  shell: "gnubash",
  markdown: "markdown",
  html: "html5",
  html5: "html5",
  css: "css",
  css3: "css",
  // hardware
  arduino: "arduino",
  raspberrypi: "raspberrypi",
  // web / framework
  next: "nextdotjs",
  nextjs: "nextdotjs",
  react: "react",
  reactjs: "react",
  reactnative: "react", // RN ships no separate brand mark; React's is canonical
  vue: "vuedotjs",
  vuejs: "vuedotjs",
  angular: "angular",
  svelte: "svelte",
  sveltekit: "svelte",
  node: "nodedotjs",
  nodejs: "nodedotjs",
  express: "express",
  expressjs: "express",
  flask: "flask",
  django: "django",
  fastapi: "fastapi",
  spring: "spring",
  springboot: "springboot",
  flutter: "flutter",
  tailwind: "tailwindcss",
  tailwindcss: "tailwindcss",
  bootstrap: "bootstrap",
  three: "threedotjs",
  threejs: "threedotjs",
  expo: "expo",
  electron: "electron",
  streamlit: "streamlit",
  gradio: "gradio",
  vite: "vite",
  webpack: "webpack",
  graphql: "graphql",
  socketio: "socketdotio",
  redux: "redux",
  jquery: "jquery",
  bun: "bun",
  pwa: "pwa",
  // ML / data (not in lobehub v1)
  pytorch: "pytorch",
  torch: "pytorch",
  tensorflow: "tensorflow",
  tensorflowlite: "tensorflow",
  tflite: "tensorflow",
  pandas: "pandas",
  numpy: "numpy",
  scikitlearn: "scikitlearn",
  sklearn: "scikitlearn",
  opencv: "opencv",
  keras: "keras",
  jupyter: "jupyter",
  jupyternotebook: "jupyter",
  plotly: "plotly",
  // data stores
  mongodb: "mongodb",
  mongo: "mongodb",
  postgres: "postgresql",
  postgresql: "postgresql",
  mysql: "mysql",
  redis: "redis",
  sqlite: "sqlite",
  supabase: "supabase",
  supabaserealtime: "supabase",
  firebase: "firebase",
  prisma: "prisma",
  planetscale: "planetscale",
  // cloud / services
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  cloudflare: "cloudflare",
  vercel: "vercel",
  netlify: "netlify",
  render: "render",
  gcp: "googlecloud",
  googlecloud: "googlecloud",
  stripe: "stripe",
  auth0: "auth0",
  clerk: "clerk",
  mapbox: "mapbox",
  googlemaps: "googlemaps",
  // tools / platforms
  git: "git",
  github: "github",
  figma: "figma",
  postman: "postman",
  unity: "unity",
  blender: "blender",
  godot: "godotengine",
  godotengine: "godotengine",
  ros: "ros",
  apple: "apple",
  ios: "apple",
  android: "android",
  androidstudio: "android",
  dotnet: "dotnet",
  csharp: "dotnet",
  gradle: "gradle",
  selenium: "selenium",
  ethereum: "ethereum",
  opengl: "opengl",
  google: "google",
};

/** Resolve a free-text label to a Simple Icons slug, or null if unknown. */
export function resolveTechSlug(name: string): string | null {
  const raw = name.toLowerCase().trim();
  if (RAW_ALIASES[raw]) return RAW_ALIASES[raw];
  const n = normalizeTech(name);
  if (ALIASES[n] && SIMPLE_ICONS[ALIASES[n]]) return ALIASES[n];
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
