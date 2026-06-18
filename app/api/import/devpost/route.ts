import { NextResponse } from "next/server";
import { devpostImportSchema } from "@/lib/validators";
import { scrapeDevpost, DevpostBlockedError } from "@/lib/devpost";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs"; // cheerio + fetch need the Node runtime
export const maxDuration = 60;

const FALLBACK = "Couldn't import automatically. Upload CSV or paste project links manually.";

/**
 * POST /api/import/devpost — scrape PUBLIC Devpost project metadata for a hackathon.
 *
 * Two-stage scrape (gallery → per-project). Reads only public pages, never bypasses
 * auth. On a block (Devpost 403s datacenter IPs) or empty result, returns `fallback`
 * so the UI can switch to CSV / manual entry.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "import-devpost"), 6, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = devpostImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { base, projects, truncated } = await scrapeDevpost(parsed.data.url);
    if (projects.length === 0) {
      return NextResponse.json({ ok: false, imported: 0, projects: [], fallback: FALLBACK });
    }
    return NextResponse.json({
      ok: true,
      source: base,
      imported: projects.length,
      truncated,
      projects: projects.map((p) => ({
        project_name: p.project_name,
        team_name: p.team_name,
        track: "", // Devpost galleries don't expose a track; the organizer assigns it.
        repo_url: p.repo_url,
        devpost_url: p.devpost_url,
        live_url: p.live_url,
        description: p.description,
        members: p.members,
        built_with: p.built_with,
      })),
      note: truncated
        ? "Imported public Devpost metadata (first 80 projects — re-run to page further)."
        : "Imported public Devpost metadata only.",
    });
  } catch (err) {
    const blocked = err instanceof DevpostBlockedError;
    return NextResponse.json(
      {
        ok: false,
        imported: 0,
        projects: [],
        error: blocked
          ? "Devpost blocked this request (try from a normal connection)."
          : "Import failed.",
        fallback: FALLBACK,
      },
      { status: blocked ? 502 : 200 },
    );
  }
}
