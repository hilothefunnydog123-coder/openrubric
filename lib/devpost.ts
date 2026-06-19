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
  screenshots: string[];
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

/** Real Devpost project image (screenshot) vs. avatars / static logos / placeholders. */
const REAL_SHOT = /software_photos|software_thumbnail_photos|d112y698adiu2z/i;
function isRealShot(src: string): boolean {
  return (
    /^https?:\/\//i.test(src) &&
    REAL_SHOT.test(src) &&
    !/avatar|gravatar|placeholder|googleusercontent/i.test(src)
  );
}

function parseGalleryPage(html: string, base: string): { name: string; url: string; image: string | null }[] {
  const $ = cheerio.load(html);
  // SELECTORS — gallery tile links (primary → fallbacks).
  let tiles = $("a.link-to-software");
  if (tiles.length === 0) tiles = $(".gallery-item a[href*='/software/']");
  if (tiles.length === 0) tiles = $("a[href*='/software/']");

  const out: { name: string; url: string; image: string | null }[] = [];
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
    // The tile thumbnail IS the project's primary screenshot (server-rendered here,
    // unlike the detail-page gallery which Devpost lazy-loads).
    const img = $(el).find("img").first();
    const raw = (img.attr("src") || img.attr("data-src") || "").trim();
    out.push({ name, url, image: isRealShot(raw) ? raw : null });
  });
  return out;
}

/** Largest URL out of a srcset string ("a.jpg 1x, b.jpg 2x" / "a 320w, b 1024w"). */
function largestFromSrcset(srcset: string): string {
  const parts = srcset
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .filter((p) => p[0]);
  return parts.length ? parts[parts.length - 1][0] : "";
}

/** Upgrade Devpost CDN thumbnails to the full-size image when the pattern is known. */
function fullSize(url: string): string {
  return url
    .replace(/software_thumbnail_photos/g, "software_photos")
    .replace(/\/(thumbnail|small|medium)\.(png|jpe?g|gif|webp)(\?|$)/i, "/large.$2$3");
}

/**
 * Detail-page screenshot extraction. Only accepts real Devpost project images (the
 * software_photos CDN) — never avatars/logos. Note Devpost lazy-loads the detail
 * gallery, so this often finds nothing; the gallery TILE image is the reliable source.
 */
function extractScreenshots($: cheerio.CheerioAPI): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const consider = (raw?: string) => {
    const src = fullSize((raw || "").trim());
    if (!isRealShot(src) || seen.has(src) || out.length >= 8) return;
    seen.add(src);
    out.push(src);
  };
  $("img").each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr("srcset") || $el.attr("data-srcset");
    consider(
      $el.attr("data-src") ||
        $el.attr("data-lazy") ||
        $el.attr("data-original") ||
        (srcset ? largestFromSrcset(srcset) : "") ||
        $el.attr("src"),
    );
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

  const screenshots = extractScreenshots($);

  return {
    project_name,
    team_name: members.map((m) => m.name).join(", "),
    description,
    repo_url,
    live_url,
    devpost_url: url,
    built_with,
    members,
    screenshots,
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
 * Images-only Apify enrichment (opt-in via APIFY_TOKEN). The free built-in scrape does
 * ALL the data + a first pass at screenshots; this fills ONLY the gaps — projects that
 * came back with zero images (lazy galleries / a blocked fetch). It batches every gap
 * into a SINGLE actor run (not one per page), so cost stays low.
 *
 * Uses apify/cheerio-scraper (HTTP-only, the cheapest official scraper). Devpost serves
 * its gallery images in static HTML, so no headless browser is needed. The run fetches
 * through Apify's RESIDENTIAL proxy to bypass Devpost's datacenter-IP block.
 *
 *   APIFY_TOKEN = your Apify API token  (https://console.apify.com/account/integrations)
 *   APIFY_ACTOR = actor id, default "apify~cheerio-scraper"
 *                 (one-time approval: console → the actor → Approve permissions)
 */
async function enrichScreenshotsViaApify(projects: DevpostProject[], base: string): Promise<void> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return;
  const targets = projects.filter((p) => p.screenshots.length === 0 && p.devpost_url);
  if (targets.length === 0) return; // tiles already covered everything → no spend

  const actor = process.env.APIFY_ACTOR || "apify~cheerio-scraper";
  const endpoint = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  // Re-crawl the gallery (through Apify's residential proxy) and read each tile's
  // thumbnail — the project's primary screenshot, reliably in static HTML. Recovers
  // shots when the direct crawl was partially blocked. One cheap HTTP run, no browser.
  const pages = Math.min(5, Math.ceil(targets.length / 40) + 1);
  const startUrls = Array.from({ length: pages }, (_, i) => ({ url: `${base}/project-gallery?page=${i + 1}` }));
  const pageFunction = `async function pageFunction(context){const {$}=context;const rows=[];$('a.link-to-software').each(function(){const a=$(this);const href=(a.attr('href')||'').split('?')[0];const img=a.find('img').attr('src')||a.find('img').attr('data-src')||'';rows.push({href,img});});return {rows};}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50_000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        startUrls,
        pageFunction,
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        maxRequestsPerCrawl: pages + 1,
        maxConcurrency: 3,
        maxRequestRetries: 4, // residential IPs occasionally return an empty page
      }),
    });
    if (!res.ok) return;
    const items = (await res.json().catch(() => null)) as Array<{ rows?: { href: string; img: string }[] }> | null;
    if (!Array.isArray(items)) return;

    const norm = (u: string) => u.replace(/\/$/, "");
    const byUrl = new Map<string, string>();
    for (const it of items) {
      for (const r of it.rows ?? []) {
        if (r.href && isRealShot(r.img) && !byUrl.has(norm(r.href))) byUrl.set(norm(r.href), r.img);
      }
    }
    for (const p of projects) {
      if (p.screenshots.length > 0) continue;
      const img = byUrl.get(norm(p.devpost_url));
      if (img) p.screenshots = [fullSize(img)];
    }
  } catch {
    /* Apify unavailable/timed out — keep whatever the built-in scrape found */
  } finally {
    clearTimeout(timer);
  }
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
    const tiles: { name: string; url: string; image: string | null }[] = [];
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
      // The gallery tile thumbnail is the project's primary screenshot (reliably in
      // static HTML). Lead with it, then add any detail-page images we managed to find.
      const merged: string[] = [];
      if (t.image) merged.push(fullSize(t.image));
      for (const s of p.screenshots) if (!merged.includes(s)) merged.push(s);
      p.screenshots = merged.slice(0, 8);
      return p;
    });

    const projects = detailed.filter((p): p is DevpostProject => p !== null);

    // Fill any remaining screenshot gaps via one cheap Apify gallery re-crawl
    // (no-op without a token, or when the tiles already covered everything).
    await enrichScreenshotsViaApify(projects, base);

    return { base, projects, truncated };
  } finally {
    clearTimeout(timer);
  }
}
