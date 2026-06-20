const fs = require("node:fs");
const si = require("simple-icons");
const slugs = [
  "javascript","typescript","python","cplusplus","c","swift","kotlin","go","rust","ruby","php","dart","scala","solidity","html5","css","lua","r","gnubash","markdown",
  "arduino","raspberrypi",
  "react","nextdotjs","vuedotjs","angular","svelte","nodedotjs","express","flask","django","fastapi","spring","springboot","flutter","tailwindcss","bootstrap","threedotjs","expo","electron","streamlit","gradio","vite","webpack","graphql","socketdotio","redux","jquery",
  "tensorflow","pytorch","pandas","numpy","scikitlearn","opencv","keras","jupyter","plotly","langchain",
  "mongodb","postgresql","mysql","redis","sqlite","supabase","firebase","prisma","planetscale",
  "docker","kubernetes","cloudflare","vercel","netlify","render","googlecloud","stripe","auth0","clerk","mapbox","googlemaps",
  "git","github","figma","postman","unity","blender","godotengine","ros","apple","android","bun","pwa","google","dotnet","gradle","selenium","ethereum","opengl",
];
const key = (s) => "si" + s.charAt(0).toUpperCase() + s.slice(1);
const out = {}; const missing = [];
for (const s of slugs) {
  const ic = si[key(s)];
  if (ic && ic.path) out[s] = { title: ic.title, path: ic.path };
  else missing.push(s);
}
let body = "";
for (const s of Object.keys(out).sort()) {
  body += `  ${JSON.stringify(s)}: { title: ${JSON.stringify(out[s].title)}, path: ${JSON.stringify(out[s].path)} },\n`;
}
const header = `// AUTO-GENERATED from Simple Icons (https://simpleicons.org), licensed CC0 1.0.
// Each icon is a single 24x24 path rendered with fill=currentColor (monochrome).
// Regenerate with scripts/gen-icons (devDependency: simple-icons). AI/LLM model brands
// are served separately by @lobehub/icons (see lobe-ai-icon.tsx).
export type IconData = { title: string; path: string };

export const SIMPLE_ICONS: Record<string, IconData> = {
${body}};
`;
fs.writeFileSync(__dirname + "/lib/tech-icons.ts", header);
fs.rmSync(__dirname + "/_icons-body.txt", { force: true });
console.log("WROTE lib/tech-icons.ts with", Object.keys(out).length, "icons.");
console.log("MISSING (skipped):", missing.join(", ") || "none");
