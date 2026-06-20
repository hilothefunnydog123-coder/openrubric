/**
 * AI project summaries via an OpenAI-compatible provider.
 *
 * Defaults to GitHub Models (free tier): set GITHUB_API_MODEL_KEY to a GitHub PAT
 * with the `models` permission and it calls https://models.inference.ai.azure.com
 * with the cheap, free gpt-4o-mini model. Any other OpenAI-compatible /chat/completions
 * API also works by overriding OPENAI_BASE_URL + AI_MODEL (and providing OPENAI_API_KEY).
 * With no key, generateSummary() returns the deterministic demo summary so the grading
 * screen always renders.
 *
 * The summary is an aid for a human judge — "What it does / Who it helps / How it
 * works / Strongest part / Worth asking about" — never a score or a verdict.
 */

import { SUGGESTED_QUESTIONS } from "./demo-data";
import type { AiSummary } from "./types";

// GitHub Models (free) is the default; OPENAI_API_KEY remains a fallback for any
// other OpenAI-compatible provider.
const AI_DEFAULT_BASE_URL = "https://models.inference.ai.azure.com";
const AI_DEFAULT_MODEL = "gpt-4o-mini";

function aiKey(): string | undefined {
  return process.env.GITHUB_API_MODEL_KEY || process.env.OPENAI_API_KEY;
}

export function isAiConfigured(): boolean {
  return Boolean(aiKey());
}

export interface SummaryInput {
  submissionId: string;
  projectName: string;
  description: string;
  repoUrl?: string | null;
  readme?: string | null;
}

const SYSTEM_PROMPT = `You help a hackathon judge quickly understand a project before scoring it.
You are given the project's FULL Devpost write-up (Inspiration / What it does / How we built it / etc.) and, when available, its GitHub README. Read BOTH carefully and REWRITE them in your own words into a crisp, neutral brief — never copy the tagline or a sentence verbatim, and never invent facts that aren't in the sources.
You are an aid, not a judge: never assign scores, never accuse a team of anything, never use words like cheater, fraud, stolen, or plagiarized.
Return ONLY compact JSON with this exact shape:
{
  "what": string,        // 1-2 sentences: what the project actually does, rewritten from the write-up + README
  "who": string,         // who it helps
  "how": string,         // how it works under the hood, grounded in the README / "How we built it"
  "tech": string[],      // 2-6 ACTUAL named technologies/frameworks/languages/databases/APIs (e.g. "React Native", "Next.js", "Firebase", "PostgreSQL", "OpenAI API", "Python"). NEVER vague categories like "AI", "mobile app", "GPS", or "real-time notifications".
  "strength": string,    // the single strongest part
  "unclear": string,     // one thing a judge might want to ask about
  "questions": string[]  // exactly 5 SPECIFIC questions a judge should ask THIS team about THIS product: its architecture, the hardest part, what's real vs mocked, data/privacy, and what they'd build next. Tailored to the project, never generic.
}`;

interface RawSummary {
  what: string;
  who: string;
  how: string;
  tech: string[];
  strength: string;
  unclear: string;
  questions: string[];
}

/**
 * A safe, short summary derived from the write-up for when the model can't return one —
 * NEVER the full raw dump. Strips Devpost section headers/bullets and keeps the first
 * couple of sentences, so "What it does" always reads like a summary, not a transcript.
 */
