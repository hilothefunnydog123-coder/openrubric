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
  video_url: string | null;
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

/**
 * Real Devpost PROJECT image (a screenshot the team uploaded) vs. avatars, the
 * hackathon's own event logo (`challenge_thumbnails`/`challenge_photos`), or static
 * placeholders. Only the software_photos buckets are genuine project screenshots.
 */
const REAL_SHOT = /software_photos|software_thumbnail_photos/i;
function isRealShot(src: string): boolean {
  return (
    /^https?:\/\//i.test(src) &&
    REAL_SHOT.test(src) &&
    !/avatar|gravatar|placeholder|googleusercontent|challenge_thumbnail|challenge_photo/i.test(src)
  );
}

/**
 * Two URLs for the SAME Devpost photo differ only by size variant
 * (.../004/699/687/datas/medium.png vs .../original.png vs .../gallery.jpg). Key on the
 * numeric photo id so the same shot doesn't appear several times.
 */
function photoKey(url: string): string {
  const m = url.match(/\/(?:software_photos|software_thumbnail_photos)\/(\d+\/\d+\/\d+)\//);
  return m ? m[1] : url;
}
function dedupeByPhoto(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const k = photoKey(u);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
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
 * software_photos CDN) — never avatars/logos.
 *
 * Devpost wraps each gallery screenshot in `<a data-lightbox href=".../datas/original.PNG">`
 * — the FULL-SIZE image, always present in static HTML. The visible <img> inside is a
 * lazy "gallery.jpg" placeholder, so we read the anchor href first (these reliably load),
 * then fall back to any real <img> src.
 */
function extractScreenshots($: cheerio.CheerioAPI): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const consider = (raw?: string) => {
    let src = (raw || "").trim();
    if (src.startsWith("//")) src = `https:${src}`;
    src = fullSize(src);
    if (!isRealShot(src) || seen.has(src) || out.length >= 8) return;
    seen.add(src);
    out.push(src);
  };
  // 1) The real full-size screenshots — Devpost's lightbox anchors.
  $("a[data-lightbox][href]").each((_, el) => consider($(el).attr("href")));
  // 2) Fallback — any <img> that points at a genuine software photo.
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

/** Pull a clean, embeddable video URL (Vimeo / YouTube) from the detail page. */
function extractVideo($: cheerio.CheerioAPI): string | null {
  let found: string | null = null;
  $("iframe[src], iframe[data-src]").each((_, el) => {
    if (found) return;
    let src = ($(el).attr("src") || $(el).attr("data-src") || "").trim();
    if (src.startsWith("//")) src = `https:${src}`;
    const vimeo = src.match(/player\.vimeo\.com\/video\/(\d+)/i) || src.match(/vimeo\.com\/(\d+)/i);
    if (vimeo) {
      found = `https://player.vimeo.com/video/${vimeo[1]}`;
      return;
    }
    const yt = src.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{6,})/i);
    if (yt) found = `https://www.youtube.com/embed/${yt[1]}`;
  });
  return found;
}

/**
 * The full Devpost write-up (Inspiration / What it does / How we built it / …). Lives in
 * #app-details as <h2> headings + paragraphs/lists. Serialized to readable plain text so
 * it feeds the AI summary AND shows to judges. Skips the embedded gallery/video nodes.
 */
