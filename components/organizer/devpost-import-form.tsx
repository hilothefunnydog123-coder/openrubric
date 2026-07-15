"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

/** Rough expected duration of a full Devpost scrape (gallery + per-project). */
const EST_SECONDS = 60;

/** A project ready to be persisted as a submission. */
export interface ImportProject {
  project_name: string;
  team_name?: string;
  track?: string;
  description?: string;
  repo_url?: string | null;
  devpost_url?: string | null;
  live_url?: string | null;
  screenshots?: string[];
  built_with?: string[];
  members?: { name: string; username?: string; profile_url?: string }[];
}

/**
 * Devpost-only import. Paste a hackathon's Devpost URL and OpenRubric scrapes its
 * public project gallery. There is no CSV / manual entry, if a hackathon isn't on
 * Devpost, organizers reach out via the Contact-us fallback and we accommodate them.
 *
 * - With a `hackathonId`, projects are saved straight to the dashboard and the Devpost
 *   URL is stored on the hackathon so auto-polling keeps pulling new submissions until
 *   the deadline.
 * - Without one (new-setup before the hackathon exists), it lifts the projects + URL via
 *   `onProjects` / `onDevpostUrl` so the wizard can persist them right after creating it.
 */
export function DevpostImportForm({
  hackathonId = null,
  onProjects,
  onDevpostUrl,
}: {
  hackathonId?: string | null;
  onProjects?: (projects: ImportProject[]) => void;
  onDevpostUrl?: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<ImportProject[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [analyze, setAnalyze] = useState<{ done: number; total: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Live elapsed-time counter while an import is running.
  useEffect(() => {
    if (!importing) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 300);
    return () => clearInterval(id);
  }, [importing]);

  /** Keep the parent in sync and remember the latest list for saving. */
  function applyRows(next: ImportProject[]) {
    setRows(next);
    setSavedCount(0);
    onProjects?.(next);
  }

  /**
   * Run the GitHub scan + AI summary for each new submission so the grading view shows
   * a real summary instead of the "draft" placeholder. Sequential to stay within limits.
   */
  async function analyzeAll(subs: { id: string }[]) {
    if (!subs.length) return;
    setAnalyze({ done: 0, total: subs.length });
    for (let i = 0; i < subs.length; i++) {
      try {
        await fetch(`/api/submissions/${subs[i].id}/process`, { method: "POST" });
      } catch {
        /* keep going, one bad repo shouldn't stall the batch */
      }
      setAnalyze({ done: i + 1, total: subs.length });
    }
    setAnalyze(null);
  }

  /** Persist the given projects to the dashboard (needs a hackathon to attach to). */
  async function saveToDashboard(projects: ImportProject[]) {
    if (!hackathonId || projects.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/submissions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: hackathonId, source: "import", projects }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setNote(typeof data.error === "string" ? data.error : "Couldn't save to the dashboard.");
        return;
      }
      setSavedCount(projects.length);
      const subs: { id: string }[] = Array.isArray(data.submissions) ? data.submissions : [];
      if (data.imported === 0) {
        setNote("These projects are already on your dashboard.");
        return;
      }
      setNote(`${data.imported} project${data.imported === 1 ? "" : "s"} added, analyzing…`);
      // Generate the AI summary + GitHub scan for each new project.
      await analyzeAll(subs);
      setNote(
        `${data.imported} project${data.imported === 1 ? "" : "s"} added and analyzed, summaries & GitHub scans are ready.`,
      );
    } catch {
      setNote("Network error saving to the dashboard.");
    } finally {
      setSaving(false);
    }
  }

  /** Store the Devpost URL on the hackathon so auto-polling can keep pulling new projects. */
  async function persistDevpostUrl(devpostUrl: string) {
    onDevpostUrl?.(devpostUrl);
    if (!hackathonId) return; // new-setup: the wizard saves it on create
    try {
      await fetch(`/api/hackathons/${hackathonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devpost_url: devpostUrl }),
      });
    } catch {
      /* non-fatal, auto-poll just won't have a URL until the next save */
    }
  }

  /** Real import: scrape public Devpost metadata via the API. */
  async function importDevpost() {
    setImporting(true);
    setFailed(false);
    setSavedCount(0);
    setNote("Scanning the Devpost gallery…");
    try {
      const res = await fetch("/api/import/devpost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      setImporting(false);
      if (!data.ok || !Array.isArray(data.projects) || data.projects.length === 0) {
        setFailed(true);
        setNote(data.fallback || "Couldn't reach that Devpost gallery automatically.");
        return;
      }
      const projects: ImportProject[] = data.projects;
      applyRows(projects);
      // Remember the URL on the hackathon so OpenRubric keeps polling for new entries.
      void persistDevpostUrl(url.trim());
      setNote(data.note || `${projects.length} projects imported from Devpost.`);
      // Auto-save to the dashboard when we already know the hackathon.
      if (hackathonId) await saveToDashboard(projects);
    } catch {
      setImporting(false);
      setFailed(true);
      setNote("Couldn't reach that Devpost gallery automatically.");
    }
  }

  /** Edit a field of a preview row before saving. */
  function updateRow(i: number, patch: Partial<ImportProject>) {
    applyRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  /** Remove a preview row before saving. */
  function deleteRow(i: number) {
    applyRows(rows.filter((_, idx) => idx !== i));
  }

  const allSaved = savedCount > 0 && savedCount >= rows.length;
  const contactHref = `mailto:${SITE.supportEmail}?subject=${encodeURIComponent(
    "Importing my hackathon into OpenRubric",
  )}&body=${encodeURIComponent(
    "Hi OpenRubric team,\n\nOur hackathon isn't on Devpost. Here's where our submissions live:\n\n",
  )}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-[1.5] text-dim">
        <strong className="font-semibold text-ink">Optional (add closer to the deadline).</strong> No
        Devpost URL yet? Skip it, you can paste it here any time. Once it&apos;s set, OpenRubric keeps
        pulling in new submissions automatically until your deadline.
      </p>
      <div className="flex items-center gap-3 rounded-[11px] border border-accent bg-accent-soft px-4 py-3.5">
        <span className="font-mono text-[11px] text-accent">01</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourhackathon.devpost.com"
          className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-faint"
          aria-label="Devpost hackathon URL"
        />
        <Button size="sm" onClick={importDevpost} disabled={importing || !url.trim()}>
          {importing ? "Importing…" : "Import"}
        </Button>
      </div>

      {/* preview */}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-[11px] border border-line">
          <div className="flex items-center justify-between border-b border-line-soft bg-raised px-4 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">Import preview</span>
            <span className="font-mono text-[11px] text-dim">{rows.length} projects</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {rows.map((r, i) => (
              <div
                key={i}
                className="group grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-2 border-b border-line-softer px-3 py-1.5 last:border-b-0"
              >
                <input
                  value={r.project_name}
                  onChange={(e) => updateRow(i, { project_name: e.target.value })}
                  placeholder="Project name"
                  className="rounded-[7px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] font-medium outline-none transition-colors hover:border-line focus:border-accent focus:bg-canvas"
                />
                <input
                  value={r.team_name ?? ""}
                  onChange={(e) => updateRow(i, { team_name: e.target.value })}
                  placeholder="Team"
                  className="rounded-[7px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-dim outline-none transition-colors hover:border-line focus:border-accent focus:bg-canvas"
                />
                <input
                  value={r.track ?? ""}
                  onChange={(e) => updateRow(i, { track: e.target.value })}
                  placeholder="Track"
                  className="rounded-[7px] border border-transparent bg-transparent px-2 py-1.5 font-mono text-[11.5px] text-dim outline-none transition-colors hover:border-line focus:border-accent focus:bg-canvas"
                />
                <button
                  type="button"
                  onClick={() => deleteRow(i)}
                  title="Remove project"
                  aria-label={`Remove ${r.project_name || "project"}`}
                  className="flex-shrink-0 rounded-md p-1.5 text-faint opacity-0 transition-all hover:bg-[rgba(199,58,58,0.1)] hover:text-[#c73a3a] group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          {/* Save action, only when there's a hackathon to attach the projects to. */}
          {hackathonId && (
            <div className="flex items-center justify-between gap-3 border-t border-line-soft bg-raised px-4 py-3">
              <span className="text-[12.5px] text-dim">
                {allSaved
                  ? "Saved, these show on your dashboard now."
                  : "Add these projects to your dashboard so judges can score them."}
              </span>
              <Button size="sm" onClick={() => saveToDashboard(rows)} disabled={saving || allSaved}>
                {saving ? "Saving…" : allSaved ? "Saved ✓" : `Add ${rows.length} to dashboard`}
              </Button>
            </div>
          )}
        </div>
      )}

      {importing ? (
        <div className="rounded-[11px] border border-line bg-raised p-4">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-accent" />
            <span className="text-[13px] font-medium text-ink">
              {note || "Scanning the Devpost gallery…"}
            </span>
            <span className="flex-1" />
            <span className="font-mono text-[11.5px] tabular-nums text-faint">{elapsed}s</span>
          </div>

          {/* progress fills toward ~92% over the estimate, then holds until done */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${Math.min(92, Math.round((elapsed / EST_SECONDS) * 100))}%` }}
            />
          </div>

          <p className="mt-2 font-mono text-[10.5px] text-faint">
            {elapsed < EST_SECONDS
              ? `Estimated ~${Math.max(5, EST_SECONDS - elapsed)}s left, scanning the gallery, then each project.`
              : "Almost done, finishing up the last projects…"}
          </p>
        </div>
      ) : analyze ? (
        <div className="rounded-[11px] border border-line bg-raised p-4">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-accent" />
            <span className="text-[13px] font-medium text-ink">
              Analyzing projects, GitHub scan + AI summary…
            </span>
            <span className="flex-1" />
            <span className="font-mono text-[11.5px] tabular-nums text-faint">
              {analyze.done}/{analyze.total}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${Math.round((analyze.done / Math.max(1, analyze.total)) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        note &&
        !failed && (
          <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-signal-clean">
            {allSaved && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            {note}
          </div>
        )
      )}

      {/* Contact-us fallback, shown after a failed import, since Devpost is the only path. */}
      {failed && !importing && (
        <div className="rounded-[11px] border border-line bg-raised p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 font-mono text-[12px] text-signal-review">!</span>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-ink">{note}</p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-dim">
                Devpost can block automated requests from some networks, and not every event runs on
                Devpost. You can add any project by hand below, just the team and product name, same
                rubric. Or if your submissions live somewhere else, contact us and we&apos;ll help you
                get them in.
              </p>
              <a
                href={contactHref}
                className="mt-3 inline-flex items-center gap-2 rounded-control border border-ink bg-ink px-3.5 py-2 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                Contact us
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-1 flex items-start gap-2.5 border-t border-line-soft pt-3.5">
        <span className="font-mono text-[12px] text-signal-review">!</span>
        <p className="text-[12.5px] leading-[1.5] text-dim">
          Devpost doesn&apos;t expose a stable public judging API. OpenRubric imports only public project
          metadata and never bypasses authentication. Not on Devpost?{" "}
          <a href={contactHref} className="font-medium text-ink underline-offset-2 hover:underline">
            Contact us
          </a>{" "}
          and we&apos;ll accommodate your platform.
        </p>
      </div>
    </div>
  );
}