function cleanSummary(description: string, projectName: string): string {
  let cleaned = (description || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*#+\s*/gm, "")
    .replace(
      /\b(Inspiration|What it does|How we built it|Challenges we ran into|Accomplishments[^\n.]*|What we learned|What['’]s next[^\n.]*|Built With)\b[:\s]*/gi,
      " ",
    )
    .replace(/[•\-*]\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Drop a leading project-name prefix so the fallback doesn't read like a transcript
  // ("Lumi AI My grandmother's friend…" → "My grandmother's friend…").
  const pn = (projectName || "").trim();
  if (pn) cleaned = cleaned.replace(new RegExp("^" + pn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s:–—-]*", "i"), "").trim();
  if (!cleaned) return `${projectName}.`;
  const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return (sentences || cleaned).slice(0, 280);
}

export async function generateSummary(input: SummaryInput): Promise<AiSummary> {
  const apiKey = aiKey();
  if (!apiKey) return demoSummaryFor(input.submissionId, input);

  const baseUrl = (process.env.OPENAI_BASE_URL || AI_DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.AI_MODEL || AI_DEFAULT_MODEL;
  const body = JSON.stringify({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Project: ${input.projectName}\n\nFull Devpost write-up:\n${
          input.description?.trim() || "(none provided)"
        }\n\nRepo: ${input.repoUrl ?? "n/a"}${
          input.readme ? `\n\nGitHub README:\n${input.readme.slice(0, 6000)}` : ""
        }`,
      },
    ],
  });

  // Retry with exponential backoff — the free GitHub Models tier rate-limits (429) under
  // load, and a single miss must not leave a project with the raw write-up as its summary.
  // We honor the provider's Retry-After (capped) so we wait exactly as long as asked.
  // Anything that still slips through is healed later by the cron's summary-repair pass.
  let raw: RawSummary | null = null;
  let backoffMs = 1500;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, backoffMs));
    backoffMs = Math.min(backoffMs * 2, 8000); // 1.5s → 3s → 6s → 8s (cap)
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
      });
      if (res.status === 429 || res.status >= 500) {
        const ra = Number(res.headers.get("retry-after"));
        if (Number.isFinite(ra) && ra > 0) backoffMs = Math.min(ra * 1000, 8000);
        continue; // transient — back off & retry
      }
      if (!res.ok) break;
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const parsed = JSON.parse(data.choices[0]?.message?.content ?? "{}") as RawSummary;
      if (parsed && typeof parsed.what === "string" && parsed.what.trim()) {
        raw = parsed;
        break;
      }
    } catch {
      /* network / parse error — retry */
    }
  }

  if (raw && raw.what) {
    return {
      id: `ai-${input.submissionId}`,
      submission_id: input.submissionId,
      summary: raw.what,
      what: raw.what,
      who: raw.who ?? "",
      how: raw.how ?? "",
      tech: Array.isArray(raw.tech) ? raw.tech.slice(0, 6) : [],
      strengths_json: raw.strength ? [raw.strength] : [],
      weaknesses_json: raw.unclear ? [raw.unclear] : [],
      suggested_questions_json:
        Array.isArray(raw.questions) && raw.questions.length
          ? raw.questions.slice(0, 5)
          : SUGGESTED_QUESTIONS,
      created_at: new Date().toISOString(),
    };
  }

  // The model never returned a usable summary — degrade to a CLEAN short summary from the
  // write-up (never the full raw dump) so "What it does" stays readable.
  const what = cleanSummary(input.description, input.projectName);
  return {
    id: `ai-${input.submissionId}`,
    submission_id: input.submissionId,
    summary: what,
    what,
    who: "",
    how: "",
    tech: [],
    strengths_json: [],
    weaknesses_json: [],
    suggested_questions_json: SUGGESTED_QUESTIONS,
    created_at: new Date().toISOString(),
  };
}

export interface RubricCriterionDraft {
  name: string;
  max: number;
}

const RUBRIC_IMAGE_PROMPT = `You read a hackathon scoring rubric from an image (a photo, screenshot, or table).
Extract every criterion and its MAXIMUM point value. A line like "Technical Execution / 20" or "Design 12 pts" means name "Technical Execution"/"Design" with max 20/12.
Ignore any total / sum row (e.g. "Total / 100"). Keep names concise and human (Title Case).
Return ONLY compact JSON with this exact shape: {"criteria":[{"name":string,"max":number}]}`;

/**
 * Vision: turn a photo/screenshot of a rubric into scorable criteria. Uses the same
 * OpenAI-compatible provider as generateSummary (gpt-4o-mini is vision-capable). Returns
 * [] when no key is set or the image can't be read, so the caller can fall back cleanly.
 */
export async function generateRubricFromImage(dataUrl: string): Promise<RubricCriterionDraft[]> {
  const apiKey = aiKey();
  if (!apiKey) return [];

  const baseUrl = (process.env.OPENAI_BASE_URL || AI_DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.AI_MODEL || AI_DEFAULT_MODEL;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RUBRIC_IMAGE_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the rubric criteria and their maximum point values from this image." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI provider ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const raw = JSON.parse(data.choices[0]?.message?.content ?? "{}") as
      | { criteria?: unknown[] }
      | unknown[];
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.criteria) ? raw.criteria : [];
    return list
      .map((c) => {
        const o = (c ?? {}) as Record<string, unknown>;
        const name = String(o.name ?? o.criterion ?? o.title ?? "").trim();
        const max = Math.round(Number(o.max ?? o.points ?? o.max_points ?? o.value ?? 0));
        return { name, max };
      })
      .filter((c) => c.name && Number.isFinite(c.max) && c.max > 0)
      .slice(0, 20);
  } catch {
    return [];
  }
}

/** Neutral placeholder summary — used when no AI provider is configured or a call fails. */
export function demoSummaryFor(submissionId: string, input?: Partial<SummaryInput>): AiSummary {
  const description = input?.description ?? "A hackathon project.";
  return {
    id: `ai-${submissionId}`,
    submission_id: submissionId,
    summary: description,
    what: description,
    who: "The project's target users.",
    how: "See the demo and repository for details.",
    tech: [],
    strengths_json: ["Connect an AI provider to generate a full summary."],
    weaknesses_json: ["No AI provider configured — set GITHUB_API_MODEL_KEY for live summaries."],
    suggested_questions_json: SUGGESTED_QUESTIONS,
    created_at: new Date().toISOString(),
  };
}
