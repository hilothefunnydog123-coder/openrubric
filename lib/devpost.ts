import "server-only";
import * as cheerio from "cheerio";

/**
 * Devpost importer — two-stage, defensive HTML scrape (Devpost has no public API).
 *
 *   1. Gallery crawl: `${base}/project-gallery?page=N` until a page yields no tiles.
 *      Server-rendered, so plain fetch + cheerio is enough (no headless browser).
 *   2. Per-project fetch: each `/software/<slug>` page for the full team roster +
 *      the repo / live links + "Built With" (needed for GitHub scans & AI summaries).
 *
 * Selectors are layered with fallbacks (marked `SELECTORS`) because Devpost tweaks
 * class names occasionally — if a field comes back empty, adjust the relevant list.
 *
 * Note: Devpost 403s many datacenter/VPN IPs. Run from a normal connection; on 403
 * the caller falls back to CSV / manual entry.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export class DevpostBlockedError extends Error {}

export interface DevpostProject {
  project_name: string;
  team_name: string;
  description: string;
  repo_url: string | null;
  live_url: string | null;
  devpost_url: string;
  built_with: string[];
  members: { name: string; username: string; profile_url: string }[];
}

/** Normalize a hackathon URL or bare subdomain into a base origin. */
export function devpostBase(input: string): string {
  const raw = input.trim();
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  const host = raw.replace(/^https?:\/\//i, "").split("/")[0];
  const sub = host.includes(".") ? host : `${host}.devpost.com`;
  return `https://${sub}`;
}

async function getHtml(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    signal,
  });
  if (res.status === 403) {
    throw new DevpostBlockedError("Devpost blocked the request (likely a datacenter IP).");
  }
  if (!res.ok) throw new Error(`Devpost ${res.status} for ${url}`);
  return res.text();
}

function parseGalleryPage(html: string, base: string): { name: string; url: string }[] {
  const $ = cheerio.load(html);
  // SELECTORS — gallery tile links (primary → fallbacks).
  let tiles = $("a.link-to-software");
  if (tiles.length === 0) tiles = $(".gallery-item a[href*='/software/']");
  if (tiles.length === 0) tiles = $("a[href*='/software/']");

  const out: { name: string; url: string }[] = [];
  const seen = new Set<string>();
  tiles.each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.includes("/software/")) return;
    const url = new URL(href.split("?")[0], base).toString();
    if (seen.has(url)) return;
    seen.add(url);
    // SELECTORS — project name within the tile.
    const name =
      $(el).find("h5").first().text().trim() ||
      $(el).find("h3, h4, .software-entry-name").first().text().trim() ||
      $(el).attr("aria-label")?.trim() ||
      url.replace(/\/$/, "").split("/").pop() ||
      "Untitled";
    out.push({ name, url });
  });
  return out;
}

function parseProject(html: string, url: string): DevpostProject {
  const $ = cheerio.load(html);

  const project_name =
    $("#software-header #app-title").text().trim() ||
    $("h1#app-title").text().trim() ||
    $("h1").first().text().trim() ||
    "Untitled";

  const description =
    $("meta[name='description']").attr("content")?.trim() ||
    $(".software-entry-tagline, #software-header .large").first().text().trim() ||
    "";

  // SELECTORS — team member profile links.
  const members: DevpostProject["members"] = [];
  const seenMember = new Set<string>();
  let memberEls = $("a.user-profile-link");
  if (memberEls.length === 0) memberEls = $("#app-team a[href*='devpost.com/']");
  if (memberEls.length === 0) memberEls = $(".software-team-member a, section a[href*='devpost.com/']");
  memberEls.each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href || /\/software\//.test(href) || /\/hackathons/.test(href) || /devpost\.com\/?$/.test(href))
      return;
    const name = ($(el).attr("data-original-title") || $(el).attr("title") || $(el).text()).trim();
    if (!name) return;
    const username = href.replace(/\/$/, "").split("/").pop() || "";
    const key = `${name}:${username}`;
    if (seenMember.has(key)) return;
    seenMember.add(key);
    members.push({ name, username, profile_url: href });
  });

  // SELECTORS — external links ("Try it out" / sidebar). Classify repo vs live.
  let repo_url: string | null = null;
  let live_url: string | null = null;
  const linkEls = $("ul.app-links a, nav.app-links a, .app-links a, #app-details a[href^='http']");
  linkEls.each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!/^https?:\/\//i.test(href)) return;
    if (/github\.com/i.test(href) && !repo_url) repo_url = href;
    else if (!/devpost\.com/i.test(href) && !live_url) live_url = href;
  });

  // SELECTORS — "Built With" tech tags.
  const built_with: string[] = [];
  $("#built-with .cp-tag, #built-with a, .software-built-with .cp-tag").each((_, el) => {
    const t = $(el).text().trim();
    if (t) built_with.push(t);
  });

  return {
    project_name,
    team_name: members.map((m) => m.name).join(", "),
    description,
    repo_url,
    live_url,
    devpost_url: url,
    built_with,
    members,
  };
}

/** Run `tasks` with a concurrency cap; failures resolve to null. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx]);
      } catch {
        out[idx] = null;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

export interface ScrapeResult {
  base: string;
  projects: DevpostProject[];
  truncated: boolean;
}

/**
 * Scrape a Devpost hackathon. Bounded for a single request: crawls up to `maxPages`
 * gallery pages and enriches up to `maxProjects` with per-project detail.
 */
export async function scrapeDevpost(
  input: string,
  opts: { maxPages?: number; maxProjects?: number; concurrency?: number; timeoutMs?: number } = {},
): Promise<ScrapeResult> {
  const { maxPages = 25, maxProjects = 80, concurrency = 5, timeoutMs = 25_000 } = opts;
  const base = devpostBase(input);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    // Stage 1 — gallery crawl
    const tiles: { name: string; url: string }[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= maxPages; page++) {
      const html = await getHtml(`${base}/project-gallery?page=${page}`, ctrl.signal);
      const batch = parseGalleryPage(html, base);
      if (batch.length === 0) break;
      for (const t of batch) {
        if (!seen.has(t.url)) {
          seen.add(t.url);
          tiles.push(t);
        }
      }
    }

    const truncated = tiles.length > maxProjects;
    const slice = tiles.slice(0, maxProjects);

    // Stage 2 — per-project detail (full roster + repo/live links)
    const detailed = await pool(slice, concurrency, async (t) => {
      const html = await getHtml(t.url, ctrl.signal);
      const p = parseProject(html, t.url);
      if (!p.project_name || p.project_name === "Untitled") p.project_name = t.name;
      return p;
    });

    const projects = detailed.filter((p): p is DevpostProject => p !== null);
    return { base, projects, truncated };
  } finally {
    clearTimeout(timer);
  }
}