function extractFullDescription($: cheerio.CheerioAPI): string {
  const original = $("#app-details").first();
  if (!original.length) return "";
  // Work on a clone with the image gallery / figures / embeds removed, so figcaptions
  // like "Logo" or "Demo screenshot" don't pollute the write-up.
  const root = original.clone();
  root.find("#gallery, figure, figcaption, a[data-lightbox], iframe, script, style, .video-container").remove();
  // Devpost appends page metadata after the write-up ("Try it out" links, "Submitted to",
  // "Created by", login prompts). Stop at the first such marker — it isn't write-up content.
  const FOOTER = /^(submitted to|created by|try it out|log ?in or sign ?up|sign up for devpost|share this project)\b/i;
  const parts: string[] = [];
  let stop = false;
  let prev = "";
  root.find("h1, h2, h3, h4, p, li").each((_, el) => {
    if (stop) return;
    // Skip blocks nested inside a list item — Devpost wraps each bullet's text in a <p>,
    // so find() would otherwise emit the same content as both an <li> and a <p>.
    if ($(el).parents("li").length > 0) return;
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() || "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!text || text.length < 2 || text === prev) return; // drop empties + immediate repeats
    if (FOOTER.test(text)) {
      stop = true;
      return;
    }
    prev = text;
    if (tag === "li") parts.push(`• ${text}`);
    else if (tag.startsWith("h")) parts.push(`\n${text}`);
    else parts.push(text);
  });
  const full = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  // Generous cap, but never cut mid-word: back off to the last sentence/paragraph break.
  const LIMIT = 16000;
  if (full.length <= LIMIT) return full;
  let cut = full.slice(0, LIMIT);
  const boundary = Math.max(
    cut.lastIndexOf("\n"),
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  if (boundary > LIMIT * 0.6) cut = cut.slice(0, boundary + 1);
  else {
    const sp = cut.lastIndexOf(" ");
    if (sp > 0) cut = cut.slice(0, sp);
  }
  return cut.trim() + "…";
}

function parseProject(html: string, url: string): DevpostProject {
  const $ = cheerio.load(html);

  const project_name =
    $("#software-header #app-title").text().trim() ||
    $("h1#app-title").text().trim() ||
    $("h1").first().text().trim() ||
    "Untitled";

  const tagline =
    $("meta[name='description']").attr("content")?.trim() ||
    $(".software-entry-tagline, #software-header .large").first().text().trim() ||
    "";
  // Prefer the full write-up; fall back to the short tagline when there isn't one.
  const fullDescription = extractFullDescription($);
  const description = fullDescription || tagline;
  const video_url = extractVideo($);

  // The project's banner / gallery-tile image (the nice logo card shown in the Devpost
  // gallery). Devpost exposes it as og:image — a `software_thumbnail_photos/.../medium.*`
  // URL that loads as-is. NOTE: never run fullSize() on it (its large variant 403s).
  const heroBanner = ($("meta[property='og:image']").attr("content") || "").trim();

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

  // SELECTORS — external links ("Try it out" / repo). These live in the SIDEBAR app-links,
  // NOT the write-up body: #app-details anchors are mostly lightbox image URLs (the project
  // screenshots), which must never be mistaken for the live demo. So we read app-links only
  // for the live URL, and fall back to the body only to find a GitHub repo.
  let repo_url: string | null = null;
  let live_url: string | null = null;

  // A Devpost CDN image / asset, never a real demo link.
  const isAssetLink = (u: string) =>
    /\.(png|jpe?g|gif|webp|svg|bmp|ico|pdf|mp4|mov)(\?|$)/i.test(u) ||
    /software_photos|software_thumbnail_photos|challenge_photos|challenge_thumbnails|\/datas\//i.test(u);
  // Social / chat / video hosts aren't the "live demo" either.
  const isNonDemoHost = (u: string) =>
    /(discord\.(gg|com)|t\.me|slack\.com|(twitter|x)\.com|instagram\.com|facebook\.com|linkedin\.com|youtube\.com|youtu\.be|vimeo\.com|devpost\.com)/i.test(u);

  $("ul.app-links a, nav.app-links a, .app-links a").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!/^https?:\/\//i.test(href)) return;
    if (/github\.com/i.test(href)) {
      if (!repo_url) repo_url = href;
      return;
    }
    if (isNonDemoHost(href) || isAssetLink(href)) return;
    if (!live_url) live_url = href; // the real "Try it out" link (e.g. a .vercel.app)
  });

  // Repo can also be linked from the write-up body when the sidebar omits it.
  if (!repo_url) {
    $("#app-details a[href*='github.com']").each((_, el) => {
      const href = ($(el).attr("href") || "").trim();
      if (/^https?:\/\//i.test(href) && /github\.com/i.test(href) && !/\/(blob|raw|releases|issues)\//i.test(href) && !repo_url) {
        repo_url = href;
      }
    });
  }

  // SELECTORS — "Built With" tech tags.
  const built_with: string[] = [];
  $("#built-with .cp-tag, #built-with a, .software-built-with .cp-tag").each((_, el) => {
    const t = $(el).text().trim();
    if (t) built_with.push(t);
  });

  // Lead with the banner/tile (the hero shown at the top of the judging panel), then the
  // detail-page screenshots. Banner kept raw — fullSize() would 403 it.
  const shots = extractScreenshots($);
  const screenshots = isRealShot(heroBanner)
    ? [heroBanner, ...shots.filter((s) => s !== heroBanner)].slice(0, 8)
    : shots;

  return {
    project_name,
    team_name: members.map((m) => m.name).join(", "),
    description,
    repo_url,
    live_url,
    video_url,
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
      // Keep the tile thumbnail AS-IS — its full-size variant 403s on Devpost's CDN.
      if (img) p.screenshots = [img];
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
      // Lead with the detail page's real full-size screenshots (lightbox anchors). Only
      // if the detail page yielded nothing do we fall back to the gallery tile thumbnail
      // — kept AS-IS, since its full-size variant 403s on Devpost's CDN.
      const merged: string[] = [...p.screenshots];
      if (merged.length === 0 && t.image) merged.push(t.image);
      // Collapse size-variant duplicates of the same photo (keeps the hero at [0]).
      p.screenshots = dedupeByPhoto(merged).slice(0, 8);
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
